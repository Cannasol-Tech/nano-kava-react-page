# functions/ — Cloud Functions for the Nano Kava site

Two entry points in `index.js`, both thin transports:

| Export | Gen | Owns | Core logic |
|---|---|---|---|
| `sendContactEmail` | 1st | `/contact` form POSTs | `lib/leads.js` |
| `chat` | 2nd | SSE stream for the Bula concierge | `lib/chat.js` |

Both entry points are thin because `lib/` is transport-agnostic — the Vite dev middleware in
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


## Why chat is gen2 and sendContactEmail is not

`chat` streams Server-Sent Events. 1st-gen functions buffer the response body, so an SSE stream
arrives as one blob when the handler ends — streaming would be pointless. 2nd-gen (Cloud Run)
passes writes through, which is the whole reason for the split.

`sendContactEmail` stays 1st gen: it has no streaming need, and migrating it would change its
deployed URL, which the live contact form is hard-coded against. Do not "modernize" it for
consistency — the cost is a broken form and the benefit is nil.

Consequence to remember: the two generations declare secrets differently
(`.runWith({ secrets })` vs the `secrets:` array in `onRequest` options). Only `sendContactEmail`
lists the SendGrid and Mailchimp handles, because it is the only function that sends anything.
`chat` needs `GOOGLE_AI_API_KEY` and nothing else.

*Corrected 2026-08-25: this section previously said both functions must declare the send secrets,
which was true while `chat` sent leads directly. It no longer does — see § The tool proposes, the
visitor sends — so those secrets were removed from `chat` rather than left granted unused.*

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

To change what Bula knows, change `src/content/` and regenerate. Site copy and bot knowledge are
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
set.

*Corrected 2026-08-25: this previously warned that `send_lead_to_josh` fails locally because
`sendLead()` cannot read secrets. The tool no longer sends, so that caveat is gone.*

### `/api/sendContactEmail` is a DRY RUN in dev

`LeadCard` posts to `/api/sendContactEmail` under `import.meta.env.DEV`, so the plugin mounts that
route too — otherwise Send 404s locally and the card hangs in its sending state. **It never
sends.** It calls `validateLead` (the same call the deployed function makes, `phone` included, so
a payload that would 400 in production 400s here), prints every received field to the terminal
prefixed `[bula dev] DRY RUN - no email sent`, and returns
`{ success: true, message: 'Dry run - no email sent', dryRun: true }` — the shape `LeadCard` gates
on with `response.ok && data.success`.

It deliberately does **not** import `sendLead`. Secrets have no local value so SendGrid would fail
anyway, but the real reason is that nobody should fire test mail at `josh.detzel@cannasolusa.com`
while clicking around a dev server.

Consequence: **local testing cannot verify real delivery.** The terminal block shows what Josh
would have received; confirming he actually receives it, that the auto-reply lands, and that
Mailchimp captured the lead all require a deploy.
