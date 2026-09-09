# Copy Update Build Spec — Nano Kava Ingredient Brief

Stephen's signed-off rulings on reconciling the site copy with the two-page
`NANO KAVA · INGREDIENT BRIEF` (enjoynano, 2026-09). This document records the rulings only.
Implement against it; do not re-litigate the decisions.

| | |
|---|---|
| Source of truth | `NANO KAVA · INGREDIENT BRIEF`, 2 pp., enjoynano / Cannasol Technologies |
| Ruled by | Stephen Boyett, 2026-09-09 |
| Sign-off record | https://claude.ai/code/artifact/3c5f1aa5-1bfa-4cf3-a937-25863128e0c1 |
| Marked | 35 of 41 items |
| Already applied | `src/content/`, `functions/lib/persona.js`, `functions/knowledge-base.md`, `src/components/chat/transport/useChatStream.js` |
| Outstanding | Tier 2 components, tier 3 SEO, tier 4 `public/`, tests |
| Release | `make deploy` only. Never bare `firebase deploy` — it skips IndexNow. |

**Verdict key.** `APPROVED` — the proposed default stands. `RULED` — Stephen's note overrides the
proposed default; the note is binding and quoted verbatim. `NOT RULED` — left unmarked; do not
assume, ask.

---

## Reversal required before anything else

**A4 was overruled after `src/content/` had already been changed.** The 12+ month shelf-stability
claim was removed from `product.js`, `faq.js` and `functions/knowledge-base.md`. Stephen ruled it
stays. Restore it first, then regenerate with `npm run kb`, or the knowledge base will ship
contradicting this spec.

---

## A · Rulings

### A1 — The brief supersedes the website · APPROVED
Wherever the brief and the site disagree, the brief wins. Every ruling below follows from this.

### A2 — Retire the 5-minute onset claim entirely · APPROVED
The brief makes no onset claim. Remove `~5 minutes vs 30–45 minutes` from the spec table, hero
stat card, meta description, JSON-LD, `routes.js` summary and all `public/` copy. Do not restate
it in weaker language.

### A3 — Retire the 80–90% vs 10–15% absorption figures · APPROVED
Replace with the brief's `4–5x higher absorption vs conventional powder`. Remove the schema.org
`QuantitativeValue` carrying the percentages and drop them from the `agents.md` "verified
specifications" list.

### A4 — Shelf stability · RULED — DEFAULT OVERRULED

> "We can keep 12+ month shelf stability"

**Keep `12+ months`.** The proposed retirement does not happen. Restore the value everywhere it was
removed (see *Reversal required* above) and keep it in the spec comparison table, the FAQ answer,
the JSON-LD product specs and the `public/` corpus. The brief's "stays clear, stays suspended — no
settling, no ringing" may be carried **in addition**, not as a replacement.

### A5 — Bitter Blocker · APPROVED, WITH A BINDING NOTE

> "We should still say that we offer the samples of all of the samples Sol is currently offering."

Two things hold together:
1. **The sample offer is unchanged.** All five lines stay on offer and stay named — Kavalactone
   Nanoemulsion, Lion's Mane Nanoemulsion, Reishi Nanoemulsion, Cordyceps Nanoemulsion and
   **Bitter Blocker**. Do not remove Bitter Blocker from `sampleOffer.lineUrls`, the `ContactPage`
   product map, or `persona.js § THE BOX HAS ROOM FOR THE WHOLE LINE`.
2. **Bitter Blocker is no longer positioned as something kava requires.** The brief states the
   nanoemulsion needs no bitter blockers or flavor modifiers. Remove any claim that a kava buyer
   will hit a taste problem without one.

### A6 — Retire "The World's First & Only ~18nm Kava Nanoemulsion" · APPROVED
Retire the badge and the only-manufacturer claim from `positioning`, the three `structuredData.js`
slogan nodes, the `routes.js` title, the `KavaLandingPage.jsx` hero badge and all `public/` copy.
Replaced by C9 — see C9's wording note, which governs.

### A7 — Savings Calculator · RULED

> "Rebuild on the brief's real economics. But if it goes negative then retire it until we can work
> with Josh on refining it."

Rebuild `SavingsCalculator.jsx` on the brief's published figures: 4–5x relative absorption,
30 mg/mL kavalactone load, $250/L at the 1,000 L tier, and the cost-per-serving table in C2.
**Then check the output across the full input range.** If savings go negative at any plausible
input, retire the calculator — remove it from `KavaLandingPage.jsx` and its section copy — and
raise it with Josh rather than shipping a calculator that argues against the product. Do not ship
a rebuilt calculator without running that check.

---

## B · Numbers and wording — all APPROVED

| # | From | To |
|---|---|---|
| B1 | `~18 nm` | `~20 nm` |
| B2 | `~10x` bioavailability | `4–5x` vs conventional kava powder |
| B3 | "fully water-soluble" | "100% water-dispersible" |
| B4 | "Not nanosized (microns and larger)" | "200–1,000 nm — settles, hazes" |
| B5 | 50–100 mg mild / 100–200 moderate / 200–300 strong | 40 mg light / 50–60 mg recommended / 75 mg max |
| B6 | "MOQ negotiated per customer" | "No minimum to get started" |
| B7 | `9:30–5:30 EST` | `9:30–5:30 ET` |

B1 also covers the `18nm` easter-egg trigger in `src/components/chat/panel/secretPhrases.js` and
the `~18 nm` value rendered by `src/components/NanoExplainer.jsx`.

B5 is the highest-consequence item in this section: the superseded guidance sends a customer to
roughly four times the brief's maximum-strength dose.

---

## C · New facts to add — all APPROVED

### Commercial
- **C1 — Price.** `$250 / liter` at ~30 mg/mL, the 1,000 L tier currently extended to every
  customer. Carry the brief's caveat: pricing reflects a promotional tier, is subject to change,
  and a written quote comes from Josh. Cost-per-serving figures are ingredient cost only.
- **C2 — Dosing and cost table.**

  | Kavalactone / serving | Emulsion | Servings per liter | Cost / serving |
  |---|---|---|---|
  | 40 mg — light | ~1.33 mL | 750 | $0.33 |
  | 50 mg — recommended | ~1.67 mL | 600 | $0.42 |
  | 60 mg — recommended | ~2.00 mL | 500 | $0.50 |
  | 75 mg — max strength | ~2.50 mL | 400 | $0.63 |

- **C3 — Kavalactone load.** 30 mg/mL.
- **C4 — Sample turnaround.** Samples, COA and particle-size report within a week. Three steps:
  confirm ship-to address and format; samples ship with COA and particle-size report; phone
  support while formulating.

### Provenance and process
- **C5 — Supply chain.** Kava extract imported directly from the South Pacific — grown in Vanuatu,
  CO₂ extracted through New Zealand — then nanoemulsified in-house.
- **C6 — Material identity.** *Piper methysticum* root & rhizome extract, 5:1.
- **C7 — Documentation.** COA and particle-size report supplied with every lot.
- **C8 — Drop-in process.** No high-shear equipment, no pre-mix, no heat step. Batch the beverage,
  meter in the emulsion, stir to disperse.
- **C9 — First to nano-emulsify kava · APPROVED, WITH A BINDING WORDING NOTE**

  > "You don't need to include \"four to five years ago\". Word it like it is worded in the document"

  The brief's sentence reads: *"Cannasol Technologies was the first company to nano-emulsify kava,
  over four to five years ago, and has spent that time scaling the process and bringing cost
  down."* Use the brief's phrasing with the time span dropped. **Open wording question:** removing
  "over four to five years ago" leaves "and has spent that time" without an antecedent, so the
  trailing clause needs rewording or dropping. Confirm the final sentence with Stephen before it
  propagates — this claim replaces the retired A6 badge and will appear in the hero, the JSON-LD
  slogan nodes and the `public/` corpus.

### Labeling
- **C10 — The "360 mg Nano Kava Complex" convention.** Brands dosing at 50–60 mg lead with the
  whole-complex weight rather than the kavalactone figure; actual kavalactone content is disclosed
  in the Supplement Facts panel.
- **C11 — 21 CFR 101.36 panel guidance.** No zero-amount rows, plant part named, kavalactone
  content disclosed, CRN caution wording abridged, every ingredient listed in Other Ingredients.
  Always carry "have your own label reviewed before print."
- **C12 — Illustrative Supplement Facts panel and CRN caution block.** Serving size 1 can (355 mL);
  Calories 20; Total Carbohydrate 5 g (2% DV); Total Sugars 4 g; Nano Kava Complex 360 mg — kava
  root extract (*Piper methysticum*), 5:1, providing 60 mg kavalactones. Caution wording: not for
  use by persons under 18, or by pregnant or breastfeeding women; not for use with alcoholic
  beverages; FDA advises a risk of rare but severe liver injury with kava supplements; ask a health
  care professional before use.

  Frame this strictly as **label copy a brand owner prints**, never as advice about consuming kava.
  The `persona.js` rule barring Sol from discussing liver safety, pregnancy and alcohol is
  unchanged and still binds.

  This block was transcribed from a photograph of the brief. Verify against the source PDF before
  it ships.
- **C13 — Bulk-ingredient disclaimer.** Sold as a bulk ingredient for licensed manufacturers and
  brand owners, not a finished consumer product. Statements have not been evaluated by the Food and
  Drug Administration. Buyers are responsible for the regulatory status, labeling and substantiation
  of their finished products.

### Mushroom line
- **C14 — Dose ranges and cost per serving.**

  | Extract | Dose range | Cost / serving |
  |---|---|---|
  | Lion's Mane | 25 – 35 mg | $0.12 – $0.17 |
  | Cordyceps | 25 – 35 mg | $0.14 – $0.20 |
  | Reishi | 15 – 25 mg | $0.11 – $0.19 |

  This deletes `mushroomLine.caveat`, which stated that no numeric specifications are published for
  the mushroom line.
- **C15 — Sourcing and positioning.** 50/50 USA/global sourcing; water-dispersible, clear in
  solution; "a daytime counterpart to kava, or stacked into the same line."
- **C16 — Josh's direct line.** `(330) 808-0546`, alongside the office number `(216) 921-2240`.

---

## D · Claims kept unchanged — all APPROVED

The brief is silent on these. Silence is not contradiction; they stay exactly as they are.

| # | Claim |
|---|---|
| D1 | NanoOptimizer™ |
| D2 | The QSonica partnership |
| D3 | Noble varieties only, never tudei |
| D4 | First in the world to nano-emulsify reishi |
| D5 | The Brez relationship, worded as-is, no-endorsement guardrail intact |

---

## NOT RULED — do not assume

Six items were left unmarked. Treat each as open.

| # | Item | Current state |
|---|---|---|
| F1 | Re-measure the Gemini cache prefix after the copy settles | Knowledge base grew 24,798 → 30,408 chars, so the 4,096-token floor is not at risk; not re-measured against the live API |
| F2 | Full test suite, then a real `npm run build` | 644 tests passing as of 2026-09-09 |
| F3 | Release only via `make deploy` | Not yet released |
| F4 | Obtain the source PDF before shipping C12 | Not obtained |
| G1 | **The brief contradicts itself: 4× in the deck, 4–5× in the stat block and dosing section** | `4–5x` used throughout. If Josh rules 4×, B2 and C-section copy change again |
| G2 | What "360 mg Nano Kava Complex" denotes — extract solids, not delivered emulsion | Unresolved; needed if a buyer's regulatory team asks |

---

## Where the work lands

Tier 1 is the fact SSoT. The FAQ page and landing page import from it and pick up changes
automatically; everything else is hand-maintained and must be reconciled by hand.

| Tier | Files | Status |
|---|---|---|
| 1 · Fact SSoT | `src/content/{company,product,faq,formulation,external}.js` | Applied — pending A4 reversal |
| 5 · Sol persona | `functions/lib/persona.js` | Applied — pending A4 reversal |
| 5 · Sol knowledge base | `functions/knowledge-base.md` — **generated, `npm run kb`, never hand-edit** | Applied — regenerate after A4 |
| 5 · Sol greetings | `src/components/chat/transport/useChatStream.js` | Applied |
| 5 · Chat engagement | `src/components/chat/panel/secretPhrases.js`, nudges, quiz, lead card | Outstanding |
| 2 · Page prose | `KavaLandingPage.jsx`, `MushroomsLandingPage.jsx`, `ContactPage.jsx`, `NanoExplainer.jsx` | Outstanding |
| 2 · Calculator | `SavingsCalculator.jsx` | Outstanding — see A7 |
| 3 · SEO | `src/seo/structuredData.js`, `src/seo/routes.js`, 4× `<Helmet>` blocks | Outstanding |
| 4 · AI-crawler corpus | `public/{index,faq,mushrooms,contact}.md`, `llms.txt`, `llms-full.txt`, `agents.md`, `ai.txt` — 1,009 hand-maintained lines | Outstanding |
| — · Tests | 17 files in `src/test/` assert on copy strings | Outstanding |

### Structural fixes to fold into the same pass

- `MushroomsLandingPage.jsx` duplicates the three mushroom products locally instead of importing
  them from `src/content/product.js`. Point it at the SSoT while the values are changing.
- `src/seo/structuredData.js` hard-codes a six-row spec table against the SSoT's ten rows. Import
  `specComparison` instead.
- The FAQ count is written as prose in `company.js` (`18 answers`) and `routes.js`
  (`Eighteen answered questions`). Derive it, or it lies the next time the FAQ changes length.

### Constraints that bind the implementer

- `functions/knowledge-base.md` is generated. Edit `src/content/`, then `npm run kb`.
- A new `src/content/` export is invisible to Sol until `scripts/build-knowledge-base.mjs` names it.
- Nothing in `src/content/` may carry a health or efficacy claim — it is handed to Sol as fact he
  may repeat, and `persona.js` cannot retract what the knowledge base asserts.
- Adding a route requires `src/seo/routes.js` **and** the `firebase.json` rewrites array, or it
  404s in production.
- Update the relevant directory `CLAUDE.md` in the same change as the code.
