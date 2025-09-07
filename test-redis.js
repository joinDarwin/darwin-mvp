#!/usr/bin/env node

// Simple Redis connection test
const Redis = require('ioredis');

// Load environment variables manually
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  try {
    const envContent = fs.readFileSync(filePath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    });
    
    return envVars;
  } catch (error) {
    return {};
  }
}

// Load .env.local
const envVars = loadEnvFile('.env.local');
Object.assign(process.env, envVars);

async function testRedisConnection() {
  console.log('🧪 Testing Redis Cloud connection...');
  
  if (!process.env.REDIS_URL) {
    console.error('❌ REDIS_URL not found in environment variables');
    console.log('📝 Please update your .env.local file with your Redis Cloud URL');
    process.exit(1);
  }

  try {
    const redis = new Redis(process.env.REDIS_URL);
    
    // Test basic connection
    const pong = await redis.ping();
    console.log('✅ Redis connection successful:', pong);
    
    // Test set/get
    await redis.set('test:connection', 'Hello Redis Cloud!');
    const value = await redis.get('test:connection');
    console.log('✅ Redis read/write test successful:', value);
    
    // Clean up test key
    await redis.del('test:connection');
    console.log('✅ Redis test completed successfully!');
    
    redis.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your Redis Cloud URL in .env.local');
    console.log('2. Make sure your Redis Cloud database is running');
    console.log('3. Verify your credentials are correct');
    process.exit(1);
  }
}

testRedisConnection();
