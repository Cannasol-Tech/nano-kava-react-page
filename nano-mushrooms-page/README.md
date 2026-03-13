# Nano Mushrooms Page — Cannasol Technologies

[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js%2014-black?logo=next.js)](https://nextjs.org)
[![SEO Optimized](https://img.shields.io/badge/SEO-Fully%20Optimized-green)](https://mushrooms.cannasoltechnologies.com)

Standalone landing page for **Cannasol Technologies' nano emulsified functional mushroom ingredients** — Lion's Mane, Reishi, and Cordyceps.

> **World's first company to nano emulsify Reishi mushrooms.** The same proprietary technology behind [drinkbrez.com](https://drinkbrez.com), now available at scale for functional beverage brands of all sizes.

---

## Why Next.js for SEO?

This application is built with **Next.js 14** configured for **static site generation (SSG)** — the gold standard for SEO-optimized web applications:

| Feature | Benefit |
|---------|---------|
| Static HTML export | Google crawls pure HTML — no JS execution required |
| `generateMetadata` API | Type-safe, page-level SEO metadata |
| JSON-LD structured data | Rich snippets: Organization, 3× Product, WebPage, FAQPage |
| `sitemap.js` | Auto-generated XML sitemap |
| `robots.js` | Auto-generated robots.txt |
| Open Graph + Twitter Card | Perfect social sharing previews |
| Inter font (preloaded) | Fast typography with no layout shift |
| Framer Motion animations | Progressive enhancement — content visible without JS |
| Core Web Vitals optimized | LCP, FID, CLS targets for Google ranking |
| Canonical URLs | Prevents duplicate content penalties |

---

## Getting Started

```bash
# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# Production build (static export → ./out/)
npm run build

# Serve production build locally
npx serve out
```

---

## Project Structure

```
nano-mushrooms-page/
├── app/
│   ├── layout.js              # Root layout: metadata + JSON-LD structured data
│   ├── page.js                # Home page (mushrooms landing)
│   ├── globals.css            # Global styles + Inter font
│   ├── sitemap.js             # Auto-generated sitemap.xml
│   ├── robots.js              # Auto-generated robots.txt
│   └── contact/
│       ├── page.js            # Contact page (metadata + server wrapper)
│       └── ContactPageClient.jsx  # Contact form (Netlify Forms compatible)
├── components/
│   ├── MushroomsPage.jsx      # Root client wrapper with ThemeProvider
│   ├── ThemeProvider.jsx      # Dark/light theme context
│   ├── Navigation.jsx         # Fixed nav with logo and theme toggle
│   ├── HeroSection.jsx        # Hero with gradient headline + CTAs
│   ├── ProductsSection.jsx    # Lion's Mane, Reishi, Cordyceps cards
│   ├── BenefitsSection.jsx    # Why nanoemulsification section
│   ├── CTASection.jsx         # Request samples CTA
│   └── Footer.jsx             # Footer with nav links
├── public/
│   ├── cannasol-logo.png      # Logo (dark mode)
│   ├── cannasol-logoW.png     # Logo (light mode)
│   └── favicon.svg
├── next.config.js             # Static export config
├── tailwind.config.js         # Tailwind with emerald/teal/cyan palette
└── package.json
```

---

## SEO Features

### Structured Data (JSON-LD)
Five schema.org structured data blocks in the page `<head>`:

1. **Organization** — Cannasol Technologies entity with contact info, logo, known-about topics
2. **WebPage** — Page entity with breadcrumbs
3. **Product** — Lion's Mane nano emulsified mushroom
4. **Product** — Reishi nano emulsified mushroom (world-first claim)
5. **Product** — Cordyceps nano emulsified mushroom
6. **FAQPage** — 6 Q&A pairs targeting high-value search queries

### Target Keywords
- `nano emulsified mushrooms`
- `nano emulsified reishi` (pioneering claim)
- `nano emulsified lion's mane`
- `nano emulsified cordyceps`
- `world's first nano reishi mushroom`
- `functional mushroom ingredients B2B`
- `mushroom beverage ingredients supplier`

### Technical SEO
- Canonical URLs on all pages
- `robots: { index: true, follow: true, googleBot: { 'max-snippet': -1, 'max-image-preview': 'large' } }`
- Geo tags (`geo.region: US-FL`, `geo.placename: Sarasota, Florida`)
- `theme-color` for mobile browsers
- Preconnect to Google Fonts (performance)
- `output: 'export'` — generates static HTML files, no server required

---

## Deployment

### Netlify (Recommended)
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "out"
```

The contact form uses **Netlify Forms** (`data-netlify="true"`) — works automatically on Netlify.

### Vercel
```bash
vercel --prod
```
> Note: With `output: 'export'`, disable the Vercel Edge Runtime for full static behavior.

### Any CDN / Static Host
Upload the `./out/` directory to any static hosting service (AWS S3 + CloudFront, GitHub Pages, Cloudflare Pages, etc.).

---

## Recommended Domain
```
https://mushrooms.cannasoltechnologies.com
```

---

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Next.js | 14.2.35 | Framework (SSG, metadata API, sitemap/robots) |
| React | 18.3.1 | UI components |
| Tailwind CSS | 3.4.0 | Utility-first styling |
| Framer Motion | 11.0.0 | Animations (progressive enhancement) |
| Lucide React | 0.294.0 | Icons |

---

## Brand Notes

- **Cannasol Technologies** was the **world's first** company to nano emulsify Reishi mushrooms
- The technology was deployed exclusively through **drinkbrez.com** before being made available at scale
- Three flagship products: **Lion's Mane** (focus), **Reishi** (calm), **Cordyceps** (performance)
- Sales contact: **(216) 921-2240** | **info@cannasoltechnologies.com**
- Based in **Sarasota, Florida**
