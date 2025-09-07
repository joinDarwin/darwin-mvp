// Server-side webhook initialization
// This runs when the server starts to set up webhook monitoring

import { createWebhookMonitor } from './solana-webhook-monitor'

let webhookMonitor: any = null

export async function initializeWebhookMonitoring() {
  try {
    // Only initialize if webhooks are enabled
    if (process.env.HELIUS_WEBHOOK_ENABLED === 'true' && process.env.HELIUS_API_KEY) {
      console.log('🚀 Initializing server-side webhook monitoring...')
      
      webhookMonitor = createWebhookMonitor()
      
      // Set up the callback to reset the global timer when trades are detected
      webhookMonitor.setSwapCallback(async (tradeInfo: any) => {
        console.log('🔔 Server-side webhook: Trade detected!', tradeInfo)
        
        // Import and reset the global timer
        const { ProductionGlobalTimerService } = await import('./global-timer-service-prod')
        const timerService = ProductionGlobalTimerService.getInstance()
        await timerService.resetTimer()
        
        console.log('✅ Timer reset via webhook trade detection')
      })
      
      // Start monitoring
      await webhookMonitor.startMonitoring()
      console.log('✅ Server-side webhook monitoring started successfully')
      
    } else {
      console.log('⚠️ Webhook monitoring disabled or missing API key')
    }
  } catch (error) {
    console.error('❌ Failed to initialize webhook monitoring:', error)
  }
}

export function getWebhookMonitor() {
  return webhookMonitor
}

// Auto-initialize when this module is imported
if (typeof window === 'undefined') {
  // Only run on server-side
  initializeWebhookMonitoring().catch(console.error)
}
