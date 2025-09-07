// Time synchronization utilities for global timer
// Ensures all users see the same time regardless of timezone or system clock differences

export interface TimeSyncData {
  serverTime: number
  clientTime: number
  offset: number
  latency: number
}

export class TimeSynchronizer {
  private offset: number = 0
  private latency: number = 0
  private lastSync: number = 0
  private syncInterval: NodeJS.Timeout | null = null

  constructor() {
    this.syncWithServer()
    // Sync every 30 seconds to account for clock drift
    this.syncInterval = setInterval(() => {
      this.syncWithServer()
    }, 30000)
  }

  private async syncWithServer(): Promise<void> {
    try {
      const startTime = Date.now()
      
      const response = await fetch('/api/timer', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to sync with server')
      }
      
      const data = await response.json()
      const endTime = Date.now()
      
      if (data.success && data.data) {
        const serverTime = data.data.serverTime
        const roundTripTime = endTime - startTime
        const estimatedLatency = roundTripTime / 2
        
        // Calculate offset: server time - (client time + latency)
        this.offset = serverTime - (endTime - estimatedLatency)
        this.latency = estimatedLatency
        this.lastSync = Date.now()
        
        console.log(`Time sync: offset=${this.offset}ms, latency=${this.latency}ms`)
      }
    } catch (error) {
      console.error('Time synchronization failed:', error)
    }
  }

  getSyncedTime(): number {
    return Date.now() + this.offset
  }

  getServerTime(): number {
    return this.getSyncedTime()
  }

  getOffset(): number {
    return this.offset
  }

  getLatency(): number {
    return this.latency
  }

  isSynced(): boolean {
    return this.lastSync > 0 && (Date.now() - this.lastSync) < 60000 // Consider synced if last sync was within 1 minute
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}

// Global time synchronizer instance
let timeSyncInstance: TimeSynchronizer | null = null

export function getTimeSynchronizer(): TimeSynchronizer {
  if (!timeSyncInstance) {
    timeSyncInstance = new TimeSynchronizer()
  }
  return timeSyncInstance
}

// Utility function to format time consistently across all clients
export function formatGlobalTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toISOString() // Always use UTC for consistency
}

// Utility function to get current global time
export function getCurrentGlobalTime(): number {
  const sync = getTimeSynchronizer()
  return sync.getSyncedTime()
}