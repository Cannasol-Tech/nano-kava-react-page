# functions/lib/ — chat + lead cores

Three modules, all transport-agnostic: nothing here may touch `req`/`res`.

| File | Owns |
|---|---|
| `persona.js` | Bula's system instruction. Compliance-bearing — see `../CLAUDE.md § persona.js is compliance-bearing`. |
| `chat.js` | Gemini streaming, the lead-proposal tool, request validation, rate limiting. |
| `leads.js` | Lead validation, the SendGrid templates, Mailchimp capture, the shared secret handles. |

`chat.js` does **not** import `leads.js`. The chat path proposes a lead; only `sendContactEmail`
sends one. See § The tool proposes, the visitor sends.


## The tool proposes, the visitor sends

`send_lead_to_josh` **sends nothing**. It emits `{ type: 'lead_proposed', fields }` and returns
`{ status: 'awaiting_user_confirmation' }` to the model, which then tells the visitor to review the
pre-filled card and press Send. The widget posts those confirmed fields to the existing
`sendContactEmail` endpoint, so a chat lead travels the exact same path as a form lead — one send
path, one set of templates, one Mailchimp integration.

*Corrected 2026-08-25: this section previously described the tool as emailing Josh directly and
was titled "The tool requires explicit confirmation". A model asserting that a visitor confirmed
is not consent; only a click is. `lib/chat.js` no longer imports `sendLead`.*

Beyond consent: a model can hallucinate a confirmation *and* the visitor's email. A human now sees
every field before anything leaves the building, and the send secrets left `chat`'s blast radius.

`fields` carries the raw values plus a ready-to-post `inquiryType` and `message`. The widget
recomposes both, correctly: the card is editable, so a `message` built before the visitor fixed
their own `interest` would be stale. Treat the ones here as the fallback shape, not the SSoT.

**At least one of `email` or `phone` is mandatory.** The rule is stated in the tool `description`
so the model collects it, and enforced in `proposeLead()` so a model that ignores it gets
`{ status: 'missing_contact_method' }` back instead of a proposal — no card appears and the model
asks for a contact method. Everything else (`name`, `company`, `interest`, `reason`,
`conversation_summary`) is in `required`.

`toolConfig` is `AUTO`, never `ANY`: `ANY` forces a call on every turn, which would pop the card
unprompted. Round-trips are capped at 2 (`MAX_TOOL_ROUND_TRIPS`). A call to any other tool name
still emits `{ type: 'tool', name, status: 'failed' }` so the transport contract stays stable.

Chat leads carry the inquiry type `Bula Chat`, which drives the distinct subject line, the Source
line in the team email, and the `Nano Kava Bula Chat` Mailchimp tag (form leads keep
`Nano Kava Contact Form`).

## Phone-only leads

`validateLead` requires `name`, `message`, and **at least one of `email` or `phone`**. The email
format regex still applies, but only when an email is actually present.

*Corrected 2026-08-25: it previously required `name`, `email` and `message` unconditionally.*

This does not change the contact form, which still marks email required in its own UI — it exists
so a chat visitor who will only give a phone number is still a lead rather than a dropped
conversation. The 400 message is deliberately left as
`Missing required fields: name, email, and message are required`, because the contact form renders
that string and changing it would alter form UX for no benefit.

Three things follow from a lead with no email, all handled in `sendLead`:

- **Mailchimp is skipped.** Members are keyed by an MD5 of the lowercased email, so
  `addLeadToMailchimp` returns `{ ok: false, skipped: true }` early rather than throwing on
  `undefined.toLowerCase()`. The lead is still emailed; `mailchimpOk` comes back `false`.
- **No auto-reply is attempted** — there is nowhere to send it. Only the team email goes out, so
  Josh gets the lead either way; the auto-reply cannot take the real send down with it.
- **`replyTo` is omitted**, not set to `undefined`. The `Email:` row reads `Not provided`.

## Lead email escaping

`lib/leads.js` HTML-escapes every interpolated value in both email templates, and builds the
`mailto:` / `tel:` anchors only when the value passes `EMAIL_REGEX` / `PHONE_REGEX`.

This was not the case before the chat endpoint existed, and the reason it is now: chat leads reach
`sendLead()` carrying fields an LLM composed from untrusted visitor text. A prompt-injected
visitor can put arbitrary markup into `name`, `reason` or `conversation_summary` and it lands in
Josh's inbox.

The proposal card does not remove that exposure: a visitor reviewing a pre-filled form checks that
their own details look right, not for injected HTML. The escaping is what actually holds.

Two things to preserve: the plain-text (`text:`) bodies are deliberately **not** escaped (they are
not markup — escaping would show `&amp;` to a human reader), and rendered output for ordinary
input is unchanged (`O'Brien` → `O&#39;Brien` in source, back to `O'Brien` in the mail client;
verified byte-identical to the pre-refactor templates for input with no HTML metacharacters).

## Mailchimp capture is best-effort

`addLeadToMailchimp` runs in a try/catch before the SendGrid send and its failure never fails the
request. The ordering is deliberate: a lead survives a SendGrid outage because it is already in
Mailchimp, and a Mailchimp outage because it is still emailed. Only the SendGrid send determines
the caller's response.

Inside, only the member upsert throws — tagging and the note are individually swallowed, because a
lead in the audience without a tag is still a lead. The upsert uses `status_if_new`, so someone
who previously unsubscribed is never re-subscribed.

## Why safety thresholds are BLOCK_ONLY_HIGH

Kava is a psychoactive-adjacent ingestible. At Gemini's default thresholds, ordinary B2B product
questions — kavalactone loading per serving, onset time, extraction solvent — trip
`HARM_CATEGORY_DANGEROUS_CONTENT` and the turn comes back empty. The four standard categories are
therefore set to `BLOCK_ONLY_HIGH`.

This loosens the *model's* filter, not the product's guardrails. Compliance is enforced by the
persona's HARD RULES, which is the correct place for it: the safety filter cannot tell a
legitimate formulation spec from a consumption recommendation, and the persona can.

`streamChat` never fails silently — a turn producing no text (blocked, or an empty candidate list)
emits a `text` event routing the visitor to the contact form, and logs the `finishReason` so a
filter firing on normal traffic is visible rather than showing up as a mysteriously quiet bot.

## Rate limiting is per-instance and best-effort

`rateLimit(ip)` in `lib/chat.js` is a sliding window in a module-scope `Map`: 30 messages per
hour per IP. Gen2 instances are ephemeral and horizontally scaled, so the counter resets on cold
start and each instance counts independently — a determined caller spread across N instances gets
roughly N × 30. It stops accidental loops and casual abuse, not a motivated attacker.

The follow-up is a Firestore-backed counter (one doc per IP per hour, incremented
transactionally) so the limit is global and survives cold starts. Deferred because it adds a
read+write to every message on the latency-critical path; do it when abuse is observed.

## Thought signatures

Gemini 3 attaches an opaque `thoughtSignature` to each `functionCall` **part**. When the call is
replayed into `contents` for the tool round-trip, that signature must survive or the next request
fails with `400 INVALID_ARGUMENT: Function call is missing a thought_signature in functionCall
parts`.

The signature lives on the *part*, not on the `functionCall` object, so anything that rebuilds the
part — `{ functionCall }` from `chunk.functionCalls`, or `parts.map(p => p.functionCall)` — drops
it. `readChunkFunctionCallParts()` therefore returns whole parts and the round-trip replays them
verbatim. Do not "simplify" it back to bare calls.

*Added 2026-08-25. The first implementation did exactly that and every lead proposal died on the
round-trip: the card rendered, then the turn errored with no assistant text at all — the failure
looks like a UI bug and is not one.*

This is independent of [[Thinking budget]] above: signatures are required even at
`thinkingBudget: 0`. Single-turn calls never hit it, so unit tests that do not exercise a tool
round-trip will not catch a regression here.

## Thinking budget

`THINKING_BUDGET = 0` in `lib/chat.js`. Measured on `gemini-3.5-flash` against the real persona
and knowledge base:

| | thoughts/turn | latency |
|---|---|---|
| thinking on (default) | 487–530 tokens | 3.4s |
| `thinkingBudget: 0` | 0 tokens | 1.3–2.4s |

Answer accuracy was equal. Thinking tokens bill as **output** ($9/MTok here), so at ~500/turn they
cost more than the visible answer (~85 tokens) and roughly doubled the per-turn price. This
workload is knowledge-base lookup plus tone, not reasoning. Raise the constant if the bot ever has
to do real multi-step work.

## Prompt caching is implicit — do not add explicit caches

The system instruction (persona + knowledge base) is a stable prefix and Gemini's **implicit**
caching picks it up with no configuration — `cachedContentTokenCount` comes back around 2030 on
repeat calls. Do **not** add `ai.caches.create()`: explicit caching bills hourly storage for a
result already free.

⚠️ **The margin is thin.** The prefix measures 4195 tokens against Gemini 3.x's 4096 minimum —
~100 tokens of headroom. Shrinking `knowledge-base.md` or trimming the persona drops it below the
minimum and caching stops with no error and no log line; the only symptom is cost. `streamChat`
logs usage every turn precisely so this is checkable.
