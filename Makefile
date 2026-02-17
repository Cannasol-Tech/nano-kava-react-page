# Cannasol Nano Kava Landing Page - Makefile
# ============================================

.PHONY: help install preview preview-mushrooms preview-chrome preview-chrome-mushrooms dev build clean deploy

# Default target
help:
	@echo ""
	@echo "Cannasol Nano Kava Landing Page"
	@echo "================================"
	@echo ""
	@echo "Available targets:"
	@echo "  make install   - Install dependencies"
	@echo "  make preview   - Start dev server and open in default browser"
	@echo "  make preview-mushrooms - Start dev server and open /mushrooms in default browser"
	@echo "  make preview-chrome - Start dev server and open in Chrome"
	@echo "  make preview-chrome-mushrooms - Start dev server and open /mushrooms in Chrome"
	@echo "  make dev       - Start dev server (no auto-open)"
	@echo "  make build     - Build for production"
	@echo "  make clean     - Remove build artifacts and node_modules"
	@echo "  make deploy    - Build and prepare for deployment"
	@echo ""

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install

# Start dev server and open browser
preview:
	@echo "Starting preview server..."
	@echo "Opening http://localhost:3000 in your browser..."
	npm run dev -- --open

preview-mushrooms:
	@echo "Starting preview server..."
	@echo "Opening http://localhost:3000/mushrooms in your browser..."
	npm run dev -- --open /mushrooms

# Start dev server and open in Chrome specifically
preview-chrome:
	@echo "Starting preview server..."
	@echo "Opening http://localhost:3000 in Chrome..."
	@(npm run dev > /dev/null 2>&1 &) && sleep 2 && open -a "Google Chrome" http://localhost:3000

preview-chrome-mushrooms:
	@echo "Starting preview server..."
	@echo "Opening http://localhost:3000/mushrooms in Chrome..."
	@(npm run dev > /dev/null 2>&1 &) && sleep 2 && open -a "Google Chrome" http://localhost:3000/mushrooms

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
