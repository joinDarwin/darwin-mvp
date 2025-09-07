#!/usr/bin/env node

/**
 * Darwin Global Timer - Production Setup Script
 * 
 * This script helps you set up either:
 * 1. Simple Production (No Redis) - Easy setup, single instance
 * 2. Full Production (With Redis) - Scalable, multiple instances
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🚀 Darwin Global Timer - Production Setup\n');
  
  console.log('Choose your production setup:');
  console.log('1. Simple Production (No Redis) - Easy setup, single instance');
  console.log('2. Full Production (With Redis) - Scalable, multiple instances\n');
  
  const choice = await question('Enter your choice (1 or 2): ');
  
  if (choice === '1') {
    await setupSimpleProduction();
  } else if (choice === '2') {
    await setupFullProduction();
  } else {
    console.log('❌ Invalid choice. Please run the script again.');
    rl.close();
    return;
  }
  
  rl.close();
}

async function setupSimpleProduction() {
  console.log('\n📦 Setting up Simple Production (No Redis)...\n');
  
  // Get Helius API key
  const heliusKey = await question('Enter your Helius API key: ');
  
  // Create .env.production file
  const envContent = `# Simple Production Configuration
# No Redis needed - uses in-memory storage

# Required: Solana Configuration
HELIUS_API_KEY=${heliusKey}
NEXT_PUBLIC_HELIUS_API_KEY=${heliusKey}

# Token Configuration
TOKEN_ADDRESS=9VxExA1iRPbuLLdSJ2rB3nyBxsyLReT4aqzZBMaBaY1p

# Timer Configuration
TIMER_DEFAULT_DURATION=600000
TIMER_UPDATE_INTERVAL=1000

# Instance Configuration
INSTANCE_ID=simple-instance-1

# Environment
NODE_ENV=production
`;

  fs.writeFileSync('.env.production', envContent);
  
  console.log('✅ Created .env.production file');
  console.log('\n📋 Next steps:');
  console.log('1. Deploy to Vercel: npm i -g vercel && vercel --prod');
  console.log('2. Or deploy to any hosting platform');
  console.log('3. Set environment variables in your hosting platform');
  console.log('\n🎯 Your timer will work with in-memory storage (single instance)');
  console.log('📊 Monitor at: https://your-domain.com/admin');
  console.log('🏥 Health check: https://your-domain.com/api/health');
}

async function setupFullProduction() {
  console.log('\n🏗️ Setting up Full Production (With Redis)...\n');
  
  // Get configuration
  const heliusKey = await question('Enter your Helius API key: ');
  const redisUrl = await question('Enter your Redis URL (or press Enter for localhost): ') || 'redis://localhost:6379';
  const instanceId = await question('Enter instance ID (or press Enter for auto): ') || `instance-${Date.now()}`;
  
  // Create .env.production file
  const envContent = `# Full Production Configuration
# With Redis for shared state across instances

# Required: Solana Configuration
HELIUS_API_KEY=${heliusKey}
NEXT_PUBLIC_HELIUS_API_KEY=${heliusKey}

# Required: Redis Configuration
REDIS_URL=${redisUrl}
REDIS_KEY_PREFIX=darwin-timer-prod

# Token Configuration
TOKEN_ADDRESS=9VxExA1iRPbuLLdSJ2rB3nyBxsyLReT4aqzZBMaBaY1p

# Timer Configuration
TIMER_DEFAULT_DURATION=600000
TIMER_UPDATE_INTERVAL=1000
TIMER_MAX_INSTANCES=10

# Instance Configuration
INSTANCE_ID=${instanceId}

# Solana Configuration
SOLANA_POLLING_INTERVAL=3000

# Monitoring (Optional)
MONITORING_ENABLED=true
ALERT_WEBHOOK_URL=

# Redis TTL Settings
REDIS_TIMER_TTL=3600
REDIS_SETTINGS_TTL=86400
REDIS_EVENTS_TTL=604800

# Environment
NODE_ENV=production
`;

  fs.writeFileSync('.env.production', envContent);
  
  console.log('✅ Created .env.production file');
  console.log('\n📋 Next steps:');
  console.log('1. Make sure Redis is running and accessible');
  console.log('2. Deploy multiple instances to your hosting platform');
  console.log('3. Set up load balancer to distribute traffic');
  console.log('4. Configure monitoring and alerting');
  console.log('\n🎯 Your timer will work with Redis shared state (multiple instances)');
  console.log('📊 Monitor at: https://your-domain.com/admin');
  console.log('🏥 Health check: https://your-domain.com/api/health');
  console.log('📈 Metrics: https://your-domain.com/api/metrics');
  
  // Check if Redis is available locally
  if (redisUrl.includes('localhost')) {
    console.log('\n⚠️  Note: You specified localhost Redis. Make sure Redis is running:');
    console.log('   - Install: brew install redis (macOS) or apt install redis (Ubuntu)');
    console.log('   - Start: redis-server');
    console.log('   - Test: redis-cli ping');
  }
}

// Run the setup
main().catch(console.error);