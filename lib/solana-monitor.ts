import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js'

// Get token address from environment or use default
const getTokenMintAddress = (): string => {
  return process.env.TOKEN_ADDRESS || '9VxExA1iRPbuLLdSJ2rB3nyBxsyLReT4aqzZBMaBaY1p'
}

const TOKEN_MINT_ADDRESS = getTokenMintAddress()

// Get Helius API key from environment variables
const getHeliusApiKey = (): string => {
  // Try client-side environment variable first (for browser usage)
  if (typeof window !== 'undefined' && (window as any).process?.env?.NEXT_PUBLIC_HELIUS_API_KEY) {
    return (window as any).process.env.NEXT_PUBLIC_HELIUS_API_KEY
  }
  // Try server-side environment variable
  if (typeof process !== 'undefined' && process.env.HELIUS_API_KEY) {
    return process.env.HELIUS_API_KEY
  }
  // Try server-side public environment variable
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
    return process.env.NEXT_PUBLIC_HELIUS_API_KEY
  }
  // Fallback to demo key if no API key is provided
  console.warn('⚠️ No Helius API key found, using demo key. Please set NEXT_PUBLIC_HELIUS_API_KEY in .env.local')
  return 'demo'
}

// Get the API key and log it for debugging
const heliusApiKey = getHeliusApiKey()
console.log('🔑 Helius API Key being used:', heliusApiKey === 'demo' ? 'DEMO (no API key found)' : `${heliusApiKey.substring(0, 8)}...`)

// Multiple RPC endpoints for better reliability
// Helius is prioritized as the primary endpoint due to its reliability and performance
const RPC_ENDPOINTS = [
  `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`, // Helius - Most reliable, trusted by major projects
  'https://api.mainnet-beta.solana.com', // Official Solana RPC
  'https://solana-api.projectserum.com', // Serum RPC
  'https://rpc.ankr.com/solana', // Ankr RPC
  'https://solana-mainnet.g.alchemy.com/v2/demo' // Alchemy RPC
]

let currentRpcIndex = 0

// Known DEX Program IDs on Solana
const DEX_PROGRAM_IDS = {
  RAYDIUM_AMM: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  RAYDIUM_CPMM: 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C',
  JUPITER_V6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  JUPITER_V4: 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
  ORCA_WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  SERUM_DEX: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  OPENBOOK: 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX',
  METEORA: 'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB',
  LIFINITY: 'LiFiDZ5VCEYF7QdM3gpn5h2cRcJCVTtZn4RUHhBY2Uy',
  ALDRIN: 'AMM55ShdkoGRB5jVYPjWJkYyQN6hB4Q3CEGQfeo7Ris',
  CREMA: '6MLxLqiXaaSUpkgMnWDTuejNZEz3kE7k2woyHGVFw319',
  STEPN: 'Dooar9JkhdZ7J3LHNH9fawoEWQyCJ6Uogp4v4eJp7fQm',
  SABER: 'SSwpkEEcfU9fz4L1vA1Lq6sWrP6Wm2pTzKWBz9eC6CN',
  MERCURIAL: 'MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky',
  CYKURA: 'cysPXAjehMpVKUapzbMCCnpFxUFFryEWEaLgnb9NrR8',
  INVARIANT: 'HyaB3W9q6XdA5xwpU4XnSZV94htfmbmqJXZcEbRaJutt',
  RAYDIUM_CLMM: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  RAYDIUM_CONCENTRATED: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK'
}

// Common trading instruction discriminators
const SWAP_INSTRUCTION_DISCRIMINATORS = [
  'swap', 'swapBaseIn', 'swapBaseOut', 'swapExactIn', 'swapExactOut',
  'swapV2', 'swapV3', 'swapV4', 'swapV6', 'route', 'routeV2',
  'executeSwap', 'swapExactTokensForTokens', 'swapTokensForExactTokens'
]

export interface TradeInfo {
  type: 'buy' | 'sell'
  amount: number
  dex: string
  signature: string
  timestamp: number
  price?: number
}

export class SolanaTokenSwapMonitor {
  private connection: Connection
  private tokenMintPubkey: PublicKey
  private lastCheckedSignature: string | null = null
  private onSwapDetected: ((tradeInfo: TradeInfo) => void) | null = null
  private lastTrade: TradeInfo | null = null
  private rpcIndex: number = 0
  private tokenMintAddress: string
  private isMonitoring: boolean = false
  private pollInterval: number = 60000 // Start with 60 seconds
  private consecutiveErrors: number = 0
  private lastSuccessfulCheck: number = 0
  private signatureCache: Set<string> = new Set()
  private maxCacheSize: number = 1000
  private webhookMode: boolean = false
  private webhookUrl: string = ''

  constructor(tokenMintAddress?: string) {
    this.tokenMintAddress = tokenMintAddress || TOKEN_MINT_ADDRESS
    this.connection = this.createConnection()
    this.tokenMintPubkey = new PublicKey(this.tokenMintAddress)
    
    // Check if webhook mode is enabled
    this.webhookMode = process.env.HELIUS_WEBHOOK_MODE === 'true'
    this.webhookUrl = process.env.HELIUS_WEBHOOK_URL || ''
  }

  private createConnection(): Connection {
    const rpcUrl = RPC_ENDPOINTS[this.rpcIndex]
    console.log(`🔗 Using RPC endpoint: ${rpcUrl}`)
    return new Connection(rpcUrl, 'confirmed')
  }

  private async switchRpcEndpoint(): Promise<void> {
    this.rpcIndex = (this.rpcIndex + 1) % RPC_ENDPOINTS.length
    console.log(`🔄 Switching to RPC endpoint: ${RPC_ENDPOINTS[this.rpcIndex]}`)
    this.connection = this.createConnection()
  }

  setSwapCallback(callback: (tradeInfo: TradeInfo) => void) {
    this.onSwapDetected = callback
  }

  updateTokenAddress(newTokenAddress: string) {
    console.log(`🔄 Updating token address: ${this.tokenMintAddress} → ${newTokenAddress}`)
    this.tokenMintAddress = newTokenAddress
    this.tokenMintPubkey = new PublicKey(newTokenAddress)
    this.lastCheckedSignature = null // Reset to check new token from beginning
    this.signatureCache.clear() // Clear cache for new token
  }

  stopMonitoring() {
    console.log('🛑 Stopping Solana token swap monitoring...')
    this.isMonitoring = false
  }

  setPollingSpeed(mode: 'conservative' | 'balanced' | 'aggressive' | 'ultra') {
    const intervals = {
      conservative: { min: 60000, max: 300000, start: 120000 }, // 1-5 min, start 2 min
      balanced: { min: 30000, max: 120000, start: 60000 },      // 30s-2 min, start 1 min  
      aggressive: { min: 15000, max: 60000, start: 30000 },     // 15s-1 min, start 30s
      ultra: { min: 10000, max: 30000, start: 15000 }           // 10s-30s, start 15s
    }
    
    const config = intervals[mode]
    this.pollInterval = config.start
    
    console.log(`⚡ Polling speed set to ${mode}:`)
    console.log(`   Start: ${config.start / 1000}s`)
    console.log(`   Range: ${config.min / 1000}s - ${config.max / 1000}s`)
    console.log(`   Estimated cost: ${this.estimateCostPerHour(config.min)} credits/hour`)
  }

  private estimateCostPerHour(minInterval: number): number {
    // Each poll makes 1 API call to get signatures + up to 3 calls to analyze transactions
    const callsPerPoll = 4 // 1 signature call + 3 transaction analysis calls
    const pollsPerHour = 3600000 / minInterval // 1 hour in ms / interval
    return Math.round(pollsPerHour * callsPerPoll)
  }

  private adjustPollingInterval() {
    const now = Date.now()
    const timeSinceLastSuccess = now - this.lastSuccessfulCheck
    const timeSinceLastTrade = this.lastTrade ? now - this.lastTrade.timestamp : Infinity
    
    // Get current mode bounds (default to balanced if not set)
    const mode = this.getCurrentMode()
    const bounds = this.getModeBounds(mode)
    
    if (this.consecutiveErrors > 3) {
      // Increase interval if many errors
      this.pollInterval = Math.min(this.pollInterval * 1.5, bounds.max)
      console.log(`⚠️ Increased polling interval to ${this.pollInterval / 1000}s due to errors`)
    } else if (this.consecutiveErrors === 0) {
      // Smart adjustment based on trading activity
      if (timeSinceLastTrade < 300000) { // Trade within last 5 minutes
        // High activity: Use faster polling
        this.pollInterval = Math.max(this.pollInterval * 0.7, bounds.min)
        console.log(`🔥 High activity detected! Decreased interval to ${this.pollInterval / 1000}s`)
      } else if (timeSinceLastTrade < 900000) { // Trade within last 15 minutes
        // Medium activity: Use moderate polling
        this.pollInterval = Math.max(this.pollInterval * 0.8, bounds.min)
        console.log(`📈 Medium activity detected! Decreased interval to ${this.pollInterval / 1000}s`)
      } else if (timeSinceLastSuccess > 600000) { // No activity for 10+ minutes
        // Low activity: Use slower polling
        this.pollInterval = Math.min(this.pollInterval * 1.2, bounds.max)
        console.log(`😴 Low activity detected! Increased interval to ${this.pollInterval / 1000}s`)
      }
    }
  }

  private getCurrentMode(): string {
    // Determine current mode based on current interval
    if (this.pollInterval <= 15000) return 'ultra'
    if (this.pollInterval <= 30000) return 'aggressive'
    if (this.pollInterval <= 60000) return 'balanced'
    return 'conservative'
  }

  private getModeBounds(mode: string) {
    const intervals = {
      conservative: { min: 60000, max: 300000 },
      balanced: { min: 30000, max: 120000 },
      aggressive: { min: 15000, max: 60000 },
      ultra: { min: 10000, max: 30000 }
    }
    return intervals[mode as keyof typeof intervals] || intervals.balanced
  }

  async startMonitoring() {
    console.log('🚀 Starting Solana token swap monitoring...')
    console.log('📍 Monitoring token mint:', this.tokenMintAddress)
    console.log('🔗 RPC URL:', RPC_ENDPOINTS[this.rpcIndex])
    
    this.isMonitoring = true
    
    if (this.webhookMode && this.webhookUrl) {
      console.log('🎣 Using webhook mode for real-time notifications')
      await this.setupWebhook()
    } else {
      console.log(`⏱️ Using polling mode with initial interval: ${this.pollInterval / 1000}s`)
      console.log('💡 To use webhook mode (much more efficient), set HELIUS_WEBHOOK_MODE=true and HELIUS_WEBHOOK_URL in .env.local')
    }
    
    try {
      // Skip account verification for now and start monitoring directly
      // The monitoring will work by analyzing transactions that involve our token mint
      console.log('✅ Starting transaction monitoring (skipping account verification)')

      // Start polling for new transactions (fallback if webhook fails)
      this.pollForNewTransactions()
    } catch (error) {
      console.error('❌ Error starting monitoring:', error)
      console.log('🔄 Attempting to switch RPC endpoint...')
      await this.switchRpcEndpoint()
      // Retry after switching
      setTimeout(() => this.startMonitoring(), 2000)
    }
  }

  private async setupWebhook() {
    try {
      const heliusApiKey = getHeliusApiKey()
      if (heliusApiKey === 'demo') {
        console.log('⚠️ Cannot setup webhook with demo API key')
        return
      }

      const webhookData = {
        webhookURL: this.webhookUrl,
        transactionTypes: ['Any'],
        accountAddresses: [this.tokenMintAddress],
        webhookType: 'enhanced'
      }

      const response = await fetch(`https://api.helius.xyz/v0/webhooks?api-key=${heliusApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Webhook setup successful:', result.webhookID)
        console.log('🎣 Real-time notifications enabled - no more polling needed!')
      } else {
        console.log('❌ Webhook setup failed, falling back to polling')
        this.webhookMode = false
      }
    } catch (error) {
      console.error('❌ Error setting up webhook:', error)
      console.log('🔄 Falling back to polling mode')
      this.webhookMode = false
    }
  }

  private async pollForNewTransactions() {
    if (!this.isMonitoring) {
      console.log('🛑 Monitoring stopped, exiting poll loop')
      return
    }

    try {
      console.log(`🔍 Polling for new transactions (interval: ${this.pollInterval / 1000}s)...`)
      
      // OPTIMIZED: Only check token mint directly, skip DEX programs
      const tokenMintPubkey = new PublicKey(this.tokenMintAddress)
      const tokenSignatures = await this.connection.getSignaturesForAddress(tokenMintPubkey, {
        limit: 5 // Reduced from 20 to 5
      })
      
      console.log(`📊 Found ${tokenSignatures.length} recent transactions for token`)
      
      if (tokenSignatures.length === 0) {
        console.log('📭 No recent transactions found')
        this.consecutiveErrors = 0
        this.lastSuccessfulCheck = Date.now()
        this.adjustPollingInterval()
        setTimeout(() => this.pollForNewTransactions(), this.pollInterval)
        return
      }

      // Check only new signatures (not in cache)
      const newSignatures = tokenSignatures
        .map(sig => sig.signature)
        .filter(sig => !this.signatureCache.has(sig))
        .slice(0, 3) // Only check 3 most recent new transactions

      console.log(`🔎 Checking ${newSignatures.length} new transactions`)

      let foundTrade = false
      for (const signature of newSignatures) {
        // Add to cache
        this.signatureCache.add(signature)
        if (this.signatureCache.size > this.maxCacheSize) {
          // Remove oldest entries
          const oldestEntries = Array.from(this.signatureCache).slice(0, 100)
          oldestEntries.forEach(entry => this.signatureCache.delete(entry))
        }

        try {
          const tradeInfo = await this.analyzeTransaction(signature)
          if (tradeInfo) {
            console.log('✅ Token trade detected!', tradeInfo)
            this.lastTrade = tradeInfo
            this.onSwapDetected?.(tradeInfo)
            foundTrade = true
            break // Only trigger once per polling cycle
          }
        } catch (txError) {
          console.log(`⚠️ Error analyzing transaction ${signature}:`, txError instanceof Error ? txError.message : String(txError))
          // Continue to next transaction
        }
      }

      // Update last checked signature
      if (tokenSignatures.length > 0) {
        this.lastCheckedSignature = tokenSignatures[0].signature
      }

      // Reset error counter on success
      this.consecutiveErrors = 0
      this.lastSuccessfulCheck = Date.now()
      
      // Adjust polling interval based on activity
      this.adjustPollingInterval()

    } catch (error) {
      console.error('❌ Error polling for transactions:', error)
      this.consecutiveErrors++
      
      // If it's a 403 or rate limit error, try switching RPC
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('403') || errorMessage.includes('rate limit') || errorMessage.includes('forbidden')) {
        console.log('🔄 RPC access issue detected, switching endpoint...')
        await this.switchRpcEndpoint()
      }
      
      // Adjust polling interval based on errors
      this.adjustPollingInterval()
    }

    // Continue polling with dynamic interval
    setTimeout(() => this.pollForNewTransactions(), this.pollInterval)
  }

  private async analyzeTransaction(signature: string): Promise<TradeInfo | null> {
    try {
      console.log(`🔍 Analyzing transaction: ${signature}`)
      const transaction = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0
      })

      if (!transaction || !transaction.meta || !transaction.transaction) {
        console.log('❌ Transaction not found or invalid')
        return null
      }

      // Check if transaction involves our token
      const preBalances = transaction.meta.preTokenBalances || []
      const postBalances = transaction.meta.postTokenBalances || []

      console.log(`📊 Pre-balances: ${preBalances.length}, Post-balances: ${postBalances.length}`)

      // Log all token balances for debugging
      console.log('📋 Pre-token balances:')
      preBalances.forEach((balance, i) => {
        console.log(`  ${i}: ${balance.mint} - ${balance.uiTokenAmount?.uiAmount || 0}`)
      })
      
      console.log('📋 Post-token balances:')
      postBalances.forEach((balance, i) => {
        console.log(`  ${i}: ${balance.mint} - ${balance.uiTokenAmount?.uiAmount || 0}`)
      })

      const hasOurToken = [...preBalances, ...postBalances].some(
        balance => balance.mint === this.tokenMintAddress
      )

      if (!hasOurToken) {
        console.log('❌ Transaction does not involve our token')
        console.log(`   Looking for: ${this.tokenMintAddress}`)
        return null
      }

      console.log('✅ Transaction involves our token')

      // Check if transaction involves known DEX programs
      const message = transaction.transaction.message
      
      // Debug: Check what type of objects we're dealing with
      console.log('🔍 Debug: First accountKey type:', typeof message.accountKeys[0])
      console.log('🔍 Debug: First accountKey value:', message.accountKeys[0])
      
      const programIds = message.accountKeys.map(key => {
        // Handle both PublicKey objects and string addresses
        if (typeof key === 'string') {
          return key
        } else if (key && typeof key.toString === 'function') {
          return key.toString()
        } else {
          return String(key)
        }
      })
      
      // Also check instruction program IDs
      const instructionProgramIds = message.instructions.map(ix => {
        if (typeof ix.programId === 'string') {
          return ix.programId
        } else if (ix.programId && typeof ix.programId.toString === 'function') {
          return ix.programId.toString()
        } else {
          return String(ix.programId)
        }
      })
      
      console.log(`🔧 Program IDs in transaction: ${programIds.length}`)
      console.log(`🔧 Instruction Program IDs: ${instructionProgramIds.length}`)
      
      // Log all program IDs for debugging
      console.log('📋 All program IDs in transaction:')
      programIds.forEach((programId, i) => {
        const programName = Object.entries(DEX_PROGRAM_IDS).find(([_, id]) => id === programId)?.[0] || 'Unknown'
        console.log(`  ${i}: ${programId} (${programName})`)
      })
      
      console.log('📋 All instruction program IDs:')
      instructionProgramIds.forEach((programId, i) => {
        const programName = Object.entries(DEX_PROGRAM_IDS).find(([_, id]) => id === programId)?.[0] || 'Unknown'
        console.log(`  ${i}: ${programId} (${programName})`)
      })
      
      // Check both account keys and instruction program IDs
      const allProgramIds = [...programIds, ...instructionProgramIds]
      const hasDexProgram = allProgramIds.some(programId => 
        Object.values(DEX_PROGRAM_IDS).includes(programId)
      )

      if (!hasDexProgram) {
        console.log('❌ Transaction does not involve known DEX programs')
        console.log('🔧 Available program IDs:', programIds)
        console.log('🔧 Known DEX program IDs:', Object.values(DEX_PROGRAM_IDS))
        return null
      }

      console.log('✅ Transaction involves known DEX program')

      // Analyze token balance changes to determine if it's a buy/sell
      const tokenBalanceChanges = this.calculateTokenBalanceChanges(preBalances, postBalances)
      const ourTokenChanges = tokenBalanceChanges.filter(change => change.mint === this.tokenMintAddress)
      
      console.log(`📈 Token balance changes: ${tokenBalanceChanges.length}`)
      console.log(`🎯 Our token changes: ${ourTokenChanges.length}`)
      
      if (ourTokenChanges.length === 0) {
        console.log('❌ No balance changes detected for our token')
        return null
      }

      console.log('📋 Our token balance changes:')
      ourTokenChanges.forEach((change, i) => {
        // CORRECTED: Invert the buy/sell labels to match the corrected logic
        const isBuy = change.change < 0
        console.log(`  ${i}: ${change.change > 0 ? '+' : ''}${change.change} (${isBuy ? 'BUY' : 'SELL'})`)
      })
      
      // Debug: Let's see all balance changes to understand the transaction better
      console.log('📋 ALL token balance changes in transaction:')
      const allTokenChanges = this.calculateTokenBalanceChanges(preBalances, postBalances)
      allTokenChanges.forEach((change, i) => {
        const isOurToken = change.mint === this.tokenMintAddress
        console.log(`  ${i}: ${change.mint} ${isOurToken ? '(OUR TOKEN)' : ''} - ${change.change > 0 ? '+' : ''}${change.change}`)
      })

      // Check if this is a genuine buy/sell transaction
      const tradeInfo = this.isBuyOrSellTransaction(transaction, ourTokenChanges, signature)
      
      if (tradeInfo) {
        console.log(`✅ Detected ${tradeInfo.type} transaction:`, {
          signature,
          amount: Math.abs(tradeInfo.amount),
          dex: tradeInfo.dex
        })
      } else {
        console.log('❌ Transaction is not a valid buy/sell')
      }

      return tradeInfo

    } catch (error) {
      console.error('❌ Error analyzing transaction:', error)
      return null
    }
  }

  private isBuyOrSellTransaction(
    transaction: ParsedTransactionWithMeta,
    ourTokenChanges: Array<{ mint: string; change: number }>,
    signature: string
  ): TradeInfo | null {
    try {
      const ourTokenChange = ourTokenChanges[0]
      const amount = Math.abs(ourTokenChange.change)
      
      // Determine if it's a buy or sell based on the change direction
      // CORRECTED LOGIC: The previous logic was inverted
      // Based on the screenshot evidence, we need to invert the detection:
      // - Positive change = SELL (user sent tokens to get SOL)
      // - Negative change = BUY (user received tokens by giving SOL)
      
      // But let's also consider the net effect of the entire transaction
      const netTokenChange = ourTokenChanges.reduce((sum, change) => sum + change.change, 0)
      console.log(`🔍 Net token change across all accounts: ${netTokenChange}`)
      
      // INVERTED LOGIC: Fix the buy/sell detection
      const isBuy = ourTokenChange.change < 0  // Negative change = BUY
      const type = isBuy ? 'buy' : 'sell'
      
      console.log(`🔍 Trade Analysis:`)
      console.log(`  Token change: ${ourTokenChange.change}`)
      console.log(`  Is buy: ${isBuy}`)
      console.log(`  Type: ${type}`)
      console.log(`  Amount: ${amount}`)
      console.log(`  Note: CORRECTED - Positive change = SELL (sent tokens), Negative change = BUY (received tokens)`)

      // Identify which DEX was used
      const message = transaction.transaction!.message
      const programIds = message.accountKeys.map(key => key.toString())
      
      let dex = 'Unknown'
      for (const [dexName, programId] of Object.entries(DEX_PROGRAM_IDS)) {
        if (programIds.includes(programId)) {
          dex = dexName
          break
        }
      }

      // Additional validation: check if transaction has swap-like characteristics
      const hasSwapCharacteristics = this.hasSwapCharacteristics(transaction)
      
      if (!hasSwapCharacteristics) {
        return null
      }

      // Only consider significant trades (avoid dust transactions)
      if (amount < 0.001) {
        return null
      }

      return { 
        type, 
        amount, 
        dex, 
        signature,
        timestamp: Date.now()
      }

    } catch (error) {
      console.error('Error determining buy/sell:', error)
      return null
    }
  }

  private hasSwapCharacteristics(transaction: ParsedTransactionWithMeta): boolean {
    try {
      // Check if transaction has multiple token accounts involved
      const preBalances = transaction.meta?.preTokenBalances || []
      const postBalances = transaction.meta?.postTokenBalances || []
      
      const uniqueTokens = new Set([
        ...preBalances.map(b => b.mint),
        ...postBalances.map(b => b.mint)
      ])

      // A swap typically involves at least 2 different tokens
      if (uniqueTokens.size < 2) {
        return false
      }

      // Check for swap-like instruction patterns
      const instructions = transaction.transaction?.message?.instructions || []
      
      // Look for instructions that might indicate swapping
      const hasSwapInstructions = instructions.some(instruction => {
        if ('programId' in instruction) {
          const programId = instruction.programId.toString()
          return Object.values(DEX_PROGRAM_IDS).includes(programId)
        }
        return false
      })

      return hasSwapInstructions

    } catch (error) {
      console.error('Error checking swap characteristics:', error)
      return false
    }
  }

  private calculateTokenBalanceChanges(
    preBalances: any[],
    postBalances: any[]
  ): Array<{ mint: string; change: number }> {
    const changes: Array<{ mint: string; change: number }> = []
    
    // Create maps for easier lookup
    const preMap = new Map<string, number>()
    const postMap = new Map<string, number>()

    preBalances.forEach(balance => {
      if (balance.mint) {
        preMap.set(balance.mint, balance.uiTokenAmount?.uiAmount || 0)
      }
    })

    postBalances.forEach(balance => {
      if (balance.mint) {
        postMap.set(balance.mint, balance.uiTokenAmount?.uiAmount || 0)
      }
    })

    // Calculate changes
    const allMints = new Set([...preMap.keys(), ...postMap.keys()])
    
    allMints.forEach(mint => {
      const preAmount = preMap.get(mint) || 0
      const postAmount = postMap.get(mint) || 0
      const change = postAmount - preAmount
      
      if (Math.abs(change) > 0.000001) { // Ignore tiny changes due to precision
        changes.push({ mint, change })
        console.log(`📊 Balance change for ${mint}: ${preAmount} → ${postAmount} (${change > 0 ? '+' : ''}${change})`)
      }
    })

    return changes
  }

  async getLastSwapTime(): Promise<number | null> {
    try {
      // First check if we have a recent trade in memory
      if (this.lastTrade && (Date.now() - this.lastTrade.timestamp) < 60000) { // Within last minute
        return this.lastTrade.timestamp
      }

      // Otherwise, check blockchain for recent trades using token program
      const tokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      const signatures = await this.connection.getSignaturesForAddress(tokenProgramId, {
        limit: 20
      })

      for (const sig of signatures) {
        const tradeInfo = await this.analyzeTransaction(sig.signature)
        if (tradeInfo) {
          return tradeInfo.timestamp
        }
      }

      return null
    } catch (error) {
      console.error('Error getting last swap time:', error)
      return null
    }
  }

  getLastTrade(): TradeInfo | null {
    return this.lastTrade
  }

  getCostStats() {
    const mode = this.getCurrentMode()
    const bounds = this.getModeBounds(mode)
    const currentCost = this.estimateCostPerHour(this.pollInterval)
    const maxCost = this.estimateCostPerHour(bounds.min)
    const minCost = this.estimateCostPerHour(bounds.max)
    
    return {
      mode,
      currentInterval: this.pollInterval / 1000,
      currentCost,
      minCost,
      maxCost,
      range: `${bounds.min / 1000}s - ${bounds.max / 1000}s`,
      lastTrade: this.lastTrade ? new Date(this.lastTrade.timestamp).toISOString() : null,
      consecutiveErrors: this.consecutiveErrors
    }
  }

  async getRecentTrades(limit: number = 5): Promise<TradeInfo[]> {
    try {
      // Get recent token program transactions
      const tokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      const signatures = await this.connection.getSignaturesForAddress(tokenProgramId, {
        limit: limit * 10
      })
      
      const trades: TradeInfo[] = []
      
      for (const sig of signatures) {
        const tradeInfo = await this.analyzeTransaction(sig.signature)
        if (tradeInfo) {
          trades.push(tradeInfo)
          if (trades.length >= limit) {
            break
          }
        }
      }

      return trades
    } catch (error) {
      console.error('Error getting recent trades:', error)
      return []
    }
  }

  // Debug method to analyze a specific transaction
  async debugSpecificTransaction(signature: string): Promise<void> {
    try {
      console.log(`🔍 DEBUG: Analyzing specific transaction...`)
      console.log(`📍 Transaction Signature: ${signature}`)
      console.log(`📍 Token Mint Address: ${this.tokenMintAddress}`)
      console.log(`🔗 RPC URL: ${RPC_ENDPOINTS[this.rpcIndex]}`)
      
      const tradeInfo = await this.analyzeTransaction(signature)
      if (tradeInfo) {
        console.log(`✅ TRADE DETECTED:`, tradeInfo)
        console.log(`🎯 This transaction SHOULD have reset the timer!`)
      } else {
        console.log(`❌ No trade detected`)
        console.log(`🤔 This transaction did NOT reset the timer`)
      }
    } catch (error) {
      console.error('❌ Error analyzing specific transaction:', error)
    }
  }

  // Debug method to manually check recent transactions
  async debugRecentTransactions(limit: number = 5): Promise<void> {
    try {
      console.log('🔍 DEBUG: Checking recent transactions...')
      console.log('📍 Token Mint Address:', this.tokenMintAddress)
      console.log('🔗 RPC URL:', RPC_ENDPOINTS[this.rpcIndex])
      
      // Skip account verification and proceed with transaction analysis
      console.log('✅ Skipping account verification, proceeding with transaction analysis')

      // Try direct token mint monitoring first, fallback to DEX monitoring
      const allSignatures: string[] = []
      
      try {
        console.log(`📊 Checking transactions for token mint: ${this.tokenMintAddress}`)
        const tokenMintPubkey = new PublicKey(this.tokenMintAddress)
        const tokenSignatures = await this.connection.getSignaturesForAddress(tokenMintPubkey, {
          limit: 10
        })
        console.log(`  Token Mint: ${tokenSignatures.length} recent transactions`)
        allSignatures.push(...tokenSignatures.map(sig => sig.signature))
      } catch (error) {
        console.log(`  Token Mint: Error fetching signatures - ${error instanceof Error ? error.message : String(error)}`)
        console.log('  Falling back to DEX program monitoring...')
        
        // Fallback: Check DEX programs
        console.log('📊 Checking DEX programs for swap transactions...')
        for (const [dexName, dexProgramId] of Object.entries(DEX_PROGRAM_IDS)) {
          try {
            const dexSignatures = await this.connection.getSignaturesForAddress(
              new PublicKey(dexProgramId), 
              { limit: 3 }
            )
            console.log(`  ${dexName}: ${dexSignatures.length} recent transactions`)
            allSignatures.push(...dexSignatures.map(sig => sig.signature))
          } catch (error) {
            console.log(`  ${dexName}: Error fetching signatures`)
          }
        }
      }

      // Remove duplicates
      const uniqueSignatures = [...new Set(allSignatures)]
      console.log(`📊 Total unique transactions to check: ${uniqueSignatures.length}`)
      
      if (uniqueSignatures.length === 0) {
        console.log('⚠️ No recent transactions found')
        console.log('💡 This could mean:')
        console.log('   - RPC endpoint might be having issues')
        console.log('   - Network connectivity problems')
        console.log('   - No recent DEX or token activity')
        return
      }
      
      let foundTrades = 0
      for (let i = 0; i < uniqueSignatures.length && foundTrades < limit; i++) {
        const signature = uniqueSignatures[i]
        console.log(`\n--- Transaction ${i + 1} ---`)
        console.log(`Signature: ${signature}`)
        
        // Analyze this transaction
        const tradeInfo = await this.analyzeTransaction(signature)
        if (tradeInfo) {
          console.log(`✅ TRADE DETECTED:`, tradeInfo)
          foundTrades++
        } else {
          console.log(`❌ No trade detected`)
        }
      }
    } catch (error) {
      console.error('❌ Error in debug check:', error)
    }
  }
}