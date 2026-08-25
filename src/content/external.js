/**
 * @file: src/content/external.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Build-time snapshot of Cannasol's corporate web presence, captured so the
 *     chatbot can answer about the parent company without a live fetch per turn.
 *     Refresh with `make refresh-kb` when the corporate site changes.
 *
 * @See Also:
 *     scripts/build-knowledge-base.mjs
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

export const externalSources = [
  {
    url: 'https://cannasoltechnologies.com/',
    captured: '2026-08-25',
    notes: 'cannasolusa.com 301-redirects here.',
    facts: [
      'Cannasol Technologies specializes in nano-emulsification technology and ultrasonic liquid processing equipment for commercial-scale operations.',
      'NanoOptimizer™ is marketed as "The World\'s Most Advanced Surfactant System", designed for bioactives including Delta-9, kavalactones and terpenes.',
      'It is claimed to deliver industry-leading particle size, enhanced bioavailability and unparalleled stability.',
      'Ultrasonic liquid processors range from 700W to 4000W with advanced automation, starting from $7,200.',
      'Shop categories: Ultrasonic Equipment, Ingredients, Filtration Equipment, Lab Equipment.',
      'The site also hosts a Resources section with videos, protocols and user manuals, plus a blog.',
      'Contact: (216) 921-2240, Sarasota, Florida 34234, Monday–Friday 9:30AM–5:30PM.',
    ],
  },
  {
    url: 'https://cannasoltechnologies.com/nano-kava/',
    captured: '2026-08-25',
    notes: 'Corporate nano kava page. Makes no numeric claims — enjoynano.com is authoritative for specs.',
    facts: [
      'Describes nanoemulsification as breaking oil-based substances into tiny droplets suspended in water, creating almost transparent mixtures with increased surface area.',
      'Claimed benefits: enhanced bioavailability from increased surface area; improved palatability that eliminates the gritty texture and muddy appearance of traditional kava; ease of production for beverage formulations; precise dosing from uniform kavalactone distribution.',
      'Named product formats: shots, soft drinks, flavored water.',
      'Promotes the CT 2000 ultrasonic system alongside a range of ultrasonic systems.',
    ],
  },
];
