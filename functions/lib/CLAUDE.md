# functions/lib/ — chat + lead cores

All transport-agnostic: nothing here may touch `req`/`res`.

*Corrected 2026-08-26: this table opened "Three modules" and listed three. It had been five since
`digest.js` and `businessHours.js` landed; `chatStore.js` and `particlePalette.js` make seven.
The lead queue and review loop added five more on 2026-09-19.*

| File | Owns |
|---|---|
| `persona.js` | Sol's system instruction. Compliance-bearing — see `../CLAUDE.md § persona.js is compliance-bearing`. |
| `chat.js` | Gemini streaming, the lead-proposal tool, request validation, rate limiting. |
| `leads.js` | Lead validation, the SendGrid templates, Mailchimp capture, the shared secret handles. |
| `digest.js` | The team conversation digest — see § Conversation digests. |
| `businessHours.js` | Whether the office is open, for § The phone offer is gated server-side. |
| `chatStore.js` | Firestore transcript persistence — see § Transcript persistence. |
| `chatLeads.js` | The extracted-contact record — see § The lead record is not the transcript. |
| `dailyReport.js` | The once-a-day review email — see § The daily report replaced the digest. |
| `particlePalette.js` | Sol's colour library and resolver — see § Colour resolution is server-side. |
| `transcript.js` | Rendering a stored conversation as text, HTML and a markdown attachment. |
| `leadIdentity.js` | Who a lead IS — see § A lead is a person, not a submission. |
| `leadQueue.js` | The quiet window that makes one lead one email, and the delivery ledger — see § One email per lead. |
| `leadHandoff.js` | The ORDER a queued lead is processed in, and the sweep itself. |
| `solReviews.js` | The permanent review corpus — see § The review corpus is permanent. |
| `reviewForm.js` | The questionnaire's HTML. Nothing else may render it. |

`chat.js` does **not** import `leads.js`. The chat path proposes a lead; only `sendContactEmail`
sends one. See § The tool proposes, the visitor sends.


## A lead is a person, not a submission

*Added 2026-09-19, from two emails Stephen forwarded.* Kelsy Bass used Sol's card at 5:34 and the
contact form at 5:52 — same email, same phone, company typed `TreeOf12` then `TreeOF12` — and got
two lead emails eighteen minutes apart.

**The first fix for this was wrong and is worth recording.** It claimed one email per
`sessionId`, which identifies a BROWSER. The contact form sent no session id at all, so the claim
could not see the second submission; and even if it had, a person who chats on their phone and
fills the form on a laptop is still one lead. Identity has to be the person.

`leadIdentity.js` keys on a normalised **email**, falling back to a normalised **phone** (digits
only, last ten — `(216) 921-2240`, `216-921-2240` and `+1 216 921 2240` are one person, and
keeping punctuation would make them three). Email wins when both are present: it is the field
people type consistently, it is what Mailchimp keys on, and a phone typed once with an extension
would otherwise split the lead.

The key is a **hash**, not the address: `.` is in every email and `/` is legal in a local part,
and neither survives a Firestore document path.

### Finding the conversation a form submission never carried

The second email had no transcript, and the person it was from had just had a whole conversation
with Sol. `sessionsForContact()` closes that with two joins, because they catch different people:

- **The session id.** It lives in `localStorage`, one per browser (§ Transcript persistence), and
  `ContactPage` now sends it alongside `source: 'form'`. One browser's chat and form submission
  meet even when the details were typed differently in each.
- **The email and phone on the stored `chatLeads` record.** Catches the same person on another
  device, where there is no shared storage to join on.

Neither throws. A lead is emailed even when both fail — an email with no transcript beats no
email.

## One email per lead, after the quiet period

`sendContactEmail` **sends nothing**. It files the submission against the person and returns
`{ success: true, queued: true }`. The scheduled `sendPendingLeads` is the only thing that sends.

`leadQueue.js` holds `leadNotifications/{contactKey}`. Every submission appends to `pending` and
pushes `notifyAfter` out to `now + QUIET_MINUTES`; the window is **quiet time, not a fixed
bucket**, so a person still going gets one email at the end rather than a stream of halves.

**20 minutes, because the observed gap was 18.** A window that does not cover the case it was
built for solves nothing. The cost is that Josh sees a lead up to ~22 minutes late, against a site
that promises a reply within 24 hours — so the delay is invisible to the visitor, and it buys
back an email that is whole. `LEAD_QUIET_MINUTES` overrides it per deploy without a code change;
set it to 1 before running the e2e scripts unless you want a 25-minute test.

**The wait is also what makes the attached transcript the WHOLE conversation.** Sending on Send
attaches however much of the chat existed at the moment the visitor pressed it.

### `notifyAfter` is absent, never null

The sweep selects on `where('notifyAfter', '<=', now)`, so the field's **presence** is the queue.
Once a lead is sent and nothing is pending, the field is left off the document entirely. (A claim
sets it to the lease expiry rather than removing it — see § Every submission is ledgered until it
is emailed. *Corrected 2026-09-28: this said a claim removed it, which is what let a dead sweep
strand a batch.*)

Writing `null` instead would be much worse than useless: Firestore orders null *below* every
timestamp, so `notifyAfter <= now` matches it, and the sweep would pick up every lead it had ever
sent, forever. `leadQueue.test.js` pins this directly.

### The order is the design

`leadHandoff.js` exists so the order is testable rather than buried in `index.js`:

1. **`sessionsForContact`** — first, because it WIDENS everything after it: a contact-form
   submission has no conversation of its own and the whole point is that the person's chat is
   attached anyway.
2. **`confirmLead`** on each of those sessions — a human pressed Send, which is true whether or
   not SendGrid was up, and the daily report's SUBMITTED / unconfirmed split reads it.
3. **`archiveForReview`** — last, and still before the send, because it copies transcripts that
   are on a 90-day clock into a collection with none.
4. The send.

Nothing in 1–3 throws. A prospect lost to a bookkeeping error is the one outcome none of this
machinery is worth.

**A failed send goes back on the queue**, in front of anything added since (it is older) and
re-armed on a 5-minute retry rather than another full window. `sendPendingLeads` then throws, so
the run is marked failed and visible. Dropping it silently would lose the prospect outright —
this is the only path a lead has to a human.

### Every submission is ledgered until it is emailed

*Added 2026-09-28, at Stephen's request that the sender "cannot fail to send".* The failure above
is the one that throws. The one that did not: a sweep that **dies** between claiming and marking
sent left the batch in `sending` with no `notifyAfter`, and nothing ever looked at it again.

- **`leadSubmissions/{id}`** — the ledger. Written in the same transaction as the enqueue, flipped
  to `emailed` (with `emailedAt`, `reviewId`) in the same transaction as `markSent`, which also
  stamps `emailedAt` on each conversation's `chatLeads` record that exists. No TTL.
- **The claim is a lease.** `claimForSend` sets `leaseUntil` and `notifyAfter` 10 minutes out
  rather than removing `notifyAfter`; an expired lease with `sending` still set is recovered into
  the next batch. `notifyAfter` is still removed — never nulled — once nothing is pending.
- **`reconcileLedger`** runs first in every sweep and puts back anything still `queued` past
  `OVERDUE_MS` that the queue has lost or will never pick up.
- **The daily report** lists anything still unsent after an hour, lead details included — the
  backstop for a sweep that is not running at all.

Delivery is **at-least-once**: a sweep that sends then dies before `markSent` re-sends on lease
expiry. Keep `LEASE_MINUTES` well above the function's 300s timeout. Full reasoning:
`docs/sol-review-loop.md § Every submission is ledgered until it is emailed`.

### What the one email carries

- **The contact**, merged: the latest non-empty value for each field, and the **union** of every
  inquiry type across both forms.
- **Each submission separately**, labelled with its source and time. Collapsing a chat card and a
  contact form into one blob loses which came from where, and they are two different things the
  person said.
- **Every conversation**, inline and as ONE markdown attachment. An attachment per chat is a
  filing problem, not a help. Capped at the 4 most recent: a person with more than that is a
  returning visitor, not a lead.
- **The review CTA**, whose stars open the form with `overall` preselected — never saved on the
  GET, because Microsoft 365 scans every link. See `docs/sol-review-loop.md § Why the stars
  preselect and do not save`.

The heading and subject say which forms were used — `New Lead (Sol chat + contact form)` is one
lead that says it did both. Every interpolation is escaped; § Lead email escaping applies with
more force to a transcript than to a lead field, because a transcript is *entirely*
visitor-authored.

**No auto-reply goes to a team address.** `isTeamAddress()` suppresses it, so a lead we submit
ourselves while testing arrives once. A real visitor still gets exactly one confirmation,
however many times they submitted.

## The review corpus is permanent

*Added 2026-09-19.* `solReviews/{reviewId}` plus `solReviewTokens/{token}`, where `reviewId` is
`{contactKey}_{n}` — **one review per email sent**, so a person who comes back next month gets a
second review rather than overwriting the first. Same reasoning as § The lead record is not the
transcript, one step further:

| | `chatSessions` | `chatLeads` | `solReviews` |
|---|---|---|---|
| What it is | Telemetry | A prospect | Training data |
| Retention | 90-day TTL | None | **None** |
| Written | every turn | on extraction | once per lead email, once per review |

**The conversations are copied when the EMAIL is sent, not when the review is filed.** That is
the load-bearing decision. A review filed on day 91 would otherwise have nothing left to attach
itself to. Archiving up front costs one write per lead and makes the emailed link good forever.

Do **not** add an `expiresAt` here, and do **not** add a `solReviews` fieldOverride to
`firestore.indexes.json` — its absence *is* the policy. A test asserts the archived document has
no `expiresAt`, because that is the field that would silently undo the whole thing.

**The token is the credential.** 144 bits from `crypto.randomBytes(18)`, base64url, in its own
collection so resolving a link is one read by id. It only ever appeared in an email to two
people, and the page reveals nothing its holder was not already sent. The endpoint sets
`noindex`, `no-store` and `Referrer-Policy: no-referrer` so it cannot leak into a referrer or a
search index.

### Four questions, two flags, one box

*Stephen, 2026-09-19: "useful categories of questions with quick answers, 1-5 numbers or
something, and a section for optional comments on all of them so we can get feedback with better
context that will always be comparable. Maybe have fields like tone, knowledge."*

*Cut back the next day, on seeing it: "that form might be TOO much — we want it quick but useful.
Don't make it TOO complicated."* The first cut asked eight scored questions with eight comment
boxes and ran 5,800px on a phone. It is now 1,700px.

`SCALES` is the fixed list — **overall, knowledge, tone, handoff** — each 1-5 with both ends
labelled and one optional line for why. `FLAGS` is the other two questions, as checkboxes.

What was cut and why it costs little: **listening** and **clarity** were shades of the overall
score that no reviewer reliably tells apart, and the free-text box says what they were saying
with more use to a model. **Tags** were twelve chips nobody would tap; the embedding text carries
the topic anyway, which is how the corpus was always going to be filtered. `idealReply` and
`doDifferently` were two boxes nobody fills in twice, and are now one.

**Compliance and lead quality are flags, not scales.** "Did it make a health claim" is a yes or a
no — scoring it 3 says nothing anybody can act on — and a flag is one tap rather than five. The
compliance flag carries its own "quote the line" box, and **caps the verdict at `mixed` however
well the rest was scored**: a conversation that made a health claim must never head a training
block as an example of Sol doing well, because that is precisely the block a model would copy.

Three rules hold the comparability the scores exist for:

- **The set is fixed.** A question added back is a deliberate trade against the form getting
  finished, not a free improvement. A test pins the list, and a second test pins the element
  count so the page cannot quietly grow again.
- **Every scale runs the same way, 5 is good.** A page where one question counts down while the
  rest count up is the reliable way to get an average nobody can trust.
- **A junk lead is a flag, so it never touches Sol's average.** It grades the prospect, not Sol.

A score at or below `WEAK_AT` (2), or a raised flag, becomes an explicit `Avoid:` line in the
prompt block, worded from the scale rather than from the reviewer, so a repeated complaint reads
identically every time — a model generalises from one phrasing far better than from twelve
paraphrases of it. Flags sort first: a compliance slip outranks a middling score.

Answers are allow-listed exactly like `normalizeLead`: this form posts from the open internet, so
an undeclared key (`__proto__` included) must not reach the document. An unticked checkbox posts
nothing at all, so absence is read as false rather than unknown. A star tapped in the email only
preselects `overall`; nothing is written until the form is posted, so `training.promptBlock` and
the scores can never disagree.

The compliance flag means **the claims line**, which moved on 2026-09-21: Sol may now name the
category an ingredient sells into, so the flag is for saying what something DOES to a person,
naming a condition, or personal dosing — not for mentioning calm-and-balance. See
`../CLAUDE.md § What Sol may say about effects`; a review filed against the old, broader meaning
will read as a false positive.

**`training.promptBlock` is the deliverable** — markdown that concatenates into Sol's system
instruction with no further shaping, reading as a worked example rather than a database row.
**Nothing consumes it yet** — see `docs/sol-review-loop.md § Feeding reviews back to Sol`. The
quoted transcript inside it is visitor-authored, so its fence is always longer than any backtick
run in the text and continuation lines are indented; do not "simplify" either away.
`training.embeddingText` is the string a future embedding would be computed over, and
`embedding` / `embeddingModel` / `embeddedAt` are reserved nulls. **kNN retrieval is investigated,
not built** — Firestore's native vector search, the 2048-dimension ceiling that forces
`outputDimensionality`, and the reason not to turn it on below ~50 reviewed conversations are all
in `docs/sol-review-loop.md § Vector retrieval`.

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
unprompted. Round-trips are capped at 2 (`MAX_TOOL_ROUND_TRIPS`) — see § The last round trip still
runs its tools for what that cap does and does not end. A call to any other tool name still emits
`{ type: 'tool', name, status: 'failed' }` so the transport contract stays stable.

Chat leads carry the inquiry type `Sol Chat`, which drives the distinct subject line, the Source
line in the team email, and the `Nano Kava Sol Chat` Mailchimp tag (form leads keep
`Nano Kava Contact Form`).

## A tool result is a request, not a fact on screen

`open_sample_quiz` and `show_nano_explainer` return `status: 'requested'` and emit
`{ type: 'tool', name, status: 'requested' }`. The server cannot observe the visitor's screen: the
SSE frame may be dropped, the client may decline it (`sampleQuiz.js § canOpenQuiz` has its own
policy), the panel may already be closed. Anything the tool tells the model must therefore be
phrased as a request that may fail.

*Corrected 2026-08-26. Both previously returned `status: 'shown'` with wording asserting the thing
was on screen — the quiz's read "The three-tap picker is on screen." Stephen hit the consequence
directly: "Sol just told me he opened the sample picker (which I don't even know what that is and
I cannot see it)." A model handed a fact will repeat it, and then argue with a visitor who says
otherwise.*

Two consequences the persona carries rather than the code: Sol names these in words a visitor
recognises ("three quick questions just came up over the chat", never "picker" or "quiz"), and a
visitor saying they cannot see it ends the matter — he asks the three questions conversationally
instead of insisting or re-calling the tool.

The client only branches on `status === 'failed'`, so the rename from `shown` to `requested` is
invisible to `useChatStream`; it is the model-facing string that mattered.

**The quiz fills in no lead.** Its taps come back as the visitor's own next turn and the card only
follows once they agree — the deliberate decision recorded in
`src/components/chat/engagement/sampleQuiz.js`. The tool `description` and the persona both said
it "fills in a sample request for them"; both were rewritten on 2026-08-26.

## The picker is offered once

*Added 2026-09-08 from a reported session.* `toolsFor({ quizAnswered })` drops
`open_sample_quiz` from the declarations when the client says the visitor has already tapped
through it. The client sends `quizAnswered` because it is the only side that knows — the flag
lives in `sessionStorage`.

Withholding beats refusing. With the tool on offer the model called it for a visitor who had just
answered all three questions, and said "three quick questions just came up over the chat" in the
same turn — a sentence the client cannot unsay, because the tool event and the text arrive
together. Reproduced against the live model on 2026-09-08, then reproduced as absent afterwards.
The persona carries the matching rule (never claim questions came up without calling the tool in
that reply), because a model that cannot call it can still describe it.

`systemInstruction` is deliberately **not** varied on this flag: that prefix must stay
byte-identical or implicit caching stops — see § Prompt caching is implicit — do not add explicit
caches. Only the tool list changes.

**Withholding the declaration is not enough, and that surprised us.** *Added 2026-09-08 after the
first fix was measured failing.* `persona.js` names `open_sample_quiz` in prose, so the model
emitted a call for it on roughly one turn in three with the tool absent from the declarations —
and `runToolCall` executed it, raising the picker and printing "three quick questions just came
up over the chat". `runToolCall` now refuses that call itself and returns `not_available` with the
reason, which reaches the model in the same turn. Two layers, because either alone leaks:
withholding stops most calls, refusing stops the rest.

## The length cap

*Added 2026-09-08.* Stephen, against a 145-word reply: cap Sol at about three quarters of it.
`MAX_REPLY_WORDS` (100) and `MAX_REPLY_SENTENCES` (3) in `chat.js` are the numbers.

Where the rule lives matters more than the numbers. Measured, in order:

| Where the limit was stated | Result |
|---|---|
| `persona.js` STYLE, mid-prompt | ignored — 122-158 word replies |
| Same, with `maxOutputTokens: 170` | replies chopped mid-sentence |
| Appended after the last turn (`brevityReminder`) | **61-89 words, nothing truncated** |

So the rule rides in the same trailing message as `businessHoursContext()`, read immediately
before the model answers. `maxOutputTokens` is 220 — a runaway guard, deliberately *above* the
instructed limit, because a reply cut off mid-sentence reads worse than a long one. Do not lower
it to enforce brevity; that was tried and it truncates. `test/e2e/sol-conversation.mjs` word-counts
every reply, which is the only place this can actually be verified.

## Proving a lead was really delivered

*Added 2026-09-08, after a reported "no email was sent" that turned out to be delivered.*

A 200 from `sendContactEmail` means SendGrid accepted the message, not that anyone received it.
Nothing checked further, so there was no way to tell a delivery failure from an inbox filter.

- `functions/test/leadDelivery.test.js` — fast, sends nothing: both team addresses on one message,
  the visitor auto-reply, the authenticated From, and a SendGrid throw propagating rather than
  being reported as a send.
- `test/e2e/lead-delivery.mjs` — posts a marked lead to the **deployed** function, then polls
  SendGrid's Email Activity until every row settles and fails on anything but `delivered`. It also
  checks all four suppression lists. Run it with `make test-lead-delivery`; it emails the team.

Match activity rows by the marker in the company field (it lands in the team subject) plus a time
window for the auto-reply, whose subject is fixed. **Never by a `unique_args` query** — nothing
sets any, so that query answers 200 with an empty list and a run that really delivered reads as a
run that sent nothing. That cost a debugging cycle.

`cannasolusa.com` is on Microsoft 365. Delivery is confirmed by the 250 in the delivered event's
reason (`Hostname=...outlook.com`); anything after that — Junk, hosted quarantine, a transport
rule — is invisible to SendGrid and has to be checked in the tenant.

## Colour resolution is server-side

*Added 2026-08-26 with `set_particle_color`.* `particlePalette.js` decides what a visitor's colour
word means; the browser only applies the numbers the SSE frame carries. Sol passes the word
through **exactly as typed** — the tool description tells him not to correct or substitute it —
and gets back one of four outcomes:

| status | Means | Sol must |
|---|---|---|
| `applied` | It is in the library | Confirm in a sentence |
| `mapped` | Not stocked; the nearest was used | **Say so** — name both, offer another |
| `reset` | Put back to the captured defaults | Confirm in a sentence |
| `not_a_color` | Not a colour at all; nothing changed | Say so lightly, name a couple he has |

Two reasons resolution does not live in the browser. The model needs to know what actually
happened in order to phrase the reply — the `mapped` case is a promise to the visitor and a client
that resolved silently could not make it. And the client would then hold a second copy of the
colour library, which is the drift § A tool result is a request, not a fact on screen was written
about.

"Is this a colour at all?" is answered by a table of ~180 CSS and common colour names plus hex,
never by the model. `table` is not in it, so it cannot become a colour because a model felt
agreeable. Nearest-match is redmean-weighted RGB against the canonical anchors — good enough to
be unsurprising, and every substitution is announced rather than hidden.

**The one duplicated object is `DEFAULT_PALETTE`**, which also lives in
`src/utils/particlePalette.js` because the client needs it before any turn happens.
`src/test/particlePalette.test.js` imports both and fails on drift.

## The last round trip still runs its tools

`MAX_TOOL_ROUND_TRIPS` caps how many times `streamChat` goes back to the *model*. It does not cap
tool execution: every non-empty `callParts` runs through `runToolCall`, and the final iteration
simply skips the extra request and breaks after running them.

*Corrected 2026-08-26. The break condition was
`if (callParts.length === 0 || roundTrip === MAX_TOOL_ROUND_TRIPS) break;`, placed **before**
`runToolCall`, so a tool call arriving on the last round trip was discarded silently. Its
narration had already streamed (the text of that turn is emitted as it arrives), so Sol said he
had put a picker on screen and no `sample_quiz` frame was ever sent — the other half of the bug in
§ A tool result is a request, not a fact on screen.*

Termination is still the `for` bound, not the break: the loop can only run `MAX_TOOL_ROUND_TRIPS +
1` times regardless of what the model asks for. The final iteration's `contents` pushes are dead
weight by construction — kept because dropping them would need a second branch to buy nothing.

## Phone-only leads

`validateLead` requires `name`, `message`, and **at least one of `email` or `phone`**. The email
format regex still applies, but only when an email is actually present.

*Corrected 2026-08-25: it previously required `name`, `email` and `message` unconditionally.*

*Corrected 2026-09-09: the chat lead card (`src/components/chat/lead/`) previously required an
email before Send would enable, out of step with this backend rule — it now requires a phone or
an email, same as here, and prefers the phone, on Stephen's instruction: Josh would rather call
than email. See `src/components/chat/lead/CLAUDE.md § Lead card`.*

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

Answer accuracy was equal. Thinking tokens bill as **output**, so at ~500/turn they cost more than
the visible answer (~85 tokens) and roughly doubled the per-turn price. This workload is
knowledge-base lookup plus tone, not reasoning. Raise the constant if the bot ever has to do real
multi-step work.

*Still 0 on `gemini-3.8-flash`, verified 2026-09-09: `thoughtsTokenCount` comes back 0 and the
model answers normally, so the switch did not quietly re-enable thinking. The measurements above
were taken on 3.5 and were not repeated; only the zero was re-confirmed.*

**The budget is a hint, and `MAX_OUTPUT_TOKENS = 220` is what makes ignoring it fatal.** Thinking
tokens count against `maxOutputTokens`, so a model that spends ~210 of them has nothing left for
the reply: the API returns `candidatesTokenCount: 0`, and the empty-response guard emits
`SAFETY_FALLBACK`. That looks like a safety block and is not one — nothing errors and nothing
alerts. Measured over 30 turns each: 3.5 and 3.8 Flash honoured 0 every time; `gemini-3.7-flash`
ignored it on 3 turns and **all three died**, one of them carrying a lead. `gemini-3.5-flash-lite`
and `gemini-3.1-pro-preview` reject `thinkingBudget: 0` outright. Raise the ceiling before trying
any model that is not 3.5 or 3.8. *Added 2026-09-08; evidence in
`docs/reports/sol-model-bakeoff.html`.*

## Prompt caching is implicit — do not add explicit caches

The system instruction (persona + knowledge base) is a stable prefix and Gemini's **implicit**
caching picks it up with no configuration. Do **not** add `ai.caches.create()`: at this volume it
bills hourly storage for a result that is already nearly free.

**Measured 2026-09-09, over 95 production turns on `gemini-3.5-flash`.** *This section previously
said the prefix was 4195 tokens with ~100 tokens of headroom over the 4096 minimum, and that
`cachedContentTokenCount` came back "around 2030". Both were true once and neither is now — the
knowledge base has roughly doubled since.*

**The switch to `gemini-3.8-flash` the same day did not change any of this.** Re-verified over
four consecutive turns: 8,152 of 11,227 prompt tokens cached, the first call cold and every one
after it warm — the same shape and very nearly the same numbers as 3.5. The prices below are 3.5's
and the break-even is recomputed for 3.8 at the end of this section.

| | |
|---|---|
| System instruction | **10,038 tokens** (persona ~4,400 + knowledge base ~5,600) |
| Cached when it hits | **~8,140** — 81% of the prefix |
| Turns that hit at all | **58%** |
| Cost per turn | ~$0.0067 · ~$0.06 per conversation |

Two things follow, and neither is what the old warning said:

- **The 4096 minimum is no longer a live risk.** There is 2.5x headroom. Trimming the knowledge
  base is now a cost *saving* (it is resent every turn) rather than something that silently kills
  caching. It only becomes dangerous again below ~4.1k tokens.
- **~1,898 prefix tokens never cache, even on a hit.** Cache hits land in blocks (observed at
  ~4,050 and ~8,140), so the tail past the last whole block is billed at full rate every turn.
  Padding the prefix to reach another block saves ~$0.002/turn and is not worth junk tokens.

**The 42% miss rate is cold starts, not a bug.** The implicit cache has a short TTL and traffic is
~22 conversations/month, so most conversations begin cold. That is exactly what an explicit cache
would fix, and it still does not pay:

| | on 3.5 (measured) | on 3.8 (current) |
|---|---|---|
| Explicit cache storage, always warm | $1.00/M/hour → **$7.33/month** | $0.50/M/hour → **$3.66/month** |
| Saved at current volume | ~$1.09/month | ~$0.55/month |
| **Break-even** | ~1,021 turns/month (~170 conversations) | **~1,021 turns/month (~170 conversations)** |

Both the storage price and the input price halved on 3.8, so the break-even is unchanged — the
ratio, not the absolute rate, is what decides it. Revisit `ai.caches.create()` when the daily
report shows roughly **170+ conversations a month**, and not before.

⚠️ **3.8's promotional pricing ends 2027-01-01 and every rate doubles.** That does not move the
break-even either, for the same reason, but it does double the running cost — `RATE_SCHEDULE` in
`usageCost.js` already carries both tiers so the report stays honest through the change.

## What a conversation costs

*Added 2026-09-09, at Stephen's request: "what is the cost of Sol so far? Are we measuring?" — the
answer was no. Usage was `console.log`ged per turn and discarded; Cloud Logging drops it after 30
days, and no billing export exists, so cost per conversation could not be answered historically.*

- `usageCost.js` holds the rates and the arithmetic. **`cachedContentTokenCount` is a subset of
  `promptTokenCount`, not an addition** — billing the whole prompt and the cache on top
  double-counts every cached token, which is the easy way to get this wrong.
- `createTranscriptRecorder` captures the `done` frame's usage; `persistTranscript` accumulates
  `usage: { promptTokens, cachedTokens, outputTokens, costUsd, turns }` onto the session document.
  A stream that errors never sends a `done`, so that turn stores zeroes rather than failing.
- The daily report renders one line: cost, per conversation, **per submitted lead**, turns, tokens
  and cache-hit share. Cost per lead is the number worth watching — it is what a conversation has
  to earn.

Sessions written before this shipped have no `usage` field; `addUsage` treats absent as zero
rather than NaN, so old documents still total correctly.

Rates live in **one** place (`RATE_SCHEDULE`) and are asserted in `functions/test/usageCost.test.js`
— a silent edit to a rate is a silently wrong cost report. They are `gemini-3.8-flash` paid tier as
published on 2026-09-09; **re-check the whole table when `MODEL` changes.**

The table is dated rather than flat because 3.8 launched on promotional pricing that **doubles on
2027-01-01** ($0.75 → $1.50 in, $3.75 → $7.50 out, $0.075 → $0.15 cached). `costOf(usage, when)`
prices a turn at the rates in force when it happened, so a stored total stays correct across the
change and January's report does not silently halve the real cost.

**Switching to 3.8 on 2026-09-09 cut the per-turn price by ~51%** — $0.0067 → $0.0033 on the same
11k-token turn — with all 33 live conversation checks passing, including the compliance guardrails
and prompt-injection resistance.


## The phone offer is gated server-side

Sol may offer Josh's number only when the office is actually open, and only to a visitor who
reads as a real business prospect. The judgement is the model's (`persona.js` § QUALIFYING A
CALLER); **the clock is not**. `businessHours.js` decides that, and the number is only present in
the context string while the line is open — Sol cannot offer a call into an empty office because
he was never handed anything to offer.

Hours are 10:00–19:00 America/New_York, Monday to Friday, via `Intl.DateTimeFormat` so DST is the
platform's problem rather than an offset table. *Mon–Fri is an assumption, not a stated
requirement — Stephen specified "10am Est - 7pm Est" with no days. One constant to change.*

**The line is appended to `contents`, never merged into `systemInstruction`.** That prefix must
stay byte-identical or implicit caching stops — see § Prompt caching is implicit, which also
explains why the margin leaves no room to be casual about it. Appending a final turn leaves the
cached prefix untouched.

It is labelled as coming from the server rather than the visitor. A visitor could still type
something resembling that marker; the worst case is Sol reciting a phone number that is already
printed in the site's own hero, so the exposure is nil and the guard is not worth more machinery.


## Conversation digests — RETIRED

> ⚠️ **Retired 2026-08-26.** Stephen replaced this with one daily report: *"I think the backstop
> is really all we need. Just get that report emailed to me once per day."* The `sendChatDigest`
> endpoint is gone from `index.js`, `ChatPanel` no longer beacons, and the `/api/sendChatDigest`
> dev route is removed. `digest.js` and `src/components/chat/transport/chatDigest.js` are still
> on disk but **nothing imports them** — they were left rather than deleted only because neither
> is in git yet. See § The daily report replaced the digest.
>
> The section below is kept because its *reasoning* still binds the replacement: the caps, the
> escaping, and the recipient rule all moved rather than disappeared.

*Added 2026-08-25 at Stephen's request: every substantive Sol conversation is emailed to the team
with its transcript, whether or not it produced a lead — "so we can see if the bot is messing up
or responding right to the potential client questions and see what the customers are really
looking for."*

`digest.js` builds it, `sendChatDigest` in `index.js` serves it, and the browser posts it with
`navigator.sendBeacon` on `pagehide` — the one transport that survives a tab closing.
`ChatPanel` also flushes on unmount, guarded by a ref so only one of the two wins.

**The visitor is never told, and Sol does not know it exists.** It is not in his system
instruction and there is no tool for it. He has one job on that turn and it is not this.

**This endpoint mails visitor-authored text to us, so its validation IS the security surface:**

- **A floor, not just a ceiling.** Fewer than 2 messages, or no visitor turn at all, returns
  `{ ok: false }` and nothing is sent. Most visits open Sol and say nothing; without this the
  team would get a mail per pageview.
- **Caps** on message count (60, most recent kept), per-message length (2000), and per-field
  length (200). Unknown roles and unknown contact keys are dropped rather than passed through.
- **Per-IP rate limit** of 6/hour, same shape and same caveat as the chat limiter — see § Rate
  limiting is per-instance and best-effort.
- **Everything is HTML-escaped** on the way into the mail body, for the reason in § Lead email
  escaping, which applies with more force here: this payload is *entirely* visitor-controlled.
- **Rejections answer 204, not 4xx.** `sendBeacon` cannot read a response and the page must not
  care; a status the client cannot act on should not look like an error in logs.

### Who receives it

*Stephen's rule, 2026-08-25.* Recipients are earned, not default:

| Situation | Goes to |
|---|---|
| Conversation timed out or the tab closed | **Stephen only** — this is review material |
| The sample form was actually submitted (`leadSent`) | Stephen **and** Josh |
| The visitor explicitly agreed to be passed on (`shareAuthorized`) | Stephen **and** Josh |

`recipientsFor` is the single decision and it is unit tested. `shareAuthorized` is set by the
`share_chat_with_josh` tool, which the persona may call **only** on an explicit yes to that
question. That is model-judged consent, which § The tool proposes, the visitor sends rejects for
sending mail to a visitor — the difference is blast radius: a mistaken call here copies a
colleague on an internal note. It still may not send anything to the visitor, and it is never a
substitute for the lead form.

**When it fires:** the tab going away, the panel unmounting, or three minutes idle
(`IDLE_TIMEOUT_MS`), whichever comes first, guarded so only one wins.

**What it deliberately does not do: send anything on the model's say-so.** Stephen asked whether
Sol could fire the lead email when a visitor types "yes" — he cannot, and must not. A model
asserting that a visitor confirmed is not consent, and prompt-injected text can make a model
assert anything; only the Send click on the lead card is consent. See § The tool proposes, the
visitor sends. The digest is a notification to *us*, which is why it is allowed to be automatic.

Worth knowing: the digest contains whatever a visitor typed, so the site's privacy policy should
say that chat conversations are retained and emailed to the team.


## Transcript persistence

*Added 2026-08-26 at Stephen's request: every chat is stored in Firestore, capped, and deleted
90 days after it started.*

*Corrected later the same day: the cap was 30 messages. Asked whether "30 turns" meant messages
or exchanges, Stephen chose exchanges, so `MAX_TURNS` is **60**. A turn is still a message; the
constant counts messages and 60 of them is 30 back-and-forths.*

`chatStore.js` owns it. One document per session at `chatSessions/{sessionId}`:

| Field | Notes |
|---|---|
| `messages` | `[{ role: 'user'\|'model', text }]`, **at most `MAX_TURNS` (60 = 30 exchanges)**, most recent kept |
| `turnCount` | Every turn the chat ever had, including the ones the cap discarded |
| `page` | Where the conversation started. Set on create, never overwritten |
| `createdAt` / `updatedAt` | |
| `expiresAt` | `createdAt + 90 days`. **The TTL policy reads this field and only this field.** |

**Two bounds, because there are two ways to grow without limit.** The 60-message cap bounds a single
document; the 90-day TTL bounds the collection. Either one alone leaves the other unbounded.

### The TTL lives in firestore.indexes.json

The policy is declared, not clicked:

```json
{ "collectionGroup": "chatSessions", "fieldPath": "expiresAt", "ttl": true, "indexes": [] }
```

`make deploy-firestore` applies it alongside the rules — **it deploys `firestore:indexes` as well
as `firestore:rules`, and it has to.** Deploying that file is what applies the TTL, so a deploy
made while the `fieldOverride` is missing would *remove* a live policy rather than leave it
alone. Do not narrow that target to rules only, and do not "tidy" the fieldOverrides array.
`make firestore-status` prints what is actually deployed.

`"indexes": []` exempts `expiresAt` from single-field indexing. TTL collection does not need a
user index and nothing queries the field, so indexing it would only add index entries to every
document write — Google recommends the exemption for exactly this case.

Deletion is not instant by design: Google documents TTL as removing documents *within 24 hours*
of the timestamp passing. Treat 90 days as a floor, not a guarantee of a hard cutoff.

### Why the server writes it, and why after the stream

The browser never touches Firestore. `firestore.rules` closes client access entirely and the
Admin SDK bypasses rules, so there is no path for a visitor to write, read or delete a transcript
— theirs or anyone's. A client-side write would have needed rules permissive enough to be abused,
for a payload the server already has in hand.

The write happens in `index.js` **after** `streamChat` resolves, so a slow or failed Firestore
round trip cannot delay a token the visitor is waiting on. `persistTranscript` never throws and
returns `{ ok, reason }` instead; a lost transcript is telemetry, and it may not cost anyone an
answer. `createTranscriptRecorder` wraps the SSE sink to capture the reply text, which is how
`chat.js` stays unaware that a database exists at all.

### The append rule

The client replays a sliding 20-message window every turn, so appending it wholesale would
duplicate. An **existing** document therefore takes only the new exchange (last user turn +
reply); a **new** one takes the whole window, which is the only chance to capture the
client-owned greeting (§ The greeting is client-owned, in `src/components/chat/transport/`).

Consequence: a write that fails loses that turn's pair permanently — the next turn appends only
*its* pair and never backfills. Accepted rather than fixed; the alternative is diffing a replayed
window against stored text on every message.

### The session id is optional on purpose

`validateChatRequest` returns `sessionId: null` for a request that omits it **or** sends a
malformed one, and answers the turn either way. A cached bundle from before this change sends
none, and persistence may never be the reason a visitor is refused an answer. Only a
present-and-malformed id is logged. The id must match `/^[A-Za-z0-9_-]{8,64}$/` before it becomes
a document path — `..` and `/` are the reason that guard exists rather than a length check.

**Nothing local writes.** `vite.config.js` prints what it would have stored, prefixed
`[sol dev] DRY RUN - nothing written to Firestore`, for the same reason the lead route does not
send mail. Verifying a real write needs a deploy.

**Privacy:** this doubles down on the note closing § Conversation digests. Chat conversations are
now emailed to the team *and* retained for 90 days, and the privacy policy should say so.


## The lead record is not the transcript

*Added 2026-08-26. Stephen: "I think the user's data should actually be stored separately from
the chat context as well — since Sol will have already extracted it, right?" He is right that Sol
extracts it: `proposeLead()` receives structured `name / company / email / phone / interest /
reason / conversation_summary` at tool-call time, and until this landed the server discarded all
of it.*

`chatLeads.js` writes `chatLeads/{sessionId}`. The split is the point:

| | `chatSessions` | `chatLeads` |
|---|---|---|
| What it is | Telemetry — how Sol performed | A business record — who the prospect is |
| Retention | 90-day TTL | **None. It does not expire.** |
| Grows by | Every turn, capped at 60 | Only when the lead tool fires |

**No TTL is deliberate**, and it is the whole reason for a second collection: losing a real
prospect's details on day 91 is worse than keeping them, while a transcript genuinely is
disposable. Do not add an `expiresAt` here, and do not add a `chatLeads` fieldOverride to
`firestore.indexes.json` — its absence *is* the policy.

### `confirmed` is the difference between a guess and a human

`false` on create: Sol extracted it, and **a model can hallucinate an email address**. The card is
also editable, so what the visitor submits can differ from what he read. `confirmLead()` flips it
to `true` from `sendContactEmail` when the visitor actually pressed Send, and:

- **It is never downgraded.** A later extraction merges its fields but re-asserts `confirmed` from
  what is already stored, so a confirmed record cannot be reverted by a subsequent tool call.
- **It creates the document if the tool never fired**, so a confirmed submission is never lost to
  a missing extraction.
- The daily report labels the two differently on purpose — `SUBMITTED by the visitor` versus
  `extracted by Sol, NOT submitted`. Treating an unconfirmed record as a lead would mean acting on
  an address nobody typed.

Writes **merge, never replace**: Sol learns the name three turns before the email, and a later
extraction that omits a field must not erase it. Fields are allow-listed from the tool's declared
arguments rather than spread, because `args` is model-authored from visitor text.

### How it is captured without touching chat.js

`createTranscriptRecorder` already wraps the SSE sink, and `lead_proposed` already carries every
extracted field — so `index.js` reads the lead off the recorder after the stream instead of
threading a session id through `streamChat` → `runToolCall` → `proposeLead`. Three functions'
signatures stayed still. Both writes are **awaited** before `res.end()`: once the response closes,
a gen2 instance may be frozen mid-write.

## The daily report replaced the digest

*Added 2026-08-26.* `dailyReport.js` plus the `dailyChatReport` scheduled function: **08:00
America/New_York, every day**, to `stephen.boyett@cannasolusa.com`.

It reads Firestore rather than the browser, which is the fix for the failure that motivated it:
`navigator.sendBeacon` is fire-and-forget and **cannot report failure**, so a killed tab, a
dropped network or a blocked beacon meant that conversation was simply never emailed and nobody
could tell. Firestore already has every turn.

Three properties are load-bearing now that this is the *only* path a conversation takes to a
human:

- **It sends on silent days.** A "no conversations" email is deliberate: silence would otherwise
  be ambiguous between a quiet day and a dead job.
- **It retries.** `sendWithRetry` makes `RETRY_ATTEMPTS` (4) attempts with exponential backoff,
  treating a non-2xx as a failure. If all of them fail the function **throws**, so Cloud Scheduler
  retries the run — swallowing it would recreate the exact bug this replaced.
- **Leads are fetched by id, not by date.** A lead's timestamps can sit outside the window (Sol
  extracted it yesterday, the visitor submitted today) and a date query would miss it.

⚠️ **SendGrid's 202 confirms acceptance, not delivery.** Stephen asked for the sender to "verify
receipt", and this delivers the retry half honestly but not true receipt: that needs the SendGrid
Event Webhook (`delivered` / `bounced` / `dropped`), which is a public endpoint plus signature
verification plus storage, and is **not built**. Do not describe the current behaviour as
confirmed delivery.
