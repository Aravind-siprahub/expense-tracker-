#!/bin/bash

# Clean script for StackWeave monorepo
# Safe cleanup that handles missing files gracefully

set +e  # Don't exit on errors

echo "🧹 Cleaning StackWeave..."

# Clean root-level build artifacts
echo "  → Cleaning root build artifacts..."
rm -rf .turbo .expo .next 2>/dev/null || true

# Clean root node_modules
echo "  → Cleaning root node_modules..."
rm -rf node_modules 2>/dev/null || true

# Clean workspace node_modules
echo "  → Cleaning workspace node_modules..."
find apps packages -maxdepth 2 -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# Clean native folders
echo "  → Cleaning native folders..."
rm -rf android ios 2>/dev/null || true
rm -rf apps/mobile/android apps/mobile/ios 2>/dev/null || true

# Clean build artifacts in workspaces
echo "  → Cleaning workspace build artifacts..."
find apps packages -maxdepth 2 -name ".turbo" -type d -exec rm -rf {} + 2>/dev/null || true
find apps packages -maxdepth 2 -name ".expo" -type d -exec rm -rf {} + 2>/dev/null || true
find apps packages -maxdepth 2 -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true
find apps packages -maxdepth 2 -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true

# Clean metro cache files
echo "  → Cleaning metro cache..."
find . -name ".metro-health-check*" -type f -delete 2>/dev/null || true

echo "✅ Clean complete!"
echo ""
echo "💡 Next steps:"
echo "   yarn install    # Reinstall dependencies"
echo "   yarn dev        # Start development"
