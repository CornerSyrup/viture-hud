"use client"

import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"

interface NotificationCenterProps {
  isFocused: boolean
  highlightColor: string
}

export default function NotificationCenter({ isFocused, highlightColor }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState([])
  const [permissionStatus, setPermissionStatus] = useState("default")

  // Request notification permission
  const requestPermission = async () => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications")
      return
    }

    try {
      const permission = await Notification.requestPermission()
      setPermissionStatus(permission)
    } catch (error) {
      console.error("Error requesting notification permission:", error)
    }
  }

  // Get existing notifications - commented out PWA functionality but kept for reference
  const getNotifications = async () => {
    /*
    if (!("serviceWorker" in navigator)) {
      console.log("Service workers not supported")
      return
    }

    try {
      // Check if we have a service worker registration
      const registrations = await navigator.serviceWorker.getRegistrations()

      if (registrations.length > 0) {
        // Get notifications from the first registration
        const notifications = await registrations[0].getNotifications()
        setNotifications(
          notifications.map((notification) => ({
            id: Math.random().toString(36).substr(2, 9),
            title: notification.title,
            body: notification.body,
            timestamp: new Date(),
            icon: notification.icon,
          })),
        )
      }
    } catch (error) {
      console.error("Error getting notifications:", error)
    }
    */
  }

  // Initialize notification system
  useEffect(() => {
    // Check permission status
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission)
    }

    // Get existing notifications
    getNotifications()

    // Add some demo notifications for testing
    setNotifications([
      {
        id: "1",
        title: "System Update",
        body: "A new system update is available",
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        icon: null,
      },
      {
        id: "2",
        title: "Weather Alert",
        body: "Heavy rain expected in your area",
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        icon: null,
      },
    ])

    // Refresh notifications periodically
    const interval = setInterval(getNotifications, 30000) // every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Handle keyboard controls when focused
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isFocused) return

      if (e.key === "Enter") {
        requestPermission()
        e.preventDefault()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isFocused])

  // Format timestamp
  const formatTime = (timestamp) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()

    // Less than a minute
    if (diff < 60000) {
      return "Just now"
    }

    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000)
      return `${minutes}m ago`
    }

    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours}h ago`
    }

    // More than a day
    const days = Math.floor(diff / 86400000)
    return `${days}d ago`
  }

  // Remove a notification
  const removeNotification = (id) => {
    setNotifications(notifications.filter((notification) => notification.id !== id))
  }

  return (
    <div
      className={`component absolute right-4 bottom-4 bg-black/40 border ${isFocused ? highlightColor : "border-gray-800"} rounded-lg p-3 w-64 ${isFocused ? "selected" : ""}`}
      tabIndex={0}
    >
      <h2 className="text-sm font-bold border-b border-gray-800 pb-1 mb-2 text-gray-500 flex items-center gap-2">
        <Bell className="h-4 w-4" /> Notifications
        {isFocused && <span className="ml-auto text-xs text-gray-500">SELECTED</span>}
      </h2>

      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-3">No notifications</div>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id} className="bg-black/60 rounded p-2 flex gap-2 relative">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-400 truncate">{notification.title}</div>
                <div className="text-xs text-gray-500 line-clamp-2">{notification.body}</div>
                <div className="text-xs text-gray-500">{formatTime(notification.timestamp)}</div>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-400"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {permissionStatus !== "granted" && (
        <div className="text-xs text-gray-500 text-center mt-2">
          {permissionStatus === "default" ? "Press Enter to enable notifications" : "Notification permission denied"}
        </div>
      )}
    </div>
  )
}
