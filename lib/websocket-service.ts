export interface TimerSyncMessage {
  type: 'initial' | 'update' | 'timer_reset' | 'ping'
  timestamp: number
  data?: any
  clientId?: string
  timeLeft?: number
  lastSwapTime?: number
}

export class WebSocketService {
  private eventSource: EventSource | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private onMessage: ((message: TimerSyncMessage) => void) | null = null
  private clientId: string

  constructor() {
    this.clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.connect()
  }

  setMessageHandler(handler: (message: TimerSyncMessage) => void) {
    this.onMessage = handler
  }

  private connect() {
    try {
      const url = `/api/timer/websocket?clientId=${this.clientId}`
      this.eventSource = new EventSource(url)

      this.eventSource.onopen = () => {
        console.log('Connected to global timer service')
        this.reconnectAttempts = 0
      }

      this.eventSource.onmessage = (event) => {
        try {
          const message: TimerSyncMessage = JSON.parse(event.data)
          this.onMessage?.(message)
        } catch (error) {
          console.error('Error parsing message:', error)
        }
      }

      this.eventSource.onerror = (error) => {
        console.error('EventSource error:', error)
        this.handleReconnect()
      }

    } catch (error) {
      console.error('WebSocket connection failed:', error)
      this.handleReconnect()
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        this.connect()
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  async sendTimerReset() {
    try {
      const response = await fetch('/api/timer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reset' })
      })
      
      if (!response.ok) {
        throw new Error('Failed to reset timer')
      }
      
      console.log('Timer reset sent to server')
    } catch (error) {
      console.error('Error sending timer reset:', error)
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }
}

// Singleton instance
let wsServiceInstance: WebSocketService | null = null

export function getWebSocketService(): WebSocketService {
  if (!wsServiceInstance) {
    wsServiceInstance = new WebSocketService()
  }
  return wsServiceInstance
}