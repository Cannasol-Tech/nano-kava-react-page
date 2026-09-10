# src/ — styling and animation performance

Nested notes: `components/CLAUDE.md` (canvas scene), `hooks/CLAUDE.md` (scroll hooks),
`components/chat/CLAUDE.md` (Sol widget), `content/CLAUDE.md` (site facts).

## The measured budget

Chrome 1440×900, dev server, medians over 12s windows, 2026-08-25. Investigated because the
page felt heavier the longer it stayed open.

| | before | after |
|---|---|---|
| idle frame rate | 24 fps | 61 fps |
| JS per frame | 3.9 ms | 1.1 ms |
| scroll p95 frame | 33.0 ms | 17.6 ms |
| scroll worst frame | 133 ms | 34 ms |
| scroll frames > 32ms (per 400) | 24 | 3 |
| elements holding `will-change` | 54 | 13 |
| compositor layers | 92 | 68 |

**There is no memory leak.** Heap after forced GC held at 12–13 MB across a 3-minute soak and
8 full route cycles; DOM nodes (827) and JS listeners (212) did not move by one. **Animations do
not run while the tab is hidden.** `animationLoop.js` cancels RAF on `visibilitychange` and
sets `html.animations-paused`, which pauses CSS animations (`animation-play-state`). A page
that loads already hidden starts paused rather than spinning until the first visibility event.
The "gets worse over time" symptom was sustained load heating the machine, not growth.

## Hero gradient heading repaint cost

`.animate-gradient-slow` animates `background-position` under `background-clip: text`. That is
not composited: every frame re-rasterises the gradient and the glyph mask, and the invalidation
spread to the `blur-3xl` radial glow layered behind the heading — repainting a large blur at
60fps. This single element capped the whole page at 24 fps; cancelling it alone restored 64 fps.

Fixed by narrowing `background-size` from `400%` to `200%` and giving the heading its own layer
with `translateZ(0)` so its repaint cannot invalidate the glow. Measured 24 → 60 fps.

The heading's `filter: drop-shadow(...)` must not sit on the `.animate-gradient-slow` span —
that re-rasterises an 80px shadow on every gradient frame and recaps the page. It lives on a
static glyph replica behind the fill (`[data-hero-shadow]`). Do not put the filter back on the
animating span.

**Do not widen `background-size` here again, and do not add an animated `background-position`,
`box-shadow`, or `filter` anywhere.** A `box-shadow` twin of this bug lived in
`tailwind.config.js` as the `glow` keyframe, which collided with the composited `.animate-glow`
in `index.css`; the Tailwind keyframe was deleted and the opacity-driven `::after` is now the
only glow.

## will-change is not a free performance hint

A `will-change` declaration pins a compositor layer for as long as it applies. It previously sat
permanently on `.scroll-hidden`, `.scroll-visible`, `.animate-fade-in-up`,
`.animate-fade-in-up-hero`, `.interactive-btn`, `.interactive-card` and both `.btn-shine`
pseudo-elements — 54 elements, most of whose animations had *finished*, holding layers forever.

The rule now: **hold it only while an animation is pending or running.**

- Pending — `.scroll-hidden` keeps it (it is about to transition); `.scroll-visible` does not.
- Hover-driven — declared on `:hover` / `:focus-visible` / `:active`, never on the base class.
- Entrance — declared nowhere. Chrome promotes an element with a running composited animation on
  its own; the hint only adds a layer that outlives the animation.
- Genuinely perpetual — `.animate-float`, `.animate-glow::after` and the decorative orbs keep it,
  because they never stop.

`components/chat/panel/CLAUDE.md § Backdrop blur needs the compositor hint released` documents the
other direction of the same trap: a held hint isolates a layer and silently breaks
`backdrop-filter` beneath it.

## btn-shine is transition-driven (2026-09-09)

`.btn-shine` (`index.css`, used on 19 buttons across every page) used to be an `:hover`-triggered
keyframe animation with `animation-fill-mode: forwards`, which restarted from 0% on every pointer
entry — a hard flash, and if the pointer flickered near an edge it could re-trigger mid-sweep.
It is now a plain `transform`/`opacity` transition: the sweep sits off-canvas at rest and glides
to a resting position on `:hover`, so entering and leaving are both continuous and interruptible
at any point. A future hover effect added alongside `.btn-shine` should follow the same
transition-driven pattern, not `animation: ... forwards`. This also fixed a dead box-shadow
collision: `.hover-glow-intense` (hero CTA only) and `.btn-shine:hover` both set `box-shadow` at
equal specificity, so only one ever won in source order — `.hover-glow-intense` was deleted.


## Safari gets less motion

*Rewritten 2026-08-26. This section previously said Safari lost the whole load sequence and the
canvas. It does not any more. What is left here is the short list of things Safari still does
without; for the canvas itself see components/CLAUDE.md § Safari draws the shells through a sprite atlas.*

`utils/browser.js` is the single Safari sniff (it replaced identical copies in `NanoScene.jsx`
and `ChatPanel.jsx`) and stamps `html[data-safari]` before first paint so stylesheets can gate on
it without a second check.

**Safari now runs the canvas, the shells and the full entrance choreography at 59fps.** Measured
over the 4.5s load window at iPhone size: 117ms/frame (9fps, 30 of 31 frames dropped) before this
work, 17ms/frame (59fps, 3 of 195) after — with *more* animation running than before.

Three things Safari still does without, each for a measured reason:

- **The hero's gradient shimmer.** Animating `background-position` under `background-clip: text`
  repaints the glyph mask every frame on WebKit, and that alone cost 103ms/frame — the site ran
  at 10fps because of this one animation, with the canvas already off. The gradient stays; only
  its movement goes. Two subtler fixes were tried and both stayed at 9fps: promoting the
  `blur-3xl` glow with `translateZ(0)`, and quantising with `steps(20)`. WebKit repaints the mask
  on every frame an animation is *active*, whether or not the value changed. Do not retry them.
- **Every `backdrop-filter` on the page.** Safari's backdrop behind those 16 elements is a flat
  colour, so the blur is a visual no-op that still buys a compositing pass over a `position: fixed`
  layer — this repo's worst measured offender, and the likely cause of a reported bug where page
  sections intermittently failed to paint mid-scroll on iOS.
- **The launcher's attention wiggle**, the one attention device that repaints per frame on WebKit.

**Sol still greets, and every nudge still works.** `shouldGreet()` is deliberately separate from
`isSequenceEnabled()`: being greeted is content, not decoration, and only the prerenderer opts out.
