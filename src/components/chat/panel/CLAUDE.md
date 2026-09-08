# src/components/chat/panel/ — the conversation surface

`ChatPanel.jsx` (header / transcript / composer), `EmojiPicker.jsx`, and `secretPhrases.js`.
Owns everything the visitor looks at while talking to Sol. The lead card is next door in
`../lead/`, the SSE transport in `../transport/`, and the attention devices in `../engagement/`.

## The panel is a vial

*Added 2026-08-25, replacing a uniformly translucent card.* Cannasol's product claim is that the
emulsion stays **crystal clear** where competitors go cloudy and ring the bottle. The panel argues
that claim rather than borrowing a frosted-glass trend: **opaque bar / liquid middle / opaque bar**.
The transcript is the only translucent surface in the widget — the contrast against the solid bars
is the composition, and softening the bars destroys it.

Surface tokens (`src/index.css`, `/* ── Sol chat widget ── */`, all keyed off
`.sol-panel[data-theme='dark'|'light']`):

| Surface | Dark | Light |
|---|---|---|
| Header / footer `.sol-bar` | `#020617` | `#ffffff` |
| Transcript `--blur`, settled | `rgba(15,23,42,0.34)` + `blur(28px) saturate(140%)` | `rgba(226,232,240,0.46)`, same filter |
| Transcript `--blur`, opening | `rgba(11,18,34,0.97)`, `blur(0px)` | `rgba(233,238,245,0.97)`, `blur(0px)` |
| Transcript `--solid` (Safari) | `linear-gradient(180deg, .97, .99)` | same, slate-tinted |
| Model bubble, chips, notes, lead card | 0.72–0.94 | opaque white |

Three of those need their reason recorded:

- **Bars are alpha 1.0, not 0.96.** Stephen, 2026-08-25, with a screenshot: page text from the
  spec-comparison table was readable straight through the header, colliding with "Sol · online".
  His rule verbatim: *"The top bar is too transparent — this should be solid white. The background
  of the chat area is the only thing that should be semi transparent."* No `backdrop-filter` on the
  bars either — an opaque surface has nothing to blur and the filter only costs a compositing pass.
- **Bubbles carry their own opacity.** Transparency belongs to the *empty* space. Body text never
  sits on the 0.34 surface; it sits on `.sol-bubble--model` / `.sol-lead`, which are dense enough
  to read against the hero's bright particle sphere.
- **The light transcript is slate-tinted, not white.** At `rgba(255,255,255,0.45)` a white bubble
  had almost no separation from the surface behind it. The cool tint makes white message surfaces
  read as objects floating on the liquid.

`saturate(140%)` is load-bearing, not decoration: without it the emerald particle field behind the
panel blurs to grey instead of glowing through.

### The meniscus

The one deliberately expressive element: a 1px horizontal gradient hairline at the header /
transcript boundary (`.sol-meniscus`), emerald → transparent at the edges and brightest at the
centre, with a 14px wash spilling down into the liquid — the surface of a liquid in a vial. It
**replaces** the header's `border-b` rather than sitting next to it; a generic divider plus a
meniscus reads as two lines. Its only animation is a 7s opacity breath between 0.82 and 1, which is
below the threshold of noticing on a static page and composites for free.

## Why the blur is browser-gated

`backdrop-filter: blur()` on a `position: fixed` element is the single worst performance offender
measured on this site: removing all 22 instances cut Safari frame time from ~137ms to ~26ms, a 53%
reduction (`SAFARI_PERFORMANCE.md`, "After Fix 1"). Safari's WebKit does not batch backdrop-filter
compositing passes the way Blink does, and `NanoScene` repaints behind everything, so each blurred
layer re-samples an animating source every frame.

So the blur is kept where it is affordable and dropped where it is not. `ChatPanel.jsx` sniffs
Safari with the same expression `NanoScene.jsx` uses — `/^((?!chrome|android).)*safari/i` — and
picks `.sol-transcript--blur` or `.sol-transcript--solid`. Never move the blur into a Tailwind
`backdrop-blur-*` utility; that would apply it unconditionally.

**The solid variant is near-opaque (0.97→0.99), not 0.90.** Measured 2026-08-25 against the hero:
at 0.90 and again at 0.94, bright hero copy ghosted through as *readable words* — with no blur to
destroy the high-frequency detail, even 6% of a white pixel over near-black is legible. It is a
gradient rather than a flat colour so the surface still reads as liquid rather than as a grey box.

## The liquid surface fades in, it does not snap

*Added 2026-08-25, at Stephen's request: "right now it is just going from fully opaque → final
destination. Make it a fade effect after Sol settles from his entrance animation."*

The cause is the section below: during the entrance the shell's `will-change` isolates the
backdrop, so the blur is **inert**, and releasing the hint at `--settled` switched it on in a
single frame. The fix keys the surface off the shell state rather than transitioning something
that was never animating:

- `.sol-panel[data-theme] .sol-transcript--blur` — the **opening** state: near-opaque,
  `blur(0px) saturate(100%)`. It is written as `blur(0px)`, never `none`, because `none` does
  not interpolate and the transition would jump.
- `.sol-panel-shell--settled …` / `.sol-panel-shell--closing …` — the liquid state, reached
  over a 560ms `background-color` + `backdrop-filter` transition.

`--closing` is on the liquid side on purpose: keyed on `--settled` alone, closing the panel
drops it back to the opening state and the surface flashes opaque as it leaves.

The Safari `--solid` variant is deliberately excluded. It has no blur to fade and is
near-opaque by design (see below), so there is nothing to reveal, and its `linear-gradient`
background would not interpolate anyway.

## Backdrop blur needs the compositor hint released

`will-change: transform` promotes `.sol-panel-shell` to its own compositing layer, and that layer
**isolates the backdrop** — `backdrop-filter` on the transcript then samples nothing and blurs
nothing. The entrance animation needs the hint; the settled panel must not have it. `ChatWidget`
adds `.sol-panel-shell--settled` (`will-change: auto; animation: none`) from `onAnimationEnd`.

The same isolation is caused by `transform`, `filter`, or `opacity < 1` on **any** ancestor of the
blurred element, so none of those may be introduced on the shell, the panel, or the fixed wrapper.
Verified in the browser after every change to this directory: walk `.sol-transcript`'s ancestors
and assert none of the four properties is set.

## The secret phrase

Idea #11. Typing exactly `bula` or `18nm` turns the NanoScene shells rainbow for 5s
(`utils/nanoRainbow.js` — one hue addition per point, and exactly zero when it is off) and makes
Sol wink once.

**Matching is exact on the trimmed entry, never a substring.** "can you hold 18nm through
hot-fill?" is a real question from a real formulator and must reach the model. The egg is
intercepted before the request is made, so it costs no tokens and Sol never answers "bula"
earnestly.
