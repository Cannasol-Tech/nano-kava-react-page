# Cannasol Nano Kava Landing Page - Makefile
# ============================================

.PHONY: help install install-functions preview preview-mushrooms preview-chrome preview-chrome-mushrooms dev build clean deploy deploy-all deploy-functions kb seo-assets seo-indexnow claude-code

# Default target
help:
	@echo ""
	@echo "Cannasol Nano Kava Landing Page"
	@echo "================================"
	@echo ""
	@echo "Available targets:"
	@echo "  make install   - Install dependencies"
	@echo "  make install-functions - Install Cloud Functions dependencies"
	@echo "  make preview   - Start dev server and open in default browser"
	@echo "  make preview-mushrooms - Start dev server and open /mushrooms in default browser"
	@echo "  make preview-chrome - Start dev server and open in Chrome"
	@echo "  make preview-chrome-mushrooms - Start dev server and open /mushrooms in Chrome"
	@echo "  make dev       - Start dev server (no auto-open)"
	@echo "  make build     - Build for production"
	@echo "  make clean     - Remove build artifacts and node_modules"
	@echo "  make deploy    - RELEASE: build + deploy hosting + IndexNow (use this, not firebase deploy)"
	@echo "  make deploy-all - make deploy plus Cloud Functions"
	@echo "  make deploy-functions - Deploy Cloud Functions (contact form + Bula chat)"
	@echo "  make seo-assets - Regenerate sitemap.xml, feed.xml, feed.json"
	@echo "  make seo-indexnow - Submit URLs to IndexNow (Bing/Yandex/Seznam/Naver)"
	@echo "  make kb        - Regenerate the Bula chatbot knowledge base"
	@echo "  make claude-code - Launch Claude Code with permission prompts skipped"
	@echo ""

# Launch Claude Code with permission prompts bypassed
claude-code:
	claude --dangerously-skip-permissions

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install

# Install Cloud Functions dependencies
install-functions:
	@echo "Installing Cloud Functions dependencies..."
	npm --prefix functions install

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

# ============================================================================
# THE single release entry point for this repository.
#
# Humans and CI both run `make deploy` — never `firebase deploy` directly. Calling the
# Firebase CLI by hand skips the IndexNow ping, and Bing's index is the retrieval layer
# behind ChatGPT Search and Microsoft Copilot: a release Bing has not seen is invisible to
# both, however well it ranks on Google. Steps run in order and make aborts on the first
# failure, so a failed build or deploy never reaches the IndexNow submission.
# ============================================================================
deploy:
	@echo "==> [1/3] Building (SEO assets + bundle + prerender)..."
	@$(MAKE) --no-print-directory build
	@echo ""
	@echo "==> [2/3] Deploying to Firebase Hosting..."
	firebase deploy --only hosting --project nano-kava-landing-page
	@echo ""
	@echo "==> [3/3] Notifying IndexNow so Bing/ChatGPT/Copilot pick up the release..."
	@$(MAKE) --no-print-directory seo-indexnow
	@echo ""
	@echo "Release complete: built, deployed and submitted to IndexNow."

# Everything above plus Cloud Functions — use when functions/ changed.
deploy-all: deploy deploy-functions

seo-assets:
	@echo "Regenerating sitemap.xml, feed.xml and feed.json from src/seo/routes.js..."
	npm run seo:assets

seo-indexnow:
	@echo "Submitting URLs to IndexNow (Bing / Yandex / Seznam / Naver)..."
	npm run seo:indexnow

# Regenerate the chatbot knowledge base from src/content/
kb:
	@echo "Rebuilding Bula knowledge base from src/content/..."
	node scripts/build-knowledge-base.mjs

# Deploy Cloud Functions
deploy-functions:
	@echo "Deploying Cloud Functions..."
	firebase deploy --only functions --project nano-kava-landing-page
