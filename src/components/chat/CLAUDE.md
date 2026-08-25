# src/components/chat — Bula assistant

Floating chat widget. `ChatWidget.jsx` is the only module `src/App.jsx` imports; the panel,
the emoji grid and the SSE hook are all reached through it.

| File | Owns |
|---|---|
| `ChatWidget.jsx` | Launcher button, open/close lifecycle, proactive pop-in, Escape + focus return |
| `ChatPanel.jsx` | Header / transcript / composer, lazy-loaded on first open |
| `EmojiPicker.jsx` | Curated emoji grid, lazy-loaded on first picker open |
| `LeadCard.jsx` | Editable lead card, its send state machine, and the contact-endpoint POST |
| `useChatStream.js` | SSE transport and message state |

## Why the blur is browser-gated

`backdrop-filter: blur()` on a `position: fixed` element is the single worst performance
offender measured on this site: removing all 22 instances cut Safari frame time from ~137ms to
~26ms, a 53% reduction (`SAFARI_PERFORMANCE.md`, "After Fix 1"). Safari's WebKit does not batch
backdrop-filter compositing passes the way Blink does, and `NanoScene` repaints behind
everything, so each blurred layer re-samples an animating source every frame.

The product requirement is a blurred transcript, so the blur is kept where it is affordable and
dropped where it is not. `ChatPanel.jsx` sniffs Safari with the same expression `NanoScene.jsx`
already uses — `/^((?!chrome|android).)*safari/i` — and picks one of two classes on the
transcript element:

- `.bula-transcript--blur` — real `backdrop-filter: blur(18px)` over a 0.55-alpha background.
- `.bula-transcript--solid` — no filter, background raised to 0.94/0.95 alpha so the panel still
  reads as a distinct surface.

Both variants live in `src/index.css` under `/* ── Bula chat widget ── */`, keyed off
`.bula-panel[data-theme='dark'|'light']`. Never move the blur into a Tailwind
`backdrop-blur-*` utility — that would apply it unconditionally.

Everything else in the widget animates `transform` and `opacity` only, and every animated
element carries `will-change`. The panel entrance, the edge-light sweep and the ring settle are
all finite, so the widget's steady-state animation cost is the launcher pulse and (while
streaming) three typing dots.

## Prerender and first render

`npm run build` runs `scripts/prerender.mjs`, which drives Puppeteer through every SEO route and
writes the settled DOM to disk; `src/main.jsx` then calls `hydrateRoot` when that markup is
present. A first client render that differs from the snapshot throws the whole prerendered root
away. Two consequences bind this directory:

1. **The widget renders closed, always.** `isOpen` starts `false` and the panel is not mounted,
   so the snapshot contains only the launcher button.
2. **Nothing touches `window`, `navigator` or `sessionStorage` during render.** The proactive
   pop-in reads storage inside a `useEffect`, mirroring the `showScene` pattern in
   `src/App.jsx`. The effect also bails when `window.__PRERENDER__` is set, the same guard
   `src/hooks/useInView.js` uses, so Puppeteer never snapshots an opened panel.

The Safari check is a module-level constant in `ChatPanel.jsx` rather than an effect because
that module is only imported after a user or timer opens the panel — never during hydration.

## sessionStorage keys

| Key | Set when | Effect |
|---|---|---|
| `bula:proactive-shown` | The pop-in fires (dwell or scroll depth) | Pop-in never fires again this session |
| `bula:dismissed` | The user closes the panel | Suppresses the pop-in for the rest of the session |

Both are written as `'1'` and read through `readFlag`/`writeFlag`, which swallow exceptions:
Safari private mode throws on `sessionStorage` access rather than returning null. Losing the
flags degrades to "the pop-in may fire once more", which is acceptable; a thrown error would
take the widget down.

## Proactive pop-in trigger

Whichever comes first: a 12s dwell timer, or a sentinel element at 40% of
`document.documentElement.scrollHeight` entering the viewport. The sentinel uses
`IntersectionObserver` rather than a scroll listener so no scroll handler reads layout — the
same reason `src/hooks/useScrollDepth.js` works that way. Note that hook positions its sentinels
with `top: 25%`-style percentages against a static `body`, which resolves against the initial
containing block (the viewport), not the document; this directory computes a pixel offset
instead.

## Lead card

The model **proposes**; the visitor **sends**. A `lead_proposed` frame appends a `role: 'lead'`
message carrying the extracted `fields`, and `LeadCard.jsx` renders every one of them as an
editable input — the model can misread an email off a transcript, and correcting it before it
goes out is the point of the card existing. `isDialogue` excludes lead messages, so a card is
never echoed back to the model as conversation.

Send is enabled only when `name`, `company`, `interest` and `reason` are all non-empty **and**
at least one of `email` / `phone` is non-empty. Email and phone are individually optional
because a buyer will often give one and not the other; requiring neither would produce leads
nobody can reply to. The blocking condition is surfaced as a one-line hint under the fields
rather than a validation dialog.

Sending POSTs to `sendContactEmail` — the same Cloud Function `src/components/ContactPage.jsx`
calls, with the same `response.ok && data.success` success test — so chat leads land in the
existing inbox and template rather than a second delivery path. `inquiryType` is the literal
`'Request Samples, Bula Chat'`, which is what makes them identifiable on the receiving end.
Cancel collapses the card to a one-line note and leaves the conversation running.

### Send-state animation

Three states, all `transform`/`opacity` (`.bula-lead*` in `src/index.css`):

- **sending** — `.bula-lead__sweep` loops an accent beam across the card; the Send button gets a
  scale-down and swaps its label for a rotating spinner. The button is a fixed `w-[104px]`
  precisely so that swap cannot reflow the row.
- **sent** — the card is replaced by a compact confirmation that scales in, a radial ring
  expands and fades, and a checkmark draws. The check is **two bars animating `scaleX` from a
  left transform-origin**, not an SVG `stroke-dashoffset` draw: stroke-dash repaints the path
  every frame, `scaleX` composites. Eight particles burst outward through per-dot
  `--bula-burst-x/y` custom properties.
- **failed** — inline error carrying `(216) 921-2240`, fields stay editable, Send re-enables.

## Analytics

Chat leads must stay separable from contact-form leads in GA4, so `LeadCard` calls
`trackChatLeadSubmitted` (event `chat_lead_submitted`, `lead_source: 'bula_chat'`) and
deliberately does **not** also fire `trackFormConversion`'s `form_submission`. Anything that
fires both would silently double-count the same lead against the form conversion tag.

| Event | Fired from |
|---|---|
| `bula_chat_open` | `ChatWidget` — with a `trigger` of `launcher`, `dwell` or `scroll-depth` |
| `bula_first_message` | `ChatPanel`, once per panel |
| `bula_lead_proposed` | `LeadCard` mount |
| `bula_lead_cancelled` | `LeadCard` dismiss |
| `chat_lead_submitted` | `LeadCard` on `ok && success` |
| `bula_tool_handoff` | `tool` frame |

## SSE contract

`useChatStream.js` POSTs `{ messages: [{ role: 'user'|'model', text }] }` and reads `data: {…}`
frames off `res.body.getReader()`. Event types: `text` (`delta`), `lead_proposed` (`fields`),
`tool` (`name`, `status`), `done` (`usage`), `error` (`message`). History is capped at 20 messages client-side; `system`
messages are local-only and are filtered out of the outbound payload.

The endpoint is a sibling Cloud Function and may not be deployed. Every failure — non-OK status,
missing body, network error, `error` frame — resolves the pending assistant turn to a message
carrying `(216) 921-2240`, so the transcript never shows a stack or an empty bubble. The
greeting works the same way: `requestGreeting` seeds the bubble with the hardcoded
`FALLBACK_GREETING` marked `pending`, and the first server token replaces it rather than
appending to it.
