/**
 * @file: scripts/brand/glyphs.mjs
 * @author: Stephen Boyett
 *
 * @description:
 *     The six drawn glyphs the Enjoy Nano logotype needs (E N J O Y A), as filled
 *     outlines on a cap height of 100. Outlines rather than a webfont so the shipped SVG
 *     renders identically everywhere and carries no font licence. Carries the optical
 *     corrections a generated geometric sans otherwise lacks — see the notes below.
 *
 * @See Also:
 *     scripts/brand/build.mjs
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

// Local em: cap height 100, baseline y = 100, stem width s.
//
// Optical corrections, none of which a naive geometric construction gets right:
//   · round and pointed glyphs overshoot the cap line and baseline, or they read short;
//   · the O's side walls are heavier than its top and bottom, as a drawn sans always is —
//     a concentric ring reads as a tool artifact, and the J's bowl gets the same treatment;
//   · every diagonal is solved for PERPENDICULAR thickness. A horizontal inset of s draws
//     a diagonal thinner than the stems by cos of its angle, which had the Y's arms 10%
//     light and the A's 5% light against the N's;
//   · E's arms and the O's top/bottom are lightened, or E reads as the darkest glyph;
//   · pairs are kerned by shape class, not tracked uniformly.

const F = (n) => Number(n.toFixed(3));
export const OVERSHOOT = 1.4;

/** Perpendicular thickness `s` on a stroke that rises `rise` over `run`. */
const perp = (rise, run, s) => s / Math.cos(Math.atan(run / rise));

/** Vertical thickness of an N diagonal whose perpendicular thickness is s, in closed
 *  form — the fixed-point iteration diverges when run <= s and returns a wrong number
 *  rather than failing. */
function diagThickness(run, s) {
  const a = run * run - s * s;
  if (a <= 0) throw new Error(`diagonal cannot fit: run ${run} <= stem ${s}`);
  const b = 2 * s * s * 100, c = -s * s * (100 * 100 + run * run);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

/** A full ellipse as two 180° arcs. One arc with near-coincident endpoints (the
 *  `A42 51.4 0 1 1 41.99 -1.4` form) puts a 0.01u segment on the curvature extremum;
 *  browsers cope, but print RIPs, vinyl cutters and embroidery digitisers nick or fail there. */
const ellipse = (cx, cy, rx, ry) =>
  `M${F(cx - rx)} ${F(cy)} A${F(rx)} ${F(ry)} 0 1 0 ${F(cx + rx)} ${F(cy)} `
  + `A${F(rx)} ${F(ry)} 0 1 0 ${F(cx - rx)} ${F(cy)} Z`;

export const WIDTH = { E: 62, N: 78, J: 54, O: 84, Y: 74, A: 80, ' ': 34 };

// Kerning by shape class. Diagonal-into-diagonal (N|A) opens the largest hole and needs
// the most; flat-into-round (N|O) already returns white and needs least. Mirrored pairs
// carry identical values — NA and AN are the same two shapes reflected.
const KERN = {
  NA: -7.5, AN: -7.5, AO: -5, OA: -5,
  NO: -1, ON: -1, NN: 0,
  EN: -1, NJ: -6, JO: -1, OY: -6, YO: -6, EJ: -3, JN: -2,
};

export function glyph(ch, s) {
  const w = WIDTH[ch];
  switch (ch) {
    case 'E': {
      const arm = F(s * 0.85);                 // arms lighter than the stem, or E reads darkest
      const armW = F(w * 0.82), mid = F(48 - arm / 2);
      return `M0 0 H${w} V${arm} H${s} V${mid} H${armW} V${F(mid + arm)} H${s} V${F(100 - arm)} `
           + `H${w} V100 H0 Z`;
    }
    case 'N': {
      const T = F(diagThickness(w - 2 * s, s));
      return `M0 0 H${s} L${w - s} ${F(100 - T)} V0 H${w} V100 H${w - s} L${s} ${T} V100 H0 Z`;
    }
    case 'J': {
      const Ro = w / 2, y = F(100 + OVERSHOOT - Ro);
      const irx = F(Ro - s * 1.02), iry = F(Ro - s * 0.82);   // modulated, like the O
      // Terminal raised off the bowl's 9-o'clock point; cut there reads as a chopped U.
      const tx = F(Ro - Math.sqrt(Math.max(0, Ro * Ro - (Ro * 0.42) ** 2)));
      const ty = F(y - Ro * 0.42);
      return `M${w} 0 V${y} A${Ro} ${Ro} 0 0 1 ${tx} ${ty} L${F(tx + s * 0.98)} ${F(ty + s * 0.2)} `
           + `A${irx} ${iry} 0 0 0 ${F(w - s)} ${y} V0 Z`;
    }
    case 'O': {
      const rx = w / 2, ry = F(50 + OVERSHOOT);
      return `${ellipse(rx, 50, rx, ry)} ${ellipse(rx, 50, F(rx - s * 1.02), F(ry - s * 0.82))}`;
    }
    case 'Y': {
      const jo = 52, half = w / 2;             // junction at 52% — 58% left the stem stunted
      const armPerp = perp(jo, half - s / 2, s);
      const ji = F(jo - armPerp * (jo / Math.hypot(jo, half - s / 2)) * 1.0 - (armPerp - s) * 0.6);
      return `M0 0 H${s} L${half} ${ji} L${w - s} 0 H${w} L${F(half + s / 2)} ${jo} V100 `
           + `H${F(half - s / 2)} V${jo} Z`;
    }
    case 'A': {
      const a = F(s * 0.32);                   // apex flat 32% of stem; 90% read as a slab
      const top = -1.6, bt = 65.5;             // crossbar raised: counters were 1.34:1
      const bb = F(bt + s * 0.82);
      const legPerp = perp(100 - top, w / 2 - a, s);
      const xl = (y) => F(legPerp + (w / 2 - a) * (100 - y) / (100 - top));
      const xr = (y) => F(w - legPerp - (w / 2 - a) * (100 - y) / (100 - top));
      const ym = F(100 - (100 - top) * (w - 2 * legPerp) / (w - 2 * a));
      return `M0 100 L${F(w / 2 - a)} ${top} H${F(w / 2 + a)} L${w} 100 Z `
           + `M${xl(bt)} ${bt} L${w / 2} ${ym} L${xr(bt)} ${bt} Z `
           + `M${xl(bb)} ${bb} L${F(legPerp)} 100 H${F(w - legPerp)} L${xr(bb)} ${bb} Z`;
    }
    default:
      throw new Error(`no glyph: ${ch}`);
  }
}

/** Emit a word as positioned <path> elements. */
export function wordSvg(text, { s = 13, track = 8, fill = '#000', kern = true } = {}) {
  let x = 0, out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ') { x += WIDTH[' '] + track; continue; }
    out += `<path transform="translate(${F(x)} 0)" fill-rule="evenodd" fill="${fill}" d="${glyph(ch, s)}"/>`;
    const pair = kern ? (KERN[ch + text[i + 1]] ?? 0) : 0;
    x += WIDTH[ch] + track + pair * (s / 15);   // kerns scale with weight
  }
  return { svg: out, width: F(Math.max(0, x - track)) };
}
