# Enjoy Nano — brand assets

Generated, **not hand-edited**. The source of truth is `scripts/brand/`; run `npm run brand`
to regenerate every file here. Editing an SVG in this directory will be overwritten.

Nothing here is wired into the app yet — these files sit alongside the existing
`cannasol-logo*.png` and `favicon.svg`, which are still what the site renders.

## The mark

A droplet with the letter **N** cut out of it. The knockout is the idea: the letter is the
*clear* part, because at ~20nm the emulsion stops scattering light. The apex is **cut
flat** rather than pointed — a cone tangent to a circle is character-for-character the
Material Symbols / Font Awesome `water_drop` path, and a stock icon carries no brand
equity. The flat cut also reads as sectioned, which suits an ingredient sold on spec.

## Files

Variants are named by **the ground they sit on**, not by a theme word: `-on-dark` is the
bright cut for dark backgrounds, `-on-light` is the darkened cut for light ones.

| File | Use |
|---|---|
| `logo-on-{dark,light}.svg` | **Primary lockup.** Mark + wordmark, horizontal. Default choice. |
| `stacked-on-{dark,light}.svg` | Centred lockup for square-ish spaces, packaging, slides. |
| `mark-on-{dark,light}.svg` | Mark alone — avatars, app chrome, anywhere the name is already present. |
| `wordmark-on-{dark,light}.svg` | Wordmark alone — when a mark would be redundant. |
| `mark-flat-on-{dark,light}.svg` | One colour, no gradient. Screen print, embroidery, foil, etch, fax. |
| `mark-flat-{white,ink}.svg` | Reversed. White for brand-coloured or mid-tone fields; ink for light fields with no colour. |
| `logo-flat-{white,ink}.svg` | The **full lockup** in one colour — what a printer or embroiderer needs. |
| `favicon.svg` · `favicon.ico` | Browser tab. SVG is transparent mid-teal; the `.ico` carries 16/32/48 for Safari and legacy Edge. |
| `favicon-square.svg` | Square transparent canvas — the source the raster favicons come from. |
| `mask-icon.svg` | Safari pinned tab. Single flat path; Safari applies its own colour. |
| `icon-square.svg` | PWA / maskable icon, 512. Art sits inside the maskable safe zone. |
| `apple-touch-icon.svg` | iOS home screen, 180. iOS applies its own corner mask. |
| `og.svg` | Social share background, 1200×630. Add headline copy over it. |
| `png/` | Raster exports for contexts that cannot take SVG. |

## Colour

| Role | On dark | On light |
|---|---|---|
| Gradient start | `#5EEAD4` | `#0D9488` |
| Gradient end | `#22D3EE` | `#0E7490` |
| Wordmark | `#FFFFFF` | `#0B1220` |

Contrast is gated, not assumed: `npm run brand:contrast` exits non-zero if any stop drops
below 3:1 on its ground, in normal vision or under simulated deuteranopia, protanopia and
tritanopia. An earlier light gradient started at `#0FB489`, measured **2.65:1** on white,
and was replaced — do not reintroduce it.

Two gradient stops and nothing else. There was a specular highlight and later a facet
plane; both were removed. The highlight read as a 2010-era gel button, and the facet
covered everything *except* the lower-right, so it darkened exactly the half the gradient
lights — 4.7% total luminance range, no modelling, and one hard seam through the N.

**Note for review:** `tailwind.config.js` defines `cannasol-green #2ECC71` and
`cannasol-teal #17A2B8`. The mark uses neither. It follows the *site's* live palette
(`src/theme/themes.js` is emerald/teal/cyan throughout), on the basis that Cannasol is the
parent and Enjoy Nano is the product brand. If the two are meant to share one palette,
that is a decision to make before this ships.

## Clear space and minimum size

- **Clear space:** the cap height of NANO's `N` on all four sides of the lockup. For the
  mark alone, one third of the mark's height. Every artboard also carries 3 units of built-in
  air, so nothing clips under `overflow: hidden` or a PDF crop.
- **Minimum size, mark:** 24px. It holds to 16px; below 20px the N reads as a notch rather
  than a letter, so prefer `favicon.svg`.
- **Minimum width, lockup:** 120px. Below that the `ENJOY` eyebrow closes up — use the mark alone.
- **Embroidery:** the knockout needs ≥2mm of stitch, so ~25mm (1") wide is the realistic
  floor. Below that, use a droplet with no N.

## Don't

- Don't put the gradient mark on a teal or mid-grey field — use `mark-flat-white.svg`.
- Don't use `mark-flat-on-dark.svg` on white; it is 1.5:1 and unreadable.
- Don't set both `width` and `height` on `mark-*.svg` — it is 64×87, not square, and will
  stretch. Use `icon-square.svg` where a square is required.
- Don't recolour, rotate, stretch, or add effects.
- Don't re-typeset the wordmark in a font. It is drawn as outlines on purpose.

## Still missing

EPS/PDF/AI for printers and embroidery digitisers, a die-cut contour path for stickers,
and a nominated Pantone — teal is a poor CMYK hue and `#22D3EE`/`#5EEAD4` are out of gamut,
so print work should use a spot colour and the flat variants.
