# src/content — site copy as data

Every factual sentence the site states about Cannasol lives here, once. Components render
from these modules; `scripts/build-knowledge-base.mjs` renders the same modules into
`functions/knowledge-base.md`, which grounds the Sol chatbot.

## Why this directory exists

Before it, the 18-question FAQ existed verbatim in two places — `src/components/FAQPage.jsx`
and `src/seo/structuredData.js` — maintained by hand and already drifting. Adding a chatbot
knowledge base would have made a third copy, and the copy a customer hears read aloud is the
one nobody remembers to update. Facts live here; presentation lives in the component.

## What belongs here, and what does not

Here: numbers, specs, claims, contact details, FAQ answers, product descriptions — anything a
customer could quote back at you. Not here: headlines, taglines, section titles, and brand
prose, which are presentation and stay in the JSX. The test is whether being wrong about it
would matter commercially.

## Icons stay in the component layer

`features` carries `iconKey: 'Beaker'` (a string), not a lucide component. These modules are
imported by a plain Node build script, so they must not pull in React or lucide-react. The
component maps `iconKey` to a real icon via a local lookup.

## Knowledge base generation

`node scripts/build-knowledge-base.mjs` (also `make kb`, and `npm run prebuild` on every
build) writes `functions/knowledge-base.md`. That file is generated — never hand-edit it, the
next build will discard the change.

The generated prefix must stay at or above **4,096 tokens** or Gemini 3.x will not cache it and
every chat turn pays full input price.

Measured against the live API on 2026-08-25 with `countTokens`: knowledge base + persona =
**4,486 tokens**, a margin of 390 over the floor. Confirmed working — repeat calls report
`cachedContentTokenCount: 2030`. An earlier revision sat at 4,195 (99 tokens of margin), which
was too thin to survive any edit; content was added rather than the floor ignored.

If you remove anything from these modules, re-measure. The byte count the build script prints
is only an estimate (chars/4); the authoritative number comes from `ai.models.countTokens`.

*2026-09-09: the knowledge base is now **30,395 characters (~7,599 estimated tokens)**, up from
24,798 after the ingredient brief was folded in, then up again from 30,222 after the A4 shelf-
stability reversal and the C9 wording fix. `functions/lib/CLAUDE.md § Prompt caching is implicit`
measures the real prefix at ~10k tokens with 2.5x headroom over the 4,096 floor, so the floor is
no longer the live risk it was when the section above was written — the live cost is that the
prefix is resent every turn.*

*2026-08-26: the 4,486 figure above is now a floor, not the current number — the Reishi world-first,
the Brez client history and the strain names added ~780 characters to the generated file. Margin
over the 4,096 floor only grew, so nothing was re-measured against the live API; do that before
trusting the figure again, and certainly before removing anything.*

## The product line has five customer-facing names

`Kavalactone Nanoemulsion`, `Lion's Mane Nanoemulsion`, `Reishi Nanoemulsion`,
`Cordyceps Nanoemulsion`, `Bitter Blocker`. The mushroom line is three distinct nanoemulsions, not
one "Nano Mushrooms" product — `mushroomLine.products` carries them individually and
`sampleOffer.headline` enumerates all five, which is what puts them in the knowledge base.
`functions/lib/persona.js` § THE BOX HAS ROOM FOR THE WHOLE LINE repeats the five names because
Sol must offer them without a knowledge-base lookup; if a name changes here, change it there too.

*Added 2026-08-26. Before this, `mushroomLine.summary` described the line as a single product and
the persona section was named THE BOX HAS ROOM FOR THREE.*

*Corrected 2026-09-09: `mushroomLine.caveat` read "No numeric specifications (particle size, onset,
shelf life) are published for the mushroom line." That is now false and the field was deleted — the
brief publishes a dose range and an ingredient cost per serving for each of the three, plus 50/50
USA/global sourcing. Bitter Blocker also changed role: it stays a purchasable line, but the kava
nanoemulsion needs no bitter blocker, so nothing here or in `persona.js` may say a kava buyer will
hit a taste problem without one.*

## Client and capability facts live in `differentiators`

`product.js` `differentiators` is the only rendered free-form list for Cannasol track-record
claims, so the Reishi world-first and the Brez relationship live there rather than in
`company.js` — `scripts/build-knowledge-base.mjs` renders only named fields from `company.js`, so
a new export there would never reach the bot.

**Brez is a real, named customer.** State the relationship exactly as `differentiators` words it
and no further: no endorsement, no reference offer, no claims about Brez's own product.

## Bioavailability is 4–5x — RESOLVED 2026-09-09

*This section previously read "Known discrepancy: bioavailability 5x vs 10x" and said
`specComparison` recorded **~10x**, with the `5x` in the `KavaLandingPage.jsx` hero card as the
lone outlier, awaiting a decision. The decision arrived: the enjoynano NANO KAVA INGREDIENT BRIEF
(2 pages, 2026-09) states **4–5x higher absorption vs. conventional powder**, and it supersedes.*

`specComparison` now records **4–5x conventional kava powder**. The hero card's `5x` was the
conservative reading and is inside the range. Two claims the brief does not substantiate were
retired outright rather than restated: **80–90% kavalactone absorption vs 10–15%**, and the
**~5 minute onset vs 30–45 minutes**. Nothing in `src/content/` may reintroduce either, and
`persona.js § USING YOUR KNOWLEDGE` does not list onset as something the knowledge base states.

*Corrected 2026-09-09: this previously grouped shelf life with onset as unstated. Shelf life
(12+ months) is stated — spec A4, see § The brief is the spec SSoT above — only onset is not.*

## The brief is the spec SSoT, and what else it superseded

*Added 2026-09-09.* Superseded in the same change: `~18 nm` → **`~20 nm`**; "fully water-soluble"
→ **"100% water-dispersible"**; the traditional droplet-size cell "Not nanosized (microns and
larger)" → **"200–1,000 nm — settles, hazes"**; and the positioning badge "The World's First &
Only ~18nm Kava Nanoemulsion" plus the only-manufacturer claim → the supportable **first to
nano-emulsify kava**.

*Corrected 2026-09-09: this section previously listed "12+ months shelf stability" as superseded
by the brief's qualitative "stays clear, stays suspended — no settling, no ringing" wording. Stephen
overruled that retirement (spec A4): `12+ months` is KEPT, in `specComparison`, the FAQ, JSON-LD
product specs and `public/`, and the qualitative wording is carried in addition, not instead.*

*Corrected 2026-09-09: the multi-year time span previously attached to the first-to-nano-emulsify
claim is dropped on Stephen's instruction (ruling C9) — `positioning.claim`, the `differentiators`
entry and the FAQ trailing sentence now all read `Cannasol Technologies was the first company to
nano-emulsify kava, and has since scaled the process and brought the cost down.`*

*Added 2026-09-09: `company.js` `contactRoutes.faqPage` no longer hard-codes "18 answers" — it
derives the count from `faqCategories.reduce(...)` in `faq.js`, so the two can no longer drift.*

Kept because the brief is silent, not contradictory: NanoOptimizer™, QSonica, noble-varieties /
never-tudei, and the Reishi world-first.

Added: sourcing (Vanuatu, CO2 through New Zealand, nanoemulsified in-house, root & rhizome, 5:1,
COA + particle-size report per lot), the drop-in process, the dosing table, `$250/L` at the 1,000 L
tier, labelling guidance, and the bulk-ingredient disclaimer. These live in `product.js` as
`sourcing`, `dropInProcess`, `dosing`, `pricing`, `labeling` and `bulkIngredientDisclaimer`, and
each had to be added to `build-knowledge-base.mjs` by name — a new export is invisible to Sol until
it is.

## Labelling guidance is B2B, not consumer advice

*Added 2026-09-09.* `labeling` carries a 21 CFR 101.36 panel template and the abridged CRN caution
wording. It is what a brand owner prints on their own label, and it is framed that way throughout —
never as advice about consuming kava. `exampleCaution` quotes label copy including the FDA liver
warning; that is a labelling requirement to reproduce, not a health discussion Sol may open. The
persona's "never discuss drug interactions, liver safety, pregnancy" rule is unchanged and still
binds.

## Why the domain knowledge avoids efficacy

*Added 2026-09-08. `formulation.js` has pointed here since it was written; the section did not
exist, so the pointer resolved to nothing.*

`formulation.js` is colloid science, process constraints and botany — droplet size, ringing,
hot-fill, pH — and deliberately no health effect. Everything in this directory is rendered into
`functions/knowledge-base.md` and handed to the model as fact it may repeat. Kava is an
ingestible: a therapeutic sentence written here is one Sol will say to a formulator as
Cannasol's position, and the no-health-claims rule in `functions/lib/persona.js` cannot retract
what the knowledge base asserts. Bioavailability and absorption are pharmacokinetics and stay;
"helps with anxiety" is efficacy and does not.

*Corrected 2026-09-09: the last sentence read "Bioavailability and onset are pharmacokinetics and
stay". Onset is no longer claimed anywhere — the brief makes no onset claim — so it is not an
example of something that stays.*

## External sources are snapshots, not live fetches

`external.js` holds captured facts from `cannasoltechnologies.com` (note: `cannasolusa.com`
301-redirects there). The corporate site publishes no numeric specs. Re-capture by hand when the
corporate site changes materially.

*Corrected 2026-09-09: this previously said "enjoynano.com is authoritative for particle size,
onset, absorption and shelf life". The NANO KAVA INGREDIENT BRIEF is now the SSoT for every spec,
and it publishes no onset or shelf-life figure at all.*

## One sample link per line

*Added 2026-08-26.* `sampleOffer.lineUrls` names all five lines with their own
`?product=` link, and `build-knowledge-base.mjs` renders one bullet each. It previously exposed
only `kavaUrl` and `mushroomUrl`, so the knowledge base told Sol just two sample links existed
and he could not point anyone at a single mushroom strain or the Bitter Blocker. `mushroomUrl`
stays as the "all three at once" link — it is referenced from `structuredData.js` and the
`/mushrooms` CTAs.
