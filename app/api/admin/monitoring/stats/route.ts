import { NextResponse } from 'next/server'
import { ProductionGlobalTimerService } from '@/lib/global-timer-service-prod'

const globalTimer = ProductionGlobalTimerService.getInstance()

export async function GET() {
  try {
    // Get monitoring stats from the timer service
    const stats = await globalTimer.getMonitoringStats()
    
    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error getting monitoring stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get monitoring stats' },
      { status: 500 }
    )
  }
}
