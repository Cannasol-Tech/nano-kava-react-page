# functions/ — Cloud Functions for the Nano Kava site

Five entry points in `index.js`, all thin transports:

*Corrected 2026-08-26: this read "Two entry points" and listed `sendChatDigest` below. That
endpoint was **removed** — see `lib/CLAUDE.md § Conversation digests — RETIRED` — and the
scheduled `dailyChatReport` replaced it. `solReview` and `sendPendingLeads` made it five on
2026-09-19.*

| Export | Gen | Owns | Core logic |
|---|---|---|---|
| `sendContactEmail` | 1st | `/contact` and chat-card POSTs. **Queues; sends nothing.** | `lib/leadQueue.js` |
| `chat` | 2nd | SSE stream for Sol; files each turn and any extracted lead to Firestore | `lib/chat.js`, `lib/chatStore.js`, `lib/chatLeads.js` |
| `sendPendingLeads` | 2nd | **Scheduled** every 2 min — the ONLY thing that emails a lead | `lib/leadHandoff.js`, `lib/leads.js` |
| `solReview` | 1st | The questionnaire the lead email links to | `lib/solReviews.js`, `lib/reviewForm.js` |
| `dailyChatReport` | 2nd | **Scheduled** 08:00 America/New_York — the daily review email | `lib/dailyReport.js` |

The entry points are thin because `lib/` is transport-agnostic — the Vite dev middleware in
`vite.config.js` requires the same modules directly, so `make preview` serves both endpoints with
no Firebase emulator. See § Local development.

Long-form reasoning for the core modules lives one level down, in `lib/CLAUDE.md`:

| `lib/CLAUDE.md` §  | Covers |
|---|---|
| The tool proposes, the visitor sends | `send_lead_to_josh` semantics, the contact-method rule |
| Phone-only leads | `validateLead`, and what a missing email changes |
| Lead email escaping | Why every interpolation in the templates is escaped |
| Mailchimp capture is best-effort | Ordering, what throws, what is swallowed |
| Why safety thresholds are BLOCK_ONLY_HIGH | Gemini filters vs. an ingestible product |
| Rate limiting is per-instance and best-effort | The limit's real strength, Firestore follow-up |
| Thinking budget | Why `thinkingBudget: 0`, with measurements |
| Prompt caching is implicit | The 4195 vs 4096 margin, and how it breaks silently |
| Transcript persistence | The 60-message cap, the declarative 90-day TTL, and the append rule |
| The lead record is not the transcript | `chatLeads`, why it has no TTL, what `confirmed` means |
| The daily report replaced the digest | The schedule, the retry, and why it sends on silent days |
| Conversation digests — RETIRED | What the old per-conversation email did, and why it is gone |
| A lead is a person, not a submission | Contact keys, and why the first fix (per-session) was wrong |
| One email per lead, after the quiet period | The window, the sweep, and the absent `notifyAfter` |
| The review corpus is permanent | `solReviews`, the token, and the 1-5 scales that make it comparable |

The review loop has its own document — `docs/sol-review-loop.md` — because it spans the email,
two new collections, an HTML form and a deliberately-unbuilt vector search. Read it before
touching `solReviews.js`, `reviewForm.js` or `leadHandoff.js`.


## Why chat is gen2 and sendContactEmail is not

`chat` streams Server-Sent Events. 1st-gen functions buffer the response body, so an SSE stream
arrives as one blob when the handler ends — streaming would be pointless. 2nd-gen (Cloud Run)
passes writes through, which is the whole reason for the split.

`sendContactEmail` stays 1st gen: it has no streaming need, and migrating it would change its
deployed URL, which the live contact form is hard-coded against. Do not "modernize" it for
consistency — the cost is a broken form and the benefit is nil.

**Nothing is emailed from a request any more.** `sendContactEmail` queues and returns
`{ queued: true }`; `sendPendingLeads` sends once the lead has been quiet for 20 minutes. That is
what turns one person's chat card and contact form into one email — see
`lib/CLAUDE.md § One email per lead, after the quiet period` before "fixing" the missing send.
It also means a broken schedule is a lead nobody receives, so `sendPendingLeads` **throws** on
any failure (the batches are already requeued) rather than logging and moving on.

**`solReview` is 1st gen for a different reason.** Firebase Hosting rewrites onto a 1st-gen
function *by name* (`{"source": "/sol-review", "function": "solReview"}`), which is what keeps the
link in every lead email an `enjoynano.com` URL rather than a `cloudfunctions.net` one. A gen2
rewrite needs a `run.serviceId` and the service name is not the export name. Same rule, different
trap: leave it alone.

Consequence to remember: the two generations declare secrets differently
(`.runWith({ secrets })` vs the `secrets:` array in `onRequest`/`onSchedule` options).
`sendPendingLeads` lists the SendGrid and Mailchimp handles, because it is the only function that
sends a lead; `dailyChatReport` lists SendGrid alone. `chat` needs `GOOGLE_AI_API_KEY` and
nothing else, and **`sendContactEmail` declares none at all** — it only queues now, and a grant
nothing uses is blast radius for free.

*Corrected 2026-08-25: this section previously said both functions must declare the send secrets,
which was true while `chat` sent leads directly. It no longer does — see § The tool proposes, the
visitor sends — so those secrets were removed from `chat` rather than left granted unused.
Corrected again 2026-09-19: it then named `sendContactEmail` as the sender. That moved to
`sendPendingLeads`, and the secrets moved with it for the same reason.*

## persona.js is compliance-bearing

`lib/persona.js` is not tone-of-voice copy. Its HARD RULES section carries the obligations that
keep an ingredient supplier out of trouble: no medical or therapeutic claims, no personal
consumption advice, no drug-interaction or liver/pregnancy discussion, no invented price, MOQ,
lead time, COA result or certification, no FDA-approval claim.

Do not soften, summarize or "tighten" that section to save prompt tokens — if a rule needs to
change, that is a business decision, not an editing pass. The distinction it draws between
manufacturer dosing guidance (legitimate, in the knowledge base) and personal consumption advice
(declined) is deliberate and load-bearing.

It also tells the model to treat visitor input as data, never instructions — the only defense
against prompt injection here, alongside § Lead email escaping in code.

## The knowledge base is generated — never hand-edit it

`functions/knowledge-base.md` is built from `src/content/` by `scripts/build-knowledge-base.mjs`
and its own header says so. Edits made directly to it are lost on the next generation, and worse,
they make the bot's facts disagree with the website's while the diff looks intentional.

To change what Sol knows, change `src/content/` and regenerate. Site copy and bot knowledge are
one source of truth by construction — the point, since the persona forbids stating anything the
knowledge base does not contain.

## Local development

`vite.config.js` mounts a serve-only plugin on `POST /api/chat` that requires `lib/chat.js`
directly, so the widget works under `make preview` with no emulator. The require is lazy so a
missing key or an uninstalled `functions/node_modules` cannot break `vite build`, and the plugin
is `apply: 'serve'`, so it is absent from production builds.

The key comes from `GOOGLE_AI_API_KEY` in the root `.env` via Vite's `loadEnv` (no dotenv
dependency). If missing, the endpoint returns `200` with an SSE `error` event naming the variable
rather than hanging.

`lib/chat.js` has no dependency on `lib/leads.js`, SendGrid or Firebase secret params, so the
whole chat path — including a `lead_proposed` card — works locally with only `GOOGLE_AI_API_KEY`
set. It requires `lib/chatStore.js` for one regex, and that module reaches `firebase-admin`
lazily, so no credentials are needed either; the dev middleware prints what it would have stored
rather than writing it. See `lib/CLAUDE.md § Transcript persistence`.

*Corrected 2026-08-25: this previously warned that `send_lead_to_josh` fails locally because
`sendLead()` cannot read secrets. The tool no longer sends, so that caveat is gone.*

### `/api/sendContactEmail` is a DRY RUN in dev

`LeadCard` posts to `/api/sendContactEmail` under `import.meta.env.DEV`, so the plugin mounts that
route too — otherwise Send 404s locally and the card hangs in its sending state. **It never
sends.** It calls `validateLead` (the same call the deployed function makes, `phone` included, so
a payload that would 400 in production 400s here), prints every received field to the terminal
prefixed `[sol dev] DRY RUN - no email sent`, and returns
`{ success: true, message: 'Dry run - no email sent', dryRun: true }` — the shape `LeadCard` gates
on with `response.ok && data.success`.

It deliberately does **not** import `sendLead`. Secrets have no local value so SendGrid would fail
anyway, but the real reason is that nobody should fire test mail at `josh.detzel@cannasolusa.com`
while clicking around a dev server.

Consequence: **local testing cannot verify real delivery.** The terminal block shows what Josh
would have received; confirming he actually receives it, that the auto-reply lands, and that
Mailchimp captured the lead all require a deploy.

It does run the **real queue** against an in-memory store, so the terminal prints how many
submissions are on the lead — post twice as the same person and it says `2 submission(s) on this
lead`, which is the behaviour the whole change is about. Locally it sweeps immediately instead of
waiting out the window, because nobody would ever see the form otherwise.

### `/sol-review` runs locally, against memory

The one thing the dry run does **not** skip is the permanent copy: it queues the submission,
archives the lead into an in-memory store (`memoryDb()` in `vite.config.js`) and prints a
clickable `http://localhost:3000/sol-review?token=…` link. The form, the validation and the
stored document shape are the ones that ship — only the database is local, and it dies with the
dev server.

That covers the half a local click can actually exercise. The other half — that two submissions
twenty minutes apart really do produce one email, and that the archive survives the 90-day TTL
on a real Firestore — is `make test-review-loop` against the deployed functions.
