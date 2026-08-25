/**
 * @file: src/content/faq.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Single source of truth for the site FAQ. Consumed by the FAQ page, the
 *     schema.org FAQPage graph, and the chatbot knowledge-base generator.
 *     Icons stay in the component layer so this module is import-safe from Node.
 *
 * @See Also:
 *     src/components/FAQPage.jsx
 *     src/seo/structuredData.js
 *     scripts/build-knowledge-base.mjs
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

export const faqCategories = [
  {
    id: 'product-technology',
    title: 'Product & Technology',
    faqs: [
      {
        question: 'What is nano Kava?',
        answer:
          'Nano Kava is a nanoemulsified form of Kava extract where particles are reduced to approximately 18 nanometers in size. This is achieved through our proprietary NanoOptimizer™ surfactant system and ultrasonic processing technology. The ultra-small particle size dramatically increases bioavailability (up to 10x compared to traditional Kava) and reduces onset time to just 5 minutes.',
      },
      {
        question: "What makes Cannasol's ~18nm particle size special?",
        answer:
          'Our ~18nm particle size is the smallest in the industry—no competitor has achieved this. Smaller particles mean: (1) Faster absorption through cell membranes, (2) Higher bioavailability of kavalactones, (3) Crystal-clear formulations with no cloudiness, and (4) Better shelf stability with no separation. We achieve this through our partnership with QSonica, the #1 ultrasonic liquid processing equipment manufacturer.',
      },
      {
        question: 'How does nano Kava compare to traditional Kava extract?',
        answer:
          'Traditional Kava extracts are hydrophobic (water-fearing), poorly absorbed, and take 30-45 minutes to feel effects. Only 10-15% of kavalactones are typically absorbed. Our nano Kava is water-soluble, absorbs in minutes, and delivers 80-90% kavalactone absorption. The result: faster onset, stronger effects at lower doses, and better-tasting products.',
      },
      {
        question: 'What is the NanoOptimizer™ surfactant system?',
        answer:
          'NanoOptimizer™ is our proprietary blend of food-grade surfactants that encapsulate Kava particles, making them water-soluble and stable. This system prevents particle re-aggregation, ensures consistent dosing, and allows the nano Kava to remain suspended indefinitely without separation or settling.',
      },
    ],
  },
  {
    id: 'effects-dosing',
    title: 'Effects & Dosing',
    faqs: [
      {
        question: 'How fast does nano Kava work?',
        answer:
          'Most users report feeling effects within 5 minutes of consumption, compared to 30-45 minutes for traditional Kava. This rapid onset is due to the ultra-small particle size allowing for immediate absorption through the oral mucosa and GI tract.',
      },
      {
        question: 'What dosage should I use in my products?',
        answer:
          'Dosing depends on your target effects and product format. We recommend starting with 50-100mg of kavalactones per serving for mild relaxation, 100-200mg for moderate effects, and 200-300mg for stronger effects. Because of the increased bioavailability, you may need less nano Kava than traditional extracts to achieve the same effects. We work directly with each client to dial in the perfect dosage for your specific product.',
      },
      {
        question: 'Is nano Kava safe?',
        answer:
          'Kava has been consumed safely for thousands of years in Pacific Island cultures. Our nano Kava uses the same kavalactones, just in a more bioavailable form. We use only noble Kava varieties and test for purity and potency. As with any supplement, we recommend following standard Kava safety guidelines and consulting with regulatory experts for your specific market.',
      },
    ],
  },
  {
    id: 'formulation-applications',
    title: 'Formulation & Applications',
    faqs: [
      {
        question: 'What products can I make with nano Kava?',
        answer:
          'Our nano Kava is ideal for: Kava seltzers and sparkling beverages, functional shots and elixirs, RTD (ready-to-drink) relaxation beverages, wellness tonics, mocktails and alcohol alternatives—plus any water-based formulation where you need fast-acting, great-tasting Kava.',
      },
      {
        question: 'Will nano Kava make my beverage cloudy?',
        answer:
          'No! One of the key benefits of our ~18nm particle size is crystal-clear formulations. Traditional Kava extracts create cloudy, unappealing beverages. Our nano Kava stays perfectly clear and stable, giving your products a premium, professional appearance.',
      },
      {
        question: 'Does nano Kava taste bitter like traditional Kava?',
        answer:
          'Our nano Kava has a significantly reduced bitter taste compared to traditional extracts. Additionally, we offer bitter blocker bundles—proprietary flavor-masking ingredients that can virtually eliminate any remaining Kava taste. This allows you to create smooth, palatable products your customers will actually enjoy drinking.',
      },
      {
        question: 'How stable is nano Kava in beverages?',
        answer:
          'Our nano Kava emulsion is highly stable with a shelf life of 12+ months when stored properly. The NanoOptimizer™ system prevents particle re-aggregation, so there\'s no separation, settling, or "ring around the bottle." Your products will look as good on day 365 as they did on day 1.',
      },
    ],
  },
  {
    id: 'ordering-partnership',
    title: 'Ordering & Partnership',
    faqs: [
      {
        question: 'What is the minimum order quantity?',
        answer:
          "We work with brands of all sizes, from startups to established beverage companies. Minimum order quantities vary based on your needs. Contact us directly to discuss your specific requirements—we're flexible and want to help you succeed.",
        linkPhrase: 'Contact us',
        linkTo: '/contact',
      },
      {
        question: 'Can I get samples before ordering?',
        answer:
          "Absolutely! We encourage all potential partners to test our nano Kava in their formulations before committing to an order. Contact us to request samples and we'll get them shipped to you promptly.",
      },
      {
        question: "What's the process to get started?",
        answer:
          'Getting started is simple: (1) Schedule a discovery call with Josh to discuss your product vision, (2) Receive samples to test in your formulations, (3) Work with us to refine your product and dial in the perfect dosage, (4) Place your order and scale production. Josh works directly with every client to ensure your success.',
      },
      {
        question: 'Do you offer white-label or private-label services?',
        answer:
          "We primarily supply nano Kava as a bulk ingredient for your own branded products. We don't currently offer finished product manufacturing, but we can recommend trusted co-packers and formulators if needed.",
      },
    ],
  },
  {
    id: 'quality-compliance',
    title: 'Quality & Compliance',
    faqs: [
      {
        question: 'What quality certifications do you have?',
        answer:
          'We maintain strict quality control standards and can provide Certificates of Analysis (COA) for all batches. Our facility follows GMP (Good Manufacturing Practice) guidelines. We test for potency, purity, heavy metals, and microbial contamination.',
      },
      {
        question: 'Is your Kava sourced from noble varieties?',
        answer:
          'Yes, we exclusively use noble Kava varieties, which are the traditional, safe varieties that have been consumed for centuries. We never use tudei (two-day) Kava or other non-noble varieties that have been associated with adverse effects.',
      },
      {
        question: 'Can you provide documentation for regulatory compliance?',
        answer:
          'Yes, we provide full documentation including COAs, specifications sheets, and safety data. We can work with your regulatory team to ensure you have everything needed for compliance in your target markets.',
      },
    ],
  },
];

export const faqEntries = faqCategories.flatMap((category) =>
  category.faqs.map(({ question, answer }) => [question, answer])
);
