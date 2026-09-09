#!/usr/bin/env node
/**
 * @file: scripts/build-knowledge-base.mjs
 * @author: Stephen Boyett
 *
 * @description:
 *     Renders every content module into functions/knowledge-base.md, the cached
 *     prefix the chat model is grounded on. Run on every build so the bot cannot
 *     drift from the site. See src/content/CLAUDE.md § Knowledge base generation.
 *
 * @See Also:
 *     src/content/faq.js
 *     functions/lib/chat.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { faqCategories } from '../src/content/faq.js';
import {
  specComparison,
  process as steps,
  applications,
  differentiators,
  mushroomLine,
  positioning,
  problems,
  solutionNarrative,
  solutionPoints,
  perfectFor,
  features,
  sourcing,
  dropInProcess,
  dosing,
  pricing,
  labeling,
  bulkIngredientDisclaimer,
} from '../src/content/product.js';
import { company, sampleOffer, equipment, contactRoutes } from '../src/content/company.js';
import { externalSources } from '../src/content/external.js';
import { domainKnowledge } from '../src/content/formulation.js';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../functions/knowledge-base.md');

const section = (title, body) => `## ${title}\n\n${body}\n`;
const bullets = (items) => items.map((item) => `- ${item}`).join('\n');

const identity = bullets([
  `Legal name: ${company.legalName} (also referred to as ${company.shortName}).`,
  `Business model: ${company.model}`,
  `Consumer-facing brand and site: ${company.brand} at ${company.site}.`,
  `Corporate site: ${company.corporateSite} (shop: ${company.shop}, resources: ${company.resources}).`,
  `Location: ${company.location}. Hours: ${company.hours}.`,
  `Phone: ${company.phone}.`,
  `Founder: ${company.founder.name}, ${company.founder.title} — ${company.founder.email}. ${company.responseTime}`,
]);

const doseTable = [
  '| Kavalactone per serving | Emulsion per serving | Servings per liter | Ingredient cost per serving |',
  '| --- | --- | --- | --- |',
  ...dosing.rows.map((r) => `| ${r.kavalactone} | ${r.emulsion} | ${r.servingsPerLiter} | ${r.costPerServing} |`),
].join('\n');

const specs = [
  '| Specification | Nano Kava | Traditional kava extract |',
  '| --- | --- | --- |',
  ...specComparison.map((r) => `| ${r.spec} | ${r.nano} | ${r.traditional} |`),
].join('\n');

const faq = faqCategories
  .map((c) => `### ${c.title}\n\n${c.faqs.map((f) => `**Q: ${f.question}**\n\nA: ${f.answer}`).join('\n\n')}`)
  .join('\n\n');

const external = externalSources
  .map((s) => `### ${s.url}\n\n_Captured ${s.captured}. ${s.notes}_\n\n${bullets(s.facts)}`)
  .join('\n\n');

const doc = [
  '# Cannasol Technologies — Nano Kava Knowledge Base',
  '',
  '_Generated from src/content/ by scripts/build-knowledge-base.mjs. Do not edit by hand._',
  '',
  section('Company identity', identity),
  section('Positioning', bullets([positioning.badge, positioning.claim, positioning.summary, positioning.trust])),
  section('The problem with traditional kava extract', bullets(problems)),
  section('How nanoemulsification solves it', `${solutionNarrative}\n\n${bullets(solutionPoints)}`),
  section('Product benefits', features.map((f) => `### ${f.title} (${f.highlight})\n\n${f.description}`).join('\n\n')),
  section('Ideal customer profiles', bullets(perfectFor)),
  section('Nano Kava vs. traditional kava extract', specs),
  section('What differentiates Cannasol', bullets(differentiators)),
  section('Where it comes from', bullets([sourcing.material, ...sourcing.facts])),
  section('Adding it to a batch', bullets([dropInProcess.summary, dropInProcess.clarity])),
  section('Dosing and cost per serving', `${dosing.guidance}\n\n${doseTable}`),
  section('Pricing', bullets([pricing.headline, pricing.tier, pricing.caveat])),
  section(
    'Labelling guidance for a brand owner',
    `_${labeling.intro}_\n\n${bullets(labeling.points)}\n\nExample Supplement Facts panel (illustrative template, not an approved label):\n\n${bullets(labeling.examplePanel)}\n\n${labeling.exampleCaution}`
  ),
  section('How Nano Kava is sold', bulkIngredientDisclaimer),
  section('Applications', bullets(applications)),
  section('How a new customer gets started', bullets(steps.map((s) => `${s.step} ${s.title} — ${s.description}`))),
  section('Samples and ordering', bullets([sampleOffer.headline, `Price: ${sampleOffer.price}.`, sampleOffer.moq, sampleOffer.turnaround, ...sampleOffer.steps, ...sampleOffer.lineUrls.map(({ name, url }) => `${name} sample request link: ${url}`), `All three mushroom nanoemulsions at once: ${sampleOffer.mushroomUrl}`])),
  section('Nano Mushroom line', bullets([mushroomLine.summary, ...mushroomLine.products.map((p) => `${p.name} — best for ${p.bestFor}. Typical dose ${p.dose}, ingredient cost ${p.costPerServing} per serving. ${p.points.join('; ')}.`), ...mushroomLine.benefits])),
  section('How to reach Cannasol', bullets([contactRoutes.form, contactRoutes.formPromise, `Inquiry types on the form: ${contactRoutes.inquiryTypes.join(', ')}.`, contactRoutes.faqPage, contactRoutes.mushroomsPage, contactRoutes.escalation])),
  section('Equipment business', bullets([equipment.summary, `Processor range: ${equipment.range}, ${equipment.startingPrice}.`, `Categories: ${equipment.categories.join(', ')}.`])),
  section('Frequently asked questions', faq),
  section(
    'General domain knowledge',
    `_Technical background for formulation conversations. These are process and composition facts, not health or efficacy claims._\n\n${domainKnowledge
      .map((topic) => `### ${topic.title}\n\n${bullets(topic.facts)}`)
      .join('\n\n')}`
  ),
  section('Corporate web presence (snapshot)', external),
].join('\n');

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, doc, 'utf8');

const estTokens = Math.round(doc.length / 4);
console.log(`knowledge-base.md written: ${doc.length} chars, ~${estTokens} tokens (Gemini 3.x caches only a >=4096-token prefix; the persona adds ~900)`);
