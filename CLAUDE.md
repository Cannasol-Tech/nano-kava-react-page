# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nano Kava landing page for Cannasol Technologies — a React SPA with advanced Canvas-based 3D visualizations, deployed on Firebase Hosting with Cloud Functions for email handling via SendGrid.

## Build & Development Commands

```bash
npm run dev          # Vite dev server on port 3000 (auto-opens browser)
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
npm run test         # Run tests once (vitest run)
npm run test:watch   # Watch mode testing (vitest)
```

Makefile shortcuts: `make install`, `make dev` (no auto-open), `make build`, `make clean`, `make deploy`

## Deployment

Firebase Hosting with SPA rewrites. Build then deploy:
```bash
npm run build && firebase deploy
```
Cloud Functions deploy separately for email handling. Project ID: `nano-kava-landing-page`.

## Architecture

**Stack**: React 18 + Vite 5 + Tailwind CSS 3 + Framer Motion 11 + Firebase

**Routing** (React Router v7 in `AppRoutes.jsx`):
- `/` → `KavaLandingPage` — main landing page with hero, features, process timeline, CTA
- `/faq` → `FAQPage` — categorized FAQ accordions
- `/contact` → `ContactPage` — validated contact form → Firebase Cloud Function → SendGrid
- `/mushrooms` → `MushroomsLandingPage` — secondary product page

**3D Canvas Visualizations** (custom HTML5 Canvas, no Three.js):
- `NanoScene.jsx` — Complex multi-sphere particle system with physics, mouse interaction, depth sorting, lighting calculations, Fibonacci sphere distribution
- `NanoSphere.jsx` — Simpler 3D sphere with floating animation and lighting
- `NanoParticles.jsx` — Background particle network with connections

These use `requestAnimationFrame`, precomputed Fibonacci sphere points, and manual 3D rotation/projection math. They are performance-sensitive — changes should respect `devicePixelRatio` and `ResizeObserver` patterns already in place.

**Theming** (`src/theme/themes.js`): Dark/light toggle with 60+ CSS class variants. All pages consume theme state and pass classes from this config.

**Animation patterns**: Framer Motion variants (`fadeInUp`, `staggerContainer`, `scaleIn`, etc.) with `useInView` for scroll-triggered animations and `useScroll`/`useTransform` for parallax.

**Cloud Functions** (`functions/index.js`): `sendContactEmail` HTTP function using SendGrid. Sends team notification + customer auto-reply. Requires `SENDGRID_API_KEY` env var set via Firebase CLI.

## Key Conventions

- Path alias `@/*` maps to `src/*` (configured in jsconfig.json and vite.config.js)
- Brand colors: green `#2ECC71`, teal `#17A2B8`, dark `#0f172a` (defined in tailwind.config.js)
- Custom CSS animations (gradient-shift, shimmer, float, glow) defined in `src/index.css`
- Test mocks for `IntersectionObserver` and `ResizeObserver` in `src/test/setupTests.js`
