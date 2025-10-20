#!/bin/bash

# eInformation Hub Server Startup Script

echo "🚀 Starting eInformation Hub Server..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v16 or higher) first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Navigate to server directory
cd server

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found in server directory"
    exit 1
fi

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
else
    echo "✅ Dependencies already installed"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    if [ -f "env.example" ]; then
        cp env.example .env
        echo "✅ .env file created from template"
        echo "📝 Please edit .env file to add your Google Books API key (optional)"
    else
        echo "❌ env.example template not found"
        exit 1
    fi
else
    echo "✅ .env file found"
fi

echo ""
echo "🌍 Starting server on http://localhost:3001"
echo "📚 API endpoints available:"
echo "   - GET /health (health check)"
echo "   - GET /api/books/search?q={query}"
echo "   - GET /api/scholar/search?q={query}"
echo ""
echo "💡 To stop the server, press Ctrl+C"
echo ""

# Start the server
npm start

