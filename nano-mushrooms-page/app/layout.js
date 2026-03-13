import './globals.css';

export const metadata = {
  metadataBase: new URL('https://mushrooms.cannasoltechnologies.com'),
  title: {
    default: "Nano Emulsified Mushrooms | Lion's Mane, Reishi & Cordyceps | Cannasol Technologies",
    template: '%s | Cannasol Technologies',
  },
  description:
    "World's first nano emulsified Reishi mushrooms. Premium nanoemulsified Lion's Mane, Reishi, and Cordyceps ingredients for functional beverages. The same proprietary technology behind drinkbrez.com — now available at scale for brands of all sizes.",
  keywords: [
    'nano emulsified mushrooms',
    'nanoemulsified mushrooms',
    'nano emulsified reishi',
    "nano emulsified lion's mane",
    'nano emulsified cordyceps',
    'reishi nanoemulsion',
    "lion's mane nanoemulsion",
    'cordyceps nanoemulsion',
    'functional mushroom ingredients',
    'mushroom beverage ingredients',
    'B2B mushroom supplier',
    'nano mushroom extract',
    'water soluble mushroom',
    'functional beverage mushrooms',
    'nano emulsification technology',
    'mushroom nanoemulsion supplier',
    'Cannasol Technologies',
    'drinkbrez mushrooms',
    'nano functional mushrooms',
    'first nano emulsified reishi',
  ],
  authors: [{ name: 'Cannasol Technologies', url: 'https://cannasoltechnologies.com' }],
  creator: 'Cannasol Technologies',
  publisher: 'Cannasol Technologies',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://mushrooms.cannasoltechnologies.com/',
    siteName: 'Cannasol Technologies — Nano Mushrooms',
    title: "Nano Emulsified Mushrooms | World's First Nano Reishi | Cannasol Technologies",
    description:
      "Cannasol Technologies — the world's first company to nano emulsify Reishi mushrooms. Premium nanoemulsified Lion's Mane, Reishi & Cordyceps for functional beverages. Same technology as drinkbrez.com, now available at scale.",
    images: [
      {
        url: '/cannasol-logo.png',
        width: 1200,
        height: 630,
        alt: 'Cannasol Technologies — Nano Emulsified Mushrooms',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Nano Emulsified Mushrooms | World's First Nano Reishi",
    description:
      "World's first nano emulsified Reishi. Premium nanoemulsified Lion's Mane, Reishi & Cordyceps for functional beverages.",
    images: ['/cannasol-logo.png'],
    creator: '@CanasolTech',
  },
  alternates: {
    canonical: 'https://mushrooms.cannasoltechnologies.com/',
  },
  other: {
    'geo.region': 'US-FL',
    'geo.placename': 'Sarasota, Florida',
  },
};

const jsonLdOrganization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://cannasoltechnologies.com/#organization',
  name: 'Cannasol Technologies',
  url: 'https://cannasoltechnologies.com',
  logo: {
    '@type': 'ImageObject',
    url: 'https://mushrooms.cannasoltechnologies.com/cannasol-logo.png',
    width: 200,
    height: 60,
  },
  description:
    'World-leading manufacturer of nano-emulsified functional mushrooms and beverage ingredients. First company to nano emulsify Reishi mushrooms.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Sarasota',
    addressRegion: 'FL',
    addressCountry: 'US',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+1-216-921-2240',
    contactType: 'sales',
    email: 'info@cannasoltechnologies.com',
    availableLanguage: 'English',
  },
  sameAs: [
    'https://cannasoltechnologies.com',
    'https://kava.cannasoltechnologies.com',
  ],
  knowsAbout: [
    'Nano Emulsification',
    "Lion's Mane Mushroom",
    'Reishi Mushroom',
    'Cordyceps Mushroom',
    'Functional Beverage Ingredients',
    'Nanoemulsion Technology',
  ],
};

const jsonLdWebPage = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://mushrooms.cannasoltechnologies.com/#webpage',
  url: 'https://mushrooms.cannasoltechnologies.com/',
  name: "Nano Emulsified Mushrooms | Lion's Mane, Reishi & Cordyceps | Cannasol Technologies",
  description:
    "World's first nano emulsified Reishi mushrooms. Premium nanoemulsified functional mushroom ingredients for beverages.",
  isPartOf: {
    '@type': 'WebSite',
    '@id': 'https://mushrooms.cannasoltechnologies.com/#website',
    url: 'https://mushrooms.cannasoltechnologies.com/',
    name: 'Cannasol Technologies — Nano Mushrooms',
    publisher: { '@id': 'https://cannasoltechnologies.com/#organization' },
  },
  about: { '@id': 'https://cannasoltechnologies.com/#organization' },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://mushrooms.cannasoltechnologies.com/',
      },
    ],
  },
};

const jsonLdProductLionsMane = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: "Nano Emulsified Lion's Mane Mushroom",
  brand: { '@type': 'Brand', name: 'Cannasol Technologies' },
  description:
    "Nanoemulsified Lion's Mane mushroom ingredient for functional beverages. Delivers faster absorption pathways, consistent dispersion, and clean beverage integration.",
  category: 'Functional Mushroom Ingredients',
  audience: { '@type': 'BusinessAudience', audienceType: 'B2B Beverage Formulation Teams' },
  manufacturer: { '@id': 'https://cannasoltechnologies.com/#organization' },
  offers: {
    '@type': 'Offer',
    availability: 'https://schema.org/InStock',
    priceCurrency: 'USD',
    url: 'https://mushrooms.cannasoltechnologies.com/',
    seller: { '@id': 'https://cannasoltechnologies.com/#organization' },
  },
};

const jsonLdProductReishi = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Nano Emulsified Reishi Mushroom — World First',
  brand: { '@type': 'Brand', name: 'Cannasol Technologies' },
  description:
    'World-first nano emulsified Reishi mushroom ingredient. Stable formulation performance, smooth sensory profile, ideal for daily wellness beverages. Pioneered by Cannasol Technologies.',
  category: 'Functional Mushroom Ingredients',
  audience: { '@type': 'BusinessAudience', audienceType: 'B2B Beverage Formulation Teams' },
  manufacturer: { '@id': 'https://cannasoltechnologies.com/#organization' },
  offers: {
    '@type': 'Offer',
    availability: 'https://schema.org/InStock',
    priceCurrency: 'USD',
    url: 'https://mushrooms.cannasoltechnologies.com/',
    seller: { '@id': 'https://cannasoltechnologies.com/#organization' },
  },
};

const jsonLdProductCordyceps = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Nano Emulsified Cordyceps Mushroom',
  brand: { '@type': 'Brand', name: 'Cannasol Technologies' },
  description:
    'Nanoemulsified Cordyceps mushroom ingredient optimized for RTDs and shots. Efficient delivery, uniform distribution, and built for scalable production.',
  category: 'Functional Mushroom Ingredients',
  audience: { '@type': 'BusinessAudience', audienceType: 'B2B Beverage Formulation Teams' },
  manufacturer: { '@id': 'https://cannasoltechnologies.com/#organization' },
  offers: {
    '@type': 'Offer',
    availability: 'https://schema.org/InStock',
    priceCurrency: 'USD',
    url: 'https://mushrooms.cannasoltechnologies.com/',
    seller: { '@id': 'https://cannasoltechnologies.com/#organization' },
  },
};

const jsonLdFAQ = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What are nano emulsified mushrooms?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Nano emulsified mushrooms are functional mushroom extracts (Lion's Mane, Reishi, Cordyceps) processed through proprietary nanoemulsification technology. Mushroom particles are reduced to nanometer scale, enabling faster absorption, better bioavailability, and seamless integration into water-based functional beverages without separation or cloudiness.",
      },
    },
    {
      '@type': 'Question',
      name: 'Was Cannasol Technologies really the first to nano emulsify Reishi mushrooms?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes. Cannasol Technologies pioneered the world's first nano emulsified Reishi mushroom ingredient. This breakthrough technology was first deployed commercially through drinkbrez.com and is now available at scale for functional beverage brands of all sizes.",
      },
    },
    {
      '@type': 'Question',
      name: 'What mushrooms does Cannasol offer in nano emulsified form?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Cannasol Technologies offers three flagship nanoemulsified mushroom ingredients: Lion's Mane (for focus & clarity), Reishi (for calm & balance), and Cordyceps (for performance & energy). All three are production-ready and optimized for functional beverages.",
      },
    },
    {
      '@type': 'Question',
      name: 'What is the connection between Cannasol Technologies and drinkbrez.com?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Cannasol Technologies developed the exclusive nanoemulsification technology used by drinkbrez.com. That same cutting-edge technology is now available at scale to help aspiring functional mushroom brands and well-established entities create premium nano emulsified mushroom products.",
      },
    },
    {
      '@type': 'Question',
      name: 'How do nano emulsified mushrooms perform in beverages?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Nano emulsified mushroom ingredients integrate cleanly into water-based formulations with consistent dispersion, no cloudiness, and superior shelf stability. The nanoemulsification process enables faster uptake pathways, reliable batch-to-batch performance, and scalable manufacturing for brands of all production volumes.",
      },
    },
    {
      '@type': 'Question',
      name: 'Can I get samples before ordering?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! Cannasol Technologies encourages all potential partners to test nano emulsified mushroom ingredients in their formulations before committing. Contact us to request samples for Lion\'s Mane, Reishi, or Cordyceps.',
      },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="msapplication-TileColor" content="#0f172a" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebPage) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProductLionsMane) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProductReishi) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProductCordyceps) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFAQ) }}
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
