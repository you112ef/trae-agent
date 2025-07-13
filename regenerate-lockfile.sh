#!/bin/bash

# Script to regenerate pnpm lockfile with correct version
echo "🔄 Regenerating pnpm lockfile..."

# Remove existing lockfile
rm -f pnpm-lock.yaml

# Install pnpm 9.0.0 globally if not available
if ! pnpm --version | grep -q "9.0.0"; then
    echo "📦 Installing pnpm 9.0.0..."
    npm install -g pnpm@9.0.0
fi

# Install dependencies to generate new lockfile
echo "📦 Installing dependencies..."
pnpm install

echo "✅ Lockfile regenerated successfully!"
echo "📝 New lockfile version: $(grep 'lockfileVersion' pnpm-lock.yaml)"