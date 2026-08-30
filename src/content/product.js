/**
 * @file: src/content/product.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Single source of truth for Nano Kava product facts — the spec comparison
 *     table and the four-step onboarding process. Consumed by the landing page
 *     and the chatbot knowledge-base generator. Plain data only, no icons, so
 *     this module is import-safe from Node build scripts.
 *
 * @See Also:
 *     src/components/KavaLandingPage.jsx
 *     scripts/build-knowledge-base.mjs
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

export const specComparison = [
  { spec: 'Droplet / particle size', nano: '~18 nm', traditional: 'Not nanosized (microns and larger)' },
  { spec: 'Water solubility', nano: 'Fully water-soluble', traditional: 'Hydrophobic, poorly dispersed' },
  { spec: 'Kavalactone absorption', nano: '80–90%', traditional: '10–15%' },
  { spec: 'Relative bioavailability', nano: '~10x', traditional: 'Baseline' },
  { spec: 'Onset time', nano: '~5 minutes', traditional: '30–45 minutes' },
  { spec: 'Appearance in beverage', nano: 'Crystal clear', traditional: 'Cloudy, muddy, gritty' },
  { spec: 'Separation / settling', nano: 'None — permanently suspended', traditional: 'Separates, rings the bottle' },
  { spec: 'Shelf stability', nano: '12+ months', traditional: 'Poor' },
  { spec: 'Dose consistency', nano: 'Uniform and precise', traditional: 'Inconsistent' },
  { spec: 'Taste', nano: 'Greatly reduced bitterness', traditional: 'Strongly bitter' },
];

export const process = [
  { step: '01', title: 'Discovery Call', description: 'Discuss your product vision with Josh directly' },
  { step: '02', title: 'Sample & Test', description: 'Get samples to test in your formulations' },
  { step: '03', title: 'Refine & Order', description: 'Dial in your product and place your order' },
  { step: '04', title: 'Scale Production', description: 'Launch with confidence and ongoing support' },
];

export const applications = [
  'Kava seltzers and sparkling beverages',
  'Functional shots and elixirs',
  'RTD (ready-to-drink) relaxation beverages',
  'Wellness tonics',
  'Mocktails and alcohol alternatives',
  'Any water-based formulation needing fast-acting, great-tasting kava',
];

export const differentiators = [
  'NanoOptimizer™ proprietary food-grade surfactant system prevents particle re-aggregation.',
  'Ultrasonic liquid processing performed on QSonica equipment — the #1 manufacturer in the category.',
  'Bitter Blocker bundles available; Cannasol offers the best pricing in the industry on them.',
  'Noble kava varieties only — never tudei (two-day) kava.',
  'Certificates of Analysis (COA) available for every batch; facility follows GMP guidelines.',
  'Testing covers potency, purity, heavy metals and microbial contamination.',
  'Direct access to Josh Detzel, the founder, on every account.',
  'First in the world to nano-emulsify reishi mushrooms — the Reishi Nanoemulsion is a Cannasol first.',
  "Brez (drinkbrez.com) was Cannasol's first major client. Cannasol has produced the active ingredients for every Brez can ever shipped, helped create the brand, hand-canned roughly the first 10,000 cans, and was involved in formulating the beverage alongside a close partner company.",
];

export const mushroomLine = {
  summary:
    'The mushroom line is three distinct nanoemulsions — Lion\'s Mane Nanoemulsion, Reishi Nanoemulsion and Cordyceps Nanoemulsion — built on the same nanoemulsification platform as the Kavalactone Nanoemulsion and sold B2B for functional beverages.',
  products: [
    {
      name: "Lion's Mane Nanoemulsion",
      bestFor: 'Focus & clarity',
      points: ['Clean, beverage-ready integration', 'Consistent dispersion and dosing', 'Designed for modern functional formats'],
    },
    {
      name: 'Reishi Nanoemulsion',
      bestFor: 'Calm & balance',
      points: ['Stable formulation performance', 'Smooth, consistent sensory profile', 'Ideal for daily wellness beverages'],
    },
    {
      name: 'Cordyceps Nanoemulsion',
      bestFor: 'Performance & energy',
      points: ['Efficient delivery in RTDs and shots', 'Uniform distribution across servings', 'Built for scalable production'],
    },
  ],
  benefits: [
    'Faster absorption pathways — nanoemulsification helps enable faster uptake and a more consistent consumer experience.',
    'Formulation-friendly — designed to integrate smoothly in water-based formulations with consistent dispersion.',
    'Production-ready stability — optimized for reliable batch-to-batch performance and scalable manufacturing workflows.',
  ],
  caveat: 'No numeric specifications (particle size, onset, shelf life) are published for the mushroom line.',
};

export const positioning = {
  badge: "The World's First & Only ~18nm Kava Nanoemulsion",
  claim: 'Cannasol Technologies is the only manufacturer producing kava at ~18nm.',
  summary:
    'Nano Kava is nano-emulsified kava with a ~18nm particle size, roughly 10x the bioavailability of traditional kava extract, 80-90% kavalactone absorption instead of 10-15%, and an onset of about 5 minutes instead of 30-45.',
  trust: 'Trusted by leading kava seltzer and shot brands.',
};

export const problems = [
  'Limited absorption in the gastrointestinal tract',
  '30-45 minute onset frustrates consumers',
  'Gritty texture and muddy appearance',
  'Inconsistent dosing leads to unpredictable effects',
];

export const solutionNarrative =
  'This cutting-edge process breaks down oil-based kavalactones into tiny droplets suspended in water—so small they become almost transparent, creating a stable and uniform mixture. Our proprietary NanoOptimizer™ surfactant system dramatically increases surface area, making kavalactones more readily available for absorption by the body.';

export const solutionPoints = [
  'Enhanced bioavailability through better absorption',
  'Crystal-clear, visually appealing beverages',
  'Uniform kavalactone distribution for precise dosing',
  'Easy integration into shots, soft drinks, and flavored water',
];

export const perfectFor = ['Kava Seltzers', 'Functional Shots', 'RTD Beverages', 'Wellness Brands'];

export const features = [
  {
    iconKey: 'Beaker',
    title: 'Enhanced Bioavailability',
    description:
      'The increased surface area of our ~18nm nanoemulsified kavalactones enables superior absorption in the gastrointestinal tract, delivering higher bioavailability and more potent effects at lower doses.',
    highlight: 'Industry First',
  },
  {
    iconKey: 'Sparkles',
    title: 'Improved Palatability',
    description:
      'Nanoemulsification eliminates the gritty texture and muddy appearance of traditional kava preparations, resulting in crystal-clear, visually appealing beverages your customers will love.',
    highlight: 'Premium Clarity',
  },
  {
    iconKey: 'Zap',
    title: 'Ease of Production',
    description:
      'Our nanoemulsified kava extracts integrate seamlessly into various beverage formulations—shots, soft drinks, and flavored water—making kava consumption more convenient and enjoyable.',
    highlight: 'Versatile',
  },
  {
    iconKey: 'Target',
    title: 'Precise Dosing',
    description:
      'With uniform distribution of kavalactones throughout the nanoemulsion, dosing becomes remarkably accurate—ensuring consistent, predictable effects in every serving.',
    highlight: 'Consistent',
  },
  {
    iconKey: 'Shield',
    title: 'Bitter Blocker Bundles',
    description:
      'We offer the best deals on bitter blockers in the industry. Create smooth, palatable Kava products your customers will actually enjoy drinking.',
    highlight: 'Best Pricing',
  },
  {
    iconKey: 'HeartHandshake',
    title: 'Direct Access to Josh',
    description:
      "Our founder works directly with every client, bringing insights from top Kratom and Kava brands. Your success is our success—we're partners, not just suppliers.",
    highlight: 'Personal Support',
  },
];
