# Cannasol Nano Kava Landing Page - Makefile
# ============================================

.PHONY: help install preview dev build clean deploy

# Default target
help:
	@echo ""
	@echo "Cannasol Nano Kava Landing Page"
	@echo "================================"
	@echo ""
	@echo "Available targets:"
	@echo "  make install   - Install dependencies"
	@echo "  make preview   - Start dev server and open in browser"
	@echo "  make dev       - Start dev server (no auto-open)"
	@echo "  make build     - Build for production"
	@echo "  make clean     - Remove build artifacts and node_modules"
	@echo "  make deploy    - Build and prepare for deployment"
	@echo ""


claude-code:
	claude --allow-dangerously-skip-permissions

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install

# Start dev server and open browser
preview:
	@echo "Starting preview server..."
	@echo "Opening http://localhost:3000 in your browser..."
	npm run dev -- --open

# Start dev server without opening browser
dev:
	@echo "Starting development server..."
	npm run dev

# Build for production
build:
	@echo "Building for production..."
	npm run build
	@echo ""
	@echo "Build complete! Output in ./dist/"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist
	rm -rf node_modules
	rm -rf .vite
	@echo "Clean complete!"

# Build and prepare for deployment
deploy: build
	@echo ""
	@echo "Ready for deployment!"
	@echo "Upload the contents of ./dist/ to your hosting provider."
