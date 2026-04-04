#!/bin/bash

# Deep clean script - removes everything including yarn cache
# Use this for a complete fresh start

set +e  # Don't exit on errors

echo "🗑️  Deep cleaning StackWeave (this will take a moment)..."

# Run normal clean first
./scripts/clean.sh

# Clean yarn cache
echo "  → Cleaning yarn cache..."
rm -rf .yarn/cache .yarn/install-state.gz .yarn/unplugged .yarn/build-state.yml 2>/dev/null || true
rm -f yarn.lock 2>/dev/null || true

# Clean TypeScript build info
echo "  → Cleaning TypeScript build info..."
find . -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true

echo "✅ Deep clean complete!"
echo ""
echo "💡 Next steps:"
echo "   yarn install    # Reinstall everything from scratch"
echo "   yarn dev        # Start development"
