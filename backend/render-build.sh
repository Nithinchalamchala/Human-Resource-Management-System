#!/bin/bash
set -e

echo "🔧 Starting Render build process..."

echo "📦 Installing dependencies (including dev dependencies for build)..."
npm install --include=dev

echo "🏗️  Building TypeScript..."
npm run build

echo "📁 Copying migration files..."
mkdir -p dist/database/migrations
cp -r src/database/migrations/* dist/database/migrations/ 2>/dev/null || echo "No migration files to copy"

echo "🗄️  Running database migrations..."
npm run migrate:prod

echo "✅ Build complete!"
