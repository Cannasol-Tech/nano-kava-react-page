/**
 * @file: scripts/brand/build.mjs
 * @author: Stephen Boyett
 *
 * @description:
 *     Generates the whole Enjoy Nano brand asset set into public/brand — mark, wordmark,
 *     horizontal and stacked lockups, one-colour and reversed marks, favicon, app icons
 *     and the Open Graph background, in light and dark. Geometry is computed, not drawn,
 *     and asserted, so the mark and the logotype stay in one system.
 *
 * @See Also:
 *     scripts/brand/glyphs.mjs
 *     scripts/brand/palette.mjs
 *     public/brand/README.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { wordSvg, OVERSHOOT } from './glyphs.mjs';
import { PALETTE } from './palette.mjs';

const DEST = process.argv[2];
if (!DEST) throw new Error('usage: node build.mjs <output-dir>');
mkdirSync(DEST, { recursive: true });
export { PALETTE };

const F = (n) => +n.toFixed(3);

// ── the mark ────────────────────────────────────────────────────────────────────
// Droplet: flanks tangent to the base circle, apex cut flat. The cut is deliberate —
// a cone tangent to a circle is character-for-character the Material Symbols
// `water_drop` path, and a stock icon carries no brand equity. It is kept to 17% of the
// body width; at 27% the silhouette stopped reading as a droplet and became a shield.
const CX = 48, CY = 63, R = 30, D = 56, APEX_CUT = 5;

// N geometry is solved, not chosen. Two constraints bind, and the first shipped
// values broke both: the corners must clear the base circle, and the diagonal's
// VERTICAL thickness must stay under half the cap height or the counters pinch shut
// at mid-height and the letter is severed. See the header comment on fitN.
const N_HALF_W = 16.6, N_H = 38, N_STEM = 9.5, N_CY = 62;

/**
 * Vertical thickness of a diagonal whose PERPENDICULAR thickness is `s`, solved in closed
 * form: T*cos(atan((h-T)/run)) = s rearranges to T²(run²-s²) + 2s²hT - s²(h²+run²) = 0.
 * Iterating the fixed point instead diverges whenever run <= s, and silently returns a
 * plausible-looking wrong number — which is how the first N shipped with severed counters.
 */
function solveDiagonal(run, h, s) {
  const a = run * run - s * s;
  if (a <= 0) throw new Error(`diagonal cannot fit: run ${run.toFixed(2)} <= stem ${s}`);
  const b = 2 * s * s * h, c = -s * s * (h * h + run * run);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

/**
 * N fitted to the droplet. `stem` is the perpendicular thickness of every stroke, so the
 * diagonal is solved rather than inset horizontally (a horizontal inset draws a diagonal
 * thinner than the stems by cos of its angle).
 */
/** Half-width of the droplet at height y — the straight flank above the tangent point,
 *  the base circle below it. Used to check the N's corners against the real outline
 *  rather than against the circle alone. */
function dropHalfWidth(y) {
  const k = R / D, tx = R * Math.sqrt(1 - k * k), ty = CY - R * k;
  const apexY = CY - D, py = apexY + (ty - apexY) * (APEX_CUT / tx);
  if (y < py || y > CY + R) return 0;
  if (y >= ty) return Math.sqrt(Math.max(0, R * R - (y - CY) ** 2));
  return APEX_CUT + (tx - APEX_CUT) * ((y - py) / (ty - py));
}

function fitN(cy, halfW, h, stem) {
  const xa = F(CX - halfW), xd = F(CX + halfW);
  const xb = F(xa + stem), xc = F(xd - stem);
  const T = solveDiagonal(xc - xb, h, stem);

  const gap = h - 2 * T;
  if (gap <= 2) throw new Error(`N counters pinch shut: h-2T = ${gap.toFixed(2)}, need > 2`);
  for (const y of [cy - h / 2, cy + h / 2]) {
    const clear = dropHalfWidth(y) - halfW;
    if (clear < 5) throw new Error(`N corner at y=${y} clears the droplet by only ${clear.toFixed(2)}u`);
  }

  const yt = F(cy - h / 2), yb = F(cy + h / 2);
  return { xa, xb, xc, xd, yt, yb, dy1: F(yb - T), dy2: F(yt + T) };
}
const N = fitN(N_CY, N_HALF_W, N_H, N_STEM);

/** Droplet path. `cut` is the half-width of the flat apex; 0 gives the stock point. */
function drop(cx, cy, r, d, cut = 0) {
  const k = r / d, s = Math.sqrt(1 - k * k);
  const tx = r * s, ty = cy - r * k, apexY = cy - d;
  if (!cut) {
    return `M${cx} ${F(apexY)} L${F(cx + tx)} ${F(ty)} A${r} ${r} 0 1 1 ${F(cx - tx)} ${F(ty)} Z`;
  }
  const t = cut / tx, py = apexY + (ty - apexY) * t;
  return `M${F(cx - cut)} ${F(py)} H${F(cx + cut)} L${F(cx + tx)} ${F(ty)} `
       + `A${r} ${r} 0 1 1 ${F(cx - tx)} ${F(ty)} Z`;
}
const nSub = ({ xa, xb, xc, xd, yt, yb, dy1, dy2 }) =>
  `M${xa} ${yt} H${xb} L${xc} ${dy1} V${yt} H${xd} V${yb} H${xc} L${xb} ${dy2} V${yb} H${xa} Z`;

const SHAPE = `${drop(CX, CY, R, D, APEX_CUT)} ${nSub(N)}`;

// Ink box, computed rather than hand-copied, plus 2u of air.
const APEX_Y = (() => { const k = R / D, tx = R * Math.sqrt(1 - k * k), ty = CY - R * k;
  return (CY - D) + (ty - (CY - D)) * (APEX_CUT / tx); })();
const MARK_W = F(2 * R + 4), MARK_H = F((CY + R) - APEX_Y + 4);
const INK_X = F(CX - R - 2), INK_Y = F(APEX_Y - 2);
const INK_BOX = `${INK_X} ${INK_Y} ${MARK_W} ${MARK_H}`;

// Two gradient stops, nothing else. A facet plane sat here and was removed: it covered
// everything except the lower-right, so it darkened exactly the half the gradient lights
// and left the shadow half alone — total luminance range 4.7%, no modelling, and one hard
// seam straight through the N.
function markBody(p, uid) {
  return `<defs>
    <linearGradient id="${uid}-g" x1=".1" y1="0" x2=".9" y2="1">
      <stop offset="0" stop-color="${p.c1}"/><stop offset="1" stop-color="${p.c2}"/>
    </linearGradient>
  </defs>
  <path fill-rule="evenodd" fill="url(#${uid}-g)" d="${SHAPE}"/>`;
}
const markFlat = (fill) => `<path fill-rule="evenodd" fill="${fill}" d="${SHAPE}"/>`;

/** The mark, scaled to `h` and placed at (x, y), as a <g> — nested <svg> + overflow is
 *  the least portable construct in SVG (Illustrator drops its positioning, Figma
 *  flattens it), so everything composes with transforms instead. */
function markAt(p, uid, x, y, h, flatFill) {
  const k = h / MARK_H;
  return `<g transform="translate(${F(x - INK_X * k)} ${F(y - INK_Y * k)}) scale(${F(k)})">`
       + `${flatFill ? markFlat(flatFill) : markBody(p, uid)}</g>`;
}

// ── the logotype ────────────────────────────────────────────────────────────────
const TYPE = { s: 15, track: 10, eCap: 27, eS: 16.5, eTrack: 150, gap: 20 };

function logotype(fill, align = 'left') {
  const nano = wordSvg('NANO', { s: TYPE.s, track: TYPE.track, fill });
  const enjoy = wordSvg('ENJOY', { s: TYPE.eS, track: TYPE.eTrack, fill });
  const k = TYPE.eCap / 100;
  const w = F(Math.max(nano.width, enjoy.width * k));
  const off = (iw) => (align === 'center' ? (w - iw) / 2 : 0);
  return {
    w,
    h: TYPE.eCap + TYPE.gap + 100,
    top: -OVERSHOOT,                       // the A's apex and the O's top sit above cap
    bot: 100 + OVERSHOOT,                  // ...and the O's and J's bottoms below baseline
    baseline: TYPE.eCap + TYPE.gap + 100,
    svg: `<g transform="translate(${F(off(enjoy.width * k))} 0) scale(${F(k)})">${enjoy.svg}</g>`
       + `<g transform="translate(${F(off(nano.width))} ${TYPE.eCap + TYPE.gap})">${nano.svg}</g>`,
  };
}

// ── assembly ────────────────────────────────────────────────────────────────────
// width/height alongside viewBox: without them, an <img> or a bare README falls back to
// the 300x150 default object size.
const doc = (x, y, w, h, title, body, uid) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${F(x)} ${F(y)} ${F(w)} ${F(h)}" `
  + `width="${F(w)}" height="${F(h)}" role="img" aria-labelledby="${uid}-t">
  <title id="${uid}-t">${title}</title>
${body}
</svg>\n`;

const PAD = 3;                                    // artboard air, so nothing clips
const slug = (name) => name.replace(/\.svg$/, '').replace(/[^a-z0-9]+/gi, '-');
const files = [];
function write(name, make) {
  writeFileSync(`${DEST}/${name}`, make(slug(name)));
  files.push(name);
}

for (const [theme, p] of Object.entries(PALETTE)) {
  const on = theme === 'dark' ? 'on-dark' : 'on-light';   // named by the ground it sits on,
  const lt = logotype(p.ink);                             // not by a theme word

  write(`mark-${on}.svg`, (uid) =>
    doc(INK_X, INK_Y, MARK_W, MARK_H, 'Enjoy Nano', `  ${markBody(p, uid)}`, uid));

  write(`wordmark-${on}.svg`, (uid) =>
    doc(-PAD, lt.top - PAD, lt.w + PAD * 2, (lt.bot - lt.top) + PAD * 2 + TYPE.eCap + TYPE.gap,
      'Enjoy Nano', `  ${lt.svg}`, uid));

  // Horizontal lockup. The droplet carries 0.85x the type block: at 0.97 the mark held
  // ~70% of the wordmark's ink and the eye landed on the teal before the name. The
  // artboard takes max() of the two heights — with a sub-1 multiplier the old
  // `H = mh` placed the wordmark at a negative y and sheared its caps.
  write(`logo-${on}.svg`, (uid) => {
    const mh = F(lt.h * 0.85), gap = 30;
    const mw = F(MARK_W * (mh / MARK_H));
    const typeTop = lt.top, typeH = (lt.bot - lt.top) + TYPE.eCap + TYPE.gap;
    const H = F(Math.max(mh, typeH) + PAD * 2), W = F(mw + gap + lt.w + PAD * 2);
    // Sit the droplet's foot on NANO's baseline rather than centring the block: a round
    // form that stops short of the baseline reads as floating.
    const typeY = F((H - typeH) / 2 - typeTop);
    const markY = F(typeY + lt.baseline - mh + OVERSHOOT);
    return doc(0, 0, W, H, 'Enjoy Nano',
      `  ${markAt(p, uid, PAD, markY, mh)}\n  <g transform="translate(${F(PAD + mw + gap)} ${typeY})">${lt.svg}</g>`, uid);
  });

  write(`stacked-${on}.svg`, (uid) => {
    const ltc = logotype(p.ink, 'center');
    const mh = 118, gap = 34;
    const mw = F(MARK_W * (mh / MARK_H));
    const typeH = (ltc.bot - ltc.top) + TYPE.eCap + TYPE.gap;
    const W = F(Math.max(mw, ltc.w) + PAD * 2), H = F(mh + gap + typeH + PAD * 2);
    return doc(0, 0, W, H, 'Enjoy Nano',
      `  ${markAt(p, uid, (W - mw) / 2, PAD, mh)}
  <g transform="translate(${F((W - ltc.w) / 2)} ${F(PAD + mh + gap - ltc.top)})">${ltc.svg}</g>`, uid);
  });

  write(`mark-flat-${on}.svg`, (uid) =>
    doc(INK_X, INK_Y, MARK_W, MARK_H, 'Enjoy Nano',
      `  ${markFlat(theme === 'dark' ? p.c1 : p.c2)}`, uid));
}

// Reversed one-colour cuts. The gradient mark loses itself on a brand-coloured or mid-grey
// field, and these are also what a screen printer, embroiderer or foil vendor needs.
for (const [name, fill] of [['white', '#FFFFFF'], ['ink', '#0B1220']]) {
  write(`mark-flat-${name}.svg`, (uid) =>
    doc(INK_X, INK_Y, MARK_W, MARK_H, 'Enjoy Nano', `  ${markFlat(fill)}`, uid));

  // ...and the full lockup in one colour, which the set previously lacked entirely.
  write(`logo-flat-${name}.svg`, (uid) => {
    const lt = logotype(fill);
    const mh = F(lt.h * 0.85), gap = 30, mw = F(MARK_W * (mh / MARK_H));
    const typeH = (lt.bot - lt.top) + TYPE.eCap + TYPE.gap;
    const H = F(Math.max(mh, typeH) + PAD * 2), W = F(mw + gap + lt.w + PAD * 2);
    const typeY = F((H - typeH) / 2 - lt.top);
    const markY = F(typeY + lt.baseline - mh + OVERSHOOT);
    return doc(0, 0, W, H, 'Enjoy Nano',
      `  ${markAt(null, uid, PAD, markY, mh, fill)}\n  <g transform="translate(${F(PAD + mw + gap)} ${typeY})">${lt.svg}</g>`, uid);
  });
}

// Favicon: transparent, in the light-theme teal. A dark tile disappeared into dark browser
// chrome; the bright dark-theme teal is only 1.5:1 on a white tab bar. The mid teal clears
// 3:1 on both (#FFFFFF 3.74:1, #060B14 5.26:1). Side padding is kept tight so the mark
// fills its box rather than reading recessive next to favicons that do.
write('favicon.svg', (uid) =>
  doc(INK_X, INK_Y, MARK_W, MARK_H, 'Enjoy Nano', `  ${markBody(PALETTE.light, uid)}`, uid));

// Safari pinned tab: a single flat path, no fill declared — Safari applies its own colour.
write('mask-icon.svg', (uid) =>
  doc(INK_X, INK_Y, MARK_W, MARK_H, 'Enjoy Nano', `  ${markFlat('#000000')}`, uid));

// Square, transparent — the source for raster favicons, which must be square canvases.
// favicon.svg itself is the tight ink box, so rasterising it directly gave 16x22.
write('favicon-square.svg', (uid) => {
  const size = 64, mh = size * 0.9, mw = F(MARK_W * (mh / MARK_H));
  return doc(0, 0, size, size, 'Enjoy Nano',
    `  ${markAt(PALETTE.light, uid, (size - mw) / 2, (size - mh) / 2, mh)}`, uid);
});

/** Square tile. `inset` is measured on HEIGHT — the mark is taller than wide, so sizing
 *  by width pushed the apex outside a maskable icon's safe zone and the circle crop
 *  sliced the tip off. */
const squareIcon = (size, inset) => (uid) => {
  const mh = size * inset, mw = F(MARK_W * (mh / MARK_H));
  return doc(0, 0, size, size, 'Enjoy Nano',
    `  <rect width="${size}" height="${size}" fill="#0B1220"/>
  ${markAt(PALETTE.dark, uid, (size - mw) / 2, (size - mh) / 2, mh)}`, uid);
};
write('icon-square.svg', squareIcon(512, 0.58));        // maskable / PWA
write('apple-touch-icon.svg', squareIcon(180, 0.68));   // iOS masks its own corners

// Open Graph background, 1200x630. Mark and logotype only — the drawn glyph set is
// E N J O Y A, so a headline here would need a font and stop being self-contained.
write('og.svg', (uid) => {
  const p = PALETTE.dark, ltc = logotype(p.ink, 'center');
  const k = F(190 / ltc.h), W = F(ltc.w * k);
  const mh = 210, mw = F(MARK_W * (mh / MARK_H));
  const typeH = ((ltc.bot - ltc.top) + TYPE.eCap + TYPE.gap) * k;
  const top = F((630 - (mh + 44 + typeH)) / 2);
  return doc(0, 0, 1200, 630, 'Enjoy Nano',
    `  <defs><radialGradient id="${uid}-bg" cx=".18" cy=".06" r="1.15">
      <stop offset="0" stop-color="#0D3B45"/><stop offset=".6" stop-color="#071018"/></radialGradient></defs>
  <rect width="1200" height="630" fill="url(#${uid}-bg)"/>
  ${markAt(p, uid, (1200 - mw) / 2, top, mh)}
  <g transform="translate(${F((1200 - W) / 2)} ${F(top + mh + 44 - ltc.top * k)}) scale(${k})">${ltc.svg}</g>`, uid);
});

console.log(files.join('\n'));
