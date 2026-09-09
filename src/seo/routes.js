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
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { faqCategories } from '../content/faq.js';

export const SITE = 'https://enjoynano.com';

const faqAnswerCount = faqCategories.reduce((count, category) => count + category.faqs.length, 0);

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
    title: 'Nano Kava — the first kava nanoemulsion, ~20 nm and 100% water-dispersible',
    summary:
      'Nano-emulsified kava with a mean particle size of ~20 nm: 100% water-dispersible, 30 mg/mL kavalactone load, 4–5x higher absorption than conventional kava powder, and crystal clear in the finished beverage.',
    image: '/og-image.png',
  },
  {
    path: '/faq',
    markdown: '/faq.md',
    changefreq: 'monthly',
    priority: '0.9',
    title: 'Nano Kava FAQ — kavalactone questions answered',
    summary: `${faqAnswerCount} answered questions on nano kava: particle size, dosing, safety, taste, clarity, shelf stability, pricing and samples, certifications and regulatory documentation.`,
  },
  {
    path: '/mushrooms',
    markdown: '/mushrooms.md',
    changefreq: 'weekly',
    priority: '0.8',
    title: 'Nano Mushroom extracts — nanoemulsified functional mushrooms',
    summary:
      "Nanoemulsified Lion's Mane, Reishi and Cordyceps extracts built on the same nanoemulsion platform as Nano Kava — water-dispersible, high-bioavailability functional beverages, dosed 15–35 mg per serving.",
  },
  {
    path: '/contact',
    markdown: '/contact.md',
    changefreq: 'yearly',
    priority: '0.7',
    title: 'Contact Cannasol Technologies — request a free Nano Kava sample',
    summary:
      'Talk to Josh Detzel about Nano Kava samples, pricing and formulation support for your beverage brand.',
  },
];

/** Absolute URL for a route path, with no trailing slash except the root. */
export const absolute = (path) => `${SITE}${path === '/' ? '/' : path}`;

/** Where prerendered HTML for a route is written inside dist/. */
export const outputFile = (path) =>
  path === '/' ? 'index.html' : `${path.replace(/^\//, '')}/index.html`;
