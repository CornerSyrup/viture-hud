"use client"

import { useState, useEffect } from "react"

export default function Compass() {
  const [heading, setHeading] = useState(0)
  const [hasPermission, setHasPermission] = useState(false)

  // Initialize device orientation
  useEffect(() => {
    // Check if DeviceOrientationEvent is available
    if (typeof DeviceOrientationEvent !== "undefined") {
      // Request permission for iOS 13+ devices
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        DeviceOrientationEvent.requestPermission()
          .then((permissionState) => {
            if (permissionState === "granted") {
              setHasPermission(true)
              window.addEventListener("deviceorientation", handleOrientation)
            }
          })
          .catch(console.error)
      } else {
        // Permission not required for other devices
        setHasPermission(true)
        window.addEventListener("deviceorientation", handleOrientation)
      }
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation)
    }
  }, [])

  // Handle orientation change
  const handleOrientation = (event) => {
    // alpha is the compass direction (in degrees)
    if (event.alpha !== null) {
      setHeading(Math.round(event.alpha))
    }
  }

  // Get cardinal direction from heading
  const getCardinalDirection = () => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    const index = Math.round(heading / 45) % 8
    return directions[index]
  }

  // Scale down font and icon sizes
  return (
    <div className="component absolute bottom-20 left-1/2 -translate-x-1/2">
      <div className="bg-black/40 border border-gray-800 rounded-full px-2 py-0.5 flex items-center">
        <div className="text-gray-400 text-sm">
          {hasPermission ? `${heading}° ${getCardinalDirection()}` : "No compass"}
        </div>
      </div>
    </div>
  )
}

