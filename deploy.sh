#!/bin/bash

# Deployment script for Trae Agent Web Interface on Cloudflare Pages
# Run this script to deploy your application to Cloudflare Pages

set -e

echo "🚀 Deploying Trae Agent to Cloudflare Pages..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if user is logged in
echo "📋 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please log in to Cloudflare:"
    wrangler login
fi

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Deploy to Cloudflare Pages
echo "🌐 Deploying to Cloudflare Pages..."
PROJECT_NAME="${1:-trae-agent-web}"

wrangler pages deploy public --project-name "$PROJECT_NAME"

echo "✅ Deployment complete!"
echo ""
echo "📱 Your Trae Agent web interface is now live!"
echo "🔗 Access it at: https://$PROJECT_NAME.pages.dev"
echo ""
echo "⚙️  Next steps:"
echo "   1. Visit the Cloudflare Dashboard to configure custom domains"
echo "   2. Set up environment variables if needed"
echo "   3. Test the interface with your LLM API keys"
echo ""
echo "📚 For detailed configuration, see: CLOUDFLARE_DEPLOYMENT.md"