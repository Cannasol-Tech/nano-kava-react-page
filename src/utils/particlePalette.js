/**
 * @file: src/utils/particlePalette.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The colours NanoScene paints with, and the signal Sol recolours them through. DEFAULT is a
 *     verbatim capture of the hard-coded values the scene shipped with — see
 *     ../components/CLAUDE.md § Recolouring the scene before changing a number in it.
 *
 * @See Also:
 *     src/components/NanoScene.jsx
 *     functions/lib/particlePalette.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { createSignal } from './signal';

/**
 * Captured 2026-08-26 from NanoScene.jsx before any recolour work. Every number here was a
 * literal in the render path; nothing is a new choice. `functions/lib/particlePalette.js` holds
 * an identical `default` entry and `src/test/particlePalette.test.js` fails if the two drift.
 *
 * `large` — the shell points orbiting the three spheres. The renderer adds its own lighting
 * terms on top, so these are the base of a gradient, not a flat colour.
 * `small` — the background particles and the lines between them.
 */
export const DEFAULT_PALETTE = Object.freeze({
  name: 'default',
  large: Object.freeze({
    hue: 232,
    sat: 58,
    light: 0,
    accentHue: 210,
    accentSat: 1,
  }),
  small: Object.freeze({
    coreHue: 232,
    coreSat: 92,
    coreLight: 80,
    hue: 222,
    sat: 0,
    light: 0,
  }),
});

/** Sol may recolour one group or both; an absent half keeps whatever is on screen. */
export const paletteSignal = createSignal({ replay: true });

let active = DEFAULT_PALETTE;

export const activePalette = () => active;

/**
 * Applies a palette the server resolved. `large`/`small` are independent so "set the small dots
 * blue" cannot silently reset the large ones a visitor picked a moment earlier.
 */
export function applyPalette({ large, small, name } = {}) {
  active = {
    name: name || 'custom',
    large: large ? { ...DEFAULT_PALETTE.large, ...large } : active.large,
    small: small ? { ...DEFAULT_PALETTE.small, ...small } : active.small,
  };
  paletteSignal.emit(active);
  return active;
}

/** The one path back. Restores both groups regardless of what was changed. */
export function resetPalette() {
  active = DEFAULT_PALETTE;
  paletteSignal.emit(active);
  return active;
}

export const subscribePalette = (fn) => paletteSignal.subscribe(fn);
