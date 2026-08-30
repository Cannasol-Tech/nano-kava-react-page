# AEO / SEO runbook — enjoynano.com

How the machine-readable surface of this site is produced, what to do after each deploy,
and what still needs a human. Written 2026-08-25.

Target queries this site is built to win: **nano kava**, **nano-kava**, **nano emulsified
kava**, **nanoemulsified kava**, **kava nanoemulsion**, **nano-emulsified kavalactones**.

---

## The one thing that matters most

Most AI retrieval crawlers — GPTBot, ClaudeBot, PerplexityBot, CCBot — **do not execute
JavaScript**. A client-rendered React SPA serves them an empty `<div id="root">`.

`scripts/prerender.mjs` runs after every `vite build` and writes fully rendered HTML for
each route. It fails the build if any route comes back with a near-empty root, so a
regression here cannot ship silently.

Verify after a build:

```bash
npm run build          # prints chars-of-content per route
grep -c "nano" dist/index.html
```

If a route ever renders empty, the cause is almost always the `app-rendered` event in
`src/AppRoutes.jsx` not firing — the prerenderer waits on it.

It is also a straight performance win, not a tax. Measured on a 4G profile with cold caches
(median of 11 runs, identical source both sides):

| | no prerender | prerendered |
| --- | --- | --- |
| FCP | 580 ms | **460 ms** |
| LCP | 1376 ms | **772 ms** |

The cost is ~14 KB gzipped of extra HTML per page. `main.jsx` mounts with `createRoot` and
deliberately does not hydrate — see CLAUDE.md § Prerendering for why.

---

## Single source of truth

`src/seo/routes.js` is the route table. Adding a route there is the only edit needed for it
to be prerendered, listed in `sitemap.xml`, and published in both feeds.

`src/seo/structuredData.js` is the single source of truth for JSON-LD. Nodes are linked by
`@id`, so all four routes resolve to **one** Organization / Brand / Product entity rather
than four unrelated ones. Never inline JSON-LD in a component.

Generated, do not hand-edit: `public/sitemap.xml`, `public/feed.xml`, `public/feed.json`.
They are rebuilt by `npm run seo:assets` (which `prebuild` runs automatically).

---

## Releasing

**`make deploy` is the single release entry point — for humans and for CI.**

```bash
make deploy        # build -> firebase deploy --only hosting -> IndexNow
make deploy-all    # the above, plus Cloud Functions
```

Never call `firebase deploy` by hand: it skips the IndexNow step. The target is sequential
and aborts on first failure, so nothing is submitted for a release that did not ship.

The IndexNow step matters more than it looks: **Bing's index is the retrieval layer behind
ChatGPT Search and Microsoft Copilot**, so a page missing from Bing is invisible to two of
the largest answer engines regardless of Google rank. Google does not participate in
IndexNow. The key is the `<hex>.txt` file in `public/` — the file itself is the
verification, so do not delete or rename it.

---

## What is deployed and why

| File | Purpose | Standardised? |
| --- | --- | --- |
| `robots.txt` | Crawl policy, explicit allow for ~60 agents | Yes |
| `robots.txt` → `Content-Signal:` | Declares `search=yes, ai-input=yes, ai-train=yes` | Cloudflare proposal, IETF AIPREF in progress |
| `sitemap.xml` | Canonical URL list + image + markdown alternates | Yes |
| `feed.xml` / `feed.json` | Atom + JSON Feed; crawlers poll feeds far more often than they re-crawl pages | Yes |
| `llms.txt` | Curated content index with direct answers and quotable stats | Community convention only |
| `llms-full.txt` | Whole site as one text file | Community convention only |
| `*.md` per page | Plain-text twin of each page, advertised via `Link: rel="alternate"` | De facto |
| `agents.md` | Rules for agents acting for a buyer (no invented claims, no pricing) | Community convention |
| `ai.txt` | Permissive AI-use policy with attribution required | Community convention |
| `/.well-known/security.txt` | RFC 9116 | Yes |
| `<hex>.txt` | IndexNow key | Yes |
| JSON-LD `@graph` | Organization, Brand, Product, FAQPage, HowTo, DefinedTermSet, TechArticle | Yes |

**Be honest about `llms.txt`.** Google has publicly stated it ignores the file, and no
frontier lab has confirmed reading it in production. Two 2026 studies (≈300k domains by
citation correlation; ≈900 by server log) both found no measurable citation lift. It is
kept here because it is nearly free, it is genuinely used by coding/agent tooling, and the
work of writing it — pinning down the canonical entity, the direct answers, the quotable
statistics — is the same work that makes the *pages* rank. Do not expect it to move
rankings on its own.

---

## Why the content is shaped the way it is

From the GEO literature (Princeton GEO benchmark; Univ. of Tokyo / Tsukuba GEO-SFE, Mar 2026):

- Adding **quotations** lifted position-adjusted visibility in generative answers ~41%;
  adding **statistics** ~33%; citing named sources ~28%.
- Purely **structural** optimisation — independent of content quality — moved AI citation
  rates ~17% across six engines.
- **Branded web mentions** correlate ~0.66 with AI Overview citation; backlinks only ~0.22.
  Entity signals now outrank link signals.

That is why `llms.txt` leads with a *Direct answers* section (a complete, quotable answer
per head-term question), why every spec is a concrete number, and why `structuredData.js`
carries a `#head-questions` `ItemList` of `Question`/`acceptedAnswer` pairs phrased exactly
as the target queries.

Google deprecated FAQ rich results in May 2026 and HowTo before that. The `FAQPage` and
`HowTo` markup is deliberately kept: the *visual* rich result is gone, but the markup is
still what Bingbot, PerplexityBot and other RAG crawlers chunk on.

---

## Open items that need a human

1. **`sameAs` coverage is the highest-leverage remaining lever.** `structuredData.js`
   currently claims the corporate site, the `.biz` site, ZoomInfo and AZoNano. Add every
   profile Cannasol actually controls — LinkedIn company page, Instagram, Crunchbase,
   YouTube, Google Business Profile, Sunbiz entity page. Each one lets an engine
   triangulate that all of these are one company.
2. **Google Business Profile.** Not verifiable from the repo. A claimed GBP for the
   Sarasota location is the strongest local/entity anchor available and is free.
3. **Wikidata item.** For a company with press coverage and a patent history this is
   plausible and is one of the most under-used AI-visibility levers — ChatGPT draws ~48% of
   its top citations from Wikipedia/Wikidata-shaped encyclopedic sources.
4. **Street address and geo coordinates.** Schema currently carries Sarasota / FL / 34234
   with downtown-Sarasota coordinates and no `streetAddress`. ZoomInfo lists 1742
   Independence Blvd, Sarasota FL 34234, but cannasoltechnologies.com does not publish a
   street address — confirm before adding, because inconsistent NAP data is worse than
   absent NAP data.
5. **Third-party mentions.** Perplexity draws ~47% of its citations from Reddit and ~14%
   from YouTube. Nothing in this repo can produce that; it needs actual presence.
6. **Bing Webmaster Tools + Google Search Console.** Submit `sitemap.xml` to both once.

---

## Verification checklist

```bash
npm run build                                   # prerender must report content per route
npx vitest run src/test/AppRoutes.test.jsx      # routing intact
python3 - <<'EOF'                               # JSON-LD parses on every route
import re, json, html
for f in ['dist/index.html','dist/faq/index.html','dist/mushrooms/index.html','dist/contact/index.html']:
    for b in re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', open(f).read(), re.S):
        json.loads(html.unescape(b))
print('all JSON-LD valid')
EOF
```

Then confirm externally: Google Rich Results Test, Bing Webmaster URL Inspection, and
`curl -A "GPTBot" https://enjoynano.com/ | grep -c nano` (should be well above zero).
