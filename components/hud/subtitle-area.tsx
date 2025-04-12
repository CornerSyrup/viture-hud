"use client"

import { useState, useEffect } from "react"
import { MessageSquare, MicOff, Mic, Loader2, AlertTriangle, Pause, Play } from "lucide-react"
import { getSetting, subscribeToSettingsChanges } from "@/lib/db"
import { SPEECH_LANG_KEY } from "@/lib/speech-recognition-service"

// Define a fallback state interface in case the import fails
interface FallbackSpeechRecognitionState {
  isInitialized: boolean
  isListening: boolean
  hasPermission: boolean
  error: string | null
  transcript: string
  isProcessing: boolean
  isPaused: boolean
}

interface SubtitleAreaProps {
  text?: string
  isActive?: boolean
}

export default function SubtitleArea({ text, isActive = false }: SubtitleAreaProps) {
  const [subtitle, setSubtitle] = useState<string>(text || "")
  const [visible, setVisible] = useState<boolean>(false)
  const [demoMode, setDemoMode] = useState<boolean>(!text && !isActive)
  const [recognitionState, setRecognitionState] = useState<FallbackSpeechRecognitionState>({
    isInitialized: false,
    isListening: false,
    hasPermission: false,
    error: null,
    transcript: "",
    isProcessing: false,
    isPaused: false,
  })
  const [speechService, setSpeechService] = useState<any>(null)
  const [currentLanguage, setCurrentLanguage] = useState<string>("")

  // Initialize speech recognition on component mount
  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let unsubscribeSettings: (() => void) | undefined
    let service: any = null

    const setupSpeechService = async () => {
      try {
        // Load current language from IndexedDB
        const savedLanguage = await getSetting(SPEECH_LANG_KEY)
        if (savedLanguage) {
          setCurrentLanguage(savedLanguage)
        } else {
          setCurrentLanguage(navigator.language || "en-US")
        }

        // Subscribe to settings changes
        unsubscribeSettings = subscribeToSettingsChanges((key, value) => {
          if (key === SPEECH_LANG_KEY) {
            setCurrentLanguage(value)
          }
        })

        // Dynamically import the speech recognition service
        const speechModule = await import("@/lib/speech-recognition-service")
        service = speechModule.speechRecognitionService
        setSpeechService(service)

        unsubscribe = service.subscribe((state: any) => {
          setRecognitionState(state)

          if (state.transcript) {
            setDemoMode(false)
            setVisible(true)
            setSubtitle(state.transcript)
          } else if (state.error && state.error !== "No speech detected") {
            setDemoMode(false)
            setVisible(true)
            setSubtitle(`Error: ${state.error}`)

            // Hide the error message after 5 seconds
            const timer = setTimeout(() => {
              setVisible(false)
            }, 5000)

            return () => clearTimeout(timer)
          }

          // If microphone permission is denied, hide the subtitle area
          if (state.hasPermission === false && state.error) {
            setDemoMode(false)
            setVisible(true)
            setSubtitle(`Microphone access denied. Speech recognition disabled.`)

            // Hide the message after 5 seconds
            const timer = setTimeout(() => {
              setVisible(false)
            }, 5000)

            return () => clearTimeout(timer)
          }
        })

        // Initialize the speech service
        service.initialize().catch((error: any) => {
          console.error("Failed to initialize speech recognition:", error)
          setDemoMode(true) // Fall back to demo mode if initialization fails
        })
      } catch (error) {
        console.error("Error setting up speech recognition service:", error)
        setDemoMode(true) // Fall back to demo mode
        setSubtitle("Speech recognition not available in this environment")
        setVisible(true)

        // Hide the message after 5 seconds
        setTimeout(() => {
          setVisible(false)
        }, 5000)
      }
    }

    setupSpeechService()

    return () => {
      if (unsubscribe) unsubscribe()
      if (unsubscribeSettings) unsubscribeSettings()
      if (service) {
        try {
          service.cleanup()
        } catch (error) {
          console.error("Error cleaning up speech service:", error)
        }
      }
    }
  }, [])

  // Toggle speech recognition (pause/resume)
  const toggleSpeechRecognition = () => {
    if (speechService) {
      speechService.toggleListening()
    }
  }

  // Demo phrases for testing when no real recognition is available
  const demoPhrases = [
    "Welcome to the HUD interface",
    "Current weather conditions are optimal",
    "New point of interest detected nearby",
    "System status nominal",
    "Incoming transmission received",
    "Navigation system calibrated",
    "Voice recognition active",
  ]

  // If in demo mode, cycle through demo phrases
  useEffect(() => {
    if (!demoMode) return

    let timeout: NodeJS.Timeout
    let typingInterval: NodeJS.Timeout
    let currentPhrase = ""
    let currentIndex = 0
    let phraseIndex = 0
    let isTyping = false

    const startTypingAnimation = () => {
      isTyping = true
      currentPhrase = demoPhrases[phraseIndex]
      currentIndex = 0
      setSubtitle("")
      setVisible(true)

      typingInterval = setInterval(() => {
        if (currentIndex < currentPhrase.length) {
          setSubtitle((prev) => prev + currentPhrase.charAt(currentIndex))
          currentIndex++
        } else {
          clearInterval(typingInterval)
          isTyping = false

          // Schedule hiding the subtitle
          timeout = setTimeout(() => {
            setVisible(false)

            // Schedule showing the next subtitle
            timeout = setTimeout(() => {
              phraseIndex = (phraseIndex + 1) % demoPhrases.length
              startTypingAnimation()
            }, 2000)
          }, 3000)
        }
      }, 50)
    }

    // Start the demo
    startTypingAnimation()

    return () => {
      clearTimeout(timeout)
      clearInterval(typingInterval)
    }
  }, [demoMode])

  // Handle real subtitle updates from props
  useEffect(() => {
    if (demoMode) return

    if (text) {
      setSubtitle(text)
      setVisible(true)
    } else if (!recognitionState.transcript && !recognitionState.error) {
      setVisible(false)
    }
  }, [text, demoMode, recognitionState.transcript, recognitionState.error])

  // Handle active state changes from props
  useEffect(() => {
    if (demoMode) return
    if (!recognitionState.transcript && !recognitionState.error) {
      setVisible(isActive)
    }
  }, [isActive, demoMode, recognitionState.transcript, recognitionState.error])

  // If microphone permission is denied, don't show the subtitle area
  if (recognitionState.hasPermission === false && !recognitionState.isProcessing) {
    return null
  }

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
      {/* Status indicator with pause/resume button */}
      <div className="bg-black/60 border border-gray-800 rounded-full px-3 py-1 flex items-center gap-2">
        {recognitionState.isProcessing ? (
          <Loader2 className="h-4 w-4 text-cyan-500 animate-spin" />
        ) : recognitionState.error && recognitionState.error !== "No speech detected" ? (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        ) : recognitionState.isListening && !recognitionState.isPaused ? (
          <Mic className="h-4 w-4 text-green-500" />
        ) : (
          <MicOff className="h-4 w-4 text-gray-500" />
        )}
        <span className="text-xs text-gray-300">
          {recognitionState.isProcessing
            ? "Processing speech..."
            : recognitionState.error && recognitionState.error !== "No speech detected"
              ? "Speech recognition error"
              : recognitionState.isListening
                ? recognitionState.isPaused
                  ? "Speech recognition paused"
                  : `Listening...`
                : "Speech recognition inactive"}
        </span>

        {/* Pause/Resume button for debugging */}
        {recognitionState.isInitialized && (
          <button
            onClick={toggleSpeechRecognition}
            className="ml-2 bg-gray-800 hover:bg-gray-700 rounded-full p-1 transition-colors"
            title={
              recognitionState.isListening && !recognitionState.isPaused
                ? "Pause speech recognition"
                : "Resume speech recognition"
            }
          >
            {recognitionState.isListening && !recognitionState.isPaused ? (
              <Pause className="h-3 w-3 text-cyan-400" />
            ) : (
              <Play className="h-3 w-3 text-cyan-400" />
            )}
          </button>
        )}
      </div>

      {/* Subtitle display */}
      <div className={`transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
        <div className="bg-black/60 border border-gray-800 rounded-lg px-4 py-2 max-w-md">
          <div className="flex items-start gap-2">
            {recognitionState.isProcessing ? (
              <Loader2 className="h-4 w-4 text-cyan-500 mt-0.5 flex-shrink-0 animate-spin" />
            ) : recognitionState.error && recognitionState.error !== "No speech detected" ? (
              <MicOff className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            ) : (
              <MessageSquare className="h-4 w-4 text-cyan-500 mt-0.5 flex-shrink-0" />
            )}
            <p className="text-sm text-gray-300">{subtitle}</p>
          </div>

          {recognitionState.error && recognitionState.error !== "No speech detected" && (
            <div className="mt-1 text-xs text-red-400">{recognitionState.error}</div>
          )}
        </div>
      </div>
    </div>
  )
}
