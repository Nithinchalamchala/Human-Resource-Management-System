#!/bin/bash
set -e

echo "🔧 Starting Render build process..."

echo "📦 Installing dependencies..."
npm install

echo "🏗️  Building TypeScript..."
npm run build

echo "🗄️  Running database migrations..."
npm run migrate:prod

echo "✅ Build complete!"
