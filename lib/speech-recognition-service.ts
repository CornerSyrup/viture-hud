/**
 * Web Speech API Service for Real-Time Speech Recognition
 *
 * This service uses the browser's built-in Web Speech API for speech recognition.
 */

import { getSetting, setSetting, subscribeToSettingsChanges } from "./db"

// Constants for IndexedDB keys (using kebab-case)
export const SPEECH_LANG_KEY = "speech-recognition-language"
export const SPEECH_LISTENING_KEY = "speech-recognition-listening"

export interface SpeechRecognitionState {
  isInitialized: boolean
  isListening: boolean
  hasPermission: boolean
  error: string | null
  transcript: string
  isProcessing: boolean
  currentLanguage: string
  availableLanguages: Array<{ code: string; name: string }>
  isPaused: boolean
}

// Create a type for the SpeechRecognition API
interface SpeechRecognitionAPI extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: (event: any) => void
  onerror: (event: any) => void
  onend: () => void
  onstart: () => void
  onspeechstart: () => void
  onspeechend: () => void
  onnomatch: () => void
  onaudiostart: () => void
  onaudioend: () => void
}

// Get the correct Speech Recognition constructor
const SpeechRecognition =
  typeof window !== "undefined" ? window.SpeechRecognition || (window as any).webkitSpeechRecognition : null

class SpeechRecognitionService {
  private recognition: SpeechRecognitionAPI | null = null
  private listeners: ((state: SpeechRecognitionState) => void)[] = []
  private isInitializing = false
  private isSupported = false
  private availableLanguages: Array<{ code: string; name: string }> = []
  private unsubscribeFromSettings: (() => void) | null = null

  private state: SpeechRecognitionState = {
    isInitialized: false,
    isListening: false,
    hasPermission: false,
    error: null,
    transcript: "",
    isProcessing: false,
    currentLanguage: navigator.language || "en-US", // Default to browser language
    availableLanguages: [],
    isPaused: false,
  }

  constructor() {
    // Check if we're in a browser environment and if the API is supported
    if (typeof window !== "undefined") {
      this.checkSpeechRecognitionSupport()
      this.initializeLanguages()

      // Subscribe to settings changes
      this.unsubscribeFromSettings = subscribeToSettingsChanges(this.handleSettingsChange)
    } else {
      this.isSupported = false
    }
  }

  private handleSettingsChange = (key: string, value: string) => {
    // Handle settings changes
    if (key === SPEECH_LANG_KEY) {
      // Update the state
      this.state.currentLanguage = value

      // Update the recognition instance if it exists
      if (this.recognition) {
        this.recognition.lang = value

        // If we're currently listening and not paused, restart with the new language
        if (this.state.isListening && !this.state.isPaused) {
          try {
            this.recognition.stop()
            // The onend handler will restart it with the new language
          } catch (error) {
            console.error("Error stopping speech recognition for language change:", error)
          }
        } else if (this.state.isPaused) {
          // If we're paused, we need to make sure the next time we resume,
          // we'll use the new language by destroying the current instance
          this.recognition = null
        }
      }

      // Notify listeners of the state change
      this.updateState({
        currentLanguage: value,
      })
    }
  }

  private checkSpeechRecognitionSupport() {
    if (SpeechRecognition) {
      this.isSupported = true
    } else {
      console.error("Web Speech API is not supported in this browser")
      this.isSupported = false
      this.updateState({
        error: "Speech recognition is not supported in this browser",
      })
    }
  }

  private async initializeLanguages() {
    // Initialize with browser's preferred languages
    if (typeof navigator !== "undefined" && navigator.languages) {
      this.availableLanguages = navigator.languages.map((langCode) => {
        try {
          return {
            code: langCode,
            name: new Intl.DisplayNames([langCode], { type: "language" }).of(langCode),
          }
        } catch (error) {
          console.error(`Error getting display name for language ${langCode}:`, error)
          return {
            code: langCode,
            name: langCode,
          }
        }
      })
    }

    // Try to load saved language preference from IndexedDB
    try {
      const savedLanguage = await getSetting(SPEECH_LANG_KEY)
      if (savedLanguage) {
        this.state.currentLanguage = savedLanguage
      } else {
        // Set default language based on browser preference
        this.state.currentLanguage = navigator.language || "en-US"
        // Save this default to IndexedDB
        await setSetting(SPEECH_LANG_KEY, this.state.currentLanguage)
      }
    } catch (error) {
      console.error("Error loading language preference:", error)
      // Set default language based on browser preference
      this.state.currentLanguage = navigator.language || "en-US"
    }

    // Update state with available languages
    this.updateState({
      availableLanguages: this.availableLanguages,
      currentLanguage: this.state.currentLanguage,
    })
  }

  // Create a new SpeechRecognition instance
  private async createRecognitionInstance(): Promise<SpeechRecognitionAPI | null> {
    if (!SpeechRecognition) {
      return null
    }

    // Always get the latest language from IndexedDB
    try {
      const savedLanguage = await getSetting(SPEECH_LANG_KEY)
      if (savedLanguage) {
        this.state.currentLanguage = savedLanguage
      }
    } catch (error) {
      console.error("Error loading language from IndexedDB:", error)
    }

    const instance = new SpeechRecognition() as SpeechRecognitionAPI
    instance.continuous = true
    instance.interimResults = true
    instance.lang = this.state.currentLanguage

    // Set up event handlers
    this.setupEventHandlers(instance)

    return instance
  }

  // Initialize the service
  public async initialize(): Promise<void> {
    if (this.isInitializing || this.state.isInitialized) {
      return
    }

    this.isInitializing = true

    try {
      this.updateState({
        isProcessing: true,
      })

      // Check if the API is supported
      if (!this.isSupported) {
        await this.checkSpeechRecognitionSupport()

        if (!this.isSupported) {
          throw new Error("Web Speech API is not supported in this browser")
        }
      }

      // Create a new SpeechRecognition instance
      this.recognition = await this.createRecognitionInstance()

      if (!this.recognition) {
        throw new Error("Failed to create speech recognition instance")
      }

      // Check if we should be listening
      let shouldListen = true
      try {
        const listeningState = await getSetting(SPEECH_LISTENING_KEY)
        shouldListen = listeningState !== "false"
      } catch (error) {
        console.error("Error getting listening state:", error)
      }

      this.updateState({
        isInitialized: true,
        isProcessing: false,
      })

      // Start listening if we should
      if (shouldListen) {
        this.startListening()
      }

      this.isInitializing = false
    } catch (error: any) {
      console.error("Failed to initialize Web Speech API service:", error)
      this.updateState({
        error: `Initialization failed: ${error.message}`,
        isProcessing: false,
        isInitialized: false,
      })
      this.isInitializing = false
    }
  }

  // Set up event handlers for the SpeechRecognition instance
  private setupEventHandlers(instance: SpeechRecognitionAPI): void {
    if (!instance) return

    instance.onstart = () => {
      this.updateState({
        isListening: true,
        isProcessing: true,
        hasPermission: true,
        isPaused: false,
      })
    }

    instance.onresult = (event) => {
      // Clear any existing error when we get a result
      if (this.state.error) {
        this.updateState({
          error: null,
        })
      }

      let interimTranscript = ""
      let finalTranscript = ""

      // Loop through the results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript

        // If the result is final, add it to the final transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      // Update the state with the processed transcript
      this.updateState({
        transcript: finalTranscript || interimTranscript,
        isProcessing: false,
      })
    }

    instance.onerror = (event: any) => {
      console.error("Speech recognition error:", event)

      // Handle different error types
      switch (event.error) {
        case "not-allowed":
          this.updateState({
            hasPermission: false,
            error: "Microphone access denied",
            isListening: false,
            isProcessing: false,
          })
          break
        case "no-speech":
          // Don't show "No speech detected" error to the user
          this.updateState({
            isProcessing: false,
          })
          break
        case "aborted":
          // This happens when we stop recognition intentionally
          this.updateState({
            isProcessing: false,
          })
          break
        default:
          this.updateState({
            error: `Speech recognition error: ${event.error}`,
            isProcessing: false,
          })
          break
      }
    }

    instance.onend = () => {
      // If we're still supposed to be listening and not paused, restart
      if (this.state.isListening && !this.state.isPaused) {
        try {
          instance.start()
        } catch (error) {
          console.error("Error restarting speech recognition:", error)
          this.updateState({
            isListening: false,
            isProcessing: false,
            error: "Failed to restart speech recognition",
          })
        }
      } else if (this.state.isPaused) {
        // If paused, don't restart but keep isListening true
        this.updateState({
          isProcessing: false,
        })
      } else {
        // If we're fully stopped
        this.updateState({
          isListening: false,
          isProcessing: false,
        })
      }
    }

    instance.onaudiostart = () => {
      this.updateState({
        hasPermission: true,
      })
    }
  }

  // Change the recognition language
  public async setLanguage(languageCode: string): Promise<void> {
    // Save to IndexedDB first - this will trigger the settings change handler
    try {
      await setSetting(SPEECH_LANG_KEY, languageCode)
    } catch (error) {
      console.error("Error saving language preference:", error)
    }
  }

  // Start listening
  public async startListening(): Promise<void> {
    if (!this.state.isInitialized) {
      console.error("Cannot start listening: speech recognition not initialized")
      return
    }

    // If we're already listening and not paused, do nothing
    if (this.state.isListening && !this.state.isPaused) {
      return
    }

    try {
      // If we were paused, create a new recognition instance
      if (this.state.isPaused) {
        // Clean up the old instance first
        if (this.recognition) {
          this.recognition = null
        }

        // Create a new instance - this will load the latest language from IndexedDB
        this.recognition = await this.createRecognitionInstance()

        if (!this.recognition) {
          throw new Error("Failed to create speech recognition instance")
        }

        // Update state before starting
        this.updateState({
          isPaused: false,
          isProcessing: true,
        })

        // Start the new instance
        this.recognition.start()
      } else {
        // Normal start (not resuming from pause)
        if (!this.recognition) {
          this.recognition = await this.createRecognitionInstance()

          if (!this.recognition) {
            throw new Error("Failed to create speech recognition instance")
          }
        }

        this.recognition.start()
        this.updateState({
          isListening: true,
          error: null,
          isPaused: false,
        })
      }

      // Save listening state
      setSetting(SPEECH_LISTENING_KEY, "true").catch((error) => console.error("Error saving listening state:", error))
    } catch (error: any) {
      console.error("Failed to start speech recognition:", error)
      this.updateState({
        error: `Failed to start speech recognition: ${error.message}`,
      })
    }
  }

  // Toggle listening state
  public toggleListening(): void {
    if (this.state.isListening) {
      if (this.state.isPaused) {
        // If already paused, resume
        this.startListening()
      } else {
        // If not paused, pause
        this.pause()
      }
    } else {
      // If not listening at all, start
      this.startListening()
    }
  }

  // Pause recognition
  public pause(): void {
    if (!this.recognition || !this.state.isListening || this.state.isPaused) {
      return
    }

    try {
      // Stop the current recognition instance
      this.recognition.stop()

      // Update state to paused
      this.updateState({
        isPaused: true,
        isProcessing: false,
      })

      // We'll set recognition to null to ensure we create a fresh instance when resuming
      this.recognition = null
    } catch (error: any) {
      console.error("Error pausing speech recognition:", error)
    }
  }

  // Update the stop method to be more explicit about stopping
  public stop(): void {
    if (!this.recognition || !this.state.isListening) {
      return
    }

    try {
      // Stop the recognition
      this.recognition.stop()

      // Update state
      this.updateState({
        isListening: false,
        isProcessing: false,
        isPaused: false,
      })

      // Save listening state
      setSetting(SPEECH_LISTENING_KEY, "false").catch((error) => console.error("Error saving listening state:", error))
    } catch (error: any) {
      console.error("Error stopping speech recognition:", error)
    }
  }

  // Subscribe to state changes
  public subscribe(listener: (state: SpeechRecognitionState) => void): () => void {
    this.listeners.push(listener)
    // Immediately notify the new listener of the current state
    listener(this.state)

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  // Update the state and notify listeners
  private updateState(partialState: Partial<SpeechRecognitionState>): void {
    this.state = { ...this.state, ...partialState }
    this.notifyListeners()
  }

  // Notify all listeners of the current state
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state)
    }
  }

  // Clean up resources
  public cleanup(): void {
    this.stop()

    // Clean up recognition
    if (this.recognition) {
      this.recognition = null
    }

    // Unsubscribe from settings changes
    if (this.unsubscribeFromSettings) {
      this.unsubscribeFromSettings()
      this.unsubscribeFromSettings = null
    }
  }
}

// Create a singleton instance
export const speechRecognitionService = new SpeechRecognitionService()
