import { NextRequest, NextResponse } from 'next/server'
import { ProductionGlobalTimerService } from '@/lib/global-timer-service-prod'

const timerService = ProductionGlobalTimerService.getInstance()

export async function GET(request: NextRequest) {
  try {
    const settings = await timerService.getSettings()
    return NextResponse.json({
      success: true,
      data: settings
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch settings'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate settings
    const settings = {
      tokenAddress: body.tokenAddress || '9VxExA1iRPbuLLdSJ2rB3nyBxsyLReT4aqzZBMaBaY1p',
      timerDuration: body.timerDuration || 10,
      pollingInterval: body.pollingInterval || 3,
      isMonitoring: body.isMonitoring !== undefined ? body.isMonitoring : true
    }
    
    // Update settings in production service
    await timerService.updateSettings(settings)
    
    console.log('Settings updated:', settings)
    
    return NextResponse.json({
      success: true,
      data: settings,
      message: 'Settings updated successfully'
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update settings'
    }, { status: 500 })
  }
}