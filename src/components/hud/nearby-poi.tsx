"use client"

import { useState, useEffect, useCallback } from "react"
import { MapPin, Navigation } from "lucide-react"

interface NearbyPOIProps {
  isFocused: boolean
  highlightColor: string
}

export default function NearbyPOI({ isFocused, highlightColor }: NearbyPOIProps) {
  const [pois, setPois] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userLocation, setUserLocation] = useState({ lat: 0, lon: 0 })

  // Fetch nearby POIs from OpenStreetMap
  const fetchNearbyPOIs = useCallback(async (lat, lon) => {
    try {
      setLoading(true)
      // Overpass API query to get nearby POIs
      const radius = 1000 // 1km radius
      const query = `
        [out:json];
        (
          node["amenity"](around:${radius},${lat},${lon});
          node["tourism"](around:${radius},${lat},${lon});
          node["shop"](around:${radius},${lat},${lon});
          node["historic"](around:${radius},${lat},${lon});
        );
        out body;
        >;
        out skel qt;
      `

      const response = await fetch(`https://overpass-api.de/api/interpreter`, {
        method: "POST",
        body: query,
      })

      if (!response.ok) {
        throw new Error("Failed to fetch POIs")
      }

      const data = await response.json()

      // Process the POIs
      const processedPOIs = data.elements
        .filter(
          (element) =>
            element.tags &&
            (element.tags.name ||
              element.tags.amenity ||
              element.tags.tourism ||
              element.tags.shop ||
              element.tags.historic),
        )
        .map((element) => {
          // Calculate distance from user
          const distance = calculateDistance(lat, lon, element.lat, element.lon)

          return {
            id: element.id,
            name:
              element.tags.name ||
              element.tags.amenity ||
              element.tags.tourism ||
              element.tags.shop ||
              element.tags.historic,
            type:
              element.tags.amenity || element.tags.tourism || element.tags.shop || element.tags.historic || "unknown",
            lat: element.lat,
            lon: element.lon,
            distance: distance,
          }
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5) // Get only the 5 closest POIs

      setPois(processedPOIs)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching nearby POIs:", error)
      setError("Failed to load nearby points of interest")
      setLoading(false)

      // Set some fallback POIs for demonstration
      setPois([
        { id: 1, name: "Central Park", type: "park", distance: 0.5, lat: lat + 0.01, lon: lon + 0.01 },
        { id: 2, name: "Coffee Shop", type: "cafe", distance: 0.8, lat: lat - 0.01, lon: lon + 0.02 },
        { id: 3, name: "City Museum", type: "museum", distance: 1.2, lat: lat + 0.02, lon: lon - 0.01 },
        { id: 4, name: "Public Library", type: "library", distance: 1.5, lat: lat - 0.02, lon: lon - 0.02 },
        { id: 5, name: "Train Station", type: "station", distance: 1.7, lat: lat + 0.03, lon: lon + 0.03 },
      ])
    }
  }, [])

  // Calculate distance between two coordinates in kilometers
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c // Distance in km
    return Math.round(distance * 10) / 10 // Round to 1 decimal place
  }

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180)
  }

  // Get user's location and fetch POIs
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ lat: latitude, lon: longitude })
          fetchNearbyPOIs(latitude, longitude)
        },
        (error) => {
          console.error("Error getting user location:", error)
          setError("Location access denied. Using default location.")

          // Use default location (New York City)
          const defaultLat = 40.7128
          const defaultLon = -74.006
          setUserLocation({ lat: defaultLat, lon: defaultLon })
          fetchNearbyPOIs(defaultLat, defaultLon)
        },
      )
    } else {
      setError("Geolocation is not supported by this browser.")

      // Use default location
      const defaultLat = 40.7128
      const defaultLon = -74.006
      setUserLocation({ lat: defaultLat, lon: defaultLon })
      fetchNearbyPOIs(defaultLat, defaultLon)
    }
  }, [fetchNearbyPOIs])

  // Get bearing between two points
  const getBearing = (lat1, lon1, lat2, lon2) => {
    const y = Math.sin(deg2rad(lon2 - lon1)) * Math.cos(deg2rad(lat2))
    const x =
      Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
      Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(deg2rad(lon2 - lon1))
    const brng = Math.atan2(y, x)
    return ((brng * 180) / Math.PI + 360) % 360 // in degrees
  }

  // Get direction arrow based on bearing
  const getDirectionArrow = (bearing) => {
    // Convert bearing to one of 8 cardinal directions
    const directions = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"]
    const index = Math.round(bearing / 45) % 8
    return directions[index]
  }

  // Scale down font and icon sizes and update position
  return (
    <div
      className={`component absolute right-4 bottom-4 bg-black/40 border ${isFocused ? highlightColor : "border-gray-800"} rounded-lg p-2 w-56 ${isFocused ? "selected" : ""}`}
      tabIndex={0}
    >
      <h2 className="text-xs font-bold border-b border-gray-800 pb-0.5 mb-1 text-gray-500 flex items-center gap-1">
        <MapPin className="h-3 w-3" /> Nearby Points of Interest
        {isFocused && <span className="ml-auto text-[10px] text-gray-500">SELECTED</span>}
      </h2>

      {loading ? (
        <div className="text-xs text-gray-500 text-center py-2">Loading nearby locations...</div>
      ) : error ? (
        <div className="text-xs text-gray-500 text-center py-2">{error}</div>
      ) : (
        <div className="flex flex-col gap-1">
          {pois.map((poi) => {
            const bearing = getBearing(userLocation.lat, userLocation.lon, poi.lat, poi.lon)
            const directionArrow = getDirectionArrow(bearing)

            return (
              <div key={poi.id} className="bg-black/60 rounded p-1">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-400">{poi.name}</div>
                    <div className="text-[10px] text-gray-500">
                      {poi.type
                        .split("_")
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ")}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-xs text-cyan-500">{directionArrow}</div>
                    <div className="text-[10px] text-gray-500">{poi.distance} km</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="text-[10px] text-gray-500 text-center mt-1 flex items-center justify-center gap-1">
        <Navigation className="h-2.5 w-2.5" /> Based on your current location
      </div>
    </div>
  )
}

