"use client"

import { useState, useEffect, useRef } from "react"
import TimeDisplay from "./components/hud/time-display"
import WeatherWidget from "./components/hud/weather-widget"
import SystemStatus from "./components/hud/system-status"
import NavigationHelp from "./components/hud/navigation-help"
import MusicPlayer from "./components/hud/music-player"
import Compass from "./components/hud/compass"
import NearbyPOI from "./components/hud/nearby-poi"
import SniperScope from "./components/hud/sniper-scope"
import "./App.css"

export default function OpenWorldHUD() {
  // State for focus
  const [focusedComponent, setFocusedComponent] = useState("weather")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)

  const hudRef = useRef(null)

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
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
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("ServiceWorker registration successful with scope: ", registration.scope)
          })
          .catch((error) => {
            console.log("ServiceWorker registration failed: ", error)
          })
      })
    }

    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
    }

    // Listen for the beforeinstallprompt event
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
      console.log("HUD Interface was installed")
    })
  }, [])

  // Enter fullscreen on load
  useEffect(() => {
    const enterFullscreen = async () => {
      if (hudRef.current && !isFullscreen) {
        try {
          if (hudRef.current.requestFullscreen) {
            await hudRef.current.requestFullscreen()
            setIsFullscreen(true)
          } else if (hudRef.current.webkitRequestFullscreen) {
            await hudRef.current.webkitRequestFullscreen()
            setIsFullscreen(true)
          } else if (hudRef.current.msRequestFullscreen) {
            await hudRef.current.msRequestFullscreen()
            setIsFullscreen(true)
          }
        } catch (error) {
          console.error("Error entering fullscreen:", error)
        }
      }
    }

    // Try to enter fullscreen
    enterFullscreen()

    // Listen for fullscreen change events
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [isFullscreen])

  // Install the app
  const installApp = async () => {
    if (installPrompt) {
      // Show the install prompt
      installPrompt.prompt()

      // Wait for the user to respond to the prompt
      const { outcome } = await installPrompt.userChoice
      console.log(`User response to the install prompt: ${outcome}`)

      // Clear the saved prompt since it can't be used again
      setInstallPrompt(null)
    }
  }

  return (
    <div ref={hudRef} className="w-full h-screen bg-black text-gray-300 font-mono relative overflow-hidden">
      {/* Add global styles for selected elements */}
      <style>
        {`
        .component:focus, .component:focus-within, .component.selected {
          outline: none;
          border-color: #0ea5e9 !important;
        }
        .component *::selection {
          color: rgb(0 0 0 / 0.7);
          background: rgb(156 163 175 / var(--tw-text-opacity, 1));
        }
        `}
      </style>

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

        {/* Navigation Help */}
        <NavigationHelp />
      </div>
    </div>
  )
}

