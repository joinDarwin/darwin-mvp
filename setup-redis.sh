#!/bin/bash

echo "🚀 Setting up Redis for Darwin Global Timer..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon Macs
    if [[ $(uname -m) == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
fi

# Install Redis
echo "📦 Installing Redis..."
brew install redis

# Start Redis service
echo "🔄 Starting Redis service..."
brew services start redis

# Test Redis connection
echo "🧪 Testing Redis connection..."
redis-cli ping

if [ $? -eq 0 ]; then
    echo "✅ Redis is running successfully!"
    echo "🌐 Redis URL: redis://localhost:6379"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Make sure your .env.local file has REDIS_URL=redis://localhost:6379"
    echo "2. Restart your Next.js development server"
    echo "3. Test the global timer - it should now persist across refreshes!"
else
    echo "❌ Redis connection failed. Please check the installation."
fi
