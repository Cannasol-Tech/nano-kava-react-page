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
npx vitest run src/test/AppRoutes.test.jsx  # Run a single test file
```

Makefile shortcuts: `make install`, `make dev`, `make preview` (opens browser), `make preview-mushrooms` (opens /mushrooms), `make build`, `make clean`, `make deploy`

Cloud Functions have a separate `functions/` directory with its own `package.json`. Install and deploy independently: `cd functions && npm install`.

## Deployment

Firebase Hosting with SPA rewrites. Build then deploy:
```bash
npm run build && firebase deploy
```
Cloud Functions deploy separately for email handling. Project ID: `nano-kava-landing-page`.

## Architecture

**Stack**: React 18 + Vite 5 + Tailwind CSS 3 + Framer Motion 11 + Firebase

**App structure** (`App.jsx`): `NanoScene` is rendered as a fixed background layer (`fixed inset-0 -z-10`) behind all route content via `AppContent`. Theme is provided at the router level: `Router > ThemeProvider > AppContent`.

**Routing** (React Router v7 in `AppRoutes.jsx`):
- `/` → `KavaLandingPage` — main landing page with hero, features, process timeline, CTA
- `/faq` → `FAQPage` — categorized FAQ accordions
- `/contact` → `ContactPage` — validated contact form → Firebase Cloud Function → SendGrid
- `/mushrooms` → `MushroomsLandingPage` — secondary product page

**3D Canvas Visualizations** (custom HTML5 Canvas, no Three.js):
- `NanoScene.jsx` — Complex multi-sphere particle system with physics, mouse interaction, depth sorting, dual-light shading, Fibonacci sphere distribution. Renders 3 spheres (350/220/120 points) plus 55 background particles with connection lines.
- `NanoSphere.jsx` — Simpler single 3D sphere with floating animation and lighting
- `NanoParticles.jsx` — Background particle network with connections

All canvas components share a single `requestAnimationFrame` loop via `src/utils/animationLoop.js` — components call `registerAnimation(id, callback)` / `unregisterAnimation(id)` rather than managing their own RAF. The loop auto-starts/stops based on registered callbacks. This is critical for performance; do not introduce separate RAF loops.

Canvas components use precomputed Fibonacci sphere points, pre-allocated sort buffers (avoiding per-frame GC), and manual 3D rotation/projection math. Changes must respect `devicePixelRatio` and `ResizeObserver` patterns already in place.

**Theming**: `ThemeContext.jsx` provides `{ isDark, setIsDark }` (defaults to dark). `src/theme/themes.js` maps `dark`/`light` keys to 60+ Tailwind class strings. Pages destructure theme classes from `themes[isDark ? 'dark' : 'light']`.

**Animation patterns**: Framer Motion variants (`fadeInUp`, `staggerContainer`, `scaleIn`, etc.) with `useInView` for scroll-triggered animations and `useScroll`/`useTransform` for parallax.

**Cloud Functions** (`functions/index.js`): `sendContactEmail` HTTP function using SendGrid. Sends team notification + customer auto-reply. Requires `SENDGRID_API_KEY` env var set via Firebase CLI.

## Key Conventions

- Path alias `@/*` maps to `src/*` in jsconfig.json (IDE resolution only — not configured in vite.config.js, so use relative imports in code)
- Brand colors: `cannasol-green` `#2ECC71`, `cannasol-teal` `#17A2B8`, `cannasol-dark` `#0f172a` (defined in tailwind.config.js under `theme.extend.colors.cannasol`)
- Custom Tailwind animations: `float`, `glow`, `pulse-slow` (in tailwind.config.js); additional CSS animations (gradient-shift, shimmer) in `src/index.css`
- `landingPage.js` at project root is a standalone prototype — not used by the app. The actual mushrooms page is `src/components/MushroomsLandingPage.jsx`
- `docs/` contains planning docs (`implementation-plan.md`), feature specs, SEO notes, and testing standards — check here for project context

## Testing

Standards are documented in `docs/sw-testing-standards.md`. Key points:
- Vitest + jsdom + React Testing Library (RTL)
- Prefer `getByRole` / `findByRole` with accessible names; avoid `querySelector`
- Route tests use `MemoryRouter` with `initialEntries` (see `src/test/AppRoutes.test.jsx` for the pattern)
- Assert user-visible behavior: headings, CTAs, navigation links. Do not assert animation timings, Tailwind class strings, or pixel layout
- Test mocks for `IntersectionObserver` and `ResizeObserver` are in `src/test/setupTests.js`
