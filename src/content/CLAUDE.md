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

## Client and capability facts live in `differentiators`

`product.js` `differentiators` is the only rendered free-form list for Cannasol track-record
claims, so the Reishi world-first and the Brez relationship live there rather than in
`company.js` — `scripts/build-knowledge-base.mjs` renders only named fields from `company.js`, so
a new export there would never reach the bot.

**Brez is a real, named customer.** State the relationship exactly as `differentiators` words it
and no further: no endorsement, no reference offer, no claims about Brez's own product.

## Known discrepancy: bioavailability 5x vs 10x

`KavaLandingPage.jsx` renders `5x` in its hero stat card. Every other statement on the site —
the spec table, the body copy below the hero, the meta description, the FAQ and all schema.org
— says `10x`. `specComparison` here records **~10x**, so the chatbot and the spec table agree
and the hero card is the lone outlier. Flagged to Stephen 2026-08-25; awaiting a decision on
whether the hero card is a typo or a deliberately conservative number.

## Why the domain knowledge avoids efficacy

*Added 2026-09-08. `formulation.js` has pointed here since it was written; the section did not
exist, so the pointer resolved to nothing.*

`formulation.js` is colloid science, process constraints and botany — droplet size, ringing,
hot-fill, pH — and deliberately no health effect. Everything in this directory is rendered into
`functions/knowledge-base.md` and handed to the model as fact it may repeat. Kava is an
ingestible: a therapeutic sentence written here is one Sol will say to a formulator as
Cannasol's position, and the no-health-claims rule in `functions/lib/persona.js` cannot retract
what the knowledge base asserts. Bioavailability and onset are pharmacokinetics and stay; "helps
with anxiety" is efficacy and does not.

## External sources are snapshots, not live fetches

`external.js` holds captured facts from `cannasoltechnologies.com` (note: `cannasolusa.com`
301-redirects there). The corporate site publishes no numeric specs, so enjoynano.com is
authoritative for particle size, onset, absorption and shelf life. Re-capture by hand when the
corporate site changes materially.

## One sample link per line

*Added 2026-08-26.* `sampleOffer.lineUrls` names all five lines with their own
`?product=` link, and `build-knowledge-base.mjs` renders one bullet each. It previously exposed
only `kavaUrl` and `mushroomUrl`, so the knowledge base told Sol just two sample links existed
and he could not point anyone at a single mushroom strain or the Bitter Blocker. `mushroomUrl`
stays as the "all three at once" link — it is referenced from `structuredData.js` and the
`/mushrooms` CTAs.
