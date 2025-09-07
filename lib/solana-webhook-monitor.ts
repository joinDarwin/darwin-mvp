import { ProductionGlobalTimerService } from './global-timer-service-prod'

export interface TradeInfo {
  type: 'buy' | 'sell'
  amount: number
  dex: string
  signature: string
  timestamp: number
  price?: number
}

export interface WebhookMonitorConfig {
  tokenAddress: string
  webhookUrl: string
  heliusApiKey: string
  webhookSecret?: string
  isEnabled: boolean
}

export class SolanaWebhookMonitor {
  private config: WebhookMonitorConfig
  private onSwapDetected: ((tradeInfo: TradeInfo) => void) | null = null
  private lastTrade: TradeInfo | null = null
  private isMonitoring: boolean = false
  private webhookId: string | null = null

  constructor(config: WebhookMonitorConfig) {
    this.config = config
  }

  setSwapCallback(callback: (tradeInfo: TradeInfo) => void) {
    this.onSwapDetected = callback
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('⚠️ Webhook monitoring is already active')
      return
    }

    if (!this.config.isEnabled) {
      console.log('⚠️ Webhook monitoring is disabled in configuration')
      return
    }

    try {
      console.log('🚀 Starting Helius webhook monitoring...')
      console.log('📍 Monitoring token:', this.config.tokenAddress)
      console.log('🔗 Webhook URL:', this.config.webhookUrl)
      
      // Check if webhook already exists
      const existingWebhook = await this.findExistingWebhook()
      
      if (existingWebhook) {
        console.log('✅ Found existing webhook:', existingWebhook.webhookID)
        this.webhookId = existingWebhook.webhookID
      } else {
        // Create new webhook subscription
        await this.createWebhookSubscription()
      }
      
      this.isMonitoring = true
      console.log('✅ Webhook monitoring started successfully')
      
    } catch (error) {
      console.error('❌ Error starting webhook monitoring:', error)
      throw error
    }
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      console.log('⚠️ Webhook monitoring is not active')
      return
    }

    try {
      if (this.webhookId) {
        await this.deleteWebhookSubscription()
      }
      
      this.isMonitoring = false
      this.webhookId = null
      console.log('✅ Webhook monitoring stopped')
      
    } catch (error) {
      console.error('❌ Error stopping webhook monitoring:', error)
    }
  }

  private async findExistingWebhook(): Promise<{ webhookID: string; webhookURL: string } | null> {
    try {
      const response = await fetch(`https://api.helius.xyz/v0/webhooks?api-key=${this.config.heliusApiKey}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch webhooks: ${response.status} ${errorText}`)
      }

      const webhooks = await response.json()
      
      // First, try to find webhook by URL only (since accountAddresses might not be in list response)
      let existingWebhook = webhooks.find((webhook: any) => 
        webhook.webhookURL === this.config.webhookUrl
      )
      
      // If found by URL, verify it has the correct account addresses by fetching individual webhook details
      if (existingWebhook) {
        try {
          const detailResponse = await fetch(`https://api.helius.xyz/v0/webhooks/${existingWebhook.webhookID}?api-key=${this.config.heliusApiKey}`)
          if (detailResponse.ok) {
            const webhookDetails = await detailResponse.json()
            if (webhookDetails.accountAddresses?.includes(this.config.tokenAddress)) {
              console.log('✅ Found existing webhook with correct token address:', existingWebhook.webhookID)
              return existingWebhook
            } else {
              console.log('⚠️ Found webhook with correct URL but wrong token address, will create new one')
              existingWebhook = null
            }
          }
        } catch (detailError) {
          console.error('❌ Error fetching webhook details:', detailError)
          existingWebhook = null
        }
      }
      
      return existingWebhook || null
      
    } catch (error) {
      console.error('❌ Error finding existing webhook:', error)
      return null
    }
  }

  private async createWebhookSubscription(): Promise<void> {
    const webhookPayload = {
      webhookURL: this.config.webhookUrl,
      transactionTypes: ['Any'],
      accountAddresses: [this.config.tokenAddress],
      webhookType: 'enhanced',
      authHeader: this.config.webhookSecret ? `Bearer ${this.config.webhookSecret}` : undefined,
      txnStatus: 'all'
    }

    try {
      console.log('🔧 Creating new webhook subscription...')
      console.log('📋 Webhook payload:', {
        webhookURL: this.config.webhookUrl,
        accountAddresses: [this.config.tokenAddress],
        webhookType: 'enhanced',
        transactionTypes: ['Any']
      })

      const response = await fetch(`https://api.helius.xyz/v0/webhooks?api-key=${this.config.heliusApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create webhook: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      this.webhookId = result.webhookID
      
      console.log('✅ Webhook subscription created successfully:', {
        webhookId: this.webhookId,
        tokenAddress: this.config.tokenAddress,
        webhookUrl: this.config.webhookUrl
      })
      
    } catch (error) {
      console.error('❌ Error creating webhook subscription:', error)
      throw error
    }
  }

  private async deleteWebhookSubscription(): Promise<void> {
    if (!this.webhookId) return

    try {
      const response = await fetch(
        `https://api.helius.xyz/v0/webhooks/${this.webhookId}?api-key=${this.config.heliusApiKey}`,
        {
          method: 'DELETE'
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to delete webhook: ${response.status} ${errorText}`)
      }

      console.log('✅ Webhook subscription deleted:', this.webhookId)
      
    } catch (error) {
      console.error('❌ Error deleting webhook subscription:', error)
    }
  }

  async updateTokenAddress(newTokenAddress: string): Promise<void> {
    console.log(`🔄 Updating token address: ${this.config.tokenAddress} → ${newTokenAddress}`)
    
    const wasMonitoring = this.isMonitoring
    
    if (wasMonitoring) {
      await this.stopMonitoring()
    }
    
    this.config.tokenAddress = newTokenAddress
    
    if (wasMonitoring) {
      await this.startMonitoring()
    }
  }

  async getWebhookStatus(): Promise<{
    isActive: boolean
    webhookId: string | null
    tokenAddress: string
    webhookUrl: string
  }> {
    return {
      isActive: this.isMonitoring,
      webhookId: this.webhookId,
      tokenAddress: this.config.tokenAddress,
      webhookUrl: this.config.webhookUrl
    }
  }

  getLastTrade(): TradeInfo | null {
    return this.lastTrade
  }

  // Method to be called by the webhook endpoint when a trade is detected
  async processWebhookTrade(tradeInfo: TradeInfo): Promise<void> {
    console.log('🔔 Processing webhook trade:', tradeInfo)
    
    this.lastTrade = tradeInfo
    
    // Notify callback
    if (this.onSwapDetected) {
      this.onSwapDetected(tradeInfo)
    }
    
    // Reset global timer
    const timerService = ProductionGlobalTimerService.getInstance()
    await timerService.resetTimer()
  }

  // Health check method
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    isMonitoring: boolean
    webhookId: string | null
    lastTrade: TradeInfo | null
    config: WebhookMonitorConfig
  }> {
    return {
      status: this.isMonitoring ? 'healthy' : 'unhealthy',
      isMonitoring: this.isMonitoring,
      webhookId: this.webhookId,
      lastTrade: this.lastTrade,
      config: this.config
    }
  }

  // Cleanup method
  destroy(): void {
    if (this.isMonitoring) {
      this.stopMonitoring().catch(console.error)
    }
  }
}

// Factory function to create webhook monitor with environment configuration
export function createWebhookMonitor(): SolanaWebhookMonitor {
  const config: WebhookMonitorConfig = {
    tokenAddress: process.env.TOKEN_ADDRESS || '9VxExA1iRPbuLLdSJ2rB3nyBxsyLReT4aqzZBMaBaY1p',
    webhookUrl: process.env.HELIUS_WEBHOOK_URL || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhooks/helius`,
    heliusApiKey: process.env.HELIUS_API_KEY || '',
    webhookSecret: process.env.HELIUS_WEBHOOK_SECRET,
    isEnabled: process.env.HELIUS_WEBHOOK_ENABLED === 'true'
  }

  return new SolanaWebhookMonitor(config)
}
