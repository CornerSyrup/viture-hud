"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { BatteryMedium, Wifi, HardDrive, Globe } from "lucide-react"
import { getSetting, subscribeToSettingsChanges } from "@/lib/db"
import { SPEECH_LANG_KEY } from "@/lib/speech-recognition-service"

interface SystemStatusProps {
  isFocused: boolean
  highlightColor: string
}

export default function SystemStatus({ isFocused, highlightColor }: SystemStatusProps) {
  // System status
  const [batteryLevel, setBatteryLevel] = useState(0)
  const [batteryCharging, setBatteryCharging] = useState(false)
  const [batteryTime, setBatteryTime] = useState(0)
  const [networkType, setNetworkType] = useState("WiFi")
  const [storageUsage, setStorageUsage] = useState({ used: 0, quota: 0 })
  const [languages, setLanguages] = useState<Array<{ code: string; name: string }>>([])
  const [currentLanguage, setCurrentLanguage] = useState("")
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)
  const [selectedLanguageIndex, setSelectedLanguageIndex] = useState(0)
  const [speechService, setSpeechService] = useState<any>(null)

  // Ref for scrolling to selected language
  const languageSelectorRef = useRef<HTMLDivElement>(null)
  const selectedLanguageRef = useRef<HTMLButtonElement>(null)

  // Fetch system status using navigator.getBattery() API
  const fetchSystemStatus = useCallback(async () => {
    try {
      // Storage information using navigator.storage.estimate()
      try {
        if (!!(navigator.storage && navigator.storage.estimate)) {
          const estimate = await navigator.storage.estimate()
          setStorageUsage({
            used: estimate.usage || 0,
            quota: estimate.quota || 0,
          })
        } else {
          // Fallback
          setStorageUsage({ used: 5000000000, quota: 10000000000 })
        }
      } catch (error) {
        console.error("Error getting storage estimate:", error)
        setStorageUsage({ used: 5000000000, quota: 10000000000 })
      }

      // Get battery information using the Battery API
      if (navigator.getBattery) {
        const battery = await navigator.getBattery()

        // Update battery information
        const updateBatteryInfo = () => {
          setBatteryLevel(Math.floor(battery.level * 100))
          setBatteryCharging(battery.charging)

          // Calculate remaining time
          if (battery.charging) {
            setBatteryTime(
              battery.chargingTime !== Number.POSITIVE_INFINITY ? Math.floor(battery.chargingTime / 60) : 0,
            )
          } else {
            setBatteryTime(
              battery.dischargingTime !== Number.POSITIVE_INFINITY ? Math.floor(battery.dischargingTime / 60) : 0,
            )
          }
        }

        // Initial update
        updateBatteryInfo()

        // Add event listeners for battery changes
        battery.addEventListener("levelchange", updateBatteryInfo)
        battery.addEventListener("chargingchange", updateBatteryInfo)
        battery.addEventListener("chargingtimechange", updateBatteryInfo)
        battery.addEventListener("dischargingtimechange", updateBatteryInfo)

        // Cleanup function
        return () => {
          battery.removeEventListener("levelchange", updateBatteryInfo)
          battery.removeEventListener("chargingchange", updateBatteryInfo)
          battery.removeEventListener("chargingtimechange", updateBatteryInfo)
          battery.removeEventListener("dischargingtimechange", updateBatteryInfo)
        }
      } else {
        // Fallback if Battery API is not available
        setBatteryLevel(65)
        setBatteryCharging(true)
        setBatteryTime(120)
      }

      // Network information
      if (navigator.onLine) {
        // Try to get connection type if available
        if (navigator.connection) {
          setNetworkType(navigator.connection.effectiveType || "WiFi")
        } else {
          setNetworkType("WiFi")
        }
      } else {
        setNetworkType("Offline")
      }
    } catch (error) {
      console.error("Error fetching system status:", error)

      // Fallback values
      setBatteryLevel(65)
      setBatteryCharging(true)
      setBatteryTime(120)
      setNetworkType("WiFi")
      setStorageUsage({ used: 5000000000, quota: 10000000000 })
    }
  }, [])

  // Initialize and fetch system status
  useEffect(() => {
    fetchSystemStatus()

    // Set up periodic refresh for system status
    const systemInterval = setInterval(fetchSystemStatus, 60000) // 1 minute

    // Listen for online/offline events
    const handleOnline = () => fetchSystemStatus()
    const handleOffline = () => fetchSystemStatus()

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      clearInterval(systemInterval)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [fetchSystemStatus])

  // Initialize speech recognition service and get available languages
  useEffect(() => {
    const initSpeechService = async () => {
      try {
        // Load the speech service
        const speechModule = await import("@/lib/speech-recognition-service")
        const service = speechModule.speechRecognitionService
        setSpeechService(service)

        // Subscribe to state updates from the speech service
        const unsubscribe = service.subscribe((state) => {
          setLanguages(state.availableLanguages)
        })

        // Load current language directly from IndexedDB
        const loadLanguage = async () => {
          const savedLanguage = await getSetting(SPEECH_LANG_KEY)
          if (savedLanguage) {
            setCurrentLanguage(savedLanguage)
          } else {
            setCurrentLanguage(navigator.language || "en-US")
          }
        }

        // Load language initially
        loadLanguage()

        // Subscribe to settings changes
        const unsubscribeSettings = subscribeToSettingsChanges((key, value) => {
          if (key === SPEECH_LANG_KEY) {
            setCurrentLanguage(value)
          }
        })

        return () => {
          if (unsubscribe) unsubscribe()
          if (unsubscribeSettings) unsubscribeSettings()
        }
      } catch (error) {
        console.error("Error setting up speech recognition service:", error)
        return () => {}
      }
    }

    const cleanup = initSpeechService()
    return () => {
      cleanup.then((unsubscribe) => {
        if (unsubscribe) unsubscribe()
      })
    }
  }, [])

  // Update selected language index when languages or current language changes
  useEffect(() => {
    if (languages.length > 0 && currentLanguage) {
      const index = languages.findIndex((lang) => lang.code === currentLanguage)
      if (index !== -1) {
        setSelectedLanguageIndex(index)
      }
    }
  }, [languages, currentLanguage])

  // Scroll selected language into view when language selector is shown
  useEffect(() => {
    if (showLanguageSelector && selectedLanguageRef.current && languageSelectorRef.current) {
      selectedLanguageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }, [showLanguageSelector, selectedLanguageIndex])

  // Handle language change
  const handleLanguageChange = async (languageCode: string) => {
    try {
      if (speechService) {
        // Let the speech service handle the language change and IndexedDB storage
        await speechService.setLanguage(languageCode)
        setShowLanguageSelector(false)
      }
    } catch (error) {
      console.error("Error changing language:", error)
    }
  }

  // Navigate through languages with keyboard
  const navigateLanguages = (direction: "next" | "prev") => {
    if (languages.length === 0) return

    if (direction === "next") {
      setSelectedLanguageIndex((prev) => (prev + 1) % languages.length)
    } else {
      setSelectedLanguageIndex((prev) => (prev - 1 + languages.length) % languages.length)
    }
  }

  // Select the currently highlighted language
  const selectCurrentLanguage = () => {
    if (languages.length > 0 && selectedLanguageIndex >= 0 && selectedLanguageIndex < languages.length) {
      handleLanguageChange(languages[selectedLanguageIndex].code)
    }
  }

  // Format battery time
  const formatBatteryTime = (minutes) => {
    if (minutes === 0) return "Unknown"
    if (minutes < 60) return `${minutes}m`

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (remainingMinutes === 0) return `${hours}h`
    return `${hours}h ${remainingMinutes}m`
  }

  // Format storage size
  const formatStorage = (bytes) => {
    if (bytes === 0) return "0 B"

    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))

    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  // Calculate storage percentage
  const getStoragePercentage = () => {
    if (storageUsage.quota === 0) return 0
    return Math.round((storageUsage.used / storageUsage.quota) * 100)
  }

  // Get language display name
  const getLanguageDisplayName = () => {
    const language = languages.find((lang) => lang.code === currentLanguage)
    return language ? language.name : currentLanguage
  }

  // Handle keyboard controls when focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFocused) return

      if (showLanguageSelector) {
        // Language selector is open - handle navigation
        switch (e.key) {
          case "ArrowUp":
          case "ArrowLeft":
            navigateLanguages("prev")
            e.preventDefault()
            e.stopPropagation() // Stop event propagation to prevent main navigation
            break
          case "ArrowDown":
          case "ArrowRight":
            navigateLanguages("next")
            e.preventDefault()
            e.stopPropagation() // Stop event propagation to prevent main navigation
            break
          case "Enter":
            selectCurrentLanguage()
            e.preventDefault()
            e.stopPropagation() // Stop event propagation
            break
          case "Escape":
            setShowLanguageSelector(false)
            e.preventDefault()
            e.stopPropagation() // Stop event propagation
            break
          default:
            break
        }
      } else {
        // Language selector is closed
        if (e.key === "Enter") {
          setShowLanguageSelector(true)
          e.preventDefault()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isFocused, showLanguageSelector, languages, selectedLanguageIndex])

  return (
    <div
      className={`component absolute left-4 bottom-4 bg-black/40 border ${isFocused ? highlightColor : "border-gray-800"} rounded-lg p-2 w-56 ${isFocused ? "selected" : ""}`}
      tabIndex={0}
    >
      <h2 className="text-xs font-bold border-b border-gray-800 pb-0.5 mb-1 text-gray-500 flex items-center gap-1">
        <BatteryMedium className="h-3 w-3" /> System Status
        {isFocused && <span className="ml-auto text-[10px] text-gray-500">SELECTED</span>}
      </h2>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-1">
          <BatteryMedium className="h-4 w-4 text-gray-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500">Battery</span>
            <span className="text-xs text-gray-400">
              {batteryLevel}% {batteryCharging ? "⚡" : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Wifi className="h-4 w-4 text-gray-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500">Network</span>
            <span className="text-xs text-gray-400">{networkType}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <HardDrive className="h-4 w-4 text-gray-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500">Storage</span>
            <span className="text-xs text-gray-400">{getStoragePercentage()}%</span>
          </div>
        </div>
      </div>

      <div className="mt-1 pt-1 border-t border-gray-800">
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-[10px] text-gray-500">{batteryCharging ? "Charging" : "Remaining"}</span>
          <span className="text-xs text-gray-400">{formatBatteryTime(batteryTime)}</span>
        </div>

        <div className="flex items-center gap-1">
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gray-600" style={{ width: `${batteryLevel}%` }}></div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-1 mb-0.5">
          <span className="text-[10px] text-gray-500">Storage</span>
          <span className="text-xs text-gray-400">
            {formatStorage(storageUsage.used)} / {formatStorage(storageUsage.quota)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gray-600" style={{ width: `${getStoragePercentage()}%` }}></div>
          </div>
        </div>

        {/* Language selector */}
        <div className="mt-1 pt-1 border-t border-gray-800">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Globe className="h-3 w-3 text-gray-500" />
              <span className="text-[10px] text-gray-500">Language</span>
            </div>
            <button
              onClick={() => setShowLanguageSelector(!showLanguageSelector)}
              className="text-xs text-gray-400 hover:text-cyan-400 transition-colors"
            >
              {getLanguageDisplayName()}
            </button>
          </div>

          {/* Language dropdown with hidden scrollbar */}
          {showLanguageSelector && (
            <div
              ref={languageSelectorRef}
              className="mt-1 bg-black/80 border border-gray-700 rounded max-h-24 overflow-y-auto hide-scrollbar"
            >
              {languages.map((language, index) => (
                <button
                  key={language.code}
                  ref={index === selectedLanguageIndex ? selectedLanguageRef : null}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`w-full text-left px-2 py-0.5 text-xs hover:bg-gray-800 transition-colors ${
                    index === selectedLanguageIndex ? "bg-gray-800 text-cyan-400" : "text-gray-400"
                  }`}
                >
                  {language.name}
                </button>
              ))}
            </div>
          )}

          {isFocused && (
            <div className="mt-1 text-[10px] text-gray-500 text-center">
              {showLanguageSelector ? "↑↓ Navigate • Enter to select • Esc to close" : "Press Enter to change language"}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
