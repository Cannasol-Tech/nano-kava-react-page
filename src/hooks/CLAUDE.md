# src/hooks/

Budget and the CSS-side rules: `../CLAUDE.md § The measured budget`.

## useScrollTransform quantises its progress

The hook drives the hero's fade/scale/lift from scroll position, so it runs inside a scroll-driven
`requestAnimationFrame`. It previously called `setStyle` with a freshly built object on every one
of those frames, re-rendering the hero subtree ~60 times a second while scrolling — including
after `progress` had clamped to 1 and the values had stopped changing, which is most of the page.

Progress is now quantised to 0.5% steps and an unchanged step returns without calling `setStyle`.
Contributed to scroll p95 falling from 33.0 ms to 17.6 ms and the worst frame from 133 ms to 34 ms.

- `willChange` is spread in only while `0 < q < 1`. Holding it at rest would pin a compositor
  layer on the hero forever — see `../CLAUDE.md § will-change is not a free performance hint`.
- The effect returns early under `prefers-reduced-motion`, leaving the static style, so no scroll
  listener is attached at all.

## useInView starts revealed under prerender

`window.__PRERENDER__` makes `isInView` initialise `true`, so the snapshot is fully visible rather
than frozen mid-animation. Root `CLAUDE.md § Prerendering` owns the reasoning.
