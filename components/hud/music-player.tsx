"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, SkipForward, SkipBack, Music } from "lucide-react"
import { saveTrack, getCurrentTrack, getLastPlayedTracks } from "@/lib/db"

interface MusicPlayerProps {
  isFocused: boolean
  highlightColor: string
}

interface Track {
  name: string
  url: string
  file: File
}

export default function MusicPlayer({ isFocused, highlightColor }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [trackList, setTrackList] = useState<Track[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [lastPlayedIndex, setLastPlayedIndex] = useState(-1)
  const [fileSystemSupported, setFileSystemSupported] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Load saved tracks and current track from IndexedDB
  useEffect(() => {
    const loadSavedTracks = async () => {
      try {
        setIsLoading(true)

        // Get current track
        const currentTrackFromDB = await getCurrentTrack()

        // Get last played tracks
        const lastPlayedTracks = await getLastPlayedTracks()

        if (lastPlayedTracks.length > 0) {
          // Convert DB tracks to our Track format
          const loadedTracks: Track[] = lastPlayedTracks.map((dbTrack) => ({
            name: dbTrack.name,
            url: dbTrack.url,
            file: new File([], dbTrack.name), // Create a placeholder File object
          }))

          setTrackList(loadedTracks)

          // Set current track if available
          if (currentTrackFromDB) {
            const currentTrackIndex = loadedTracks.findIndex((track) => track.name === currentTrackFromDB.name)
            if (currentTrackIndex !== -1) {
              setSelectedIndex(currentTrackIndex)
              setCurrentTrack(loadedTracks[currentTrackIndex])
              setLastPlayedIndex(currentTrackIndex)
            }
          }
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error loading saved tracks:", error)
        setIsLoading(false)
      }
    }

    loadSavedTracks()
  }, [])

  // Check if File System Access API is supported
  useEffect(() => {
    setFileSystemSupported("showOpenFilePicker" in window)
  }, [])

  // Handle file selection using File System Access API
  const handleFileSelectUsingFileSystem = async () => {
    try {
      // Show file picker and allow multiple audio files
      const fileHandles = await window.showOpenFilePicker({
        multiple: true,
        types: [
          {
            description: "Audio Files",
            accept: {
              "audio/*": [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a"],
            },
          },
        ],
      })

      if (fileHandles.length > 0) {
        const newTracks: Track[] = []

        for (const fileHandle of fileHandles) {
          const file = await fileHandle.getFile()
          const track = {
            name: file.name,
            url: URL.createObjectURL(file),
            file,
          }
          newTracks.push(track)

          // Save track to IndexedDB
          await saveTrack({
            name: file.name,
            url: URL.createObjectURL(file),
            lastPlayed: new Date(),
            isCurrentTrack: false,
          })
        }

        setTrackList([...trackList, ...newTracks])

        // If no track is currently selected, select the first new one
        if (selectedIndex === -1) {
          setSelectedIndex(0)
          setCurrentTrack(newTracks[0])
          setLastPlayedIndex(0)

          // Save as current track in IndexedDB
          await saveTrack({
            name: newTracks[0].name,
            url: newTracks[0].url,
            lastPlayed: new Date(),
            isCurrentTrack: true,
          })

          // Auto-play when file is chosen
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch((err) => console.error("Error playing audio:", err))
            }
          }, 100)
        }
      }
    } catch (error) {
      console.error("Error selecting files:", error)
      // Fallback to traditional file input if there's an error
      if (fileInputRef.current) {
        fileInputRef.current.click()
      }
    }
  }

  // Handle file selection using traditional file input
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const newTracks = Array.from(files).map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
        file,
      }))

      // Save tracks to IndexedDB
      for (const track of newTracks) {
        await saveTrack({
          name: track.name,
          url: track.url,
          lastPlayed: new Date(),
          isCurrentTrack: false,
        })
      }

      setTrackList([...trackList, ...newTracks])

      // If no track is currently selected, select the first new one
      if (selectedIndex === -1) {
        setSelectedIndex(0)
        setCurrentTrack(newTracks[0])
        setLastPlayedIndex(0)

        // Save as current track in IndexedDB
        await saveTrack({
          name: newTracks[0].name,
          url: newTracks[0].url,
          lastPlayed: new Date(),
          isCurrentTrack: true,
        })

        // Auto-play when file is chosen
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current
              .play()
              .then(() => setIsPlaying(true))
              .catch((err) => console.error("Error playing audio:", err))
          }
        }, 100)
      }
    }
  }

  // Toggle play/pause
  const togglePlay = () => {
    if (!currentTrack) return

    if (isPlaying) {
      audioRef.current?.pause()
    } else {
      audioRef.current?.play().catch((err) => console.error("Error playing audio:", err))
    }

    setIsPlaying(!isPlaying)
  }

  // Handle next track
  const nextTrack = async () => {
    if (trackList.length === 0) return

    const nextIndex = (selectedIndex + 1) % trackList.length
    setSelectedIndex(nextIndex)
    setCurrentTrack(trackList[nextIndex])
    setLastPlayedIndex(nextIndex)
    setIsPlaying(true)

    // Save as current track in IndexedDB
    await saveTrack({
      name: trackList[nextIndex].name,
      url: trackList[nextIndex].url,
      lastPlayed: new Date(),
      isCurrentTrack: true,
    })
  }

  // Handle previous track
  const prevTrack = async () => {
    if (trackList.length === 0) return

    const prevIndex = selectedIndex <= 0 ? trackList.length - 1 : selectedIndex - 1
    setSelectedIndex(prevIndex)
    setCurrentTrack(trackList[prevIndex])
    setLastPlayedIndex(prevIndex)
    setIsPlaying(true)

    // Save as current track in IndexedDB
    await saveTrack({
      name: trackList[prevIndex].name,
      url: trackList[prevIndex].url,
      lastPlayed: new Date(),
      isCurrentTrack: true,
    })
  }

  // Open file selector
  const openFileSelector = () => {
    if (fileSystemSupported) {
      handleFileSelectUsingFileSystem()
    } else if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Select last played track
  const selectLastPlayedTrack = async () => {
    if (lastPlayedIndex >= 0 && lastPlayedIndex < trackList.length) {
      setSelectedIndex(lastPlayedIndex)
      setCurrentTrack(trackList[lastPlayedIndex])
      setIsPlaying(true)

      // Save as current track in IndexedDB
      await saveTrack({
        name: trackList[lastPlayedIndex].name,
        url: trackList[lastPlayedIndex].url,
        lastPlayed: new Date(),
        isCurrentTrack: true,
      })
    }
  }

  // Handle keyboard controls when focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFocused) return

      if (e.key === "Enter") {
        if (!currentTrack) {
          // If no track is selected, open file selector
          openFileSelector()
        } else {
          // If track is selected, toggle play/pause
          togglePlay()
        }
        e.preventDefault()
      } else if (e.key === "ArrowRight") {
        // Right arrow opens file selector
        openFileSelector()
        e.preventDefault()
      } else if (e.key === "ArrowUp") {
        // Up arrow selects last played track
        selectLastPlayedTrack()
        e.preventDefault()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isFocused, currentTrack, isPlaying, lastPlayedIndex])

  // Update audio element when track changes
  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.url
      if (isPlaying) {
        audioRef.current.play().catch((err) => console.error("Error playing audio:", err))
      }
    }
  }, [currentTrack, isPlaying])

  // Update time display
  useEffect(() => {
    const updateTime = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime)
        setDuration(audioRef.current.duration || 0)
      }
    }

    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Format time (seconds to MM:SS)
  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00"

    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)

    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current

    const handleEnded = () => {
      nextTrack()
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    if (audio) {
      audio.addEventListener("ended", handleEnded)
      audio.addEventListener("play", handlePlay)
      audio.addEventListener("pause", handlePause)
    }

    return () => {
      if (audio) {
        audio.removeEventListener("ended", handleEnded)
        audio.removeEventListener("play", handlePlay)
        audio.removeEventListener("pause", handlePause)
      }
    }
  }, [trackList, selectedIndex]) // Re-add event listeners when track list or selected index changes

  return (
    <div
      className={`component absolute right-4 top-16 bg-black/40 border ${isFocused ? highlightColor : "border-gray-800"} rounded-lg p-2 w-56`}
      tabIndex={0}
    >
      <h2 className="text-xs font-bold border-b border-gray-800 pb-0.5 mb-1 text-gray-500 flex items-center gap-1">
        <Music className="h-3 w-3" /> Music Player
        {isFocused && <span className="ml-auto text-[10px] text-gray-500">SELECTED</span>}
      </h2>

      <div className="flex flex-col gap-1">
        {/* Current track info */}
        <div className="text-center mb-1">
          <div className="text-sm truncate text-gray-400">
            {isLoading
              ? "Loading music..."
              : currentTrack
                ? currentTrack.name.replace(/\.[^/.]+$/, "")
                : "No track selected"}
          </div>
          <div className="text-[10px] text-gray-500">{trackList.length} tracks in library</div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[10px] text-gray-500">{formatTime(currentTime)}</span>
          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-600"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-gray-500">{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-3">
          <button
            onClick={prevTrack}
            className="text-gray-500 hover:text-gray-400 transition-colors"
            disabled={trackList.length === 0}
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            onClick={togglePlay}
            className="text-gray-400 hover:text-gray-300 transition-colors"
            disabled={!currentTrack}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>

          <button
            onClick={nextTrack}
            className="text-gray-500 hover:text-gray-400 transition-colors"
            disabled={trackList.length === 0}
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        {/* Instructions */}
        <div className="text-[10px] text-gray-500 text-center mt-1">
          {!currentTrack
            ? "Press Enter or → to select music files"
            : isPlaying
              ? "Press Enter to pause"
              : "Press Enter to play"}
          {trackList.length > 0 && " • Press ↑ for last played"}
        </div>
      </div>

      {/* Hidden file input (fallback) */}
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="audio/*" multiple className="hidden" />

      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />
    </div>
  )
}
