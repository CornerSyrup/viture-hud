"use client"

import { useState, useEffect, useCallback } from "react"
import { Cloud, Sun, Wind, Droplets, Snowflake, CloudRain, CloudLightning, CloudFog } from "lucide-react"

interface WeatherWidgetProps {
  isFocused: boolean
  highlightColor: string
}

export default function WeatherWidget({ isFocused, highlightColor }: WeatherWidgetProps) {
  // Weather data
  const [temperature, setTemperature] = useState(0)
  const [weather, setWeather] = useState("")
  const [location, setLocation] = useState("")
  const [humidity, setHumidity] = useState(0)
  const [windSpeed, setWindSpeed] = useState(0)
  const [forecast, setForecast] = useState([])
  const [weatherCode, setWeatherCode] = useState(0)

  // Fetch weather data from Open-Meteo API
  const fetchWeatherData = useCallback(async () => {
    try {
      // Default coordinates for New York City
      const latitude = 40.7128
      const longitude = -74.006

      // Try to get user's location if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const userLat = position.coords.latitude
            const userLon = position.coords.longitude
            await fetchOpenMeteoData(userLat, userLon)

            // Reverse geocoding to get location name
            try {
              const geoResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLon}`,
              )
              const geoData = await geoResponse.json()
              if (geoData.address) {
                const city =
                  geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.county
                const state = geoData.address.state
                setLocation(city ? (state ? `${city}, ${state}` : city) : "Current Location")
              }
            } catch (error) {
              console.error("Error fetching location name:", error)
              setLocation("Current Location")
            }
          },
          (error) => {
            console.error("Error getting user location:", error)
            // Fallback to default location
            fetchOpenMeteoData(latitude, longitude)
            setLocation("New York City")
          },
        )
      } else {
        // Geolocation not supported, use default
        fetchOpenMeteoData(latitude, longitude)
        setLocation("New York City")
      }
    } catch (error) {
      console.error("Error fetching weather data:", error)
      // Set fallback data
      setTemperature(22)
      setWeather("Partly Cloudy")
      setLocation("New York City")
      setHumidity(65)
      setWindSpeed(8)
      setWeatherCode(2)
      setForecast([
        { time: "Now", temp: 22, weatherCode: 2 },
        { time: "11 AM", temp: 24, weatherCode: 1 },
        { time: "12 PM", temp: 25, weatherCode: 1 },
        { time: "1 PM", temp: 24, weatherCode: 2 },
      ])
    }
  }, [])

  // Fetch data from Open-Meteo API
  const fetchOpenMeteoData = async (latitude, longitude) => {
    try {
      // Construct the Open-Meteo API URL with the required parameters - using Celsius
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&temperature_unit=celsius&wind_speed_unit=kmh&forecast_days=1`

      const response = await fetch(url)
      const data = await response.json()

      if (data.current && data.hourly) {
        // Current weather
        setTemperature(Math.round(data.current.temperature_2m))
        setHumidity(data.current.relative_humidity_2m)
        setWindSpeed(Math.round(data.current.wind_speed_10m))
        setWeatherCode(data.current.weather_code)
        setWeather(getWeatherDescription(data.current.weather_code))

        // Hourly forecast for next few hours
        const currentHour = new Date().getHours()
        const forecastData = []

        // Add current hour
        forecastData.push({
          time: "Now",
          temp: Math.round(data.current.temperature_2m),
          weatherCode: data.current.weather_code,
        })

        // Add next 3 hours
        for (let i = 1; i <= 3; i++) {
          const hourIndex = currentHour + i
          if (hourIndex < data.hourly.time.length) {
            const hourTime = new Date(data.hourly.time[hourIndex])
            forecastData.push({
              time: hourTime.getHours() + ":00",
              temp: Math.round(data.hourly.temperature_2m[hourIndex]),
              weatherCode: data.hourly.weather_code[hourIndex],
            })
          }
        }

        setForecast(forecastData)
      }
    } catch (error) {
      console.error("Error fetching from Open-Meteo:", error)
      throw error
    }
  }

  // Get weather description based on WMO weather code
  const getWeatherDescription = (code) => {
    // WMO Weather interpretation codes (WW)
    // https://open-meteo.com/en/docs
    const weatherCodes = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      56: "Light freezing drizzle",
      57: "Dense freezing drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      66: "Light freezing rain",
      67: "Heavy freezing rain",
      71: "Slight snow fall",
      73: "Moderate snow fall",
      75: "Heavy snow fall",
      77: "Snow grains",
      80: "Slight rain showers",
      81: "Moderate rain showers",
      82: "Violent rain showers",
      85: "Slight snow showers",
      86: "Heavy snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm with slight hail",
      99: "Thunderstorm with heavy hail",
    }

    return weatherCodes[code] || "Unknown"
  }

  // Fetch initial data and set up refresh interval
  useEffect(() => {
    fetchWeatherData()

    // Set up periodic refresh - every 30 minutes
    const weatherInterval = setInterval(fetchWeatherData, 1800000) // 30 minutes

    return () => clearInterval(weatherInterval)
  }, [fetchWeatherData])

  // Get weather icon based on WMO weather code
  const getWeatherIcon = (code) => {
    const iconColor = "text-gray-400"

    // Map WMO weather codes to appropriate icons
    if (code === 0) return <Sun className={iconColor} /> // Clear sky
    if (code === 1) return <Sun className={iconColor} /> // Mainly clear
    if (code >= 2 && code <= 3) return <Cloud className={iconColor} /> // Partly cloudy to overcast
    if (code >= 45 && code <= 48) return <CloudFog className={iconColor} /> // Fog
    if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82))
      return <CloudRain className={iconColor} /> // Drizzle and rain
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return <Snowflake className={iconColor} /> // Snow
    if (code >= 95 && code <= 99) return <CloudLightning className={iconColor} /> // Thunderstorm

    // Default icon
    return <Cloud className={iconColor} />
  }

  // Get small icon for forecast
  const getSmallWeatherIcon = (code) => {
    const iconColor = "text-gray-400"

    // Map WMO weather codes to appropriate icons
    if (code === 0) return <Sun className={`h-3 w-3 ${iconColor}`} /> // Clear sky
    if (code === 1) return <Sun className={`h-3 w-3 ${iconColor}`} /> // Mainly clear
    if (code >= 2 && code <= 3) return <Cloud className={`h-3 w-3 ${iconColor}`} /> // Partly cloudy to overcast
    if (code >= 45 && code <= 48) return <CloudFog className={`h-3 w-3 ${iconColor}`} /> // Fog
    if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82))
      return <CloudRain className={`h-3 w-3 ${iconColor}`} /> // Drizzle and rain
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86))
      return <Snowflake className={`h-3 w-3 ${iconColor}`} /> // Snow
    if (code >= 95 && code <= 99) return <CloudLightning className={`h-3 w-3 ${iconColor}`} /> // Thunderstorm

    // Default icon
    return <Cloud className={`h-3 w-3 ${iconColor}`} />
  }

  return (
    <div
      className={`component absolute left-4 top-16 bg-black/40 border ${isFocused ? highlightColor : "border-gray-800"} rounded-lg p-2 w-56 ${isFocused ? "selected" : ""}`}
      tabIndex={0}
    >
      <h2 className="text-xs font-bold border-b border-gray-800 pb-0.5 mb-1 text-gray-500 flex items-center gap-1">
        <Cloud className="h-3 w-3" /> Weather
        {isFocused && <span className="ml-auto text-[10px] text-gray-500">SELECTED</span>}
      </h2>

      <div className="flex items-center justify-between mb-1">
        <div className="flex flex-col">
          <span className="text-base text-gray-400">{temperature}°C</span>
          <span className="text-xs text-gray-500">{weather}</span>
          <span className="text-xs text-gray-500">{location}</span>
        </div>
        <div className="text-xl">{getWeatherIcon(weatherCode)}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-1">
        <div className="flex items-center gap-1">
          <Droplets className="h-3 w-3 text-gray-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500">Humidity</span>
            <span className="text-xs text-gray-400">{humidity}%</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Wind className="h-3 w-3 text-gray-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500">Wind</span>
            <span className="text-xs text-gray-400">{windSpeed} km/h</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 text-center">
        {forecast.map((item, index) => (
          <div key={index} className="flex flex-col items-center">
            <span className="text-[10px] text-gray-500">{item.time}</span>
            {getSmallWeatherIcon(item.weatherCode)}
            <span className="text-xs text-gray-400">{item.temp}°</span>
          </div>
        ))}
      </div>
    </div>
  )
}

