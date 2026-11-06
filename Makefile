# file: Makefile
# author: Stephen Boyett
#
# description:
#   Task runner for the Nano Kava site: dev server, build, release (`make deploy` is the only
#   supported release path), Firebase backend deploys, SEO assets, the vitest unit suite, the
#   pytest-bdd + Playwright acceptance suite and its functionality-report evidence gates.
#
# See Also:
#   CLAUDE.md
#   test/acceptance/README.md
#
# ---
# Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
# ---

UI_HOST ?= localhost
UI_PORT ?= 3000

PYTHON ?= python3.12
VENV ?= .venv
VENV_PY := $(VENV)/bin/python
ACCEPTANCE_REQS := test/acceptance/requirements.txt
ACCEPTANCE_STAMP := $(VENV)/.acceptance-requirements.stamp
ACCEPTANCE_JUNIT := test-results/e2e-results.xml
APP_URL ?= http://$(UI_HOST):$(UI_PORT)
SITE_URL ?= https://enjoynano.com

.PHONY: help install install-functions verify-release test-review-loop preview preview-mushrooms preview-chrome preview-chrome-mushrooms dev build clean clean-test deploy deploy-all deploy-functions deploy-firestore firestore-status kb seo-assets seo-indexnow claude-code test-lead-delivery test-sol test test-unit acceptance-setup test-acceptance check-evidence check-scenario-levels requirements-doc

# Default target
help:
	@echo ""
	@echo "Cannasol Nano Kava Landing Page"
	@echo "================================"
	@echo ""
	@echo "Available targets:"
	@echo "  make install   - Install dependencies"
	@echo "  make install-functions - Install Cloud Functions dependencies"
	@echo "  make preview   - Start dev server on UI_HOST:UI_PORT and open in default browser"
	@echo "  make preview-mushrooms - Start dev server and open /mushrooms in default browser"
	@echo "  make preview-chrome - Start dev server and open in Chrome"
	@echo "  make preview-chrome-mushrooms - Start dev server and open /mushrooms in Chrome"
	@echo "  make dev       - Start dev server on UI_HOST:UI_PORT (default localhost:3000)"
	@echo "  make build     - Build for production"
	@echo "  make clean     - Remove build artifacts and node_modules"
	@echo "  make clean-test - Remove .venv, test-results and the pytest cache"
	@echo "  make deploy    - RELEASE: build + deploy hosting + IndexNow (use this, not firebase deploy)"
	@echo "  make deploy-all - make deploy plus Cloud Functions and Firestore rules"
	@echo "  make deploy-functions - Deploy Cloud Functions (contact form + Sol chat)"
	@echo "  make deploy-firestore - Deploy Firestore rules + the 90-day transcript TTL"
	@echo "  make firestore-status - Show the deployed indexes and TTL policy"
	@echo "  make seo-assets - Regenerate sitemap.xml, feed.xml, feed.json"
	@echo "  make seo-indexnow - Submit URLs to IndexNow (Bing/Yandex/Seznam/Naver)"
	@echo "  make verify-release - Check what is ACTUALLY live (read-only, run after deploy)"
	@echo "  make kb        - Regenerate the Sol chatbot knowledge base"
	@echo "  make claude-code - Launch Claude Code with permission prompts skipped"
	@echo ""
	@echo "Tests:"
	@echo "  make test      - Unit tests (alias of test-unit)"
	@echo "  make test-unit - Vitest unit suite"
	@echo "  make acceptance-setup - Create .venv and install test/acceptance/requirements.txt"
	@echo "  make test-acceptance - Acceptance suite (real browser, live Sol) -> JUnit + report + archive"
	@echo "                         [FR=0101] [STORY=2.1] filter: JUnit only, no report"
	@echo "                         [APP_URL=...] [SITE_URL=...] [HEADED=1] [DEPLOYED_E2E=1]"
	@echo "  make check-evidence - Gate: the run left a real, matching functionality report"
	@echo "  make check-scenario-levels - Lint: one tier tag, the right surface, FR + story tags"
	@echo "  make requirements-doc - Regenerate the functional requirements reference document"
	@echo "  make test-sol  - Live conversation checks against the real model (needs make dev)"
	@echo "  make test-lead-delivery - Prove delivery against the DEPLOYED function (emails the team)"
	@echo "  make test-review-loop - Review loop against the DEPLOYED backend (emails the team)"
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
	@echo "Opening http://$(UI_HOST):$(UI_PORT) in your browser..."
	npm run dev -- --host $(UI_HOST) --port $(UI_PORT) --open

preview-mushrooms:
	@echo "Starting preview server..."
	@echo "Opening http://$(UI_HOST):$(UI_PORT)/mushrooms in your browser..."
	npm run dev -- --host $(UI_HOST) --port $(UI_PORT) --open /mushrooms

# Start dev server and open in Chrome specifically
preview-chrome:
	@echo "Starting preview server..."
	@echo "Opening http://$(UI_HOST):$(UI_PORT) in Chrome..."
	@(npm run dev -- --host $(UI_HOST) --port $(UI_PORT) > /dev/null 2>&1 &) && sleep 2 && open -a "Google Chrome" http://$(UI_HOST):$(UI_PORT)

preview-chrome-mushrooms:
	@echo "Starting preview server..."
	@echo "Opening http://$(UI_HOST):$(UI_PORT)/mushrooms in Chrome..."
	@(npm run dev -- --host $(UI_HOST) --port $(UI_PORT) > /dev/null 2>&1 &) && sleep 2 && open -a "Google Chrome" http://$(UI_HOST):$(UI_PORT)/mushrooms

# Start dev server
dev:
	@echo "Starting development server on $(UI_HOST):$(UI_PORT)..."
	npm run dev -- --host $(UI_HOST) --port $(UI_PORT)

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

# Remove the acceptance suite's environment and generated results (the tracked archive is kept)
clean-test:
	@echo "Removing .venv, test-results and .pytest_cache..."
	rm -rf $(VENV) test-results .pytest_cache
	@echo "Clean complete!"

# THE release entry point for humans and CI — never `firebase deploy`; see CLAUDE.md § Deployment.
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

# Backend FIRST, hosting last (/sol-review rewrites onto solReview); see CLAUDE.md § Deployment.
deploy-all: deploy-functions deploy-firestore deploy

seo-assets:
	@echo "Regenerating sitemap.xml, feed.xml and feed.json from src/seo/routes.js..."
	npm run seo:assets

seo-indexnow:
	@echo "Submitting URLs to IndexNow (Bing / Yandex / Seznam / Naver)..."
	npm run seo:indexnow

# Regenerate the chatbot knowledge base from src/content/
kb:
	@echo "Rebuilding Sol knowledge base from src/content/..."
	node scripts/build-knowledge-base.mjs

# Deploy Cloud Functions
deploy-functions:
	@echo "Deploying Cloud Functions..."
	firebase deploy --only functions --project nano-kava-landing-page

# Rules AND indexes together: firestore.indexes.json IS the 90-day TTL; see CLAUDE.md § Deployment.
deploy-firestore:
	@echo "Deploying Firestore rules and the 90-day transcript TTL..."
	firebase deploy --only firestore:rules,firestore:indexes --project nano-kava-landing-page
	@echo ""
	@echo "Deployed. Confirm the TTL with: make firestore-status"

firestore-status:
	@echo "Deployed Firestore indexes and field overrides (expiresAt should show a TTL):"
	firebase firestore:indexes --project nano-kava-landing-page

## Proves a sample request is really delivered via the DEPLOYED function and SendGrid. Emails the team.
test-lead-delivery:
	node test/e2e/lead-delivery.mjs

## Live conversation checks against the real model. Needs `make dev` running.
test-sol:
	node test/e2e/sol-conversation.mjs

## Read-only check of what is actually live — run after every `make deploy-all`. Emails nobody.
verify-release:
	node test/e2e/verify-release.mjs

## Real test lead through the DEPLOYED function, then reads Firestore back. Emails the team.
test-review-loop:
	node test/e2e/review-loop.mjs

## Unit tests — alias of test-unit.
test: test-unit

## Vitest unit suite (jsdom + React Testing Library).
test-unit:
	@echo "Running unit tests..."
	@[ -d node_modules ] || npm ci
	npx vitest run

$(ACCEPTANCE_STAMP): $(ACCEPTANCE_REQS)
	@echo "Creating $(VENV) with $(PYTHON) and installing $(ACCEPTANCE_REQS)..."
	@[ -x $(VENV_PY) ] || $(PYTHON) -m venv $(VENV)
	$(VENV_PY) -m pip install --quiet --upgrade pip setuptools wheel
	$(VENV_PY) -m pip install --quiet -r $(ACCEPTANCE_REQS)
	@touch $@

## Create .venv and install the acceptance suite's Python dependencies (re-runs when they change).
acceptance-setup: $(ACCEPTANCE_STAMP)
	@echo "Acceptance environment ready: $(VENV_PY)"

## Acceptance suite — real Chrome, live Sol. Whole suite: JUnit + report + archive. FR=/STORY= filter: JUnit only.
test-acceptance: acceptance-setup
	@[ -d node_modules ] || npm ci
	@[ -d functions/node_modules ] || npm --prefix functions ci
	@marks=""; \
	if [ -n "$(FR)" ]; then marks="FR_$(subst FR_,,$(subst FR-,,$(FR)))"; fi; \
	if [ -n "$(STORY)" ]; then marks="$${marks:+$$marks and }story_$(subst .,_,$(STORY))"; fi; \
	if [ -n "$$marks" ]; then echo "Filter: -m \"$$marks\" — JUnit only; a filtered run cannot describe the corpus, so no report."; fi; \
	echo "Running acceptance suite against APP_URL=$(APP_URL), SITE_URL=$(SITE_URL)..."; \
	start=$$(date +%s); \
	APP_URL="$(APP_URL)" SITE_URL="$(SITE_URL)" $(VENV_PY) -m pytest --junitxml=$(ACCEPTANCE_JUNIT) $${marks:+-m "$$marks"} $(PYTEST_ARGS); \
	status=$$?; \
	echo "Acceptance wall-clock: $$(( $$(date +%s) - start ))s"; \
	exit $$status

## Gate: the last run's evidence is real (report matches its JUnit, names its corpus, is archived).
check-evidence:
	@echo "Checking the acceptance evidence chain..."
	python3 scripts/check_acceptance_evidence.py

## Lint: every scenario claims one tier (@e2e/@service), the @web surface rule, an @FR_ and a @story_ tag.
check-scenario-levels:
	@echo "Checking scenario level tags..."
	python3 scripts/check_scenario_levels.py

## Regenerate the functional requirements reference document from the PRD.
requirements-doc:
	@echo "Generating the functional requirements reference document..."
	python3 docs/requirements/generate_functional_requirements.py
