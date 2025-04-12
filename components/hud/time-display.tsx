"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock } from "lucide-react"

export default function TimeDisplay() {
  const [time, setTime] = useState("00:00")
  const [date, setDate] = useState("")

  // Update time and date
  useEffect(() => {
    const updateTimeAndDate = () => {
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, "0")
      const minutes = now.getMinutes().toString().padStart(2, "0")
      setTime(`${hours}:${minutes}`)

      const options = { weekday: "long", month: "long", day: "numeric" }
      setDate(now.toLocaleDateString("en-US", options))
    }

    updateTimeAndDate()
    const timer = setInterval(updateTimeAndDate, 1000)

    return () => clearInterval(timer)
  }, [])

  // Scale down font and icon sizes
  return (
    <div className="component absolute top-4 left-0 right-0 flex justify-center items-center">
      <div className="bg-black/50 border border-gray-700 px-3 py-0.5 rounded-full flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span className="text-sm text-gray-300">{time}</span>
        </div>
        <div className="h-3 w-px border-gray-700"></div>
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span className="text-xs text-gray-400">{date}</span>
        </div>
      </div>
    </div>
  )
}
