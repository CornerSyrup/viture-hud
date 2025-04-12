"use client"

import { useState, useEffect, useRef } from "react"
import TimeDisplay from "@/components/hud/time-display"
import WeatherWidget from "@/components/hud/weather-widget"
import SystemStatus from "@/components/hud/system-status"
import NavigationHelp from "@/components/hud/navigation-help"
import MusicPlayer from "@/components/hud/music-player"
import Compass from "@/components/hud/compass"
import NearbyPOI from "@/components/hud/nearby-poi"
import SniperScope from "@/components/hud/sniper-scope"
import SubtitleArea from "@/components/hud/subtitle-area"

export default function OpenWorldHUD() {
  // State for focus
  const [focusedComponent, setFocusedComponent] = useState("weather")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [recognitionState, setRecognitionState] = useState({
    isInitialized: false,
    isProcessing: false,
    hasPermission: null,
    error: null,
    currentLanguage: "",
  })

  const hudRef = useRef(null)

  // Initialize and check speech recognition
  useEffect(() => {
    // Try to import and subscribe to speech recognition service
    const setupSpeechService = async () => {
      try {
        const speechModule = await import("@/lib/speech-recognition-service")
        const speechService = speechModule.speechRecognitionService

        const unsubscribe = speechService.subscribe((state) => {
          setRecognitionState((prev) => ({
            ...prev,
            isInitialized: state.isInitialized,
            isProcessing: state.isProcessing,
            hasPermission: state.hasPermission,
            error: state.error,
            currentLanguage: state.currentLanguage,
          }))
        })

        return () => {
          if (unsubscribe) unsubscribe()
        }
      } catch (error) {
        console.error("Error setting up speech recognition service:", error)
        // Set a fallback state
        setRecognitionState((prev) => ({
          ...prev,
          error: "Speech recognition not available",
        }))
        return () => {}
      }
    }

    const cleanup = setupSpeechService()
    return () => {
      cleanup.then((unsubscribe) => {
        if (unsubscribe) unsubscribe()
      })
    }
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip navigation if a language selector is open
      if (document.querySelector(".hide-scrollbar")) {
        return
      }

      // Handle regular navigation
      switch (e.key) {
        case "ArrowUp":
          if (focusedComponent === "system") setFocusedComponent("weather")
          else if (focusedComponent === "poi") setFocusedComponent("music")
          e.preventDefault()
          break
        case "ArrowDown":
          if (focusedComponent === "weather") setFocusedComponent("system")
          else if (focusedComponent === "music") setFocusedComponent("poi")
          e.preventDefault()
          break
        case "ArrowLeft":
          if (focusedComponent === "music") setFocusedComponent("weather")
          else if (focusedComponent === "poi") setFocusedComponent("system")
          e.preventDefault()
          break
        case "ArrowRight":
          if (focusedComponent === "weather") setFocusedComponent("music")
          else if (focusedComponent === "system") setFocusedComponent("poi")
          e.preventDefault()
          break
        default:
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [focusedComponent])

  // Service worker registration for PWA
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("ServiceWorker registration successful with scope: ", registration.scope)
          })
          .catch((error) => {
            console.error("ServiceWorker registration failed: ", error)
          })
      })
    }

    // Check if app is already installed
    if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
    }

    // Listen for the beforeinstallprompt event
    if (typeof window !== "undefined") {
      window.addEventListener("beforeinstallprompt", (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault()
        // Stash the event so it can be triggered later
        setInstallPrompt(e)
      })

      // Listen for app installed event
      window.addEventListener("appinstalled", () => {
        setIsInstalled(true)
        setInstallPrompt(null)
      })
    }
  }, [])

  // Enter fullscreen on user interaction, not on load
  const requestFullscreen = () => {
    if (hudRef.current && !isFullscreen && typeof document !== "undefined") {
      try {
        if (hudRef.current.requestFullscreen) {
          hudRef.current
            .requestFullscreen()
            .then(() => setIsFullscreen(true))
            .catch((error) => console.error("Error entering fullscreen:", error))
        } else if (hudRef.current.webkitRequestFullscreen) {
          hudRef.current.webkitRequestFullscreen()
          setIsFullscreen(true)
        } else if (hudRef.current.msRequestFullscreen) {
          hudRef.current.msRequestFullscreen()
          setIsFullscreen(true)
        }
      } catch (error) {
        console.error("Error entering fullscreen:", error)
      }
    }
  }

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (typeof document !== "undefined") {
        setIsFullscreen(!!document.fullscreenElement)
      }
    }

    if (typeof document !== "undefined") {
      document.addEventListener("fullscreenchange", handleFullscreenChange)
      return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Install the app
  const installApp = async () => {
    if (installPrompt) {
      // Show the install prompt
      installPrompt.prompt()

      // Wait for the user to respond to the prompt
      const { outcome } = await installPrompt.userChoice

      // Clear the saved prompt since it can't be used again
      setInstallPrompt(null)
    }
  }

  return (
    <div
      ref={hudRef}
      className="w-full h-screen bg-black text-gray-300 font-mono relative overflow-hidden"
      onClick={requestFullscreen}
    >
      {/* Overlay grid effect */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"></div>

      {/* Install button - only show if not installed and prompt is available */}
      {!isInstalled && installPrompt && (
        <button
          onClick={installApp}
          className="absolute top-4 right-4 bg-cyan-500 text-black px-3 py-1 rounded-full text-xs z-50"
        >
          Install App
        </button>
      )}

      {/* Fullscreen button */}
      {!isFullscreen && (
        <button
          onClick={requestFullscreen}
          className="absolute top-4 right-4 bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs z-50"
        >
          Enter Fullscreen
        </button>
      )}

      {/* HUD Components */}
      <div className="relative w-full h-full">
        {/* Time and Date */}
        <TimeDisplay />

        {/* Weather Widget */}
        <WeatherWidget isFocused={focusedComponent === "weather"} highlightColor="border-cyan-500" />

        {/* System Status */}
        <SystemStatus isFocused={focusedComponent === "system"} highlightColor="border-cyan-500" />

        {/* Music Player */}
        <MusicPlayer isFocused={focusedComponent === "music"} highlightColor="border-cyan-500" />

        {/* Nearby POI */}
        <NearbyPOI isFocused={focusedComponent === "poi"} highlightColor="border-cyan-500" />

        {/* Sniper Scope */}
        <SniperScope />

        {/* Compass */}
        <Compass />

        {/* Subtitle Area for Speech Recognition */}
        <SubtitleArea />

        {/* Navigation Help */}
        <NavigationHelp />
      </div>

      {/* Debug info */}
      <div className="absolute bottom-1 left-1 text-[8px] text-gray-600">
        Debug:
        {[
          recognitionState.isInitialized ? "API initialized" : "API not initialized",
          recognitionState.isProcessing ? "Processing" : "Idle",
          recognitionState.hasPermission === null
            ? "Mic: Not requested"
            : recognitionState.hasPermission
              ? "Mic: Allowed"
              : "Mic: Denied",
          recognitionState.error ? `Error: ${recognitionState.error}` : "No errors",
          "Using: Web Speech API",
          `Lang: ${recognitionState.currentLanguage || "Not set"}`,
        ].join(" | ")}
      </div>
    </div>
  )
}
