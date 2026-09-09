# src/components/chat — Sol assistant

`ChatWidget.jsx` is the only module `src/App.jsx` imports. It owns the launcher, the open/close
lifecycle and every decision about *when* Sol appears; everything else lives one level down.

| Directory | Owns |
|---|---|
| `panel/` | The conversation surface: header, transcript, composer, emoji, secret phrase |
| `lead/` | The editable lead card and its send state machine |
| `transport/` | SSE streaming, message state, and the team conversation digest |
| `engagement/` | Section nudges, scroll escalation, the three-tap intent quiz |

*Restructured 2026-08-25. This file had reached 322 lines — past the ~200 guidance — with no
subdirectories to split into. Grouping the modules by layer gave each group a `CLAUDE.md` that is
auto-loaded when an agent reads a sibling, which a single long file could no longer do well.*

Sections below are the ones that belong to the widget itself.

## Prerender and first render

`npm run build` runs `scripts/prerender.mjs`, which drives Puppeteer through every SEO route and
writes the settled DOM to disk. *Corrected 2026-08-25: this paragraph said `src/main.jsx`
calls `hydrateRoot`; it has mounted with `createRoot` since the mismatch work described in
root CLAUDE.md § Prerendering.* The snapshot must still be a settled, legible page, so two
consequences bind this directory:

1. **The widget renders closed, always.** `isOpen` starts `false` and the panel is not mounted,
   so the snapshot contains only the launcher button.
2. **Nothing touches `window`, `navigator` or `sessionStorage` during render.** The proactive
   pop-in reads storage inside a `useEffect`, mirroring the `showScene` pattern in
   `src/App.jsx`. The effect also bails when `window.__PRERENDER__` is set, the same guard
   `src/hooks/useInView.js` uses, so Puppeteer never snapshots an opened panel.
3. **The launcher's arrival is the one exception, and it is gated.** `arrival` starts at
   `'ready'` — not `'pending'` — whenever `isSequenceEnabled()` is false, which covers both
   prerendering and reduced motion, so the snapshot never captures a launcher at `opacity: 0`.

The Safari check is a module-level constant in `ChatPanel.jsx` rather than an effect because
that module is only imported after a user or timer opens the panel — never during hydration.

## sessionStorage keys

| Key | Set when | Effect |
|---|---|---|
| `sol:proactive-shown` | The pop-in fires (dwell or scroll depth) | Pop-in never fires again this session |
| `sol:dismissed` | The user closes the panel | Suppresses the pop-in for the rest of the session |
| `sol:quiz-uninvited` | The picker raises itself *uninvited* | No second uninvited open this session — see `engagement/CLAUDE.md § A chip tap is not an interruption` |
| `sol:quiz-answered` | The visitor finishes the picker | The model is never offered the tool again, and never raises it — see `engagement/CLAUDE.md § The three-tap intent quiz` |
| `sol:session-id` | The first turn of a conversation is sent | **`localStorage`, not `sessionStorage`** — keys the stored transcript across tabs and return visits. See `transport/CLAUDE.md § The session id` |

*Corrected 2026-08-26, twice: this paragraph opened "Both are written as `'1'`" and covered two
keys, and then listed `sol:session-id` here as a sessionStorage key. It is a **localStorage** key
— Stephen chose to stitch a visitor's return visits into one transcript, so this table's heading
is accurate for every row except that one.*

The **flags** are written as `'1'` and read through `readFlag`/`writeFlag`; `sol:session-id` holds
an opaque id, lives in `localStorage`, and is read through `chatSession.js`. All of them swallow
exceptions, because Safari private mode throws on storage access rather than returning null.
Losing a flag degrades to "the pop-in may fire once more"; losing the session id costs transcript
continuity. Neither is worth a thrown error that would take the widget down.

## Proactive pop-in trigger

*Corrected 2026-08-25: this section previously listed only the dwell timer and the scroll
sentinel. The load sequence now opens Sol first, at 3.8s, on every fresh load.*

All three triggers funnel through one `popIn` callback so a single session flag governs them:

| Trigger | Fires | Note |
|---|---|---|
| `load-sequence` | 3.8s after first paint | Sol has landed and settled; see src/components/CLAUDE.md, § Load sequence |
| `dwell` | 12s | The fallback when the sequence is gated off (reduced motion) |
| `scroll-depth` | 40% of the document | Sentinel + IntersectionObserver |

**The load-sequence greeting is not once-per-session.** *Corrected 2026-08-25: it was, and
Stephen reloaded the page to find Sol shut, because `sol:proactive-shown` was already set in that
tab.* `popIn` takes `{ once }`; the greeting passes `false`, so only an explicit dismissal
(`sol:dismissed`) silences it. The dwell and scroll triggers still honour the session flag.

### Getting noticed while scrolling

A visitor who never opens Sol gets two escalations, and only two (`launcherEscalation.js`):

| Depth | Stage | What happens |
|---|---|---|
| 22% | `peek` | A teaser bubble over the launcher — the same component the section nudges use |
| 55% | `insist` | The launcher wiggles **three times and stops** |

`nextStage` advances but never retreats, so scrolling back up does not un-notice him, and it
returns to `idle` permanently for anyone who has opened, dismissed, or converted. A section nudge
always outranks the generic teaser. The wiggle is capped at three iterations in CSS for a plain
reason: a button that shakes forever reads as broken, not as friendly.

Whichever comes first: the load-sequence mark, a 12s dwell timer, or a sentinel element at 40% of
`document.documentElement.scrollHeight` entering the viewport. The sentinel uses
`IntersectionObserver` rather than a scroll listener so no scroll handler reads layout — the
same reason `src/hooks/useScrollDepth.js` works that way. Note that hook positions its sentinels
with `top: 25%`-style percentages against a static `body`, which resolves against the initial
containing block (the viewport), not the document; this directory computes a pixel offset
instead.

### Escalation sentinels wait for layout

*Added 2026-09-09 (Task 8), from a repro: reload the landing page, wait, and the `peek` teaser
was already up over the hero's own "Request a Sample" button at `scrollY 0`.* The sentinel
effect used to read `document.documentElement.scrollHeight` synchronously on mount — before
webfonts and the hero's own content had settled the page to its real height. A short measured
page plants its 22%-depth sentinel inside the first viewport, so it "intersects" immediately and
fires the teaser over content nobody has scrolled to yet.

Fixed by measuring one `requestAnimationFrame` past `window`'s `load` event (immediately, via rAF,
if `document.readyState` is already `'complete'`) instead of on mount. No test exercises this
effect directly (it needs a real `IntersectionObserver` + `load` timing jsdom does not model), so
this is verified by browser repro, not a unit test — see `mobileChat.test.jsx` for the sibling
greeting-bubble fix below, which does have coverage.

**Corrected 2026-09-09 (fix round 1): this alone was not sufficient.** A fresh-load repro at
360×780 still showed the `peek` teaser over the hero CTA after this landed — timing this precisely
in a real browser is inherently racy, and a second root cause is plausible (a webfont or layout
pass settling after the `load` + rAF measurement). Rather than chase the exact remaining cause, a
render-level gate now backs this fix: § Sol on a phone's `heroCleared` state withholds the teaser
*bubble* regardless of whether `stage` itself advances early. Keep this fix — it still narrows how
often the sentinel is wrong — but do not treat it as the whole story on its own.

## Analytics

Chat leads must stay separable from contact-form leads in GA4, so `LeadCard` calls
`trackChatLeadSubmitted` (event `chat_lead_submitted`, `lead_source: 'sol_chat'`) and
deliberately does **not** also fire `trackFormConversion`'s `form_submission`. Anything that
fires both would silently double-count the same lead against the form conversion tag.

| Event | Fired from |
|---|---|
| `sol_chat_open` | `ChatWidget` — with a `trigger` of `launcher`, `dwell` or `scroll-depth` |
| `sol_first_message` | `ChatPanel`, once per panel |
| `sol_lead_proposed` | `LeadCard` mount |
| `sol_lead_cancelled` | `LeadCard` dismiss |
| `chat_lead_submitted` | `LeadCard` on `ok && success` |
| `sol_tool_handoff` | `tool` frame |


## Sol on a phone

*Added 2026-08-25 from a bug report: on an iPhone 14 Pro Max the panel opened itself and took
most of the screen, and the page scrolled straight through it.*

The rule is one line: **nothing opens the panel on a phone except a tap.** `popIn` returns early
when `isMobileViewport()`, which covers the load-sequence greeting, the 12s dwell and the
scroll-depth trigger in one place rather than three.

What replaces the auto-open is a **greeting bubble** over the launcher — the same `SolNudge`
component the section prompts use, with `shimmer` set. It carries a deliberately short line
(`GREETING_BUBBLE`), because on a phone that bubble *is* the introduction. Tapping it opens the
panel; dismissing it writes `sol:nudge-dismissed` and Sol stays quiet for the session.

**Every bubble that can anchor over the hero waits for the hero to clear — not just the
greeting.** *Added 2026-09-09 (Task 8, fix round 1), from a repro: at 360×780 both the greeting
bubble AND the scroll-depth escalation teaser (`launcherEscalation.js`'s `peek` stage) could land
directly over the hero's "Request a Sample" button on a fresh load with no scrolling — the first
round only gated the greeting, and the escalation-sentinel timing fix (§ Escalation sentinels wait
for layout) turned out not to be sufficient on its own.* `ChatWidget` now holds one shared
`heroCleared` boolean, set by a single effect that checks `window.scrollY` against
`HERO_CLEAR_SCROLL_PX` (150) on mount and flips true on the first `scroll` past it, whichever
comes first. Two things read it:

- The greeting: the load-sequence timer sets `greetTimerFired` rather than showing the bubble
  directly; a small effect on `[greetTimerFired, heroCleared]` shows it only once both are true,
  whichever finishes last.
- The escalation teaser: `stage !== 'idle'` alone no longer renders `teaser` — the `teaser`
  computation now reads `stage !== 'idle' && heroCleared`, a one-line defense-in-depth on top of
  the sentinel-timing fix, not a replacement for it.

A visitor who never scrolls never sees either bubble — they are already looking at the CTA either
would have covered, so nothing is lost. `mobileChat.test.jsx`'s `scrollPastHero()` helper
simulates crossing the gate by overriding `window.scrollY` and firing a `scroll` event; each
test's `setup()` resets it to `0` first, since jsdom's `Object.defineProperty` override otherwise
leaks into later tests in the file.

One bubble slot, three possible occupants, in priority order: a contextual **section prompt**, the
mobile **greeting**, then the generic **scroll teaser**. A section prompt is about what the visitor
is reading, so it always outranks the other two.

**The picker may raise itself on a phone.** *Corrected 2026-08-26; this previously said it never
did, via a `canOpenQuiz` `isMobile` guard.* The guard was removed because the server tool still
reported `shown` to the model regardless, so Sol told a visitor to tap through a picker that had
never rendered — Stephen hit exactly that: "Sol just told me he opened the sample picker which I
don't even know what that is and I cannot see it." `@media (max-width: 767px)` now sizes the
modal for a phone, so the original reason for the guard is gone. Every other restraint holds:
once per session, never after converting, and a chip tap always wins.

### Escape closes one thing

*Added 2026-08-26 from a bug report.* `ChatWidget`'s Escape handler and both modals' handlers all
sat on `document` with no guard, so one press dismissed the modal **and** unmounted `ChatPanel` —
the whole conversation, gone, because the visitor closed a picker. `ChatWidget` now ignores
Escape while `isModalOpen()`; the reasoning and the capture-phase half of the fix are in
`engagement/CLAUDE.md § One modal at a time`.

### Following Sol's own links

**On a phone the panel closes on navigation; on desktop it does not.** Sol's quick replies link to
`/contact`, and the panel lives outside the router, so it survived the route change and sat over
the destination. Measured in WebKit at 430x740: the panel covered **81%** of the screen and
`document.elementFromPoint` on the contact form's first field returned `div.sol-transcript` — the
form was there and untappable. Desktop covers 17% and the field is reachable, so it keeps the
panel and the conversation with it.

### Sizing and scroll

Both live in `src/index.css` under `@media (max-width: 767px)`, which matches `MOBILE_QUERY` in
`src/utils/viewport.js` — **change one and you must change the other**, or JS and CSS will disagree
about what a phone is.

- The sheet is `min(58dvh, 520px)`, with a `vh` line written **first** as the fallback. On iOS
  Safari `100vh` is the URL-bar-*hidden* height, so a `vh`-sized bottom sheet is clipped until the
  bar retracts; `dvh` tracks the visible viewport.
- Scroll chaining had **two** causes. The chrome accepted the pan, so `touch-action: none` is set
  on `.sol-bar` / `.sol-meniscus` / `.sol-edge-light` — deliberately **not** on the panel root,
  which would intersect with the transcript's `pan-y` and risks breaking its scrolling on WebKit.
- The second cause is the real one: **`overscroll-behavior` is inert on a container with nothing
  to scroll.** Such a container is treated as permanently at its boundary and chains anyway.
  Chrome 144 fixed this to match the spec; Safari has not. The transcript already had
  `overscroll-contain` and it did nothing on a short conversation, which is exactly when the bug
  was reported. `.sol-transcript::after` now guarantees a 1px overflow floor.

**Known, unfixed: the iOS keyboard.** iOS resizes the *visual* viewport but not the *layout*
viewport, so a bottom-anchored composer sits behind the keyboard; `dvh` does not help, because the
keyboard is not browser UI. The real fix is positioning the sheet from `visualViewport.height` +
`offsetTop` rather than `bottom`. Not done here: it needs testing on a physical device, which this
change could not do. The cheap half is done — the composer is 16px on mobile, below which iOS
zooms the whole page on focus and compounds every other offset.

**No `viewport-fit=cover`.** Safe-area insets would need it, and it makes content extend under the
notch site-wide — a large change to fix a bottom margin that the default viewport already clears.
Under the default `viewport-fit=auto` iOS insets the layout viewport to the safe area itself, so
`bottom: 1rem` is already clear of the home indicator, in portrait and landscape. The tradeoff is
that the sheet can never be truly edge-to-edge; it is `calc(100dvh - 6rem)`, not `inset: 0`.

*On the size:* Stephen asked for the panel to be **smaller**. Measured against the live Intercom
and Crisp widgets at 430x932, both go to `position: fixed; inset: 0` — full screen — at this
width, because a conversation needs a transcript, a composer and room for the keyboard. This sits
between the two at ~90% height. The complaint was really about a panel that opened *itself*; that
is fixed separately above. `calc(100dvh - 6rem)` is the one number to change if it still reads
too large.
