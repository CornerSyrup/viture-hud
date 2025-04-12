import Dexie from "dexie"

// Define the database schema
export interface Settings {
  id?: number
  key: string
  value: string
}

export interface MusicTrack {
  id?: number
  name: string
  url: string
  lastPlayed: Date
  isCurrentTrack: boolean
}

// Create a Dexie database class
class HudDatabase extends Dexie {
  settings: Dexie.Table<Settings, number>
  musicTracks: Dexie.Table<MusicTrack, number>

  constructor() {
    super("hudDatabase")

    // Define tables and their primary keys and indexes
    this.version(1).stores({
      settings: "++id, key",
      musicTracks: "++id, name, lastPlayed, isCurrentTrack",
    })

    // Define typed tables
    this.settings = this.table("settings")
    this.musicTracks = this.table("musicTracks")
  }
}

// Create and export a database instance
export const db = new HudDatabase()

// Event system for database changes
type SettingsChangeListener = (key: string, value: string) => void
const settingsChangeListeners: SettingsChangeListener[] = []

// Subscribe to settings changes
export function subscribeToSettingsChanges(listener: SettingsChangeListener): () => void {
  settingsChangeListeners.push(listener)
  return () => {
    const index = settingsChangeListeners.indexOf(listener)
    if (index !== -1) {
      settingsChangeListeners.splice(index, 1)
    }
  }
}

// Notify listeners of settings changes
function notifySettingsChange(key: string, value: string) {
  settingsChangeListeners.forEach((listener) => listener(key, value))
}

// Helper functions for settings
export async function getSetting(key: string): Promise<string | null> {
  try {
    const setting = await db.settings.where("key").equals(key).first()
    return setting?.value ?? null
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error)
    return null
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  try {
    // Check if setting exists
    const existing = await db.settings.where("key").equals(key).first()

    if (existing) {
      // Update existing setting
      await db.settings.update(existing.id!, { value })
    } else {
      // Create new setting
      await db.settings.add({ key, value })
    }

    // Notify listeners of the change
    notifySettingsChange(key, value)
  } catch (error) {
    console.error(`Error setting ${key}:`, error)
  }
}

// Helper functions for music tracks
export async function saveTrack(track: Omit<MusicTrack, "id">): Promise<number> {
  try {
    // If this is the current track, unset any other current tracks
    if (track.isCurrentTrack) {
      await db.musicTracks.where("isCurrentTrack").equals(true).modify({ isCurrentTrack: false })
    }

    // Check if track with same name exists
    const existing = await db.musicTracks.where("name").equals(track.name).first()

    if (existing) {
      // Update existing track
      await db.musicTracks.update(existing.id!, {
        lastPlayed: track.lastPlayed,
        isCurrentTrack: track.isCurrentTrack,
      })
      return existing.id!
    } else {
      // Add new track
      return await db.musicTracks.add(track)
    }
  } catch (error) {
    console.error("Error saving track:", error)
    return -1
  }
}

export async function getCurrentTrack(): Promise<MusicTrack | undefined> {
  try {
    return await db.musicTracks.where("isCurrentTrack").equals(true).first()
  } catch (error) {
    console.error("Error getting current track:", error)
    return undefined
  }
}

export async function getLastPlayedTracks(limit = 10): Promise<MusicTrack[]> {
  try {
    return await db.musicTracks.orderBy("lastPlayed").reverse().limit(limit).toArray()
  } catch (error) {
    console.error("Error getting last played tracks:", error)
    return []
  }
}
