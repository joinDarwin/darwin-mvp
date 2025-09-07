import { NextRequest } from 'next/server'
import { ProductionGlobalTimerService } from '@/lib/global-timer-service-prod'

const globalTimer = ProductionGlobalTimerService.getInstance()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId') || 'anonymous'

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let unsubscribe: (() => void) | null = null
      let pingInterval: NodeJS.Timeout | null = null
      
      try {
        // Send initial state
        const initialState = await globalTimer.getCurrentState()
        const initialData = `data: ${JSON.stringify({
          type: 'initial',
          data: initialState,
          clientId
        })}\n\n`
        controller.enqueue(encoder.encode(initialData))

        // Subscribe to timer updates
        unsubscribe = globalTimer.subscribe((state) => {
          const data = `data: ${JSON.stringify({
            type: 'update',
            data: state,
            clientId,
            timestamp: Date.now()
          })}\n\n`
          controller.enqueue(encoder.encode(data))
        })

        // Keep connection alive with periodic pings
        pingInterval = setInterval(() => {
          const ping = `data: ${JSON.stringify({
            type: 'ping',
            timestamp: Date.now()
          })}\n\n`
          controller.enqueue(encoder.encode(ping))
        }, 30000)

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          if (unsubscribe) {
            unsubscribe()
          }
          if (pingInterval) {
            clearInterval(pingInterval)
          }
          try {
            if (controller.desiredSize !== null) {
              controller.close()
            }
          } catch (error) {
            // Controller might already be closed, ignore the error
            console.log('Controller already closed or error closing:', error)
          }
        })
      } catch (error) {
        console.error('Error in WebSocket stream:', error)
        controller.error(error)
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}