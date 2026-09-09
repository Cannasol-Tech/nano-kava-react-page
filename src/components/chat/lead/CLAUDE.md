# src/components/chat/lead/ — the handoff

`LeadCard.jsx`: the editable card the model proposes and the visitor sends. The rule that makes
this directory exist is in `functions/lib/CLAUDE.md § The tool proposes, the visitor sends` —
**nothing here may send without a click.**

## Lead card

The model **proposes**; the visitor **sends**. A `lead_proposed` frame appends a `role: 'lead'`
message carrying the extracted `fields`, and `LeadCard.jsx` renders every one of them as an
editable input — the model can misread an email off a transcript, and correcting it before it
goes out is the point of the card existing. `isDialogue` excludes lead messages, so a card is
never echoed back to the model as conversation.

**The form is Name, Email, an optional Company, and a row of sample-line pills. Nothing else.**
*Cut down 2026-08-26.* It previously asked for name, company, email, phone, a free-text Interest
and a free-text "Why now", and required name + company + interest + reason before Send would
enable. Stephen, looking at it on a phone: reduce it "down to just Name, Email and make the
sample options just choosable by selecting/unselecting their pills". Every field asked for is a
field that loses leads, and the conversation already tells Josh why they are here.

*Company came back the same day — "maybe you can fit a text box for company in with that
design" — as a full-width optional field under the pair. This section previously said company
"is no longer collected"; it is, but it never gates Send, which is the whole difference between
a field and a barrier.* `phone` is still not collected and is omitted from the payload rather
than sent empty.

Send enables on name + email + at least one selected line. `interest` is composed from the
selected pills. That still satisfies `validateLead`, which needs `name`, `message`, and one of
`email`/`phone`.

**The pills carry their own contrast, deliberately.** Reported 2026-08-26 with a screenshot: the
previous chips were `1px dashed currentColor` at `opacity: 0.72`, and `currentColor` resolved to
the muted `text-slate-500` the surrounding chat furniture uses — over a translucent transcript
they were effectively invisible. Unselected pills use a solid border and legible slate text. The
whole card moved to an opaque ground at the same time: it is a form, and a form does not get
chat-furniture contrast.

**Selected is a lit rim, not a filled chip.** *Corrected 2026-08-26; selected pills briefly used
a solid `linear-gradient(135deg, #34d399, #22d3ee)` fill with dark text.* Stephen: "I don't
really like the solid teal pills … make the thin border be what is that color — with a metallic
shimmer to it (slight)." Two masked rings on `.sol-lead__line--on` do it: `::before` is a static
brushed-metal gradient, `::after` is a diagonal white band whose **opacity** breathes on a 3.6s
loop, staggered by `nth-child` so the glints cross the row. Opacity, not a travelling
`background-position` — that is the animation this repo does not do anywhere (`src/CLAUDE.md §
Hero gradient heading repaint cost`). Both rings sit at `inset: -1px`, on the button's own border
track, so selecting a pill lights the existing rim instead of adding a second one inside it. The
whole thing is inside `@supports (mask-composite)`; without it the plain `#34d399` border stands.

**`.sol-lead__lines` is `display: block`.** *Fixed 2026-08-26.* It wraps a caption **and** the
pill row, and as a flex container it laid the two out side by side and squeezed the caption into
a column — which is a large part of why the picker read as broken in the screenshot.

Sending POSTs to `sendContactEmail` — the same Cloud Function `src/components/ContactPage.jsx`
calls, with the same `response.ok && data.success` success test — so chat leads land in the
existing inbox and template rather than a second delivery path. `inquiryType` is the literal
`'Request Samples, Sol Chat'`, which is what makes them identifiable on the receiving end.
Cancel collapses the card to a one-line note and leaves the conversation running.

## Sol asks before it sends

*Added 2026-08-26, at Stephen's request: "Have Sol follow up with the user after the form is
submitted before sending the email."* Send is a **two-click gate**, not a dispatch:

1. **Send** posts one line from Sol into the transcript — "Got it, Ana. Anything else Josh should
   know before I pass this on?" — opens an optional last-word box on the card, and swaps the
   button for **Confirm & send**. Nothing has left the browser.
2. **Confirm & send** does the POST. The last-word box rides in the `message` under its own
   `--- Anything else ---` heading, above the conversation summary.

Sol's line goes through `appendSolLine`, threaded from `ChatPanel` as `onFollowUp`, so it is a
real `model` turn rather than form chrome dressed up as one. The card keeps its own box rather
than pointing at the composer: a reply typed into the composer reaches the model and the digest,
but the email was already composed, so it would never reach Josh's inbox.

The hint line reads "Nothing has been sent yet — Confirm & send does that." for the whole of
step 2, because a form that looks submitted and is not is worse than one extra tap. **Not now**
still backs out of step 2 without sending, which is the point of the gate existing.

### Send-state animation

Three states, all `transform`/`opacity` (`.sol-lead*` in `src/index.css`):

- **sending** — `.sol-lead__sweep` loops an accent beam across the card; the Send button gets a
  scale-down and swaps its label for a rotating spinner. The button width is fixed at each step
  — `w-[104px]` for Send, `w-[148px]` for Confirm & send — precisely so that swap cannot reflow
  the row.
- **sent** — the card is replaced by a compact confirmation that scales in, a radial ring
  expands and fades, and a checkmark draws. The check is **two bars animating `scaleX` from a
  left transform-origin**, not an SVG `stroke-dashoffset` draw: stroke-dash repaints the path
  every frame, `scaleX` composites. Eight particles burst outward through per-dot
  `--sol-burst-x/y` custom properties.
- **failed** — inline error carrying `(216) 921-2240`, fields stay editable, Send re-enables.

## Cross-selling the box

*Added 2026-08-25 after Stephen watched Sol propose a kava-only card: "It should always suggest
our other samples alongside the kava or at least ask." Widened 2026-08-26 from two add-ons to
five named lines.*

Cannasol sells five things off one nanoemulsification platform, and they ship in the same box at
no extra cost.

**The pill says the short name; the email says the catalogue name.** *Split 2026-08-26 — the
pills used to carry the catalogue name and five of them wrapped one per line on a phone.*
`SAMPLE_LINES` therefore has both, and `labelsFor` composes `interest` from `interest`, never
from `label`:

| `label` (the pill) | `interest` (what reaches Josh) | |
|---|---|---|
| Nano Kava | Kavalactone Nanoemulsion | the flagship |
| Nano Lion's Mane | Lion's Mane Nanoemulsion | |
| Nano Reishi | Reishi Nanoemulsion | Cannasol were the first in the world to nano-emulsify Reishi |
| Nano Cordyceps | Cordyceps Nanoemulsion | |
| Bitter Blocker | Bitter Blocker | for bitter botanicals other than kava — the kava nanoemulsion needs none |

*Previously these were collapsed into a single "Nano Mushrooms" chip. Three strains behave
differently and buyers ask for them by name, so the card names them.*

It is handled in two places, deliberately, because either alone leaks:

- **Sol asks**, per `persona.js` § THE BOX HAS ROOM FOR THE WHOLE LINE. One sentence in the same breath as
  the sample offer, asked once and never twice. He is told explicitly **not** to hold the handoff
  open waiting for an answer — a card that arrives late costs more than a missed add-on.
- **The card offers**, via `SAMPLE_LINES`. This is the net that catches the case Sol forgot, and
  the faster path for a visitor who did not want to type.

**The pills are the source of truth for `interest`, not a text field.** They used to splice
strings into a free-text Interest box, which meant the selected state had to be parsed back out
of prose Sol had written. `linesFromInterest` now runs once on mount to pre-select from whatever
the model passed — matching on the **catalogue** name plus `LINE_ALIASES` — and selection lives
in component state after that.

*Corrected 2026-09-09: this section previously said the bitter blocker was worth pushing because
"a kava buyer who is never told about it hits the taste problem in their own kitchen and blames
the kava" — that framing is gone.*
Bitter Blocker stays worth offering on its own merits — best pricing in the industry, for kava and
other bitter botanicals — never framed as something the kava formulation requires.

*Corrected 2026-09-09 (second pass): an earlier version of this correction said "the kava
nanoemulsion needs no bitter blocker." Stephen's ruling: the site says neither that kava needs a
Bitter Blocker nor that it does not — copy describes taste only and keeps Bitter Blocker positively
on offer.*
