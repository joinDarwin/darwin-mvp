import { NextRequest, NextResponse } from 'next/server'
import { ProductionGlobalTimerService } from '@/lib/global-timer-service-prod'

export async function GET(request: NextRequest) {
  try {
    const timerService = ProductionGlobalTimerService.getInstance()
    const stats = await timerService.getStats()
    
    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch admin statistics'
    }, { status: 500 })
  }
}