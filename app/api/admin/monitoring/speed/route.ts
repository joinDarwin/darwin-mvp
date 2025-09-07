import { NextRequest, NextResponse } from 'next/server'
import { ProductionGlobalTimerService } from '@/lib/global-timer-service-prod'

const globalTimer = ProductionGlobalTimerService.getInstance()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode } = body
    
    if (!mode || !['conservative', 'balanced', 'aggressive', 'ultra'].includes(mode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid polling mode' },
        { status: 400 }
      )
    }
    
    // Set polling speed
    await globalTimer.setPollingSpeed(mode)
    
    return NextResponse.json({
      success: true,
      message: `Polling speed set to ${mode} mode`
    })
  } catch (error) {
    console.error('Error setting polling speed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to set polling speed' },
      { status: 500 }
    )
  }
}
