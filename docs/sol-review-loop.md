# The Sol review loop

*Added 2026-09-19. Stephen: "I am getting TWO emails from Sol every time a lead comes through the
chat bot… we should have ONE email for the lead with the whole conversation attached… the
receivers should ALSO receive a CTA to respond, or click a link and fill out a questionnaire that
will act as a human review of Sol's performance and copy the lead's conversation into a PERMANENT
firestore location with the review attached to it, structured so it is ready to be injected into
LIVEY's prompt."*

This is the loop that turns a lead notification into training data. Three collections, one email,
one form.

## One lead, one email

A chat lead produced **two** emails before this landed, and for a reason worth recording because
it will look like a bug again otherwise: `sendLead()` always sent a team notification *and* a
"we received your message" auto-reply to whatever address the lead card carried. That second
email is correct for a real prospect. It is noise when the address on the card is one of ours —
which it is every time the team tests the widget, and which `test/e2e/lead-delivery.mjs` does by
default (`LEAD_TEST_EMAIL` falls back to `stephen.boyett@cannasolusa.com`).

Two changes, and they are independent because the symptom had two possible causes:

- **`isTeamAddress()` suppresses the auto-reply** when the visitor's address is one of
  `TEAM_RECIPIENTS`. A real visitor still gets theirs. Nobody gets an automated reply to a lead
  they submitted themselves.
- **`claimLeadEmail()` bounds the team email to one per conversation.** The claim is a
  `teamEmailedAt` stamp taken in a transaction *before* the send, so two submissions racing
  cannot both pass — a check made after sending is exactly the one that cannot catch a race.
  A second Send on the same session answers `{ success: true, duplicate: true }` and sends
  nothing.

**The claim has to be given back.** `sendLead` throwing means nobody received anything, and a
visitor tapping Send again must not be answered with "already sent". `abandonChatLead()` clears
the stamp on the failure path in `index.js`. Dropping that half would turn a SendGrid blip into a
permanently unsendable lead, silently.

`confirmLead()` now runs **before** the send rather than after it. A human pressing Send is true
whether or not SendGrid was up, and the daily report's SUBMITTED / unconfirmed split should say so.

## What the one email carries

`functions/lib/transcript.js` renders a stored conversation three ways — plain text, an HTML
block, and the markdown that rides along as an attachment. The team email carries all three
surfaces of the same transcript:

| | Why both |
|---|---|
| Inline HTML | Read it without leaving the inbox. This is the version anyone actually reads. |
| `sol-conversation-<sessionId>.md` attachment | Survives the email. Pastes into a prompt, a doc or a ticket months later, which is why it repeats the lead's name and the page rather than assuming the covering email is still to hand. |

The transcript comes from `chatSessions/{sessionId}` via `loadTranscript()`, **not** from the
browser: the client only ever replays a 20-message window, and the stored document is the only
place the whole conversation exists. A form lead has neither, so it gets no transcript section,
no attachment and no review CTA — the code branches on `transcript?.messages?.length`.

Everything interpolated is escaped, for the reason in
`functions/lib/CLAUDE.md § Lead email escaping`, which applies with *more* force here than to the
lead fields: a transcript is entirely visitor-authored.

## Why the stars are links

The CTA is a row of five `<a>` tags, each a `GET /sol-review?token=…&rating=N`. Tapping one
records the score server-side and *then* renders the questionnaire with that score already
selected.

One number on every lead beats a long form on none. A rating stored by a tap is a real data point
— `status: 'rated'` distinguishes it from `'reviewed'`, so a filled-in questionnaire is never
confused with a star somebody hit on their phone. If they go on to fill the form, the tapped
rating survives a submission that omits one.

This is a GET that writes, which is normally wrong. It is acceptable here for exactly the reasons
it usually is not: the write is idempotent (same token, same rating, same result), it is
authenticated by an unguessable token, it cannot be triggered cross-site to any effect worth
having, and an email client's link prefetcher recording a star that its human then corrects on
the very page it opened is a cost worth one click.

## The permanent copy

`solReviews/{sessionId}`. **No TTL, deliberately** — the same reasoning as `chatLeads`
(`functions/lib/CLAUDE.md § The lead record is not the transcript`), one step further:

| | `chatSessions` | `solReviews` |
|---|---|---|
| What it is | Telemetry — how Sol performed | Training data — what Sol should have done |
| Retention | 90-day TTL | **None** |
| Written by | Every turn | Once per lead email, then once per review |

**The copy is made when the email is sent, not when the review is filed.** That is the whole
trick. A review filed on day 91 would otherwise have nothing left to attach itself to, because
the TTL would have taken the transcript. Archiving up front costs one write per lead and makes
the review link good forever.

Do **not** add an `expiresAt` field here, and do **not** add a `solReviews` fieldOverride to
`firestore.indexes.json` — its absence *is* the policy, exactly as for `chatLeads`.

### Documents

```
solReviews/{sessionId}
  sessionId, token, status: 'pending' | 'rated' | 'reviewed'
  page, startedAt, archivedAt, updatedAt, ratedAt?, reviewedAt?
  lead      { name, company, email, phone, interest, … }   — snapshot at email time
  messages  [{ role, text }]                               — the archived transcript
  usage     { promptTokens, cachedTokens, outputTokens, costUsd, turns }
  review    { rating, verdict, accuracy, handoffTiming, tone, compliance, leadQuality,
              accuracyNotes, complianceNotes, didWell, doDifferently, idealReply, tags[], reviewer }
  training  { … see below … }

solReviewTokens/{token}
  token, sessionId, createdAt
```

The token is a separate collection rather than a query on `solReviews`, because resolving a link
is then a single document read by id — no index, no scan, and nothing about the review is
reachable without the exact token.

### The token is the credential

144 bits from `crypto.randomBytes(18)`, base64url. It only ever appeared in an email to two
people. There is nothing further to authenticate against, and nothing the page reveals that a
holder of the link was not already sent in full. The endpoint sets `X-Robots-Tag: noindex`,
`Cache-Control: no-store` and `Referrer-Policy: no-referrer` so the token does not leak into a
referrer header or a search index.

## The questionnaire

Served by the **1st-gen** `solReview` function and rewritten onto `/sol-review` in
`firebase.json`. 1st gen on purpose: Firebase Hosting can rewrite straight onto a 1st-gen
function *by name*, which is what keeps the link in the email an `enjoynano.com` URL instead of a
`cloudfunctions.net` one. Do not "modernize" it to gen2 — same trap as `sendContactEmail`
(`functions/CLAUDE.md § Why chat is gen2 and sendContactEmail is not`).

It is **not** a React route. It must never be prerendered, listed in `src/seo/routes.js`, or
indexed, and nothing about a private token-addressed page should ride on a hosting release.
`functions/lib/reviewForm.js` emits one self-contained HTML document with inline CSS.

Every answer is allow-listed and enum-checked on the way in, exactly like `normalizeLead` — the
form posts from the open internet, so an undeclared key (a `__proto__` among them) must not reach
the document. Free-text boxes are clipped at 4000 characters.

**The enums are closed on purpose.** The point of this corpus is that it can be filtered and,
later, clustered. A field whose values are whatever the reviewer typed that day can do neither.
`tone`, `accuracy`, `compliance`, `handoffTiming`, `leadQuality` and `tags` are all fixed lists in
`solReviews.js`; adding a value is a one-line change and a deliberate one.

`compliance` is not a style question. Kava is an ingestible and the no-health-claims rule is the
one failure mode that costs more than a lost lead — see
`functions/CLAUDE.md § persona.js is compliance-bearing`. It gets its own question and its own
"quote the line" box, and a `violation` becomes an explicit `Avoid:` line in the prompt block.

## The training block

`buildTraining()` joins the archived conversation to the human verdict and renders
`training.promptBlock` — markdown that can be concatenated into LIVEY's system instruction with
no further shaping:

```
### Reviewed conversation — 2026-09-19 · 2/5 (bad)

Context: visitor on /mushrooms, interested in Kavalactone Nanoemulsion (Saltmarsh Drinks).

What happened:
```
Visitor: Will it help me sleep?
Sol: …
```

Reviewer's notes:
- Do differently: Decline the effects question before pivoting to format.

What Sol should have said instead:
> I can't speak to effects — but for a seltzer, 30 mg/mL goes in clear.

Avoid:
- Wording that edges toward a health claim.
- Raising the sample card before the visitor asked to be contacted.

Tags: compliance, dosing
```

It reads as a worked example rather than a database row, because that is the form a model
actually learns from in context. The `Avoid:` lines are derived mechanically from the enums, so
they read identically every time — a model generalises from a repeated phrasing far better than
from twelve reviewers' paraphrases of the same complaint.

**"Write the reply Sol should have given" is the single most valuable field on the form.** A
score says a turn was bad; only that box says what good looks like. The form labels it as such.

## Vector retrieval — investigated, not built

The goal Stephen named: once the corpus is large, pull in the handful of reviews closest to what
LIVEY is dealing with *right now*, instead of injecting all of them.

This is not built. What **is** built is the thing that makes it a backfill rather than a
migration: every `training` block already carries

- **`embeddingText`** — the exact string we would embed, assembled now while the shape is easy to
  change. Page, tags, the last 12 turns, the correction and the ideal reply; capped at 8000 chars.
- **`embedding`, `embeddingModel`, `embeddedAt`** — all `null`, reserved.

### The shape it would take

Firestore has native vector search, so there is no second database to run:

```js
const { FieldValue } = require('firebase-admin/firestore');
await ref.update({ embedding: FieldValue.vector(values) });

const nearest = await db.collection('solReviews')
  .where('status', '==', 'reviewed')
  .findNearest('embedding', FieldValue.vector(queryValues), {
    limit: 3,
    distanceMeasure: 'COSINE',
  })
  .get();
```

The index is created out-of-band with gcloud, **not** from `firestore.indexes.json` — worth
knowing before anyone assumes `make deploy-firestore` covers it:

```
gcloud alpha firestore indexes composite create \
  --collection-group=solReviews --query-scope=COLLECTION \
  --field-config=order=ASCENDING,field-path=status \
  --field-config=field-path=embedding,vector-config='{"dimension":"768","flat":"{}"}'
```

The `status` field-config is what allows the `.where()` pre-filter alongside the nearest-neighbour
stage; a vector index without it supports the `findNearest` but not the filter.

### Three things to settle before writing any of it

1. **Dimension.** `gemini-embedding-001` is natively 3072-dimensional and **Firestore's ceiling
   is 2048**, so `outputDimensionality` has to be set — 768 is the sensible pick and keeps index
   size and write cost down. Getting this wrong is not a tuning mistake; the write is rejected.
   Store `embeddingModel` *and* the dimension, because changing either invalidates every stored
   vector and the backfill needs to know which documents are stale.
2. **Asymmetric task types.** Embed the stored review with `RETRIEVAL_DOCUMENT` and the live
   query with `RETRIEVAL_QUERY`. Using the same task type for both is the usual way this
   underperforms and it is invisible — the results are merely mediocre, never wrong-looking.
3. **What the query vector is built from.** The live conversation's last few turns, embedded on
   the latency-critical path, adds an embedding round trip to *every* chat turn. Cheap, but not
   free, and it is the reason to cache per session rather than per turn.

### And the reason not to build it yet

Retrieval over a handful of documents is worse than no retrieval: it returns the three least
irrelevant reviews regardless of whether any of them is relevant, and a model handed an
off-target example follows it. Below roughly **50 reviewed conversations**, concatenating every
`promptBlock` marked `bad` or `mixed` is both cheaper and better — and at ~22 conversations a
month (`functions/lib/CLAUDE.md § Prompt caching is implicit`) that is a while away.

Revisit when `solReviews` holds 50+ documents with `status: 'reviewed'`.

## Replying to the email

Stephen also asked for the reply itself to work as a review. It does not yet, and the blocker is
not code: an inbound reply needs an MX record on a subdomain plus a SendGrid Inbound Parse
webhook, which is a DNS change nobody here can make from a deploy.

The email's `Reply-To` is therefore still the **prospect**, unchanged — Josh hits Reply and
reaches the buyer, which is the behaviour his muscle memory expects and the wrong one to break on
a guess. The review path is the link.

To flip it later: point MX for `reviews.enjoynano.com` at SendGrid, add an Inbound Parse hook to
an endpoint that reads the token out of a `review+<token>@` address, and set the team email's
`Reply-To` to it. The token is already minted per conversation and already resolves, so the
endpoint is a thin wrapper over `saveReview({ sessionId, answers: { doDifferently: body } })`.
Everything else is in place.

## Testing it

| | |
|---|---|
| `functions/test/solReviews.test.js` | The store on its own: the archive has no TTL, tokens resolve, an existing review is never clobbered, the prompt block carries the correction. |
| `functions/test/leadReviewLoop.test.js` | The whole loop across every module that only meets in production — a real stored turn, ONE email, the link in it resolving, a review filed against it. |
| `make preview` | `/sol-review` runs locally against an in-memory store (`memoryDb()` in `vite.config.js`). Post a lead and the terminal prints a clickable review link; the form, the validation and the stored shape are the ones that ship, only the database is local. |
| `make test-review-loop` | The deployed thing: posts a real lead, waits for SendGrid to settle, reads the permanent record back out of Firestore. **Emails the team — run it deliberately.** |

Local testing still cannot verify real delivery, for the reason in
`functions/CLAUDE.md § /api/sendContactEmail is a DRY RUN in dev`.

## Deploying it

**`make deploy-all`, and note the order changed.** Backend now ships *before* hosting:

```
deploy-all: deploy-functions deploy-firestore deploy
```

`/sol-review` is a hosting rewrite onto the `solReview` function. Publishing hosting first would
put a link in front of nothing. The IndexNow ping inside `deploy` stays the final step either way.
