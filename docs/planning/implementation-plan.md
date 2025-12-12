# Nano Kava Landing Page - Implementation Plan

## Overview
Complete the Kava landing page and deploy it as a standalone site, with a redirect from the main Cannasol website.

---

## Milestone 1: Complete Landing Page (Current Sprint)

### 1.1 Fix Remaining UI Issues
- [x] Replace header logo placeholder with actual `cannasol-logo.png`
- [x] Replace footer logo placeholder with actual `cannasol-logo.png`
- [x] Add mobile hamburger menu (nav links currently hidden on mobile)

### 1.2 Add Contact Form
- [ ] Add a simple contact form to the CTA section
- [ ] Integrate with Netlify Forms (free, no backend needed)
- [ ] Add form validation and success/error states

### 1.3 SEO & Meta Tags
- [x] Add meta description, title, keywords to `index.html`
- [x] Add Open Graph tags for social sharing
- [x] Add Twitter Card tags
- [x] Add favicon (already have `favicon.svg`)

### 1.4 Add Nanoemulsified Mushrooms Landing Page (TDD)
- [x] Add feature spec in `docs/features/nanoemulsified-mushrooms-landing-page.md`
- [x] Add missing testing standards doc `docs/sw-testing-standards.md`
- [x] Add Vitest + React Testing Library and a `test` script
- [x] Add new route `/mushrooms` and new page component
- [x] Add navigation link(s) to the Mushrooms page
- [x] Verify all tests are passing

---

## Milestone 2: Deploy to Production

### 2.1 Deploy to Netlify
- [ ] Build production bundle (`npm run build`)
- [ ] Deploy to Netlify with custom subdomain
- [ ] Configure subdomain: `kava.cannasoltechnologies.com`

### 2.2 Set Up Redirect on Main Site
- [ ] Add redirect in WordPress: `/nano-kava` → `kava.cannasoltechnologies.com`
- [ ] Option A: WordPress plugin (Redirection or Simple 301 Redirects)
- [ ] Option B: Add to `.htaccess` file:
  ```apache
  Redirect 301 /nano-kava https://kava.cannasoltechnologies.com
  ```

### 2.3 DNS Configuration
- [ ] Add CNAME record for `kava` subdomain pointing to Netlify
- [ ] Verify SSL certificate is active

---

## Milestone 3: Future Enhancements (Post-Launch)

### 3.1 Analytics & Tracking
- [ ] Add Google Analytics or Plausible
- [ ] Set up conversion tracking for form submissions
- [ ] Add Meta Pixel if running Facebook ads

### 3.2 Content Enhancements
- [ ] Add customer testimonials section
- [ ] Add product images/videos
- [ ] Add FAQ section
- [ ] Add pricing information (if applicable)

### 3.3 Headless WordPress Integration (Future)
- [ ] Migrate main site to headless WordPress
- [ ] Move landing page into main React app as `/nano-kava` route
- [ ] Share components (header, footer, forms)
- [ ] Pull dynamic content from WordPress API

---

## Technical Notes

### Tech Stack
- **Framework**: React 18 + Vite 5
- **Styling**: TailwindCSS 3.4
- **Animations**: Framer Motion 11
- **Icons**: Lucide React

### Deployment
- **Hosting**: Netlify (recommended) or Vercel
- **Forms**: Netlify Forms (built-in, no backend)
- **Domain**: Subdomain of cannasoltechnologies.com

### File Structure
```
nano-kava-react-page/
├── public/
│   ├── cannasol-logo.png    # Logo asset
│   └── favicon.svg          # Favicon
├── src/
│   ├── components/
│   │   └── KavaLandingPage.jsx  # Main component
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
└── package.json
```

---

## Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| Header logo | ✅ Done | Using cannasol-logo.png |
| Footer logo | ✅ Done | Using cannasol-logo.png |
| Mobile menu | ✅ Done | Hamburger menu with animated dropdown |
| SEO meta tags | ✅ Done | OG + Twitter cards added |
| Contact form | ⏳ Pending | |
| Mushrooms landing page | ✅ Done | Route: `/mushrooms` |
| Netlify deploy | ⏳ Pending | |
| WordPress redirect | ⏳ Pending | |
