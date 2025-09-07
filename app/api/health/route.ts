import { NextResponse } from 'next/server'
import { ProductionGlobalTimerService } from '@/lib/global-timer-service-prod'

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: Date.now(),
    instanceId: process.env.INSTANCE_ID || 'unknown',
    services: {
      timer: await checkTimerService(),
      redis: await checkRedis(),
      solana: await checkSolanaRPC()
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      redisAvailable: !!process.env.REDIS_URL,
      heliusApiKey: !!process.env.HELIUS_API_KEY
    }
  }

  // Determine overall health status
  const allServicesHealthy = Object.values(health.services).every(service => service.status === 'healthy')
  health.status = allServicesHealthy ? 'healthy' : 'degraded'

  const statusCode = allServicesHealthy ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
}

async function checkTimerService() {
  try {
    const timerService = ProductionGlobalTimerService.getInstance()
    const state = await timerService.getCurrentState()
    
    return {
      status: 'healthy',
      timeLeft: Math.max(0, state.duration - (Date.now() - state.startTime)),
      isActive: state.isActive,
      lastReset: state.lastSwapTime
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkRedis() {
  try {
    // Try to import Redis to check if it's available
    const Redis = await import('ioredis').catch(() => null)
    
    if (!Redis || !process.env.REDIS_URL) {
      return {
        status: 'not_configured',
        message: 'Redis not configured, using in-memory storage'
      }
    }

    const redis = new Redis.default(process.env.REDIS_URL)
    await redis.ping()
    redis.disconnect()
    
    return {
      status: 'healthy',
      url: process.env.REDIS_URL.replace(/\/\/.*@/, '//***@') // Hide credentials
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkSolanaRPC() {
  try {
    const rpcUrl = process.env.HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com'
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth'
      }),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })

    if (response.ok) {
      return {
        status: 'healthy',
        endpoint: rpcUrl.replace(/api-key=.*/, 'api-key=***')
      }
    } else {
      return {
        status: 'unhealthy',
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}