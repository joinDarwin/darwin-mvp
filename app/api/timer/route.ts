import { NextRequest, NextResponse } from 'next/server'
import { ProductionGlobalTimerService } from '@/lib/global-timer-service-prod'

const globalTimer = ProductionGlobalTimerService.getInstance()

export async function GET() {
  try {
    const state = await globalTimer.getCurrentState()
    return NextResponse.json({
      success: true,
      data: state
    })
  } catch (error) {
    console.error('Error getting timer state:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get timer state' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.action === 'reset') {
      await globalTimer.resetTimer()
      return NextResponse.json({
        success: true,
        message: 'Timer reset successfully',
        data: await globalTimer.getCurrentState()
      })
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error processing timer action:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process timer action' },
      { status: 500 }
    )
  }
}