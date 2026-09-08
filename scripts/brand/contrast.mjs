#!/usr/bin/env node
/**
 * @file: scripts/brand/contrast.mjs
 * @author: Stephen Boyett
 *
 * @description:
 *     Checks the brand palette against both grounds — WCAG contrast ratios plus
 *     deuteranopia, protanopia and tritanopia simulation. Non-text marks need 3:1. This
 *     is what caught the original light-theme gradient start at 2.65:1 on white.
 *
 * @See Also:
 *     scripts/brand/build.mjs
 *     public/brand/README.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { PALETTE } from './palette.mjs';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = (h) => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Brettel/Viénot-style dichromacy simulation on linear RGB.
const M = {
  deuteranopia: [[0.625, 0.375, 0], [0.7, 0.3, 0], [0, 0.3, 0.7]],
  protanopia:   [[0.567, 0.433, 0], [0.558, 0.442, 0], [0, 0.242, 0.758]],
  tritanopia:   [[0.95, 0.05, 0], [0, 0.433, 0.567], [0, 0.475, 0.525]],
};
const toHex = (v) => '#' + v.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('');
const sim = (h, k) => toHex(M[k].map((row) => row.reduce((s, w, i) => s + w * hex(h)[i], 0)));

const SETS = Object.entries(PALETTE).flatMap(([theme, p]) =>
  [['c1', p.c1], ['c2', p.c2]].map(([k, hex]) => [`${theme.padEnd(5)} ${k}`, hex, p.ground]));

let failed = 0;
console.log('CONTRAST vs ground');
for (const [n, c, bg] of SETS) {
  const r = ratio(c, bg);
  if (r < 3) failed++;
  console.log(`  ${n} ${c} vs ${bg}  ${r.toFixed(2)}:1  ${r >= 3 ? 'PASS (>=3:1 non-text)' : 'FAIL'}`);
}

console.log('\nDICHROMACY — does the mark still separate from its ground?');
for (const [n, c, bg] of SETS) {
  const out = Object.keys(M).map((k) => {
    const r = ratio(sim(c, k), sim(bg, k));
    if (r < 3) failed++;
    return `${k.slice(0, 5)} ${sim(c, k)} ${r.toFixed(2)}:1`;
  });
  console.log(`  ${n}  ${out.join('  |  ')}`);
}

if (failed) {
  console.error(`\n${failed} check(s) below 3:1 — the palette is not shippable.`);
  process.exit(1);
}
console.log('\nAll checks clear 3:1.');
