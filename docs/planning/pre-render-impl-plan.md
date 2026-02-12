# Pre-Rendering Implementation Plan

## Why Pre-Render?

The current `index.html` has a rich `<head>` (meta tags, OG tags, 4 JSON-LD blocks, GTM) but the `<body>` is just `<div id="root"></div>` — all visible page content is rendered client-side by React. This creates two problems:

1. **Shared metadata across routes:** Every route (`/faq`, `/contact`, `/mushrooms`) serves the same `index.html` with the home page's title, description, and OG tags. The correct per-page metadata only appears after React + react-helmet-async executes and swaps the tags.
2. **Empty body:** Crawlers that don't fully execute JS (Bing, social scrapers, some Googlebot passes) see zero page content.

Pre-rendering generates a separate static HTML file per route at build time — each with the correct `<head>` metadata AND fully rendered `<body>` content.

**Expected improvements:**

- Each route serves its own correct title, description, OG tags, and canonical URL without JS
- Googlebot indexes content immediately (no JS rendering queue)
- Social scrapers (Facebook, Slack, LinkedIn) see correct OG tags without JS
- LCP drops from ~2-3s to ~0.5-1.5s (static HTML served directly)
- Core Web Vitals score improves (Google ranking signal)

---

## Approach: `vite-plugin-prerender-k`

Headless browser renders each route at build time and saves the output as static HTML. React hydrates on the client so all interactivity (animations, form, theme toggle) works as before.

**Why this plugin:**
- Purpose-built for Vite (our build tool)
- Works with React Router + react-helmet-async out of the box
- Firebase Hosting serves static files before SPA rewrite — zero config changes needed
- Only 4 routes to prerender, so build time stays fast

**Routes to prerender:** `/`, `/faq`, `/contact`, `/mushrooms`

**Build output changes:**
```
dist/
├── index.html              ← fully rendered home page
├── faq/index.html           ← fully rendered FAQ
├── contact/index.html       ← fully rendered contact
├── mushrooms/index.html     ← fully rendered mushrooms
├── assets/                  ← JS/CSS chunks (unchanged)
└── sitemap.xml, robots.txt  ← static assets (unchanged)
```

---

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add `vite-plugin-prerender-k` dev dependency |
| `vite.config.js` | Import and configure prerender plugin with 4 routes, event-based rendering, postProcess |
| `src/main.jsx` | Switch from `createRoot` to `hydrateRoot` for prerendered HTML |
| `src/AppRoutes.jsx` | Add `PrerenderReady` component to dispatch `app-rendered` event |
| `firebase.json` | No changes needed — static files are served before SPA rewrite |

---

## Tasks

### Phase 1: Setup

- [x] Research latest `vite-plugin-prerender` docs and confirm compatibility with Vite 5 + React 18
  - Used `vite-plugin-prerender-k` (v1.0.14) — maintained fork with Vite 5 ESM fix. Original `vite-plugin-prerender` (v1.0.8) had `require is not defined` error in ESM context.
- [x] Install: `npm install --save-dev vite-plugin-prerender-k`
- [x] Update `vite.config.js` — add prerender plugin with routes, `renderAfterDocumentEvent`, and `postProcess` for deduplicating Helmet meta tags
- [x] Update `src/main.jsx` — use `hydrateRoot` when pre-rendered HTML exists, `createRoot` as fallback (keeps `npm run dev` working)

### Phase 2: Handle Edge Cases

- [x] **Lazy routes:** Verified — Puppeteer fully resolves `React.lazy()` imports. Added `PrerenderReady` component in `AppRoutes.jsx` inside the Suspense boundary that dispatches `app-rendered` event after lazy chunks load + 2s delay for Helmet.
- [x] **NanoScene canvas:** Confirmed — canvas element renders in prerendered HTML as a static frame. Animations start after JS hydration.
- [x] **Dark/light theme:** Prerendered in default dark theme. Theme flash on light-mode users is acceptable for now (optional enhancement deferred).
- [x] **react-helmet-async:** Confirmed — each page has correct per-page `<title>`, `<meta description>`, `<link canonical>`, `og:title`, `og:description`, `og:url`. Static duplicates from `index.html` are removed via `postProcess` in vite.config.js.
- [x] **GTM dataLayer:** Verified — GTM snippet and noscript iframe present in all prerendered pages.

### Phase 3: Local Testing

- [x] Run `npm run build` — build completes successfully, all 4 routes prerendered
- [x] Inspect `dist/index.html` — contains fully rendered home page content with correct meta tags
- [x] Inspect `dist/faq/index.html` — contains FAQ accordion content, correct `<title>` "Nano Kava FAQ | Kavalactone Questions Answered — EnjoyNano", correct description and canonical
- [x] Inspect `dist/contact/index.html` — contains contact form markup, correct `<title>` "Contact Us | Nano Kava by EnjoyNano"
- [x] Inspect `dist/mushrooms/index.html` — contains mushrooms page content, correct `<title>` "Nano Mushroom Extracts | Nanoemulsified Functional Mushrooms — EnjoyNano"
- [ ] Run `npm run preview` — navigate all 4 routes, confirm pages render and hydrate correctly
- [ ] Test interactivity after hydration: form validation, theme toggle, NanoScene animations, phone/email click tracking
- [ ] Test navigation between routes — React Router client-side transitions should still work
- [x] Run `npm run test` — all existing tests pass (1 test file, 1 test)

### Phase 4: Deploy & Validate

- [ ] `npm run build && firebase deploy`
- [ ] `curl -s https://enjoynano.com/ | head -100` — verify rendered HTML served
- [ ] `curl -s https://enjoynano.com/faq | head -100` — verify rendered HTML
- [ ] Test on mobile device — confirm pages load, scroll, animate correctly
- [ ] Test a non-existent route (e.g., `/nonexistent`) — should still hit SPA rewrite and show 404 page
- [ ] Open each page in incognito — verify no hydration mismatch warnings in console
- [ ] Verify GTM events still fire: page_view on navigation, phone_click / email_click on link clicks

### Phase 5: SEO Validation

- [ ] [Google Rich Results Test](https://search.google.com/test/rich-results) — test each URL, confirm structured data renders
- [ ] [PageSpeed Insights](https://pagespeed.web.dev) — run on each URL, compare LCP/FCP to pre-change baseline
- [ ] [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) — paste each URL, confirm OG tags appear
- [ ] Google Search Console — request re-indexing for all 4 URLs
- [ ] Google Search Console — monitor "Pages" report over next 1-2 weeks for indexing improvements
- [ ] Run Lighthouse audit on each page — target green scores for Performance and SEO

---

## Code Snippets

### `vite.config.js` (updated)

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import prerender from 'vite-plugin-prerender';

export default defineConfig({
  plugins: [
    react(),
    prerender({
      routes: ['/', '/faq', '/contact', '/mushrooms'],
    }),
  ],
  server: { port: 3000, open: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setupTests.js'],
  },
  build: { outDir: 'dist', sourcemap: false },
});
```

> **Note:** The exact plugin API may differ — check the latest docs during Phase 1. Some prerender plugins use `PrerenderSPAPlugin` from `prerender-spa-plugin` instead. The correct plugin and config should be confirmed before implementation.

### `src/main.jsx` (updated)

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = document.getElementById('root');

if (root.hasChildNodes()) {
  // Pre-rendered HTML exists — hydrate to preserve it
  ReactDOM.hydrateRoot(root, <React.StrictMode><App /></React.StrictMode>);
} else {
  // Dev server or fallback — full client render
  ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
}
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Plugin incompatibility with Vite 5 | Build fails | Research alternatives: `@prerenderer/rollup-plugin`, `vite-plugin-ssr`, or manual Puppeteer script |
| Canvas prerender captures blank frame | White rectangle until JS loads | Acceptable — NanoScene initializes fast. Could add CSS background-color matching the canvas bg as fallback |
| Theme flash (dark→light or vice versa) | Brief visual flicker on load | Optional: inline `<script>` in index.html reads localStorage theme before React loads |
| Hydration mismatch warnings | Console noise, potential UI glitch | Ensure prerendered HTML matches client render. Avoid `Date.now()` or `Math.random()` in initial render |
| Build time increase | Slower CI/CD | Only 4 routes — should add <10s. Monitor and optimize if needed |

---

## Out of Scope

These are related but separate tasks — not part of this implementation:

- Server-Side Rendering (SSR) — overkill for a 4-page static site
- Dynamic rendering (user-agent detection) — only needed for dynamic content
- Blog/CMS integration — would require additional prerender routes
- Image optimization (WebP/AVIF conversion, lazy loading) — separate performance task
- OG image generation — separate SEO task
