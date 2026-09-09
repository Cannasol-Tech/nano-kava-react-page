/**
 * @file: src/content/company.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Single source of truth for Cannasol company facts — identity, contact
 *     routes, hours, location and the sample offer. Consumed by the chatbot
 *     knowledge-base generator and available to page components.
 *
 * @See Also:
 *     src/content/product.js
 *     scripts/build-knowledge-base.mjs
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { faqCategories } from './faq.js';

const faqAnswerCount = faqCategories.reduce((count, category) => count + category.faqs.length, 0);

export const company = {
  legalName: 'Cannasol Technologies LLC',
  shortName: 'Cannasol',
  brand: 'Nano Kava',
  site: 'https://enjoynano.com',
  corporateSite: 'https://cannasoltechnologies.com',
  shop: 'https://cannasoltechnologies.com/shop/',
  resources: 'https://cannasoltechnologies.com/resources',
  model: 'B2B ingredient supplier to beverage brands, co-packers and formulators.',
  location: 'Sarasota, Florida 34234, United States',
  hours: 'Monday–Friday, 9:30 AM – 5:30 PM ET',
  phone: '(216) 921-2240',
  phoneHref: 'tel:+12169212240',
  founder: {
    name: 'Josh Detzel',
    title: 'Founder',
    email: 'josh.detzel@cannasolusa.com',
    directPhone: '(330) 808-0546',
  },
  responseTime: 'Josh replies within 24 hours.',
};

export const sampleOffer = {
  headline:
    "Free samples for qualified B2B evaluation, across the whole line: Kavalactone Nanoemulsion (the flagship), Lion's Mane Nanoemulsion, Reishi Nanoemulsion, Cordyceps Nanoemulsion and Bitter Blocker.",
  price: 'Free',
  moq: 'No minimum to get started — Cannasol works with brands at any volume, from a first development batch upward.',
  turnaround:
    "Tell us the format and target dose and the samples, COA and particle-size report are with you within a week.",
  steps: [
    'Confirm your ship-to address and the format you are developing.',
    'Samples ship with a COA and a particle-size report.',
    'Start formulating — support is available by phone.',
  ],
  kavaUrl: '/contact?inquiry=samples&product=nano-kava',
  mushroomUrl: '/contact?inquiry=samples&product=nano-mushrooms',
  lineUrls: [
    { name: 'Kavalactone Nanoemulsion', url: '/contact?inquiry=samples&product=nano-kava' },
    { name: "Lion's Mane Nanoemulsion", url: '/contact?inquiry=samples&product=lions-mane' },
    { name: 'Reishi Nanoemulsion', url: '/contact?inquiry=samples&product=reishi' },
    { name: 'Cordyceps Nanoemulsion', url: '/contact?inquiry=samples&product=cordyceps' },
    { name: 'Bitter Blocker', url: '/contact?inquiry=samples&product=bitter-blocker' },
  ],
};

export const equipment = {
  summary:
    'Cannasol Technologies also sells ultrasonic liquid processors and lab/filtration equipment through its corporate site.',
  range: '700W to 4000W',
  startingPrice: 'from $7,200',
  categories: ['Ultrasonic Equipment', 'Ingredients', 'Filtration Equipment', 'Lab Equipment'],
};

export const contactRoutes = {
  inquiryTypes: [
    'Request Samples',
    'Pricing & Volume Quotes',
    'Formulation Support',
    'Partnership Inquiry',
    'General Question',
    'Other',
  ],
  form: '/contact — name, email, company, phone, one or more inquiry types, and a message.',
  formPromise: 'The contact form emails Josh directly and he replies within 24 hours.',
  faqPage: `/faq — ${faqAnswerCount} answers across product & technology, effects & dosing, formulation & applications, ordering & partnership, and quality & compliance.`,
  mushroomsPage:
    "/mushrooms — the Nano Mushroom Emulsion line: Lion's Mane Nanoemulsion, Reishi Nanoemulsion and Cordyceps Nanoemulsion.",
  escalation:
    'A visitor who wants a human can use the contact form, call the office on (216) 921-2240 or Josh directly on (330) 808-0546 during business hours, email josh.detzel@cannasolusa.com, or let Sol send their details straight to Josh.',
};
