// Production configuration and environment setup

export interface ProductionEnvironment {
  // Redis Configuration
  redis: {
    url: string
    keyPrefix: string
    ttl: {
      timerState: number
      settings: number
      events: number
    }
  }
  
  // Database Configuration
  database: {
    url: string
    ssl: boolean
  }
  
  // Solana Configuration
  solana: {
    rpcEndpoints: string[]
    apiKey: string
    pollingInterval: number
  }
  
  // Timer Configuration
  timer: {
    defaultDuration: number
    updateInterval: number
    maxInstances: number
  }
  
  // Monitoring Configuration
  monitoring: {
    enabled: boolean
    alertWebhook?: string
    metricsEndpoint?: string
  }
  
  // Security Configuration
  security: {
    adminSecret: string
    rateLimiting: {
      enabled: boolean
      maxRequests: number
      windowMs: number
    }
  }
}

export const getProductionConfig = (): ProductionEnvironment => {
  return {
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'darwin-timer',
      ttl: {
        timerState: parseInt(process.env.REDIS_TIMER_TTL || '3600'), // 1 hour
        settings: parseInt(process.env.REDIS_SETTINGS_TTL || '86400'), // 24 hours
        events: parseInt(process.env.REDIS_EVENTS_TTL || '604800') // 7 days
      }
    },
    
    database: {
      url: process.env.DATABASE_URL || 'postgresql://localhost:5432/darwin',
      ssl: process.env.NODE_ENV === 'production'
    },
    
    solana: {
      rpcEndpoints: (process.env.SOLANA_RPC_ENDPOINTS || '').split(',').filter(Boolean),
      apiKey: process.env.HELIUS_API_KEY || '',
      pollingInterval: parseInt(process.env.SOLANA_POLLING_INTERVAL || '3000')
    },
    
    timer: {
      defaultDuration: parseInt(process.env.TIMER_DEFAULT_DURATION || '600000'), // 10 minutes
      updateInterval: parseInt(process.env.TIMER_UPDATE_INTERVAL || '1000'), // 1 second
      maxInstances: parseInt(process.env.TIMER_MAX_INSTANCES || '10')
    },
    
    monitoring: {
      enabled: process.env.MONITORING_ENABLED === 'true',
      alertWebhook: process.env.ALERT_WEBHOOK_URL,
      metricsEndpoint: process.env.METRICS_ENDPOINT
    },
    
    security: {
      adminSecret: process.env.ADMIN_SECRET || 'change-this-in-production',
      rateLimiting: {
        enabled: process.env.RATE_LIMITING_ENABLED === 'true',
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000') // 1 minute
      }
    }
  }
}

// Environment validation
export const validateProductionConfig = (config: ProductionEnvironment): string[] => {
  const errors: string[] = []
  
  if (!config.redis.url) {
    errors.push('REDIS_URL is required')
  }
  
  if (!config.database.url) {
    errors.push('DATABASE_URL is required')
  }
  
  if (!config.solana.apiKey) {
    errors.push('HELIUS_API_KEY is required')
  }
  
  if (config.security.adminSecret === 'change-this-in-production') {
    errors.push('ADMIN_SECRET must be changed from default value')
  }
  
  return errors
}