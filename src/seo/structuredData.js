/**
 * @file: src/seo/structuredData.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Single source of truth for every JSON-LD graph on the site. Nodes are linked by
 *     @id rather than repeated, so answer engines resolve one Organization/Brand/Product
 *     entity across all four routes instead of four unrelated ones.
 *
 * @See Also:
 *     src/seo/JsonLd.jsx
 *     public/llms.txt
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies. All Rights Reserved.
 * ---
 */

import { faqEntries } from '../content/faq.js';

const SITE = 'https://enjoynano.com';

export const ID = {
  website: `${SITE}/#website`,
  organization: `${SITE}/#organization`,
  brand: `${SITE}/#brand`,
  place: `${SITE}/#place`,
  founder: `${SITE}/#josh-detzel`,
  nanoKava: `${SITE}/#product-nano-kava`,
  nanoMushrooms: `${SITE}/#product-nano-mushrooms`,
  terms: `${SITE}/#glossary`,
  home: `${SITE}/#webpage`,
  faq: `${SITE}/faq#webpage`,
  contact: `${SITE}/contact#webpage`,
  mushrooms: `${SITE}/mushrooms#webpage`,
};

/** Third-party URLs that let engines resolve our topics to known Knowledge Graph entities. */
const KG = {
  kavaPlant: 'https://en.wikipedia.org/wiki/Piper_methysticum',
  kavaPlantWd: 'https://www.wikidata.org/wiki/Q161067',
  kava: 'https://en.wikipedia.org/wiki/Kava',
  kavalactone: 'https://en.wikipedia.org/wiki/Kavalactone',
  kavalactoneWd: 'https://www.wikidata.org/wiki/Q408171',
  nanoemulsion: 'https://en.wikipedia.org/wiki/Nanoemulsion',
  emulsion: 'https://en.wikipedia.org/wiki/Emulsion',
  bioavailability: 'https://en.wikipedia.org/wiki/Bioavailability',
  surfactant: 'https://en.wikipedia.org/wiki/Surfactant',
  lionsMane: 'https://en.wikipedia.org/wiki/Hericium_erinaceus',
  reishi: 'https://en.wikipedia.org/wiki/Ganoderma_lingzhi',
  cordyceps: 'https://en.wikipedia.org/wiki/Cordyceps',
};

const place = {
  '@type': 'Place',
  '@id': ID.place,
  name: 'Cannasol Technologies — Sarasota, Florida',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Sarasota',
    addressRegion: 'FL',
    postalCode: '34234',
    addressCountry: 'US',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 27.3364, longitude: -82.5307 },
};

const founder = {
  '@type': 'Person',
  '@id': ID.founder,
  name: 'Josh Detzel',
  jobTitle: 'Founder',
  email: 'josh.detzel@cannasolusa.com',
  telephone: '+1-216-921-2240',
  worksFor: { '@id': ID.organization },
  knowsAbout: [
    'Kava nanoemulsion',
    'Functional beverage formulation',
    'Kavalactone bioavailability',
  ],
};

const brand = {
  '@type': 'Brand',
  '@id': ID.brand,
  name: 'Nano Kava',
  alternateName: [
    'NanoKava',
    'nano kava',
    'nano-kava',
    'nano emulsified kava',
    'nanoemulsified kava',
    'nano-emulsified kava',
    'kava nanoemulsion',
    'nano emulsified kavalactones',
    'EnjoyNano',
  ],
  slogan: "The world's first and only ~18nm kava nanoemulsion",
  logo: `${SITE}/cannasol-logo.png`,
  url: SITE,
};

const organization = {
  '@type': ['Organization', 'LocalBusiness', 'Manufacturer'],
  '@id': ID.organization,
  name: 'Cannasol Technologies',
  alternateName: ['Cannasol', 'EnjoyNano'],
  legalName: 'Cannasol Technologies LLC',
  url: SITE,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE}/cannasol-logo.png`,
    width: 644,
    height: 559,
  },
  image: `${SITE}/og-image.png`,
  description:
    "Manufacturer of Nano Kava, the world's first and only ~18nm kava nanoemulsion, plus nanoemulsified functional mushroom extracts. B2B ingredient supplier to beverage brands, co-packers and formulators.",
  slogan: "The world's first and only ~18nm kava nanoemulsion",
  telephone: '+1-216-921-2240',
  email: 'josh.detzel@cannasolusa.com',
  priceRange: '$$',
  founder: { '@id': ID.founder },
  brand: { '@id': ID.brand },
  location: { '@id': ID.place },
  address: place.address,
  geo: place.geo,
  areaServed: { '@type': 'Country', name: 'United States' },
  knowsAbout: [
    'Kava nanoemulsion',
    'Nano-emulsified kavalactones',
    'Nanoemulsification',
    'Functional beverage ingredients',
    'Kavalactone bioavailability',
    'Ultrasonic liquid processing',
    'Nanoemulsified functional mushroom extracts',
    'Water-soluble kava extract',
  ],
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '09:30',
    closes: '17:30',
  },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: '+1-216-921-2240',
      email: 'josh.detzel@cannasolusa.com',
      availableLanguage: 'English',
      areaServed: 'US',
    },
  ],
  makesOffer: [
    { '@type': 'Offer', itemOffered: { '@id': ID.nanoKava } },
    { '@type': 'Offer', itemOffered: { '@id': ID.nanoMushrooms } },
  ],
  sameAs: [
    'https://cannasoltechnologies.com',
    'https://cannasoltechnologies.com/nano-kava/',
    'https://cannasoltechnologies.biz',
    'https://www.zoominfo.com/c/cannasol-technologies-llc/1257617325',
    'https://www.azonano.com/suppliers.aspx?SupplierID=3539',
  ],
};

const website = {
  '@type': 'WebSite',
  '@id': ID.website,
  url: SITE,
  name: 'Nano Kava by Cannasol Technologies',
  alternateName: 'EnjoyNano',
  inLanguage: 'en-US',
  publisher: { '@id': ID.organization },
  copyrightHolder: { '@id': ID.organization },
};

/** Answer-engine bait: a quotable, attributable definition per term. */
const glossary = {
  '@type': 'DefinedTermSet',
  '@id': ID.terms,
  name: 'Nano Kava glossary',
  url: `${SITE}/faq`,
  hasDefinedTerm: [
    {
      '@type': 'DefinedTerm',
      '@id': `${SITE}/#term-nano-kava`,
      name: 'Nano kava',
      alternateName: ['nano-kava', 'nano emulsified kava', 'nanoemulsified kava', 'kava nanoemulsion'],
      description:
        'Nano kava is kava extract whose kavalactones have been broken into droplets of approximately 18 nanometers by nanoemulsification, making the normally hydrophobic compounds fully water-soluble. Compared with traditional kava extract it delivers roughly 10x the bioavailability, 80–90% kavalactone absorption instead of 10–15%, and an onset of about 5 minutes instead of 30–45 minutes.',
      inDefinedTermSet: { '@id': ID.terms },
      sameAs: [KG.kava, KG.nanoemulsion],
    },
    {
      '@type': 'DefinedTerm',
      '@id': `${SITE}/#term-nanoemulsification`,
      name: 'Nanoemulsification',
      description:
        'Nanoemulsification is the process of breaking an oil phase into nanometer-scale droplets suspended in water, producing a mixture so fine that it appears transparent and resists separation. Cannasol Technologies performs it with ultrasonic liquid processing to reach an ~18nm droplet size for kava.',
      inDefinedTermSet: { '@id': ID.terms },
      sameAs: [KG.nanoemulsion, KG.emulsion],
    },
    {
      '@type': 'DefinedTerm',
      '@id': `${SITE}/#term-kavalactone`,
      name: 'Kavalactone',
      description:
        'Kavalactones are the active class of compounds in the kava plant (Piper methysticum) responsible for its calming, stress-reducing effects. They are hydrophobic and poorly absorbed in traditional preparations, which is the problem nanoemulsification solves.',
      inDefinedTermSet: { '@id': ID.terms },
      sameAs: [KG.kavalactone, KG.kavalactoneWd],
    },
    {
      '@type': 'DefinedTerm',
      '@id': `${SITE}/#term-nanooptimizer`,
      name: 'NanoOptimizer™',
      description:
        'NanoOptimizer™ is Cannasol Technologies’ proprietary blend of food-grade surfactants that encapsulates kava droplets, keeps them water-soluble, and prevents re-aggregation so the emulsion stays suspended indefinitely without separation or settling.',
      inDefinedTermSet: { '@id': ID.terms },
      sameAs: [KG.surfactant],
    },
  ],
};

const spec = (name, value, unit) => ({
  '@type': 'PropertyValue',
  name,
  value,
  ...(unit ? { unitText: unit } : {}),
});

/**
 * Numeric spec with a UN/CEFACT unit code. Engines can compare these across suppliers;
 * a unitText-only string is only readable as prose. C45 = nanometre, MIN = minute.
 */
const measured = (name, value, unitCode, unitText) => ({
  '@type': 'PropertyValue',
  name,
  value: { '@type': 'QuantitativeValue', value, unitCode, unitText },
});

const nanoKavaProduct = {
  '@type': 'Product',
  '@id': ID.nanoKava,
  name: 'Nano Kava Emulsion',
  alternateName: [
    'Nano kava',
    'nano-kava',
    'Nano-emulsified kava',
    'nano emulsified kava',
    'nanoemulsified kava',
    'Kava nanoemulsion',
    'Nano-emulsified kavalactones',
    'Water-soluble kava extract',
  ],
  description:
    "The world's first and only ~18nm kava nanoemulsion. Approximately 10x the bioavailability of traditional kava extract, 80–90% kavalactone absorption, ~5-minute onset, crystal-clear appearance and 12+ month shelf stability. Supplied B2B as a bulk ingredient for functional beverages.",
  image: `${SITE}/og-image.png`,
  url: SITE,
  brand: { '@id': ID.brand },
  manufacturer: { '@id': ID.organization },
  category: 'Functional Beverage Ingredients',
  material: 'Noble kava (Piper methysticum) extract',
  isRelatedTo: { '@id': ID.nanoMushrooms },
  audience: {
    '@type': 'BusinessAudience',
    name: 'Beverage brands, co-packers and formulators',
  },
  additionalProperty: [
    measured('Droplet size', 18, 'C45', 'nanometer'),
    measured('Onset time', 5, 'MIN', 'minute'),
    spec('Relative bioavailability vs traditional kava extract', '10x'),
    spec('Kavalactone absorption', '80–90', 'percent'),
    spec('Appearance in finished beverage', 'Crystal clear — no cloudiness or sediment'),
    spec('Water solubility', 'Fully water-soluble'),
    spec('Shelf stability', '12+', 'month'),
    spec('Kava variety', 'Noble varieties only — never tudei'),
    spec('Surfactant system', 'NanoOptimizer™ food-grade surfactant system'),
    spec('Processing method', 'Ultrasonic liquid processing (QSonica equipment)'),
  ],
  offers: {
    '@type': 'Offer',
    '@id': `${SITE}/#offer-nano-kava-sample`,
    name: 'Free Nano Kava sample',
    price: '0.00',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
    url: `${SITE}/contact?inquiry=samples&product=nano-kava`,
    seller: { '@id': ID.organization },
    businessFunction: 'http://purl.org/goodrelations/v1#Sell',
    eligibleCustomerType: 'http://purl.org/goodrelations/v1#Business',
  },
};

const nanoMushroomProduct = {
  '@type': 'Product',
  '@id': ID.nanoMushrooms,
  name: 'Nano Mushroom Emulsions',
  alternateName: ['Nanoemulsified functional mushroom extracts'],
  description:
    "Nanoemulsified functional mushroom extracts — Lion's Mane, Reishi and Cordyceps — built on the same nanoemulsion platform as Cannasol's ~18nm Nano Kava, for water-soluble, high-bioavailability use in functional beverages.",
  url: `${SITE}/mushrooms`,
  brand: { '@id': ID.brand },
  manufacturer: { '@id': ID.organization },
  category: 'Functional Beverage Ingredients',
  isRelatedTo: { '@id': ID.nanoKava },
  audience: {
    '@type': 'BusinessAudience',
    name: 'Beverage brands, co-packers and formulators',
  },
  hasVariant: [
    { '@type': 'Product', name: "Nanoemulsified Lion's Mane extract", sameAs: KG.lionsMane },
    { '@type': 'Product', name: 'Nanoemulsified Reishi extract', sameAs: KG.reishi },
    { '@type': 'Product', name: 'Nanoemulsified Cordyceps extract', sameAs: KG.cordyceps },
  ],
  offers: {
    '@type': 'Offer',
    '@id': `${SITE}/#offer-nano-mushroom-sample`,
    name: 'Free Nano Mushroom sample pack',
    price: '0.00',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    url: `${SITE}/contact?inquiry=samples&product=nano-mushrooms`,
    seller: { '@id': ID.organization },
    eligibleCustomerType: 'http://purl.org/goodrelations/v1#Business',
  },
};

const breadcrumb = (trail) => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((crumb, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: crumb.name,
    item: `${SITE}${crumb.path}`,
  })),
});

/** Marks the passage answer engines and voice assistants should read aloud or quote. */
const speakable = (selectors) => ({
  '@type': 'SpeakableSpecification',
  cssSelector: selectors,
});

const gettingStarted = {
  '@type': 'HowTo',
  '@id': `${SITE}/#howto-get-started`,
  name: 'How to source Nano Kava for your beverage brand',
  description:
    'The four steps Cannasol Technologies runs with every client, from first call to scaled production.',
  totalTime: 'P30D',
  estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '0' },
  supply: { '@type': 'HowToSupply', name: 'Free Nano Kava sample' },
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Discovery call',
      text: 'Discuss your product vision directly with Josh Detzel, Cannasol’s founder.',
      url: `${SITE}/contact`,
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Sample and test',
      text: 'Receive free Nano Kava samples and test them in your own formulations.',
      url: `${SITE}/contact?inquiry=samples&product=nano-kava`,
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Refine and order',
      text: 'Dial in kavalactone dosage per serving, refine the formulation, and place your order.',
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'Scale production',
      text: 'Launch with ongoing formulation and supply support from Cannasol Technologies.',
    },
  ],
};

/** Head-to-head comparison — the shape AI Overviews extract for "X vs Y" queries. */
const comparison = {
  '@type': 'ItemList',
  '@id': `${SITE}/#comparison-nano-vs-traditional`,
  name: 'Nano Kava vs traditional kava extract',
  description:
    'Specification-by-specification comparison of Cannasol Technologies’ ~18nm Nano Kava against traditional kava extract.',
  itemListOrder: 'https://schema.org/ItemListUnordered',
  numberOfItems: 6,
  itemListElement: [
    { name: 'Droplet size', nano: '~18 nm', traditional: 'Not nanosized (microns and larger)' },
    { name: 'Kavalactone absorption', nano: '80–90%', traditional: '10–15%' },
    { name: 'Onset time', nano: '~5 minutes', traditional: '30–45 minutes' },
    { name: 'Water solubility', nano: 'Fully water-soluble', traditional: 'Hydrophobic, poorly dispersed' },
    { name: 'Appearance in beverage', nano: 'Crystal clear', traditional: 'Cloudy, muddy, gritty' },
    { name: 'Shelf stability', nano: '12+ months, no separation', traditional: 'Separates and settles' },
  ].map((row, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: row.name,
    item: {
      '@type': 'Thing',
      name: row.name,
      description: `Nano Kava: ${row.nano}. Traditional kava extract: ${row.traditional}.`,
    },
  })),
};

/**
 * Head-term questions, answered in full on the home page. Google's FAQ rich result is
 * gone (deprecated May 2026) but Question/acceptedAnswer is still what retrieval crawlers
 * chunk on, and these are the exact phrasings we need to own.
 */
const headQuestions = {
  '@type': 'ItemList',
  '@id': `${SITE}/#head-questions`,
  name: 'Common questions about nano kava',
  itemListElement: [
    [
      'What is nano kava?',
      'Nano kava is kava extract whose kavalactones have been broken into droplets of approximately 18 nanometers by nanoemulsification, making the normally hydrophobic compounds fully water-soluble and rapidly absorbable. Cannasol Technologies of Sarasota, Florida manufactures the only ~18nm kava nanoemulsion, sold B2B as Nano Kava.',
    ],
    [
      'What is nano emulsified kava?',
      'Nano-emulsified kava is the same thing as nano kava: kava extract processed by ultrasonic nanoemulsification until its kavalactone droplets reach nanometer scale. Cannasol Technologies reaches approximately 18 nanometers, which yields roughly 10x the bioavailability of traditional kava extract, 80–90% kavalactone absorption instead of 10–15%, and a crystal-clear rather than cloudy finished beverage.',
    ],
    [
      'Who makes nano kava?',
      'Cannasol Technologies, a B2B functional-beverage ingredient manufacturer based in Sarasota, Florida, makes Nano Kava. It supplies the ingredient in bulk to beverage brands, co-packers and formulators. Contact Josh Detzel at josh.detzel@cannasolusa.com or +1-216-921-2240.',
    ],
    [
      'How is nano kava different from traditional kava extract?',
      'Traditional kava extract is hydrophobic, absorbs at only 10–15%, takes 30–45 minutes to take effect, and makes beverages cloudy and prone to separation. Cannasol Technologies\u2019 ~18nm Nano Kava is fully water-soluble, absorbs at 80–90%, takes effect in about 5 minutes, stays crystal clear, and remains stable for 12+ months with no separation or settling.',
    ],
    [
      'What is a kava nanoemulsion?',
      'A kava nanoemulsion is kava extract suspended in water as nanometer-scale droplets stabilised by a surfactant system, so the mixture stays transparent and does not separate. Cannasol Technologies produces its kava nanoemulsion at approximately 18 nanometers using the proprietary NanoOptimizer\u2122 food-grade surfactant system and QSonica ultrasonic liquid-processing equipment.',
    ],
    [
      'Where can I buy nano kava in bulk?',
      'Cannasol Technologies supplies Nano Kava in bulk directly to beverage brands, co-packers and formulators. Free samples are available and minimum order quantity is negotiated per customer rather than fixed. Request a sample at https://enjoynano.com/contact or contact Josh Detzel at josh.detzel@cannasolusa.com.',
    ],
  ].map(([name, text], i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'Question',
      '@id': `${SITE}/#head-question-${i + 1}`,
      name,
      acceptedAnswer: { '@type': 'Answer', text, url: `${SITE}/` },
      author: { '@id': ID.organization },
    },
  })),
};

/** A citable document entity — engines attribute passages to an Article far more readily
 *  than to a bare WebPage. */
const explainer = {
  '@type': 'TechArticle',
  '@id': `${SITE}/#article-what-is-nano-kava`,
  headline: 'What nano-emulsified kava is, and how an ~18nm kava nanoemulsion is made',
  description:
    "A technical explanation of kava nanoemulsification: why kavalactones are poorly absorbed in traditional extracts, how ultrasonic processing with the NanoOptimizer\u2122 surfactant system reduces droplet size to approximately 18 nanometers, and what that changes in a finished beverage.",
  articleSection: 'Functional beverage ingredients',
  inLanguage: 'en-US',
  isAccessibleForFree: true,
  mainEntityOfPage: { '@id': ID.home },
  about: { '@id': ID.nanoKava },
  author: { '@id': ID.organization },
  publisher: { '@id': ID.organization },
  image: `${SITE}/og-image.png`,
  keywords: [
    'nano kava',
    'nano-kava',
    'nano emulsified kava',
    'nanoemulsified kava',
    'kava nanoemulsion',
    'nano-emulsified kavalactones',
    'water-soluble kava',
    '18nm kava',
  ],
  proficiencyLevel: 'Expert',
};

const graph = (...nodes) => ({ '@context': 'https://schema.org', '@graph': nodes });

export const homeSchema = graph(
  organization,
  brand,
  website,
  place,
  founder,
  nanoKavaProduct,
  nanoMushroomProduct,
  glossary,
  gettingStarted,
  comparison,
  headQuestions,
  explainer,
  {
    '@type': 'WebPage',
    '@id': ID.home,
    url: `${SITE}/`,
    name: 'Nano Kava | Premium Nano-Emulsified Kavalactones',
    description:
      "Nano-emulsified kava with ~18nm particle size. 10x bioavailability, 5-minute onset, crystal-clear kavalactones. The world's first and only ~18nm kava nanoemulsion.",
    isPartOf: { '@id': ID.website },
    inLanguage: 'en-US',
    primaryImageOfPage: `${SITE}/og-image.png`,
    about: { '@id': ID.nanoKava },
    mainEntity: { '@id': `${SITE}/#head-questions` },
    significantLink: [`${SITE}/faq`, `${SITE}/contact`, `${SITE}/mushrooms`],
    mentions: [
      { '@type': 'Thing', name: 'Kava', sameAs: [KG.kava, KG.kavaPlant, KG.kavaPlantWd] },
      { '@type': 'Thing', name: 'Kavalactone', sameAs: [KG.kavalactone, KG.kavalactoneWd] },
      { '@type': 'Thing', name: 'Nanoemulsion', sameAs: KG.nanoemulsion },
      { '@type': 'Thing', name: 'Bioavailability', sameAs: KG.bioavailability },
      { '@type': 'Thing', name: 'Surfactant', sameAs: KG.surfactant },
    ],
    speakable: speakable(['h1']),
    breadcrumb: breadcrumb([{ name: 'Home', path: '/' }]),
    publisher: { '@id': ID.organization },
  }
);

export const faqSchema = graph(
  organization,
  brand,
  website,
  glossary,
  {
    '@type': ['FAQPage', 'WebPage'],
    '@id': ID.faq,
    url: `${SITE}/faq`,
    name: 'Nano Kava FAQ | Kavalactone Questions Answered',
    description:
      'Frequently asked questions about nano kava, kavalactones, nano-emulsified kava technology, dosing, safety, and bioavailability benefits.',
    isPartOf: { '@id': ID.website },
    inLanguage: 'en-US',
    about: { '@id': ID.nanoKava },
    publisher: { '@id': ID.organization },
    speakable: speakable(['.faq-answer']),
    breadcrumb: breadcrumb([
      { name: 'Home', path: '/' },
      { name: 'Nano Kava FAQ', path: '/faq' },
    ]),
    mainEntity: faqEntries.map(([name, text]) => ({
      '@type': 'Question',
      name,
      acceptedAnswer: { '@type': 'Answer', text },
    })),
  }
);

export const mushroomsSchema = graph(
  organization,
  brand,
  website,
  nanoMushroomProduct,
  {
    '@type': 'WebPage',
    '@id': ID.mushrooms,
    url: `${SITE}/mushrooms`,
    name: 'Nano Mushroom Extracts | Nanoemulsified Functional Mushrooms',
    description:
      "Nanoemulsified functional mushroom extracts for maximum bioavailability. Lion's Mane, Reishi, Cordyceps and more — powered by nano-emulsification technology.",
    isPartOf: { '@id': ID.website },
    inLanguage: 'en-US',
    about: { '@id': ID.nanoMushrooms },
    publisher: { '@id': ID.organization },
    mentions: [
      { '@type': 'Thing', name: "Lion's Mane (Hericium erinaceus)", sameAs: KG.lionsMane },
      { '@type': 'Thing', name: 'Reishi (Ganoderma lingzhi)', sameAs: KG.reishi },
      { '@type': 'Thing', name: 'Cordyceps', sameAs: KG.cordyceps },
    ],
    breadcrumb: breadcrumb([
      { name: 'Home', path: '/' },
      { name: 'Nano Mushroom Extracts', path: '/mushrooms' },
    ]),
  }
);

export const contactSchema = graph(
  organization,
  brand,
  website,
  founder,
  place,
  {
    '@type': ['ContactPage', 'WebPage'],
    '@id': ID.contact,
    url: `${SITE}/contact`,
    name: 'Contact Us | Nano Kava by EnjoyNano',
    description:
      'Get in touch with the EnjoyNano team about nano kava samples, pricing, formulation support, or partnership inquiries.',
    isPartOf: { '@id': ID.website },
    inLanguage: 'en-US',
    about: { '@id': ID.organization },
    publisher: { '@id': ID.organization },
    mainEntity: { '@id': ID.organization },
    breadcrumb: breadcrumb([
      { name: 'Home', path: '/' },
      { name: 'Contact', path: '/contact' },
    ]),
  }
);
