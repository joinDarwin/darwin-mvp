import { NextRequest, NextResponse } from 'next/server'

// In-memory monitoring state (in production, use a database)
let monitoringState = {
  enabled: true
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: monitoringState
    })
  } catch (error) {
    console.error('Error fetching monitoring state:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch monitoring state'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (typeof body.enabled === 'boolean') {
      monitoringState.enabled = body.enabled
      
      // In production, you'd want to:
      // 1. Start/stop the Solana monitoring service
      // 2. Update the monitoring state in the database
      // 3. Notify connected clients about the change
      
      console.log('Monitoring state updated:', monitoringState)
      
      return NextResponse.json({
        success: true,
        data: monitoringState,
        message: `Monitoring ${body.enabled ? 'enabled' : 'disabled'} successfully`
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid enabled value'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating monitoring state:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update monitoring state'
    }, { status: 500 })
  }
}