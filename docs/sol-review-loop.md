# The Sol review loop

*Added 2026-09-19. Stephen: "I am getting TWO emails from Sol every time a lead comes through the
chat bot… we should have ONE email for the lead with the whole conversation attached… the
receivers should ALSO receive a CTA to respond, or click a link and fill out a questionnaire that
will act as a human review of Sol's performance and copy the lead's conversation into a PERMANENT
firestore location with the review attached to it, structured so it is ready to be injected into
LIVEY's prompt."*

*Corrected the same day, against the two emails themselves: the first implementation deduplicated
by `sessionId` and would not have fixed this. See § A lead is a person.*

This is the loop that turns a lead notification into training data. Four collections, one email,
one form.

## A lead is a person

The two emails Stephen forwarded were **not** a duplicate send. They were two different
submissions by one person:

| | 5:34pm | 5:52pm |
|---|---|---|
| Subject | New Chat Lead (Sol): TreeOf12 | New Contact Form Submission: TreeOF12 |
| Came from | Sol's lead card | `/contact` |
| Name / email / phone | Kelsy Bass · jalynnwilllzen@gmail.com · 18647107608 | identical |
| Message | the sample lines | a paragraph about going B2B |

Both are legitimate. Neither should be dropped. But Josh's inbox shows two leads where there is
one person, and the second email carried no conversation at all — even though that person had
just had one.

**The first attempt at this claimed one email per `sessionId`, and was wrong.** A session id
identifies a *browser*. The contact form sent none, so the claim could never see the second
submission; and a person who chats on a phone and fills the form on a laptop is still one lead.
Identity has to be the person.

`leadIdentity.js` keys on a normalised **email**, falling back to a normalised **phone** (digits
only, last ten — `(216) 921-2240`, `216-555-0142` and `+1 216 921 2240` are one person, and
keeping punctuation would make them three). Email wins when both are present: people type it
consistently, it is what Mailchimp keys on, and a phone typed once with an extension would split
the lead. The key is a **hash**, never the raw address: `.` is in every email and `/` is legal in
a local part, and neither survives a Firestore document path.

### Finding a conversation the form never carried

`sessionsForContact()` uses two joins, because they catch different people:

- **The session id** — `localStorage`, one per browser, and `ContactPage` now sends it alongside
  `source: 'form'`. One browser's chat and form submission meet even when the details were typed
  differently in each (the real case: `TreeOf12` then `TreeOF12`).
- **The email and phone on the stored `chatLeads` record** — catches the same person on another
  device, where there is no shared storage to join on.

Neither throws. An email with no transcript beats no email.

## One email, after the quiet period

`sendContactEmail` **sends nothing**. It files the submission against the person and answers
`{ success: true, queued: true }`. The scheduled `sendPendingLeads` is the only thing that sends.

`leadQueue.js` holds `leadNotifications/{contactKey}`. Every submission appends to `pending` and
pushes `notifyAfter` to `now + QUIET_MINUTES`. The window is **quiet time, not a fixed bucket**:
a person who is still going gets one email at the end rather than a stream of halves.

**20 minutes, because the observed gap was 18.** A window that does not cover the case it was
built for solves nothing.

| | |
|---|---|
| Cost | Josh sees a lead up to ~22 minutes late (20 quiet + a 2-minute sweep) |
| Against | A site that promises a reply within 24 hours, and a lead already in Firestore and Mailchimp instantly |
| Bought | One email per lead, every inquiry type merged, and a transcript that is the WHOLE conversation rather than however much existed when Send was pressed |

`LEAD_QUIET_MINUTES` overrides it per deploy with no code change. **Set it to 1 before running
either e2e script**, or they take 25 minutes.

### `notifyAfter` is absent, never null

The sweep selects on `where('notifyAfter', '<=', now)`, so the field's **presence** is the queue.
When a batch is claimed, the field is left off the document entirely.

Writing `null` would be far worse than useless: Firestore orders null *below* every timestamp, so
`notifyAfter <= now` matches it and the sweep would re-send every lead it had ever sent, forever.
`leadQueue.test.js` pins this directly, including that a second sweep finds nothing.

### The order, and what happens when it fails

`leadHandoff.js` owns both the order and the sweep, so neither is buried in `index.js`:

1. **`sessionsForContact`** — first, because it widens everything after it.
2. **`confirmLead`** on each session found — a human pressed Send, which is true whether or not
   SendGrid was up, and the daily report's SUBMITTED / unconfirmed split reads it.
3. **`archiveForReview`** — last, and still before the send, because it copies transcripts on a
   90-day clock into a collection with none.
4. The send.

Nothing in 1–3 throws. A prospect lost to a bookkeeping error is the one outcome none of this is
worth.

A **failed send goes back on the queue**, in front of anything added since (it is older) and
re-armed on a 5-minute retry rather than another full window. `sendPendingLeads` then throws, so
Cloud Scheduler marks the run failed and it is visible. This is the only path a lead has to a
human; a swallowed failure here loses the prospect outright.

**The corresponding risk of this design is a schedule that never runs.** Nothing in the request
path errors, so a dead `sendPendingLeads` is silent. Two things make it visible: the function
throws on any failure, and the 08:00 daily report still lists every conversation from Firestore.
If leads stop arriving, check that schedule first.

## What the one email carries

- **The contact**, merged: the latest non-empty value for each field, and the **union** of every
  inquiry type across both forms.
- **Each submission separately**, labelled with its source and time. Collapsing a chat card and a
  contact form into one blob loses which came from where, and they are two different things the
  person said.
- **Every conversation**, inline and as ONE markdown attachment. An attachment per chat is a
  filing problem, not a help. Capped at the 4 most recent — a person with more is a returning
  visitor, not a lead.
- **The review CTA.**

The heading and subject say which forms were used: `New Lead (Sol chat + contact form)` is one
lead that says it did both. Everything interpolated is escaped, for the reason in
`functions/lib/CLAUDE.md § Lead email escaping`, which applies with more force to a transcript
than to a lead field — a transcript is *entirely* visitor-authored.

**No auto-reply goes to a team address.** `isTeamAddress()` suppresses it, so a lead we submit
while testing arrives once. A real visitor gets exactly one confirmation however many times they
submitted, which is the same merge working in their favour.

## The scores

*Stephen: "useful categories of questions with quick answers, 1-5 numbers or something, and a
section for optional comments on all of them so we can get feedback with better context that will
always be comparable. Maybe have fields like tone, knowledge."*

Eight fixed scales, each 1–5, each with a comment box:

| | Question | 1 | 5 |
|---|---|---|---|
| **Overall** | How well did Sol handle this one? | badly | excellently |
| **Knowledge** | Did it get the product facts right? | got things wrong | spot on |
| **Tone** | Did it sound like us? | off brand | sounded like us |
| **Listening** | Did it answer what was actually asked? | talked past them | answered it |
| **Compliance** | Did it stay clear of health claims and personal dosing advice? | crossed the line | clean |
| **Handoff** | Did it ask for the lead at the right moment? | badly timed | well judged |
| **Clarity** | Was it easy to follow, and the right length? | waffly | crisp |
| **Lead quality** | Is this lead worth chasing? | junk | real buyer |

Three rules hold the comparability the scores exist for:

- **The set is fixed.** Adding a question changes what the corpus means, so it is a deliberate
  edit, not a convenience. A test pins the list.
- **Every scale runs the same way, and 5 is always good.** A page where compliance counts *down*
  while tone counts *up* is the reliable way to get an average nobody can trust. `compliance: 5`
  means clean, and a test pins that too, because it is the one most likely to get flipped by a
  well-meaning edit.
- **Lead quality is excluded from the average.** It grades the prospect, not Sol. `SOL_SCALES` is
  the set that averages.

Both ends of every scale are labelled on the page, so a 2 means the same thing in March as in
September. The comment box beside each is what makes the number usable — the form says so.

`compliance` is not a style question. Kava is an ingestible and the no-health-claims rule is the
one failure mode that costs more than a lost lead; see
`functions/CLAUDE.md § persona.js is compliance-bearing`.

## Why the stars are links

The CTA is a row of five `<a>` tags, each a `GET /sol-review?token=…&rating=N`. Tapping one
records `overall` server-side and *then* renders the questionnaire with that score selected.

One number on every lead beats a long form on none. `status: 'rated'` distinguishes a tapped star
from a filled-in questionnaire, so the two are never confused when the corpus is filtered, and a
tapped score survives a later submission that omits one.

This is a GET that writes, which is normally wrong. It is acceptable here for exactly the reasons
it usually is not: the write is idempotent, it is authenticated by an unguessable token, it
cannot be triggered cross-site to any effect worth having, and an email client's link prefetcher
recording a score its human then corrects on the very page it opened is a cost worth one click.

## The permanent copy

`solReviews/{reviewId}`, where `reviewId` is `{contactKey}_{n}` — **one review per email sent**,
so a person who comes back next month gets a second review rather than overwriting the first.
**No TTL, deliberately** — the same reasoning as `chatLeads`, one step further:

| | `chatSessions` | `chatLeads` | `leadNotifications` | `solReviews` |
|---|---|---|---|---|
| What it is | Telemetry | A prospect | The pending queue | Training data |
| Retention | 90-day TTL | None | None | **None** |

**The conversations are copied when the EMAIL is sent, not when the review is filed.** A review
filed on day 91 would otherwise have nothing left to attach itself to, because the TTL would have
taken the transcript. Archiving up front costs one write per lead and makes the emailed link good
forever.

Do **not** add an `expiresAt` here, and do **not** add a `solReviews` fieldOverride to
`firestore.indexes.json` — its absence *is* the policy. A test asserts the archived document has
no `expiresAt`, because that is the field that would silently undo the whole thing.

### Documents

```
leadNotifications/{contactKey}       ← the queue; e_<hash> or p_<hash>
  contactKey, keyedBy, sessionIds[]
  pending[]      { at, source, name, email, phone, company, types[], message, sessionId }
  sending[]      claimed by a sweep, in flight
  notifyAfter    PRESENT = queued. Absent = nothing pending. Never null.
  notifyCount, notifiedAt, firstSeenAt, lastSubmissionAt

solReviews/{contactKey}_{n}
  reviewId, contactKey, sequence, token, status: 'pending' | 'rated' | 'reviewed'
  contact        { name, company, email, phone, types[] }   — merged, at send time
  submissions[]  every submission that went into this email
  conversations[] { sessionId, page, startedAt, messages[] }
  review         { scores{8}, comments{8}, average, verdict, idealReply, doDifferently, tags[], reviewer }
  training       { … promptBlock, embeddingText, embedding: null … }

solReviewTokens/{token}
  token, reviewId, createdAt
```

The token is a separate collection rather than a query on `solReviews`, so resolving a link is a
single document read by id — no index, no scan, and nothing about the review is reachable without
the exact token.

**The token is the credential.** 144 bits from `crypto.randomBytes(18)`, base64url. It only ever
appeared in an email to two people, and the page reveals nothing its holder was not already sent.
The endpoint sets `X-Robots-Tag: noindex`, `Cache-Control: no-store` and
`Referrer-Policy: no-referrer` so it cannot leak into a referrer header or a search index.

## The questionnaire

Served by the **1st-gen** `solReview` function and rewritten onto `/sol-review` in
`firebase.json`. 1st gen on purpose: Firebase Hosting can rewrite straight onto a 1st-gen function
*by name*, which is what keeps the link in the email an `enjoynano.com` URL instead of a
`cloudfunctions.net` one. Do not "modernize" it to gen2 — same trap as `sendContactEmail`.

It is **not** a React route. It must never be prerendered, listed in `src/seo/routes.js`, or
indexed, and nothing about a private token-addressed page should ride on a hosting release.
`functions/lib/reviewForm.js` emits one self-contained HTML document with inline CSS, laid out
for a phone because that is where these get read.

Every answer is allow-listed and range-checked on the way in, exactly like `normalizeLead` — the
form posts from the open internet, so an undeclared key (a `__proto__` among them) must not reach
the document. Comments are clipped at 4000 characters.

## The training block

`buildTraining()` joins the archived conversations to the scores and renders
`training.promptBlock` — markdown that concatenates into LIVEY's system instruction with no
further shaping:

```
### Reviewed conversation — 2026-09-19 · 2/5 (bad)

Context: visitor on /mushrooms, interested in Request Samples (TreeOf12).

What happened:
```
Visitor: Will it help me sleep?
Sol: …
```

Reviewer's scores:
- Overall: 2/5
- Tone: 1/5 — Read like a brochure.
- Compliance: 1/5

Do differently:
- Stop selling once they ask a health question.

What Sol should have said instead:
> I can't speak to effects — but for a seltzer, 30 mg/mL goes in clear.

Avoid:
- Drifting off the house voice — read the tone notes above.
- Health claims and personal dosing advice — kava is an ingestible.

Tags: compliance, dosing
```

It reads as a worked example rather than a database row, because that is the form a model
actually learns from in context. The `Avoid:` lines are derived mechanically from any score at or
below 2, worded from the scale rather than from the reviewer, so a repeated complaint reads
identically every time — a model generalises from one phrasing far better than from twelve
paraphrases of it.

**"Write the reply Sol should have given" is the single most valuable field on the form.** A
score says a turn was bad; only that box says what good looks like. The form labels it as such.

## Vector retrieval — investigated, not built

The goal Stephen named: once the corpus is large, pull in the handful of reviews closest to what
LIVEY is dealing with *right now*, instead of injecting all of them.

This is not built. What **is** built is the thing that makes it a backfill rather than a
migration: every `training` block already carries

- **`embeddingText`** — the exact string we would embed, assembled now while the shape is easy to
  change. Page, tags, the last 14 turns, the correction and the ideal reply; capped at 8000 chars.
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
`promptBlock` whose verdict is `bad` or `mixed` is both cheaper and better — and at ~22
conversations a month (`functions/lib/CLAUDE.md § Prompt caching is implicit`) that is a while
away.

Revisit when `solReviews` holds 50+ documents with `status: 'reviewed'`.

## Replying to the email

Stephen also asked for the reply itself to work as a review. It does not yet, and the blocker is
not code: an inbound reply needs an MX record on a subdomain plus a SendGrid Inbound Parse
webhook, which is a DNS change no deploy can make.

The email's `Reply-To` is therefore still the **prospect**, unchanged — Josh hits Reply and
reaches the buyer, which is the behaviour his muscle memory expects and the wrong one to break on
a guess. The review path is the link.

To flip it later: point MX for `reviews.enjoynano.com` at SendGrid, add an Inbound Parse hook to
an endpoint that reads the token out of a `review+<token>@` address, and set the team email's
`Reply-To` to it. The token is already minted per lead email and already resolves, so the
endpoint is a thin wrapper over `saveReview({ reviewId, answers: { doDifferently: body } })`.

## Testing it

| | |
|---|---|
| `functions/test/leadQueue.test.js` | Identity and the window on their own: one person however they typed it, the quiet period pushing forward, and the absent-not-null `notifyAfter`. |
| `functions/test/solReviews.test.js` | The store: the archive has no TTL, tokens resolve, an existing review is never clobbered, the scales run one way and the average excludes lead quality. |
| `functions/test/reviewForm.test.js` | That the page offers exactly the scores the store accepts, prefills a revisit, and cannot be injected into. |
| `functions/test/leadReviewLoop.test.js` | **The reported bug.** Kelsy's two submissions, 18 minutes apart, across every module that only meets in production — one email, both messages, the conversation attached, the link resolving. |
| `make preview` | The real queue and the real form against an in-memory store. Post twice as the same person and the terminal says `2 submission(s) on this lead`, then prints a clickable review link. |
| `make test-review-loop` | The deployed thing. **~25 minutes** unless `LEAD_QUIET_MINUTES=1` is set on the function. Emails the team — run it deliberately. |

Local testing still cannot verify real delivery, for the reason in
`functions/CLAUDE.md § /api/sendContactEmail is a DRY RUN in dev`.

## Deploying it

**`make deploy-all`, and note the order changed.** Backend now ships *before* hosting:

```
deploy-all: deploy-functions deploy-firestore deploy
```

`/sol-review` is a hosting rewrite onto the `solReview` function. Publishing hosting first would
put a link in front of nothing. The IndexNow ping inside `deploy` stays the final step either way.

`sendPendingLeads` is a new scheduled function, so the first `make deploy-functions` after this
change creates its Cloud Scheduler job. **Until that job exists, no lead is emailed** — the
request path only queues. Confirm it is there before walking away from the deploy.
