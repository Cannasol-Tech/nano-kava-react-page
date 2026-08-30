# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nano Kava landing page for Cannasol Technologies — a React SPA with advanced Canvas-based 3D visualizations, deployed on Firebase Hosting with Cloud Functions for email handling via SendGrid.

## Build & Development Commands

```bash
npm run dev          # Vite dev server on port 3000 (auto-opens browser)
npm run build        # Generates SEO assets, builds to dist/, then prerenders every route
npm run seo:assets   # Regenerate sitemap.xml + feed.xml + feed.json from the route table
npm run seo:indexnow # Push URLs to Bing/Yandex/Seznam/Naver (run AFTER firebase deploy)
npm run preview      # Preview production build locally
npm run test         # Run tests once (vitest run)
npm run test:watch   # Watch mode testing (vitest)
npx vitest run src/test/AppRoutes.test.jsx  # Run a single test file
```

Makefile shortcuts: `make install`, `make dev`, `make preview` (opens browser), `make preview-mushrooms` (opens /mushrooms), `make build`, `make clean`, `make deploy`, `make seo-assets`, `make seo-indexnow`

Cloud Functions have a separate `functions/` directory with its own `package.json`. Install and deploy independently: `cd functions && npm install`.

## Deployment

**`make deploy` is the only supported way to release this repo — humans and CI alike.**

```bash
make deploy         # build -> firebase deploy --only hosting -> IndexNow submission
make deploy-all     # the above, plus Cloud Functions and Firestore (rules + TTL)
make firestore-status  # show the deployed Firestore indexes and the transcript TTL
```

Do **not** run `firebase deploy` directly. It skips the IndexNow ping, and Bing's index is
the retrieval layer behind ChatGPT Search and Microsoft Copilot — a release Bing has not
seen is invisible to both regardless of Google rank. The target runs its steps in order and
make aborts on the first failure, so a broken build or a failed deploy never reaches the
IndexNow submission. Any pipeline added later must call `make deploy` rather than
reimplementing the steps.

There is **no catch-all `**` rewrite** any more. Each route is prerendered to
`dist/<route>/index.html` and rewritten explicitly in `firebase.json`; unmatched paths fall
through to `dist/404.html` so Firebase returns a real 404 instead of a soft 404. Adding a
React route therefore requires adding it to `src/seo/routes.js` **and** to the `rewrites`
array, or it will 404 in production.
Cloud Functions deploy separately for email handling. Project ID: `nano-kava-landing-page`.

Firestore carries stored chat transcripts. `firestore.rules` closes client access entirely — the
`chat` function writes through the Admin SDK, which bypasses rules. The 90-day retention TTL is
declared as a `ttl: true` fieldOverride in `firestore.indexes.json`, so `make deploy-all` ships
both. `make deploy-firestore` deploys **rules and indexes together on purpose**: that file *is*
the TTL policy, so deploying it without the fieldOverride would delete a live one.
`make firestore-status` shows what is deployed.

## Architecture

**Stack**: React 18 + Vite 5 + Tailwind CSS 3 + Firebase (no animation library — see Animation patterns)

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

**Animation patterns**: This project has **no animation library**. Framer Motion was removed for Safari performance; `package.json` has no such dependency and `src/` has zero `motion.` usages. *(Corrected 2026-08-25: this section previously described Framer Motion variants — that had been untrue since the CSS-animation migration.)* Use instead:
- Scroll reveal — the `useInView` hook plus `.scroll-hidden` / `.scroll-visible`
- Entrance — `.animate-fade-in-up`, `.animate-slide-down`, with `.anim-delay-*` for stagger
- Hover/press — `.interactive-btn`, `.interactive-card`, `.hover-lift`, `.active-press`
- Parallax — the `useScrollTransform(ref)` hook

Animate **only `transform` and `opacity`**, and hold `will-change` **only while an animation is
pending or running**. Both rules were being broken and cost 2.5× the frame rate; the measurements,
the two bugs and the current budget are in `src/CLAUDE.md § The measured budget`. `backdrop-filter:
blur()` on a `position: fixed` element is the single worst offender on this site — see
`SAFARI_OPTIMIZATIONS.md`.

## SEO / AEO

Full detail and the post-deploy checklist: `docs/SEO/aeo-runbook.md`.

- **`src/seo/routes.js` is the route SSoT.** The prerenderer, the sitemap and both feeds
  read it. Add a route there, not in three places.
- **`src/seo/structuredData.js` is the JSON-LD SSoT.** Nodes are linked by `@id` so all
  routes resolve to one Organization/Brand/Product entity. Never inline JSON-LD in a
  component; render it through `src/seo/JsonLd.jsx`.
- **Generated — never hand-edit:** `public/sitemap.xml`, `public/feed.xml`,
  `public/feed.json`. Run `npm run seo:assets`.
- **`public/<hex>.txt` is the IndexNow key.** The file IS the verification. Do not rename
  or delete it.

### Prerendering

`scripts/prerender.mjs` serves `dist/` and drives Puppeteer through every route, writing
the rendered DOM back to disk. This exists because AI retrieval crawlers (GPTBot,
ClaudeBot, PerplexityBot, CCBot) do not run JavaScript and would otherwise receive an empty
`<div id="root">`.

- It replaced `vite-plugin-prerender-k`, which cannot load under Node 22+: its
  `html-minifier` → `yargs` chain hits `require is not defined in ES module scope` and
  fails the entire build. Do not reinstate that plugin.
- It prefers an installed Chrome over Puppeteer's bundled download, which is per-machine
  and fails with a bare `spawn Unknown system error -88` when stale. Override with
  `PUPPETEER_EXECUTABLE_PATH`.
- It waits on the `app-rendered` event dispatched by `PrerenderReady` in `AppRoutes.jsx`.
  If that stops firing, routes prerender empty — the script fails the build rather than
  shipping them.
- It strips the build-time meta tags that react-helmet-async re-emits with `data-rh="true"`,
  so pages ship exactly one `<title>`, description and canonical.
- It sets `window.__PRERENDER__`, which `useInView` reads to start every section already
  revealed. The snapshot is therefore fully visible rather than frozen half-way through a
  scroll animation — it stays legible with JS disabled, and to crawlers that respect CSS.

**`main.jsx` mounts with `createRoot`; it must not hydrate.** The snapshot is a serialised
DOM, not a React server render: Chrome normalises inline styles when serialising (react-hot
-toast's `top/left/right/bottom` comes back as `inset`), and effect-driven state is already
applied. `hydrateRoot` therefore mismatched on every route (React #418 -> #423) and React
re-rendered the whole root anyway, so hydrating only added a wasted pass. Measured on a 4G
profile with cold caches (median of 11), mounting over the snapshot is still a clear win
over no prerendering at all: FCP 580ms -> 460ms, LCP 1376ms -> 772ms.

### Testing SEO-bearing components

Page components render `<Helmet>`, which throws outside a `HelmetProvider`. Use
`renderWithProviders` from `src/test/renderWithProviders.jsx` rather than wrapping in
`MemoryRouter`/`ThemeProvider` by hand.

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

## AI Chat Widget (Sol)

A floating sales-concierge widget backed by Gemini. Architecture:

- **Content** — `src/content/*.js` is the single source of truth for site facts (see `src/content/CLAUDE.md`). `scripts/build-knowledge-base.mjs` renders it to `functions/knowledge-base.md` on every build.
- **Backend** — `functions/lib/chat.js` (model call, tool, rate limiting) and `functions/lib/persona.js` (system instruction, compliance guardrails). Exposed as the **2nd-gen** `chat` function for SSE streaming; `sendContactEmail` stays 1st-gen. Shared lead delivery lives in `functions/lib/leads.js`.
- **Transcripts** — `functions/lib/chatStore.js` files every turn to Firestore at `chatSessions/{sessionId}`, capped at **60 messages (30 exchanges)** and deleted **90 days** after the chat started. Both bounds exist to stop unbounded growth: the cap bounds one document, the TTL bounds the collection. The TTL is declared in `firestore.indexes.json` and deployed by `make deploy-firestore`. Read `functions/lib/CLAUDE.md § Transcript persistence` first.
- **Leads** — `functions/lib/chatLeads.js` stores what Sol extracted at `chatLeads/{sessionId}`, **with no TTL**: a transcript is telemetry and expires, a prospect is a business record and does not. `confirmed` separates a model's extraction from a human pressing Send. See `functions/lib/CLAUDE.md § The lead record is not the transcript`.
- **Daily report** — the scheduled `dailyChatReport` function emails every conversation from the last 24h to Stephen at **08:00 America/New_York**, read from Firestore and retried on failure. It **replaced** the per-conversation digest beacon, which is retired; `functions/lib/digest.js` and `src/components/chat/transport/chatDigest.js` are now unreferenced.
- **Frontend** — `src/components/chat/`, mounted once in `App.jsx` after `<AppRoutes />`.
- **Local dev** — `vite.config.js` mounts `/api/chat` in the dev server, so `make preview` works with just `GOOGLE_AI_API_KEY` in `.env`. No Firebase emulator needed.

`functions/lib/persona.js` is compliance-bearing — kava is an ingestible, and the no-health-claims / no-personal-dosing rules are not style preferences. Read `functions/CLAUDE.md` before editing it.
