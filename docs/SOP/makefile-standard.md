---
file: docs/SOP/makefile-standard.md
title: "Makefile Target Standards"
author: Stephen Boyett
company: Cannasol Technologies LLC
date: 2026-05-14
brief: Required Makefile targets, naming conventions, and help-text standards for this project. v1.2 adds build/sim-install/emu-install targets.
version: 1.2
---

# Makefile Target Standards

## Purpose

Ensure all Makefile targets in this project are consistent. When working in this project's Makefile, always refer and strictly adhere to the standards outlined in this document. If a makefile target is not listed here, it is not currently allowed; propose an amendment to this document before introducing a new target.

## Source of Truth

This document is the source of truth for the Makefile targets used in this project.

## Per-Stack Adaptations (v1.1)

The Global Requirements below describe the *spirit* of the standard. The specific commands differ by language stack. RRUA is a JS/TS project; its `test*` targets use `npm ci` / `npx` rather than `python -m venv` / `pip`.

| Stack | Environment prep | Acceptance / BDD tool |
|---|---|---|
| **Python** (canonical) | `python3 -m venv .venv` + `pip install` | `behave` (pytest-bdd) |
| **JS / TypeScript** (RRUA) | `[ -d node_modules ] \|\| npm ci` | `cucumber-js` (driving Detox for RN) |
| Go | `go mod download` | `go test` with BDD tags |
| Rust | `cargo fetch` | `cargo test` |

The Global Requirements apply across all stacks; the canonical examples below are Python-flavored, with JS/TS adaptations called out inline where they diverge.

## Makefile Target Standards

### Global Requirements

*1.* Test targets ***MUST*** auto-verify and install dependencies

- All `test*` targets (e.g., `test`, `test-unit`, `test-integration`, `test-e2e`, `test-acceptance`) MUST ensure the runtime environment is prepared before running tests.
- The canonical Python implementation creates/uses a project-local virtual environment (e.g., `.venv`) and installs missing packages automatically.
- Acceptable Python approach is to run in this order:
  - Create venv if missing: `python3 -m venv .venv`
  - Upgrade tooling: `python -m pip install --upgrade pip setuptools wheel`
  - Install project dependencies: `python -m pip install -r requirements.txt`
  - Install test extras: `python -m pip install -e .[test]`
  - Ensure BDD tool is present when acceptance tests exist: `python -m pip install behave`
- **JS/TS adaptation (RRUA):** Targets check for `node_modules` and run `npm ci` if missing. For Detox-backed acceptance tests, the target also verifies Detox build artifacts exist (`detox build --configuration <profile>` if missing).
- This requirement exists so `make test*` succeeds on a fresh machine without manual setup, regardless of stack.

*2.* UI targets ***MUST*** use a standardized, configurable port

- Any target that launches a UI or HTTP service MUST bind to a standard, configurable host/port exposed via Make variables:
  - `UI_HOST` (default `localhost`)
  - `UI_PORT` (default per stack — `8080` for web; **`8081` for Metro/Expo** in JS/TS RN projects)
- All run/status/preview/story-like targets MUST pass these values to the underlying process/CLI when supported (e.g., `--host $(UI_HOST) --port $(UI_PORT)`).
- These variables MUST be documented in the README, and the Makefile MUST honor them.


### Development Targets

***make dev:*** Start development server with auto-reload and verbose logging

**Python (canonical):**

```make
dev:
	@echo "Starting development server with auto-reload..."
	PYTHONPATH=src python -m orchestrator.cli run --verbose
```

**JS/TS adaptation (RRUA):**

```make
dev:
	@echo "Starting Expo Dev Client on $(UI_HOST):$(UI_PORT)..."
	npx expo start --dev-client --host $(UI_HOST) --port $(UI_PORT)
```

### Test Targets — JS/TS adaptation (RRUA)

***make test-unit:*** Run Jest unit tests (co-located `*.test.ts(x)` per `coding-style.md` §Test Organization).

```make
test-unit:
	@echo "Running unit tests..."
	@[ -d node_modules ] || npm ci
	npx jest
```

***make test-acceptance:*** Run Cucumber.js + Detox acceptance tests.

```make
test-acceptance:
	@echo "Running acceptance tests (Cucumber.js + Detox)..."
	@[ -d node_modules ] || npm ci
	npx cucumber-js $(TAGS)
```

***make test-acceptance STORY=N.N:*** Run scenarios filtered to a specific story.

```make
ifdef STORY
TAGS = --tags "@story-$(subst .,-,$(STORY))"
endif
```

The `subst` substitution converts `1.3` → `1-3` to match Cucumber tag syntax `@story-1-3` per the Silverline dual-tag standard.

***make test-acceptance SMOKE=1:*** Run the smoke subset.

```make
ifeq ($(SMOKE),1)
TAGS = --tags "@smoke"
endif
```

***make check-headers:*** Validate file-header standard per `docs/SOP/file-headers.md`.

```make
check-headers:
	@echo "Validating file headers..."
	@./scripts/check-headers.sh
```

### Build Targets — JS/TS adaptation

***make build:*** EAS cloud build (profile-driven). Defaults: `PROFILE=development`, `PLATFORM=all`.

```make
PROFILE  ?= development
PLATFORM ?= all

build: ## EAS cloud build — PROFILE=(development|preview|production) PLATFORM=(ios|android|all)
	@echo ">> Building via EAS (profile=$(PROFILE), platform=$(PLATFORM))..."
	@[ -d node_modules ] || npm ci
	npx eas build --profile $(PROFILE) --platform $(PLATFORM)
```

Variables: `PROFILE` (one of `development` / `preview` / `production`); `PLATFORM` (one of `ios` / `android` / `all`).

Usage examples:
```bash
make build PROFILE=development PLATFORM=ios     # dev build, iOS only
make build PROFILE=preview PLATFORM=android     # preview build, Android only
make build PROFILE=production                   # production build, both platforms
```

***make sim-install:*** Install a built `.app` artifact on the currently-booted iOS simulator. Requires `BUILD=<path>`. Fails loudly if `BUILD` is not supplied.

```make
sim-install: ## Install a built .app on the booted iOS simulator — BUILD=path/to/RRUA.app
	@[ -n "$(BUILD)" ] || (echo "ERROR: BUILD is required"; exit 1)
	@echo ">> Installing $(BUILD) on booted iOS simulator..."
	xcrun simctl install booted "$(BUILD)"
```

Usage:
```bash
make sim-install BUILD=~/Downloads/RRUA.app
```

Prerequisites: an iOS simulator must be booted (`xcrun simctl boot "<sim-name>"`).

***make emu-install:*** Install a built `.apk` artifact on the running Android emulator via `adb`. Requires `BUILD=<path>`. Fails loudly if `BUILD` is not supplied.

```make
emu-install: ## Install a built .apk on the running Android emulator — BUILD=path/to/rrua.apk
	@[ -n "$(BUILD)" ] || (echo "ERROR: BUILD is required"; exit 1)
	@echo ">> Installing $(BUILD) on Android emulator via adb..."
	adb install "$(BUILD)"
```

Usage:
```bash
make emu-install BUILD=~/Downloads/rrua.apk
```

Prerequisites: an Android emulator must be running and `adb` must be on `PATH` (installed via Android Studio / SDK tools).

### Clean Target

***make clean:*** Remove all build artifacts and dependency caches.

```make
clean:
	@echo "Cleaning..."
	rm -rf node_modules dist .expo .detox-cache android/build ios/build
```

## Implementation Guidelines

- Make targets should be simple and descriptive
- Complex logic should be in `scripts/` directory, called by make targets
- All targets should have help text accessible via `make help`
- Use `.PHONY` declarations for non-file targets
- Include error handling and status reporting
- Follow the root directory standard - no scripts in root

## Standards Compliance

All Makefile targets in this project must:

*1.* Include descriptive echo statements
*2.* Use consistent naming conventions
*3.* Set appropriate environment variables when needed (`PYTHONPATH=src` for Python; **`EXPO_PUBLIC_*` for JS/TS via the EAS profile system, not Make variables**)
*4.* Handle errors gracefully with proper exit codes
*5.* Provide clear usage instructions for parameterized targets

## Amendment History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-02-14 | Stephen Boyett | Initial Python-focused standard |
| 1.1 | 2026-05-14 | Stephen Boyett | Added per-stack adaptations table. Added JS/TS adaptation guidance for `dev`, `test-unit`, `test-acceptance`, `build`, `clean` targets. Specified `cucumber-js` + Detox as the JS/TS acceptance-test pattern. Specified Metro's `8081` as JS/TS `UI_PORT` default. Driven by RRUA architecture work. |
| **1.2** | **2026-05-15** | **Stephen Boyett** | **Implemented `build` target (was specced in v1.1 but unimplemented). Added `sim-install` (iOS simulator artifact install via `xcrun simctl`) and `emu-install` (Android emulator install via `adb`). Both require `BUILD=<path>` and fail loudly if omitted. Added `PROFILE` and `PLATFORM` Make variables with documented defaults. Driven by Story 1.14 manual verification gate pattern — any story with visual verification needs these.** |
