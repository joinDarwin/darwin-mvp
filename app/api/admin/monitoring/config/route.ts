import { NextRequest, NextResponse } from 'next/server'
import { ProductionGlobalTimerService } from '@/lib/global-timer-service-prod'

const globalTimer = ProductionGlobalTimerService.getInstance()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Update monitoring configuration
    await globalTimer.updateMonitoringConfig(body)
    
    return NextResponse.json({
      success: true,
      message: 'Monitoring configuration updated successfully'
    })
  } catch (error) {
    console.error('Error updating monitoring config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update monitoring configuration' },
      { status: 500 }
    )
  }
}
