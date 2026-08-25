/**
 * @file: src/seo/routes.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Single source of truth for the site's public routes. The prerenderer, the sitemap
 *     generator and the feed generator all read this list, so adding a route here is the
 *     only edit needed for it to be crawled, prerendered and indexed.
 *
 * @See Also:
 *     scripts/prerender.mjs
 *     scripts/generate-seo-assets.mjs
 *     src/AppRoutes.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies. All Rights Reserved.
 * ---
 */

export const SITE = 'https://enjoynano.com';

/**
 * A route that is prerendered to static HTML and listed in sitemap.xml / the feeds.
 * `markdown` is the plain-text alternate advertised to AI crawlers via Link headers.
 */
export const ROUTES = [
  {
    path: '/',
    markdown: '/index.md',
    changefreq: 'weekly',
    priority: '1.0',
    title: "Nano Kava — the world's first ~18nm kava nanoemulsion",
    summary:
      'Nano-emulsified kava with an approximately 18 nanometer droplet size: ~10x the bioavailability of traditional kava extract, 80–90% kavalactone absorption, ~5-minute onset, crystal clear and fully water-soluble.',
    image: '/og-image.png',
  },
  {
    path: '/faq',
    markdown: '/faq.md',
    changefreq: 'monthly',
    priority: '0.9',
    title: 'Nano Kava FAQ — kavalactone questions answered',
    summary:
      'Eighteen answered questions on nano kava: particle size, dosing, safety, taste, clarity, shelf stability, minimum order quantity, certifications and regulatory documentation.',
  },
  {
    path: '/mushrooms',
    markdown: '/mushrooms.md',
    changefreq: 'weekly',
    priority: '0.8',
    title: 'Nano Mushroom extracts — nanoemulsified functional mushrooms',
    summary:
      "Nanoemulsified Lion's Mane, Reishi and Cordyceps extracts built on the same nanoemulsion platform as Nano Kava, for water-soluble, high-bioavailability functional beverages.",
  },
  {
    path: '/contact',
    markdown: '/contact.md',
    changefreq: 'yearly',
    priority: '0.7',
    title: 'Contact Cannasol Technologies — request a free Nano Kava sample',
    summary:
      'Talk to Josh Detzel about Nano Kava samples, pricing, minimum order quantity and formulation support for your beverage brand.',
  },
];

/** Absolute URL for a route path, with no trailing slash except the root. */
export const absolute = (path) => `${SITE}${path === '/' ? '/' : path}`;

/** Where prerendered HTML for a route is written inside dist/. */
export const outputFile = (path) =>
  path === '/' ? 'index.html' : `${path.replace(/^\//, '')}/index.html`;
