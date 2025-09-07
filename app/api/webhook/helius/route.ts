import { NextRequest, NextResponse } from 'next/server'
import { ProductionGlobalTimerService } from '@/lib/global-timer-service-prod'

const globalTimer = ProductionGlobalTimerService.getInstance()

export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json()
    
    console.log('🎣 Received Helius webhook:', webhookData)
    
    // Check if this is a transaction involving our token
    if (webhookData.type === 'TRANSFER' || webhookData.type === 'SWAP') {
      console.log('✅ Token transaction detected via webhook')
      
      // Reset the timer
      await globalTimer.resetTimer()
      console.log('🔄 Timer reset via webhook notification')
      
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook processed successfully' 
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook received but no action needed' 
    })
    
  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}
