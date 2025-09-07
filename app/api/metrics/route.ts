import { NextResponse } from 'next/server'
import { ProductionGlobalTimerService } from '@/lib/global-timer-service-prod'

export async function GET() {
  try {
    const timerService = ProductionGlobalTimerService.getInstance()
    const stats = await timerService.getStats()
    const events = await timerService.getRecentEvents(100)
    
    // Calculate metrics
    const metrics = {
      timestamp: Date.now(),
      instanceId: process.env.INSTANCE_ID || 'unknown',
      
      // Timer metrics
      timer: {
        isActive: stats.uptime > 0,
        uptime: stats.uptime,
        totalResets: stats.totalResets,
        lastReset: stats.lastReset,
        connectedClients: stats.connectedClients,
        activeInstances: stats.activeInstances
      },
      
      // System metrics
      system: {
        redisAvailable: stats.redisAvailable,
        nodeEnv: process.env.NODE_ENV,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      },
      
      // Event metrics
      events: {
        total: events.length,
        resets: events.filter(e => e.event === 'reset').length,
        recent: events.slice(0, 10).map(e => ({
          event: e.event,
          timestamp: e.timestamp,
          instanceId: e.instanceId
        }))
      },
      
      // Performance metrics
      performance: {
        avgResetInterval: calculateAverageResetInterval(events),
        resetFrequency: calculateResetFrequency(events),
        systemLoad: process.cpuUsage()
      }
    }
    
    return NextResponse.json(metrics)
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to collect metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 })
  }
}

function calculateAverageResetInterval(events: any[]): number {
  const resetEvents = events.filter(e => e.event === 'reset')
  if (resetEvents.length < 2) return 0
  
  const intervals = []
  for (let i = 1; i < resetEvents.length; i++) {
    intervals.push(resetEvents[i].timestamp - resetEvents[i - 1].timestamp)
  }
  
  return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
}

function calculateResetFrequency(events: any[]): number {
  const resetEvents = events.filter(e => e.event === 'reset')
  if (resetEvents.length === 0) return 0
  
  const now = Date.now()
  const oneHourAgo = now - (60 * 60 * 1000)
  const recentResets = resetEvents.filter(e => e.timestamp > oneHourAgo)
  
  return recentResets.length
}