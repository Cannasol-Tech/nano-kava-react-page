/**
 * @file: src/content/product.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Single source of truth for Nano Kava product facts — the spec comparison
 *     table, the onboarding process, sourcing, dosing, pricing, labelling
 *     guidance and the bulk-ingredient disclaimer. Consumed by the landing page
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
  { spec: 'Mean particle size', nano: '~20 nm', traditional: '200–1,000 nm — settles, hazes' },
  { spec: 'Water dispersibility', nano: '100% water-dispersible', traditional: 'Hydrophobic, poorly dispersed' },
  { spec: 'Kavalactone load', nano: '30 mg/mL', traditional: 'Varies by extract' },
  { spec: 'Relative absorption', nano: '4–5x conventional kava powder', traditional: 'Baseline' },
  { spec: 'Appearance in beverage', nano: 'Crystal clear', traditional: 'Cloudy, muddy, gritty' },
  { spec: 'Separation / settling', nano: 'Stays clear, stays suspended — no settling, no ringing', traditional: 'Separates, rings the bottle' },
  { spec: 'Shelf stability', nano: '12+ months', traditional: 'Poor' },
  { spec: 'Dose consistency', nano: 'Uniform and precise', traditional: 'Inconsistent' },
  { spec: 'Taste', nano: 'Minimal kava-characteristic taste; no bitter blocker needed', traditional: 'Strongly bitter' },
  { spec: 'Process requirement', nano: 'Meter in and stir — no high-shear step', traditional: 'Pre-mix and high-shear typically required' },
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
  'Any water-based formulation needing clear, great-tasting kava',
];

export const differentiators = [
  'NanoOptimizer™ proprietary food-grade surfactant system prevents particle re-aggregation.',
  'Ultrasonic liquid processing performed on QSonica equipment — the #1 manufacturer in the category.',
  'Bitter Blocker is sold as its own line at the best pricing in the industry — the kava nanoemulsion itself needs no bitter blocker or flavour modifier.',
  'Noble kava varieties only — never tudei (two-day) kava.',
  'A Certificate of Analysis (COA) and a particle-size report are supplied with every lot; facility follows GMP guidelines.',
  'Testing covers potency, purity, heavy metals and microbial contamination.',
  'Direct access to Josh Detzel, the founder, on every account.',
  'First in the world to nano-emulsify reishi mushrooms — the Reishi Nanoemulsion is a Cannasol first.',
  'Cannasol Technologies was the first company to nano-emulsify kava, and has since scaled the process and brought the cost down.',
  'Kava extract is imported directly from the South Pacific — grown in Vanuatu, CO2 extracted through New Zealand — then nanoemulsified in-house.',
  "Brez (drinkbrez.com) was Cannasol's first major client. Cannasol has produced the active ingredients for every Brez can ever shipped, helped create the brand, hand-canned roughly the first 10,000 cans, and was involved in formulating the beverage alongside a close partner company.",
];

export const mushroomLine = {
  summary:
    'The mushroom line is three distinct nanoemulsions — Lion\'s Mane Nanoemulsion, Reishi Nanoemulsion and Cordyceps Nanoemulsion — the same nanoemulsification platform as the Kavalactone Nanoemulsion, water-dispersible and clear in solution, on 50/50 USA/global sourcing. A daytime counterpart to kava, or stacked into the same line.',
  products: [
    {
      name: "Lion's Mane Nanoemulsion",
      bestFor: 'Focus & clarity',
      dose: '25–35 mg per serving',
      costPerServing: '$0.12–$0.17',
      points: ['Clean, beverage-ready integration', 'Consistent dispersion and dosing', 'Designed for modern functional formats'],
    },
    {
      name: 'Reishi Nanoemulsion',
      bestFor: 'Calm & balance',
      dose: '15–25 mg per serving',
      costPerServing: '$0.11–$0.19',
      points: ['Stable formulation performance', 'Smooth, consistent sensory profile', 'Ideal for daily wellness beverages'],
    },
    {
      name: 'Cordyceps Nanoemulsion',
      bestFor: 'Performance & energy',
      dose: '25–35 mg per serving',
      costPerServing: '$0.14–$0.20',
      points: ['Efficient delivery in RTDs and shots', 'Uniform distribution across servings', 'Built for scalable production'],
    },
  ],
  benefits: [
    'Faster absorption pathways — nanoemulsification helps enable faster uptake and a more consistent consumer experience.',
    'Formulation-friendly — designed to integrate smoothly in water-based formulations with consistent dispersion.',
    'Production-ready stability — optimized for reliable batch-to-batch performance and scalable manufacturing workflows.',
  ],
};

export const positioning = {
  badge: 'The first kava nanoemulsion — ~20 nm and 100% water-dispersible',
  claim:
    'Cannasol Technologies was the first company to nano-emulsify kava, and has since scaled the process and brought the cost down.',
  summary:
    'Nano Kava is a crystal-clear, 100% water-dispersible kavalactone nanoemulsion for canned and bottled beverages — mean particle size ~20 nm, 30 mg/mL kavalactone load, and 4–5x higher absorption than conventional kava powder. No haze, no sediment, no gritty mouthfeel.',
  trust: 'Trusted by leading kava seltzer and shot brands.',
};

export const problems = [
  'Limited absorption in the gastrointestinal tract',
  'Conventional kava emulsions run 200–1,000 nm, so they settle and haze the beverage',
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
      'Packaging kavalactones in ~20 nm particles multiplies surface area, so the body absorbs far more of what you put in — 4–5x conventional kava powder. You can formulate at roughly a quarter of a conventional dose.',
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
    title: 'No Bitter Blocker Needed',
    description:
      'The kava nanoemulsion dissolves in with minimal kava-characteristic taste, so it needs no bitter blocker or flavour modifier. Bitter Blocker is sold separately, at the best pricing in the industry, for other bitter botanicals.',
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

export const sourcing = {
  material: 'Piper methysticum root and rhizome extract, a 5:1 extract, imported directly from Vanuatu via New Zealand.',
  facts: [
    'Kava extract is imported directly from the South Pacific — grown in Vanuatu and CO2 extracted through New Zealand — then nanoemulsified in-house in Florida.',
    'Noble kava varieties only; never tudei (two-day) kava.',
    'A COA and a particle-size report are supplied with every lot.',
  ],
};

export const dropInProcess = {
  summary:
    'Drop-in simple: no high-shear equipment, no pre-mix and no heat step. Batch the beverage, meter in the emulsion, stir to disperse. That is the whole process.',
  clarity:
    'It dissolves completely into the beverage with no cloud, no ring and minimal kava-characteristic taste, so there is no need to employ bitter blockers or flavour modifiers.',
};

export const dosing = {
  guidance:
    'The nanoemulsion is roughly 4–5x more bioavailable than powder-based kava, so conventional kava dosing does not apply. For most social tonics and seltzers Cannasol recommends 50–60 mg of kavalactone per serving.',
  rows: [
    { kavalactone: '40 mg — light', emulsion: '~1.33 mL', servingsPerLiter: '750', costPerServing: '$0.33' },
    { kavalactone: '50 mg — recommended', emulsion: '~1.67 mL', servingsPerLiter: '600', costPerServing: '$0.42' },
    { kavalactone: '60 mg — recommended', emulsion: '~2.00 mL', servingsPerLiter: '500', costPerServing: '$0.50' },
    { kavalactone: '75 mg — max strength', emulsion: '~2.50 mL', servingsPerLiter: '400', costPerServing: '$0.63' },
  ],
};

export const pricing = {
  headline: '$250 per liter of ~30 mg/mL kavalactone nanoemulsion.',
  tier: 'That is the 1,000 L tier, currently extended to every customer to make development easy. No minimum to get started.',
  caveat:
    'Pricing reflects the current 1,000 L promotional tier and is subject to change — ask Josh for a written quote. Cost-per-serving figures are ingredient cost only.',
};

export const labeling = {
  intro:
    'Illustrative labelling guidance for a brand owner, not legal advice. Have your own label reviewed before print.',
  points: [
    "Brands dosing in the 50–60 mg range often lead with the weight of the whole nano kava complex rather than the kavalactone figure alone — a 60 mg dose becomes '360 mg Nano Kava Complex'.",
    'The actual kavalactone content is then disclosed in the Supplement Facts panel, where a consumer or a buyer\'s regulatory team can find it.',
    'A panel following 21 CFR 101.36 carries no zero-amount rows, names the plant part, discloses kavalactone content and carries the CRN caution wording. Every ingredient must appear in Other Ingredients.',
  ],
  examplePanel: [
    'Serving size 1 can (355 mL).',
    'Calories 20. Total Carbohydrate 5 g (2% DV). Total Sugars 4 g.',
    'Nano Kava Complex 360 mg — Kava root extract (Piper methysticum), 5:1, providing 60 mg kavalactones.',
  ],
  exampleCaution:
    'Example caution wording (CRN, abridged): "Not for use by persons under 18, or by pregnant or breastfeeding women. Not for use with alcoholic beverages. FDA advises a risk of rare but severe liver injury with kava supplements; ask a health care professional before use." This is example label copy for a buyer\'s own review, not advice to any individual.',
};

export const bulkIngredientDisclaimer =
  'Nano Kava is sold as a bulk ingredient for licensed manufacturers and brand owners, not as a finished consumer product. Statements have not been evaluated by the Food and Drug Administration. Buyers are responsible for the regulatory status, labeling and substantiation of their finished products.';
