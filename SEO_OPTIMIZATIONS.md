# SEO Optimizations — Nano Kava Landing Page

> **Purpose**: Comprehensive SEO audit with actionable improvements to maximize organic search visibility for target keywords: *nano kava*, *kavalactones*, *nanokava*, *nano emulsified kava*, *kava extract*, and related terms.
>
> **Domain**: `enjoynano.com`
>
> **Date**: 2025-02-10
>
> **Rule**: No changes should alter visual appearance or functionality.

---

## Table of Contents

| #  | Optimization | Severity | Status |
|----|-------------|----------|--------|
| 1  | [Wrong Domain References (15+ instances) - FIXED](#1-wrong-domain-references-15-instances---fixed) | CRITICAL | **FIXED** |
| 2  | [Title Tag Too Long & Not Keyword-Optimized - FIXED](#2-title-tag-too-long--not-keyword-optimized---fixed) | CRITICAL | **FIXED** |
| 3  | [Meta Description Too Long & Generic - FIXED](#3-meta-description-too-long--generic---fixed) | CRITICAL | **FIXED** |
| 4  | [No Per-Page Meta Tags (Single Static Set) - FIXED](#4-no-per-page-meta-tags-single-static-set---fixed) | CRITICAL | **FIXED** |
| 5  | [Static Canonical Tag (Same for All Routes) - FIXED](#5-static-canonical-tag-same-for-all-routes---fixed) | CRITICAL | **FIXED** |
| 6  | [Sitemap Missing /mushrooms Route - FIXED](#6-sitemap-missing-mushrooms-route---fixed) | HIGH | **FIXED** |
| 7  | [Sitemap Stale Dates - FIXED](#7-sitemap-stale-dates---fixed) | HIGH | **FIXED** |
| 8  | [robots.txt Wrong Domain - FIXED](#8-robotstxt-wrong-domain---fixed) | HIGH | **FIXED** |
| 9  | [Schema.org Structured Data — Wrong URLs - FIXED](#9-schemaorg-structured-data--wrong-urls---fixed) | HIGH | **FIXED** |
| 10 | [H1 Tags Not Keyword-Optimized on Subpages - FIXED](#10-h1-tags-not-keyword-optimized-on-subpages---fixed) | HIGH | **FIXED** |
| 11 | [FAQ Semantic HTML (button → h3) - FIXED](#11-faq-semantic-html-button--h3---fixed) | HIGH | **FIXED** |
| 12 | [OG Image Uses Logo Instead of Hero Image](#12-og-image-uses-logo-instead-of-hero-image) | MEDIUM | TODO |
| 13 | [Missing apple-touch-icon](#13-missing-apple-touch-icon) | MEDIUM | TODO |
| 14 | [No 404 Error Page - FIXED](#14-no-404-error-page---fixed) | MEDIUM | **FIXED** |
| 15 | [Client-Side Rendering Only (No SSR / Prerendering)](#15-client-side-rendering-only-no-ssrprerendering) | MEDIUM | TODO |
| 16 | [Code Splitting for Core Web Vitals - FIXED](#16-code-splitting-for-core-web-vitals---fixed) | MEDIUM | **FIXED** |
| 17 | [Missing Security Headers in Firebase Config - FIXED](#17-missing-security-headers-in-firebase-config---fixed) | MEDIUM | **FIXED** |
| 18 | [Source Maps Enabled in Production - FIXED](#18-source-maps-enabled-in-production---fixed) | MEDIUM | **FIXED** |
| 19 | [External Links Missing rel="noopener noreferrer" - FIXED](#19-external-links-missing-relnoopener-noreferrer---fixed) | LOW | **FIXED** |
| 20 | [Image Alt Text Improvements](#20-image-alt-text-improvements) | LOW | TODO |
| 21 | [Add Internal Linking Strategy](#21-add-internal-linking-strategy) | LOW | TODO |
| 22 | [HTML Cache-Control Headers - FIXED](#22-html-cache-control-headers---fixed) | LOW | **FIXED** |
| 23 | [Add Breadcrumb Structured Data - FIXED](#23-add-breadcrumb-structured-data---fixed) | LOW | **FIXED** |
| 24 | [Keyword Density & Content Strategy](#24-keyword-density--content-strategy) | LOW | TODO |
| 25 | [Add hreflang Tag (Future-Proofing) - FIXED](#25-add-hreflang-tag-future-proofing---fixed) | LOW | **FIXED** |

---

## CRITICAL Severity

---

### 1. Wrong Domain References (15+ instances) - FIXED

**Impact**: All canonical URLs, Open Graph tags, structured data, sitemap, and robots.txt reference `kava.cannasoltechnologies.com` instead of `enjoynano.com`. Search engines index the WRONG domain, OG shares point to the wrong URL, and structured data references a domain that may not resolve to this site.

**Current State**: 15+ references across multiple files:

**`index.html`** — 9+ references:
```html
<link rel="canonical" href="https://kava.cannasoltechnologies.com/" />
<meta property="og:url" content="https://kava.cannasoltechnologies.com/" />
<meta property="og:image" content="https://kava.cannasoltechnologies.com/cannasol-logo.png" />
<!-- Plus all JSON-LD schema @id, url, image fields -->
```

**`public/sitemap.xml`** — 3 references:
```xml
<loc>https://kava.cannasoltechnologies.com/</loc>
<loc>https://kava.cannasoltechnologies.com/faq</loc>
<loc>https://kava.cannasoltechnologies.com/contact</loc>
```

**`public/robots.txt`** — 2 references:
```
# Nano Kava Landing Page - kava.cannasoltechnologies.com
Sitemap: https://kava.cannasoltechnologies.com/sitemap.xml
```

**Fix**: Global find-and-replace `kava.cannasoltechnologies.com` → `enjoynano.com` across ALL files:

```bash
# Files to update:
# - index.html (canonical, og:url, og:image, all JSON-LD urls)
# - public/sitemap.xml (all <loc> tags)
# - public/robots.txt (comment + Sitemap directive)
```

After replacing, every URL should look like:
```html
<link rel="canonical" href="https://enjoynano.com/" />
<meta property="og:url" content="https://enjoynano.com/" />
```

**Priority**: Do this FIRST — everything else builds on correct domain references.

---

### 2. Title Tag Too Long & Not Keyword-Optimized - FIXED

**Impact**: Title tags are the single most important on-page ranking factor. Current title is 80 characters (Google truncates at ~60) and buries the primary keyword.

**Current** (`index.html:7`):
```html
<title>Nano Kava by Cannasol Technologies | Premium Nano-Emulsified Kavalactones</title>
```
- 80 characters — truncated in SERPs
- "Cannasol Technologies" wastes valuable keyword space
- Primary keyword "Nano Kava" is present but diluted

**Recommended**:
```html
<title>Nano Kava | Premium Nano-Emulsified Kavalactones — EnjoyNano</title>
```
- 59 characters — within limit
- Primary keyword "Nano Kava" is first (position-weighted)
- Secondary keyword "Kavalactones" included
- Brand "EnjoyNano" at the end (brand searches still match)

**Alternative options** (pick based on keyword priority):
```
Nano Kava Drops | Fast-Absorbing Kavalactones — EnjoyNano     (56 chars)
NanoKava™ | Nano-Emulsified Kava Extract — EnjoyNano           (53 chars)
Nano Kava | #1 Nano-Emulsified Kava Drops — EnjoyNano          (54 chars)
```

---

### 3. Meta Description Too Long & Generic - FIXED

**Impact**: Meta descriptions don't directly affect ranking but strongly affect click-through rate (CTR) from SERPs. Current description is 223 characters — Google truncates at ~155.

**Current** (`index.html:10`):
```html
<meta name="description" content="Experience the next evolution in kava technology.
Cannasol Technologies' nano-emulsified kavalactones deliver up to 5x faster
absorption with our proprietary NanoSorb™ technology. Premium quality, rapid onset,
maximum bioavailability." />
```

**Recommended**:
```html
<meta name="description" content="Nano-emulsified kava drops with up to 5x faster absorption. Premium kavalactones powered by NanoSorb™ technology. Feel it in minutes, not hours." />
```
- 153 characters — within limit
- Front-loads keywords: "nano-emulsified kava", "kavalactones"
- Includes differentiator: "5x faster absorption"
- Includes branded term: "NanoSorb™"
- Ends with compelling hook: "Feel it in minutes, not hours"

---

### 4. No Per-Page Meta Tags (Single Static Set) - FIXED

**Impact**: All 4 routes (`/`, `/faq`, `/contact`, `/mushrooms`) share the SAME title, description, canonical, and OG tags from `index.html`. This means:
- Google sees duplicate metadata across all pages
- Each page cannot rank for its own keywords
- OG shares from any page show the homepage info

**Fix**: Install `react-helmet-async` and add per-page `<Helmet>` blocks.

**Step 1** — Install:
```bash
npm install react-helmet-async
```

**Step 2** — Wrap app in `HelmetProvider` (`App.jsx`):
```jsx
import { HelmetProvider } from 'react-helmet-async';

// Wrap at the top level:
<HelmetProvider>
  <Router>
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  </Router>
</HelmetProvider>
```

**Step 3** — Add `<Helmet>` to each page component:

**`KavaLandingPage.jsx`**:
```jsx
import { Helmet } from 'react-helmet-async';

// Inside the component return:
<Helmet>
  <title>Nano Kava | Premium Nano-Emulsified Kavalactones — EnjoyNano</title>
  <meta name="description" content="Nano-emulsified kava drops with up to 5x faster absorption. Premium kavalactones powered by NanoSorb™ technology. Feel it in minutes, not hours." />
  <link rel="canonical" href="https://enjoynano.com/" />
  <meta property="og:title" content="Nano Kava | Premium Nano-Emulsified Kavalactones" />
  <meta property="og:description" content="Nano-emulsified kava drops with up to 5x faster absorption. Premium kavalactones powered by NanoSorb™ technology." />
  <meta property="og:url" content="https://enjoynano.com/" />
</Helmet>
```

**`FAQPage.jsx`**:
```jsx
<Helmet>
  <title>Nano Kava FAQ | Kavalactone Questions Answered — EnjoyNano</title>
  <meta name="description" content="Frequently asked questions about nano kava, kavalactones, NanoSorb™ technology, dosing, safety, and nano-emulsified kava benefits." />
  <link rel="canonical" href="https://enjoynano.com/faq" />
  <meta property="og:title" content="Nano Kava FAQ — Kavalactones Questions Answered" />
  <meta property="og:url" content="https://enjoynano.com/faq" />
</Helmet>
```

**`ContactPage.jsx`**:
```jsx
<Helmet>
  <title>Contact Us | Nano Kava by EnjoyNano</title>
  <meta name="description" content="Get in touch with the EnjoyNano team. Questions about nano kava, wholesale orders, or NanoSorb™ technology? We'd love to hear from you." />
  <link rel="canonical" href="https://enjoynano.com/contact" />
  <meta property="og:title" content="Contact EnjoyNano — Nano Kava Team" />
  <meta property="og:url" content="https://enjoynano.com/contact" />
</Helmet>
```

**`MushroomsLandingPage.jsx`**:
```jsx
<Helmet>
  <title>Nano Mushroom Extracts | Nanoemulsified Functional Mushrooms — EnjoyNano</title>
  <meta name="description" content="Nanoemulsified functional mushroom extracts for maximum bioavailability. Lion's Mane, Reishi, Cordyceps, and more — powered by NanoSorb™ technology." />
  <link rel="canonical" href="https://enjoynano.com/mushrooms" />
  <meta property="og:title" content="Nano Mushroom Extracts — Nanoemulsified Functional Mushrooms" />
  <meta property="og:url" content="https://enjoynano.com/mushrooms" />
</Helmet>
```

**Step 4** — Remove static meta tags from `index.html` that will be managed by Helmet (keep only fallback `<title>` and move everything else to components).

---

### 5. Static Canonical Tag (Same for All Routes) - FIXED

**Impact**: The canonical tag tells Google "this is the definitive URL for this content." Currently, ALL pages point to the homepage canonical:

```html
<link rel="canonical" href="https://kava.cannasoltechnologies.com/" />
```

This tells Google that `/faq`, `/contact`, and `/mushrooms` are all duplicates of the homepage. Google may:
- De-index subpages entirely
- Ignore subpage content for ranking
- Consolidate all ranking signals to the homepage only

**Fix**: This is solved by implementing **#4 (Per-Page Meta Tags)** — each page gets its own canonical:
```
https://enjoynano.com/           → homepage
https://enjoynano.com/faq        → FAQ page
https://enjoynano.com/contact    → Contact page
https://enjoynano.com/mushrooms  → Mushrooms page
```

---

## HIGH Severity

---

### 6. Sitemap Missing /mushrooms Route - FIXED

**Impact**: The `/mushrooms` page is NOT in the sitemap, meaning Google may take longer to discover and index it.

**Current** (`public/sitemap.xml`):
```xml
<url><loc>https://kava.cannasoltechnologies.com/</loc>...</url>
<url><loc>https://kava.cannasoltechnologies.com/faq</loc>...</url>
<url><loc>https://kava.cannasoltechnologies.com/contact</loc>...</url>
<!-- /mushrooms is MISSING -->
```

**Fix**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://enjoynano.com/</loc>
    <lastmod>2025-02-10</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://enjoynano.com/faq</loc>
    <lastmod>2025-02-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://enjoynano.com/contact</loc>
    <lastmod>2025-02-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://enjoynano.com/mushrooms</loc>
    <lastmod>2025-02-10</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>
```

---

### 7. Sitemap Stale Dates - FIXED

**Impact**: All `<lastmod>` dates are `2024-12-08`. Stale dates signal to crawlers that content hasn't changed, potentially reducing crawl frequency.

**Fix**: Update dates whenever content changes. Consider automating this as part of the build process:

```js
// vite.config.js plugin or build script
// Replace dates in sitemap.xml with current date on build
```

Or simply update manually with each deployment.

---

### 8. robots.txt Wrong Domain - FIXED

**Impact**: The Sitemap directive in `robots.txt` points crawlers to the wrong sitemap URL.

**Current** (`public/robots.txt`):
```
# Nano Kava Landing Page - kava.cannasoltechnologies.com
User-agent: *
Allow: /

Sitemap: https://kava.cannasoltechnologies.com/sitemap.xml
```

**Fix**:
```
# Nano Kava Landing Page - enjoynano.com
User-agent: *
Allow: /

Sitemap: https://enjoynano.com/sitemap.xml
```

---

### 9. Schema.org Structured Data — Wrong URLs - FIXED

**Impact**: JSON-LD structured data contains 3 schema blocks (Organization, Product, FAQPage) all referencing the wrong domain. This affects rich snippet eligibility in Google search results.

**Current** (`index.html` — JSON-LD blocks):
```json
{
  "@type": "Organization",
  "url": "https://kava.cannasoltechnologies.com",
  "@id": "https://kava.cannasoltechnologies.com/#organization",
  "image": "https://kava.cannasoltechnologies.com/cannasol-logo.png"
}
```

**Fix**: Update ALL URLs in all 3 JSON-LD blocks to `enjoynano.com`. Additionally, enhance the Product schema:

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Nano Kava — Nano-Emulsified Kavalactones",
  "description": "Premium nano-emulsified kavalactone drops with up to 5x faster absorption powered by NanoSorb™ technology.",
  "url": "https://enjoynano.com/",
  "brand": {
    "@type": "Brand",
    "name": "EnjoyNano"
  },
  "manufacturer": {
    "@type": "Organization",
    "name": "Cannasol Technologies"
  },
  "image": "https://enjoynano.com/nano-kava-product.jpg",
  "category": "Health & Wellness > Herbal Supplements > Kava",
  "keywords": ["nano kava", "kavalactones", "nano-emulsified kava", "NanoSorb", "kava drops", "kava extract"]
}
```

Also update the Organization schema:
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "EnjoyNano by Cannasol Technologies",
  "url": "https://enjoynano.com",
  "@id": "https://enjoynano.com/#organization",
  "logo": "https://enjoynano.com/cannasol-logo.png",
  "sameAs": [
    "https://www.instagram.com/enjoynano/",
    "https://www.facebook.com/enjoynano/"
  ]
}
```

> **Note**: Add actual social media profile URLs to `sameAs` for social graph linking.

---

### 10. H1 Tags Not Keyword-Optimized on Subpages - FIXED

**Impact**: H1 is the most weighted heading for SEO. Subpages use generic H1s that waste keyword opportunity.

**Current H1 Tags**:
| Page | Current H1 | Problem |
|------|-----------|---------|
| `/` (KavaLandingPage) | "Nano Kava" | Too short — misses secondary keywords |
| `/faq` (FAQPage) | "Frequently Asked Questions" | Completely generic, no keywords |
| `/contact` (ContactPage) | "Let's Connect" | No keywords at all |
| `/mushrooms` (MushroomsLandingPage) | "Nanoemulsified Functional Mushrooms" | Good as-is |

**Recommended H1 Tags**:
| Page | Recommended H1 |
|------|---------------|
| `/` | "Nano Kava — Premium Nano-Emulsified Kavalactones" |
| `/faq` | "Nano Kava FAQ — Your Kavalactone Questions Answered" |
| `/contact` | "Contact EnjoyNano — Nano Kava Support" |
| `/mushrooms` | "Nanoemulsified Functional Mushrooms" (keep as-is) |

**Implementation**: Update the H1 elements in each component. The visual appearance can remain similar — use `<span className="sr-only">` for the SEO-only portions if needed to keep the visual design unchanged:

```jsx
// Example: KavaLandingPage H1
<h1>
  Nano Kava
  <span className="sr-only"> — Premium Nano-Emulsified Kavalactones</span>
</h1>
```

This keeps the visual appearance identical while giving Google the full keyword-rich heading.

---

### 11. FAQ Semantic HTML (button → h3) - FIXED

**Impact**: FAQ questions are rendered as `<button>` elements inside `<div>`s. Google's FAQ rich snippet crawler looks for semantic heading hierarchy. Using proper headings improves both SEO and accessibility.

**Current** (`FAQPage.jsx`):
```jsx
<button onClick={() => toggle(idx)} className="w-full flex items-center ...">
  <span className="text-left font-medium">{item.q}</span>
</button>
```

**Recommended**:
```jsx
<h3>
  <button onClick={() => toggle(idx)} className="w-full flex items-center ...">
    <span className="text-left font-medium">{item.q}</span>
  </button>
</h3>
```

This is the accessible accordion pattern recommended by W3C WAI. The `<h3>` wraps the `<button>`, preserving all click behavior while giving the question semantic heading weight.

Additionally, add `<details>`/`<summary>` as progressive enhancement or use `role="region"` with `aria-labelledby` on the answer panels.

---

## MEDIUM Severity

---

### 12. OG Image Uses Logo Instead of Hero Image

**Impact**: When the site is shared on social media (Facebook, Twitter, LinkedIn, Slack, Discord), the preview image is just the logo. A compelling product/hero image dramatically increases click-through from social shares.

**Current**:
```html
<meta property="og:image" content="https://kava.cannasoltechnologies.com/cannasol-logo.png" />
```

**Recommended**:
1. Create a dedicated OG image (1200×630px) featuring:
   - Product shot or hero visual
   - "Nano Kava" text overlay
   - Brand colors (emerald/teal gradient)
   - "enjoynano.com" URL visible
2. Save as `public/og-image.jpg` (JPEG for smaller file size)
3. Update:
```html
<meta property="og:image" content="https://enjoynano.com/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:type" content="image/jpeg" />
<meta name="twitter:image" content="https://enjoynano.com/og-image.jpg" />
```

Per-page OG images are even better — each page gets its own social preview card via `react-helmet-async` (see #4).

---

### 13. Missing apple-touch-icon

**Impact**: When users save the site to their iPhone/iPad home screen, iOS shows a generic screenshot instead of a branded icon. Also signals site maturity to crawlers.

**Fix**: Create a 180×180px PNG icon and add to `index.html`:
```html
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
```

Also consider adding a full favicon set:
```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="manifest" href="/site.webmanifest" />
```

---

### 14. No 404 Error Page - FIXED

**Impact**: When users (or crawlers) hit a nonexistent URL, the SPA rewrites serve the homepage with a 200 status. This is a "soft 404" — Google may:
- Index garbage URLs as duplicates of the homepage
- Waste crawl budget on nonexistent pages
- Show confusing search results

**Fix**: Add a catch-all route in `AppRoutes.jsx`:
```jsx
import NotFoundPage from '../components/NotFoundPage';

// In Routes:
<Route path="*" element={<NotFoundPage />} />
```

Create a minimal `NotFoundPage.jsx`:
```jsx
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>Page Not Found — EnjoyNano</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold">404</h1>
          <p className="mt-4 text-xl">Page not found</p>
          <Link to="/" className="mt-8 inline-block ...">
            Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
```

> **Note**: Firebase Hosting SPA rewrites (`"rewrites": [{"source": "**", "destination": "/index.html"}]`) will still serve 200 status for all URLs. To return actual 404 status codes, you'd need server-side rendering or Cloud Functions middleware. The client-side 404 page with `<meta name="robots" content="noindex">` is the best SPA-only solution.

---

### 15. Client-Side Rendering Only (No SSR/Prerendering)

**Impact**: The site is a client-side rendered SPA. When Google crawls it, the initial HTML is an empty `<div id="root">`. Google does execute JavaScript, but:
- There's a rendering delay (lower priority in crawl queue)
- Some crawlers (Bing, social media scrapers) may not execute JS at all
- Core Web Vitals (LCP, FCP) are worse for CSR

**Options** (from easiest to most complex):

**Option A — Prerendering at build time (Recommended)**:
Use `vite-plugin-prerender` or `react-snap` to generate static HTML for each route at build time:
```bash
npm install --save-dev vite-plugin-prerender
```
```js
// vite.config.js
import prerender from 'vite-plugin-prerender';

export default {
  plugins: [
    prerender({
      routes: ['/', '/faq', '/contact', '/mushrooms'],
    }),
  ],
};
```
This outputs fully-rendered HTML that Google can index immediately, while React hydrates on the client for interactivity.

**Option B — Dynamic rendering with Rendertron**:
Use Firebase Cloud Functions to serve prerendered HTML to crawlers only. More complex but handles dynamic content.

**Option C — Migrate to Next.js/Remix**:
Full SSR/SSG framework. Most SEO-friendly but requires significant rewrite. Only consider for a future version.

**Recommendation**: Option A gives 80% of the SEO benefit with minimal effort.

---

### 16. Code Splitting for Core Web Vitals - FIXED

**Impact**: All pages are bundled into a single JS file. Users visiting the homepage download code for FAQ, Contact, and Mushrooms pages they may never visit. This increases:
- Time to Interactive (TTI)
- Largest Contentful Paint (LCP)
- Total Blocking Time (TBT)

Google uses Core Web Vitals as a ranking signal.

**Fix**: Use `React.lazy` and `Suspense` in `AppRoutes.jsx`:
```jsx
import React, { Suspense, lazy } from 'react';

const KavaLandingPage = lazy(() => import('../components/KavaLandingPage'));
const FAQPage = lazy(() => import('../components/FAQPage'));
const ContactPage = lazy(() => import('../components/ContactPage'));
const MushroomsLandingPage = lazy(() => import('../components/MushroomsLandingPage'));

function AppRoutes() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Routes>
        <Route path="/" element={<KavaLandingPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/mushrooms" element={<MushroomsLandingPage />} />
      </Routes>
    </Suspense>
  );
}
```

Vite will automatically split each page into its own chunk. The homepage bundle could shrink by 30-50%.

---

### 17. Missing Security Headers in Firebase Config - FIXED

**Impact**: Security headers don't directly affect SEO ranking, but Google considers site security as a trust signal. Missing headers can also lead to security issues that cause Google to flag the site.

**Current** (`firebase.json`): Only has cache headers for assets.

**Recommended** additions to `firebase.json`:
```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "X-Frame-Options", "value": "DENY" },
          { "key": "X-XSS-Protection", "value": "1; mode=block" },
          { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
          { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ]
  }
}
```

---

### 18. Source Maps Enabled in Production - FIXED

**Impact**: Source maps expose your full source code to anyone who opens DevTools. While not a direct SEO issue, it's a security/professionalism concern and slightly increases deploy size.

**Fix**: Disable source maps in `vite.config.js`:
```js
export default defineConfig({
  build: {
    sourcemap: false, // or 'hidden' for error tracking services
  },
});
```

---

## LOW Severity

---

### 19. External Links Missing rel="noopener noreferrer" - FIXED

**Impact**: External links without `rel="noopener noreferrer"` can leak referrer data and (in older browsers) allow the linked page to access `window.opener`. Also a minor security signal.

**Found in**: `KavaLandingPage.jsx` (lines ~942-943) — Instagram/TikTok links in the CTA section.

**Fix**: Add `rel="noopener noreferrer"` to all external `<a>` tags:
```jsx
<a href="https://instagram.com/..." target="_blank" rel="noopener noreferrer">
```

---

### 20. Image Alt Text Improvements

**Impact**: Alt text helps Google Image Search understand image content and improves accessibility scores (which correlate with SEO).

**Audit areas**:
- Logo images should have descriptive alt: `alt="EnjoyNano — Nano Kava Logo"`
- Decorative images should have empty alt: `alt=""`
- Any product images should describe the product: `alt="Nano Kava drops bottle — nano-emulsified kavalactones"`

Review all `<img>` tags across components and ensure each has appropriate, keyword-aware alt text.

---

### 21. Add Internal Linking Strategy

**Impact**: Internal links distribute "link juice" (PageRank) and help Google discover/understand page relationships. Currently, the navigation links between pages, but there's no contextual cross-linking.

**Recommendations**:
- **Homepage → FAQ**: Add a "Have questions? See our FAQ" link in the CTA section
- **Homepage → Mushrooms**: Add a "Explore our Mushroom line" teaser/link
- **FAQ → Contact**: Add "Still have questions? Contact us" at the bottom
- **FAQ → Homepage**: Link product mentions back to the main product page
- **Mushrooms → Homepage**: Cross-link between product lines
- **Contact → FAQ**: "Check our FAQ first" suggestion

Each link should use keyword-rich anchor text:
```html
<!-- Good -->
<a href="/faq">nano kava FAQ</a>

<!-- Bad -->
<a href="/faq">click here</a>
```

---

### 22. HTML Cache-Control Headers - FIXED

**Impact**: Currently, `firebase.json` only sets cache headers for static assets (images, JS, CSS). HTML files have no cache policy, meaning browsers may cache HTML pages and show stale meta tags/content.

**Fix**: Add to `firebase.json`:
```json
{
  "source": "**/*.html",
  "headers": [
    { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }
  ]
}
```

This ensures crawlers and browsers always get the latest HTML with updated meta tags.

---

### 23. Add Breadcrumb Structured Data - FIXED

**Impact**: Breadcrumb schema enables breadcrumb display in Google search results, improving CTR and showing site hierarchy.

**Add to each page via JSON-LD**:

**Homepage** (no breadcrumb needed — it IS the root)

**FAQ Page**:
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://enjoynano.com/" },
    { "@type": "ListItem", "position": 2, "name": "Nano Kava FAQ", "item": "https://enjoynano.com/faq" }
  ]
}
```

**Contact Page**:
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://enjoynano.com/" },
    { "@type": "ListItem", "position": 2, "name": "Contact", "item": "https://enjoynano.com/contact" }
  ]
}
```

This can be added statically in `index.html` or dynamically via `react-helmet-async`.

---

### 24. Keyword Density & Content Strategy

**Impact**: Target keyword presence in page content signals relevance to Google. Here's an analysis of keyword density and recommendations:

**Target Keywords** (primary → long-tail):
1. `nano kava` — primary branded term
2. `kavalactones` — high-intent ingredient search
3. `nano-emulsified kava` — technical differentiator
4. `nanokava` / `nano kava drops` — brand variations
5. `kava extract` — broad category
6. `fast-absorbing kava` — benefit keyword
7. `kava bioavailability` — technical intent
8. `NanoSorb` / `NanoSorb technology` — branded technology

**Content Recommendations** (without changing visuals):

- **Homepage hero subtitle**: Include "nano-emulsified kavalactones" and "kava drops" in the subtitle/description text
- **Feature cards**: Ensure each card's descriptive text naturally includes at least one target keyword
- **Process timeline**: Mention "kavalactones", "nano-emulsification", "bioavailability" in step descriptions
- **FAQ questions**: Many already contain target keywords — good! Ensure answers also repeat keywords naturally
- **Alt text**: As mentioned in #20, use keywords in image descriptions

**Consider adding**:
- A "What is Nano Kava?" section on the homepage (H2) — Google loves definition-style content for informational queries
- A blog or articles section at `/blog` (future) for long-tail keyword targeting

---

### 25. Add hreflang Tag (Future-Proofing) - FIXED

**Impact**: If you ever serve content in multiple languages or target specific regions, `hreflang` tells Google which version to show users.

**For now** (English-only, US-targeted):
```html
<link rel="alternate" hreflang="en-US" href="https://enjoynano.com/" />
<link rel="alternate" hreflang="x-default" href="https://enjoynano.com/" />
```

This is low priority but easy to add and signals geographic intent to Google.

---

## Google Search Console Setup

After implementing these changes, submit the site to Google Search Console:

1. **Verify domain ownership** at [search.google.com/search-console](https://search.google.com/search-console) for `enjoynano.com`
2. **Submit sitemap**: Enter `https://enjoynano.com/sitemap.xml`
3. **Request indexing** for all 4 pages: `/`, `/faq`, `/contact`, `/mushrooms`
4. **Monitor**: Check "Coverage" report for crawl errors, "Performance" for keyword rankings

Also submit to **Bing Webmaster Tools** at [bing.com/webmasters](https://www.bing.com/webmasters).

---

## Implementation Priority Order

For maximum SEO impact with minimum effort, implement in this order:

| Phase | Items | Effort | Impact |
|-------|-------|--------|--------|
| ~~**Phase 1 — Domain Fix**~~ | ~~#1~~, #8, #9 | 30 min | ~~Fixes fundamentally broken SEO~~ **#1 FIXED** |
| ~~**Phase 2 — Meta Tags**~~ | ~~#2, #3, #4, #5~~ | 1-2 hrs | ~~Enables per-page ranking + proper SERP display~~ **ALL FIXED** |
| **Phase 3 — Sitemap & Headings** | #6, #7, #10, #11 | 1 hr | Improves crawlability + on-page signals |
| **Phase 4 — Technical** | #14, #16, #17 | 1-2 hrs | Core Web Vitals + crawl quality |
| **Phase 5 — Content & Polish** | #12, #13, #19, #20, #21 | 1-2 hrs | Social sharing + content signals |
| **Phase 6 — Advanced** | #15, #22, #23, #24, #25 | 2-4 hrs | Maximum indexation + rich results |

---

## Summary

| Severity | Count | Key Theme |
|----------|-------|-----------|
| CRITICAL | 5/5 **ALL FIXED** | Domain, per-page SEO, title/description |
| HIGH | 6/6 **ALL FIXED** | Sitemap, structured data, headings, FAQ semantics |
| MEDIUM | 4/7 FIXED | 404 page, code splitting, security headers, source maps |
| LOW | 4/7 FIXED | Link rels, cache headers, breadcrumbs, hreflang |
| **TOTAL** | **19/25 FIXED** | |

**19 of 25 items have been FIXED.** Remaining 6 items require manual content/assets (#12 OG image, #13 apple-touch-icon, #15 SSR/prerendering, #20 alt text audit, #21 internal linking strategy, #24 keyword density content).
