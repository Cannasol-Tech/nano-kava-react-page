# src/components/ — canvas scene notes

Budget and the CSS-side rules: `../CLAUDE.md § The measured budget`.
Chat widget: `chat/CLAUDE.md`.

## Sphere shells re-render at 30fps

`drawSphere` rasterises 690 arcs plus five radial gradients per pass across the three shells,
and it was the single largest JS cost in the frame — the scene ran ~3.9 ms of script per frame.

The shells are now redrawn into their offscreen canvases at most every `SHELL_RENDER_INTERVAL`
(1000/30 ms), while the composite blit, the particle physics and the float positions stay at
60fps. Rotation is driven by `t = timestamp * 0.00015`, so a 30fps shell update is not visible;
the float, which is, still moves every frame because the blit reads `spPos` each time.

Measured 3.9 → 1.1 ms of JS per frame, at more than double the frame rate.

Two invariants:

- `resize()` sets `lastShellRender = -1e9`, because a resized offscreen canvas is cleared and
  must be redrawn before the next blit. Declare it above `resize()` — `resize()` runs once
  immediately, and a `let` declared below it would throw on that first call.
- The throttle is bypassed while `assembling` is true. The load sequence crossfades dots into
  shells, and a 30fps shell against 60fps dots steps visibly.

Safari still throttles the entire loop to 30fps (and physics to 15fps); that is separate and
predates this, and `NanoScene` returns `null` on Safari anyway.

## NanoScene is always on screen

The `IntersectionObserver` on the canvas never fires. `App.jsx` renders the scene inside
`fixed inset-0 -z-10`, so the canvas intersects the viewport at every scroll position and
`visibleRef.current` is permanently `true`. It is kept as a correct guard for any future layout
that scrolls the canvas, but **do not count it as an existing optimisation** — the scene renders
for the whole time the tab is visible.

What does stop it: `utils/animationLoop.js` pauses on `visibilitychange`, and
`PREFERS_REDUCED_MOTION` renders one settled frame instead of registering the loop at all.


## Recolouring the scene

*Added 2026-08-26.* Sol can repaint the particles on request (`set_particle_color`). Two groups,
and visitors name them a dozen ways: **large** is the shell points orbiting the three spheres,
**small** is the drifting background specks and the lines between them.

**`DEFAULT_PALETTE` in `utils/particlePalette.js` is a verbatim capture of the literals this file
shipped with, taken before any recolour work.** Stephen's first instruction on the feature was to
save the defaults before touching anything, and the reason is plain: a visitor can reach every
other state through the UI, but not that one. Nothing in it is a new choice. The refactor that
introduced it was checked by computing the old literal formulas and the new palette formulas over
a grid of 1970 colour strings — zero differences at default. `src/test/particlePalette.test.js`
opens with the round trip (a colour, then back) for the same reason.

The renderer keeps its own lighting maths and takes only a base hue, a saturation base and a
lightness offset from the palette, so shading survives a recolour instead of flattening. `large`
reads deeper and `small` reads brighter — the brief was "the large balls get a darker pink, the
small glowy balls get a shiny light pink".

**Three caches hold colour, and a recolour must drop all three:**

| Cache | Reset by |
|---|---|
| The three offscreen sphere canvases | `lastShellRender = -1e9` |
| The background particle sprite | `particleSpriteValid = false` |
| The Safari shell sprite atlas | rebuilding it — see § Safari draws the shells through a sprite atlas |

Miss the atlas and Safari keeps painting the old colour with no other symptom. The subscription in
the effect does all three together for exactly that reason; do not split them up.

**Resolution is server-side** — the browser applies numbers it is handed and never decides what a
colour word means. `functions/lib/CLAUDE.md § Colour resolution is server-side` has the why.
`functions/lib/particlePalette.js` holds a `default` entry identical to the client's, and the test
above fails if the two drift, which is what makes that one duplicated object safe.

## Lab mode

Triple-clicking the nav logo (`KavaLandingPage.jsx`) arms a timed easter egg — idea #12 in
`IMPROVEMENT_IDEAS.md`. `utils/labMode.js` owns it; `LabModeHud.jsx` draws the readout and
`NanoScene` grows its particle pool while it runs.

Three things are deliberate:

- **`event.detail === 3`, not a click-counting timer.** The browser already counts clicks in a
  multi-click sequence and exposes it on the event. A hand-rolled timer would be more code and
  would disagree with the platform's own double/triple-click threshold.
- **The spike is 40 particles, not 400.** The connection pass is O(N²): 55 → 95 already trebles
  the comparison count. Six seconds at 95 is affordable; the same effect at 300 is the lag the
  whole `../CLAUDE.md § The measured budget` work was undoing. Do not raise it without measuring.
- **Re-triggering extends rather than restarts.** `startLabMode()` announces `true` only on a
  cold start, so clicking again mid-run does not restart the HUD's entrance animation.

**The rainbow tint is uneven, and that is pre-existing.** `hueShift` reaches only the mid-depth
flat-filled points: front-facing points call `paintShellPoint` with `0`, and Safari's atlas path
ignores it entirely. *Noted 2026-08-26 while threading the palette through the same functions —
the recolour work deliberately preserved this rather than quietly fixing an easter egg it was not
asked to touch.* Passing `hueShift` through both paths is a one-line change if it is ever wanted.

The extras are ordinary `createParticle` objects pushed onto the same pool, so every physics and
draw loop picks them up with no branch in the hot path; ending the run truncates the array back.
NanoScene is absent on Safari, so there the HUD appears without the particle spike — which is
the correct degradation, not a bug.

## The savings calculator is retired

*Added 2026-09-09.* `SavingsCalculator.jsx` and its test are deleted, and `KavaLandingPage.jsx`'s
`#calculator` section is now `#dosing` — "Dosing & cost per serving". Spec ruling A7
(`docs/design-specs/COPY_UPDATE_BUILD_SPEC.md`): rebuilt on the ingredient brief's real figures,
the ingredient-cost saving goes **negative** at plausible inputs — break-even needs conventional
extract at roughly $500–625/kg at 30% kavalactones, and typical is well below that. Raise it with
Josh before anyone rebuilds it; do not ship a calculator that argues against the product.

What replaced it renders `dosing`, `pricing` and `dropInProcess` from `src/content/product.js` and
types no number of its own. **The row emphasis is keyed off the copy**: a `dosing.rows` entry whose
`kavalactone` string contains "recommended" gets the accent bar, so rewording those rows in
`product.js` silently drops it.

**Resolved 2026-09-09.** This section previously said the lab-mode HUD still settled on ~18nm.
`LabModeHud.jsx` `TARGET_NM` is now `20` and `src/test/labModeHud.test.jsx` asserts
`18 < nm < 22` (loose bounds around the settled value, same ±2 margin the old assertion used).

## Dosing panel legibility

*Added 2026-09-09.* Stephen's screenshot review flagged the dosing table rows and the `$250`
pricing card as too transparent over the fixed NanoScene canvas, and the pricing card's tier
sentence as "nearly unreadable". Both panels sat on tokens built for lighter use — the table
container used `bgCardSolid` (80–90% opaque) and the pricing card used `bgHighlightBorder`
(a 10%-opacity emerald tint meant for small badges layered on an *already-opaque* card, not for a
standalone panel over moving canvas content).

Fix: a new `bgCardOpaque` token in `theme/themes.js` (dark `slate-900/95` → `slate-950/95`, light
`white/95`), applied to both panels. The pricing card's tier sentence also moved off the shared
`textSecondary` token (`slate-400`/`slate-600`) to the stronger `isDark ? 'text-slate-200' :
'text-slate-700'` pair already used inline for the hero subhead — same pattern, not a new token.
The two "recommended" dosing rows keep their existing `bgHighlight` emerald tint; layered over the
now near-opaque container it reads as a clear highlight instead of near-invisible.

**Corrected 2026-09-09: that inline pair is now the `textIntro` token** (Task 8's mobile pass —
see § Section intro legibility below), because the same "stronger than textSecondary" need showed
up in half a dozen more places. The pricing card and the "How it goes into your batch" card
(previously `bgCardAlt`, now also `bgCardOpaque` to match) both read off `theme.textIntro`.

## Dosing table on mobile

*Added 2026-09-09 (Task 8).* At 390px the four-column table scrolled horizontally and hid the
one column a buyer actually wants — cost per serving. Below `sm` (640px) `KavaLandingPage.jsx`
now renders `dosing.rows` as stacked cards instead: kavalactone label and cost right-aligned bold
on one line, emulsion + servings/L as a quiet second line, same accent bar the table uses for
"recommended" rows. The table itself is unchanged and still renders from `sm` up
(`hidden sm:block` / `sm:hidden`) — both are in the DOM at once, so `src/test/ThemeAndRouting.test.jsx`
asserts `costPerServing` with `getAllByText`, not `getByText`.

## Particle-size vessel comparison

*Added 2026-09-09 (fix round 1, Task 8).* Stephen's screenshot review: three grey circles of
uneven size, a dotted green line, then two captions — "doesn't look great," fix or remove; the
brief carries this diagram, so it stays, redesigned. The old version showed size only, and
abstractly. The new one is two vessel cross-sections (`viewBox 0 0 100 150` inline SVG, no new
dependency, no animation): **left**, "Conventional kava emulsion" — a hazy fill, five large grey
droplets settled in the bottom third, one stroke-only ring near the top standing in for the
floating film a hazy emulsion leaves at the surface; **right**, "Nano Kava" — no fill, just the
vessel outline, 36 tiny emerald dots scattered evenly through the whole height. Haze *and*
settling *and* clarity *and* suspension, in one glance, rather than a number.

**The nano vessel's scatter is a seeded hash, not `Math.random()`.** `scatterPoints()` in
`KavaLandingPage.jsx` takes a fixed seed, so the 36 points are identical on every render and every
screenshot — a decorative visual that reshuffled itself on each reload would read as a bug during
review, not as texture.

**Both size strings are sourced, never retyped.** `particleSizeNano` reads `specComparison`'s
`Mean particle size` row's `nano` cell (`~20 nm`) directly; `particleSizeTraditional` splits the
`traditional` cell (`'200–1,000 nm — settles, hazes'`) on `' — '` and keeps only the value half —
the short captions ("settles, hazes" / "stays clear, stays suspended") are local presentational
strings, not spec-table content, so they are not sourced the same way.

**The light-theme haze is grey-blue, not white.** A white haze on the light theme's near-white
`bgCardOpaque` card would vanish; `vesselHaze` uses `rgba(100, 116, 139, 0.16)` (a muted slate)
in both themes rather than a literal white/grey pair, so it never depends on which theme's card
tint it happens to sit on. `vesselStroke` and `settledDroplet` likewise stay theme-aware muted
slate tones — the card moved to `bgCardOpaque` (from `bgCardAlt`) for the same reason the dosing
panel did, see § Dosing panel legibility.

## Section intro legibility

*Added 2026-09-09 (Task 8).* A section intro sitting bare on the page background — no card, no
`bgSecondary` wash — goes unreadable wherever the fixed NanoScene canvas puts a lit sphere behind
it, in both themes. Fixed once, not per-section: a `textIntro` token (`slate-200` dark /
`slate-700` light — the same pair the hero subhead and pricing tier already used inline) raises
the text itself, and a `bgScrim` token (`slate-950/45` dark / `white/55` light — flat, no
`backdrop-filter`, per the paint budget) backs the ones with nothing else behind them: the specs,
process and dosing section intros. Sections already inside a card (`bgCard`, the Features intro)
or behind a `bgSecondary` wash (Partnership) only picked up `textIntro`, not the scrim — a second
translucent layer there would have been decoration, not legibility.

## The nano explainer

`NanoExplainer.jsx` is the visual Sol raises when someone asks how small ~20nm is (~18nm before
the 2026-09-09 ingredient-brief update). Sol calls the
`show_nano_explainer` tool, `functions/lib/chat.js` emits a `nano_explainer` frame, `useChatStream`
forwards it to `onExplain`, and `ChatPanel` calls `openExplainer()`. It renders from `App.jsx`
rather than inside the widget so it can overlay the page instead of the chat panel — the two are
joined by `utils/explainer.js` rather than by props threaded through `App`.

**The reveal is one timer.** `--nano-in` on `.nano-explainer-root` drives the scrim, the rise, the
tint, the blur and the shadow. They share a duration and an easing and start together, which is
what makes it read as a screen arriving rather than four effects that happen to overlap. Change
the number once and the whole thing moves.

**The shell is near-opaque, and it must never be invisible.** *Corrected 2026-08-26; the surface
was a 45% translucent wash "per the brief".* Stephen, on the sample picker that shares this shell:
"I can't even really see the sample options in the tool here." Over the canvas scene a 45% panel
reads as dimmed-out furniture rather than a dialog, so the surface is now 96%, the scrim 74%, and
the option rows carry their own border and white text instead of inheriting the shell's colour.
The blur and saturate in the rise keyframe still carry the glass. Two related fixes landed with it:

- `html.animations-paused` is **exempted for `.nano-modal-root`**. The entrance starts at
  `opacity: 0`, so pausing it mid-flight left a dialog holding focus and swallowing Escape while
  painting nothing — a tool firing while the tab was hidden did exactly that. The pause is a
  battery optimisation; it does not get to hide a dialog.
- The root scrolls (`overflow-y: auto`, `align-content: safe center`) and `.nano-modal` has real
  rules under `@media (max-width: 767px)`. A comment in `chat/engagement/sampleQuiz.js` had
  claimed those phone rules existed for weeks before they did.
- `will-change` is gone from `.nano-modal`, its `::before`, the scrim and the quiz option rows.
  All four are entrance-only animations, which per `../CLAUDE.md § will-change is not a free
  performance hint` declare it nowhere — they were pinning layers for the whole life of the modal.

Two constraints shape how it is built:

- **`transform` and `backdrop-filter` sit on the same element.** Splitting the rise onto a wrapper
  would make that wrapper a backdrop root and the blur beneath it would sample nothing — the trap
  documented in `chat/panel/CLAUDE.md § Backdrop blur needs the compositor hint released`. Verified in
  Chrome: the settled panel computes `blur(18px) saturate(1.4)`.
- **The shadow rides `::before`, and only its opacity animates.** An animated `box-shadow`
  repaints every frame (`PERFORMANCE_OPTIMIZATIONS.md` §12). A static shadow on a pseudo-element
  whose opacity animates composites, and lands on the same timeline.

The content is placeholder-grade by agreement — Stephen, 2026-08-25: *"just go ahead and build
that screen for me and then we will decide what to put on it later."* The scale rows are
log-scaled because at linear scale 20nm against an 80,000nm hair is an invisible sliver. It is
product-neutral (`Cannasol droplet`, not `Nano Kava droplet`) because the same modal is raised
from the mushrooms page.

**Whatever replaces the content keeps the sample CTA.** The modal exists to convert attention into
a sample request; a version that only educates has lost the plot.

### The nano explainer's single stat

*Added 2026-09-09 (Task 8).* `STATS` held one entry once the retired savings calculator's figures
left it (§ The savings calculator is retired), and the old `.nano-modal__stats` — a `flex` row of
equal-width cells — stretched that one entry into a lonely full-width strip. `NanoExplainer.jsx`
now renders a single `HEADLINE_STAT` as one centered pill (`inline-flex`, rounded-full, its own
emerald border) instead of mapping an array; `index.css`'s `.nano-modal__stat` sizes to its
content rather than `flex: 1`. Bring back a second stat by reverting to the array + `.map`, not by
re-widening this rule — a two-item row wants the flex layout back.

The fill is still `rgba(148, 163, 184, 0.055)` — Stephen, 2026-08-26, asked for this tile more
transparent so it reads as sitting on the modal's glass, not in a box; the pill reshape kept that
fill and only added the rounded-full border.


## Load sequence

*Added 2026-08-25.* First paint runs one choreographed sequence: the NanoScene shells fly in
from offscreen and coalesce (#2), the settled primary sphere emits a single ultrasonic ripple
(#3), then Sol rises into place and opens with his greeting. `src/utils/loadSequence.js` owns
the marks; `SEQUENCE` there is the SSoT for every timing.

| Mark | ms | Owner |
|---|---|---|
| assemble | 0 → 1500 | `NanoScene.drawAssembling` |
| crossfade to real spheres | 1080 → 1500 | `NanoScene`, `crossfadeFrom` |
| ultrasonic ripple | 1280 → 3180 | `LoadPulse` |
| Sol arrives | 2150 → 3300 | `.sol-launcher--arriving` |
| Sol greets | 3800 | `ChatWidget` `popIn('load-sequence')` |

Three decisions hold this together and are easy to undo by accident:

- **One clock, no signalling.** Consumers read marks off `loadSequence` rather than notifying
  each other, so no stage transition re-renders the page tree. `LoadPulse` and `ChatWidget`
  each own a local timer; `NanoScene` reads the clock inside the RAF callback it already has.
  Lifting stage state into `AppContent` would re-render `AppRoutes` three times during load.
- **The assemble phase is cheaper than the settled page, not more expensive.** It draws flat
  dots and calls `createRadialGradient` zero times, and it skips the O(N²) connection-line
  passes entirely. The expensive offscreen sphere render does not start until the crossfade at
  72%. This matters because the sequence runs during load, against LCP.
- **Hero content is deliberately untouched.** The sequence is background and chrome only; the
  headline and CTA still paint on React's first commit.

`isSequenceEnabled()` gates the whole thing off for `prefers-reduced-motion` and for
`window.__PRERENDER__`, so the snapshot ships settled — see § Prerendering. NanoScene does not
render at all on Safari (`src/App.jsx` gates on Chrome), so there the ripple and Sol's arrival
play without the assemble that motivates them.


## Safari draws the shells through a sprite atlas

*Added 2026-08-26. NanoScene was switched off entirely on Safari for a long time; it is on now,
at 59fps, and the reason it was slow was never really "Safari is slow".*

A front-facing shell point costs up to **three `createRadialGradient` calls** — body, specular,
rim — and there are ~345 of them across the three shells every pass. WebKit's
`createRadialGradient` is 2-3x slower than Blink's, so that is ~1000 gradient objects a frame at
a 2-3x penalty. The existing 30fps/15fps Safari throttles did not come close to covering it.

`buildShellAtlas` bakes those points into a 16x4 sprite sheet once per theme, and each point
becomes a single `drawImage`. Measured in WebKit at iPhone size, median frame time at idle:

| | |
|---|---|
| shells painted live | 77ms (13fps) |
| shells via atlas | **17ms (59fps)** |

`paintShellPoint` is deliberately shared: it both paints live (Chrome) and bakes the atlas
(Safari), so the two renderings cannot drift apart. Verified side by side at 900x800 — the
atlas render is indistinguishable from the live one.

Buckets are the **signed** light dot, not `lit`, because the rim term reads `|dot|` and two
points with `lit === 0` can look very different. The second light's `fill` is baked at its mid
value; it moves hue by at most 2 and lightness by 3, invisible at these sizes.

**Chrome still paints live.** The atlas is gated on `IS_SAFARI` only, because the brief was to
leave the web exactly as it was. Chrome desktop measured 33.2ms before and 33.7ms after — noise.
If that constraint ever lifts, Chrome is a candidate: its 30fps shell throttle is what puts it at
33ms, and the atlas would likely remove the need for the throttle at all.
