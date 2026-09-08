/**
 * @file: scripts/brand/palette.mjs
 * @author: Stephen Boyett
 *
 * @description:
 *     The Enjoy Nano brand palette — one source of truth, shared by the asset builder
 *     and the contrast gate so the two can never disagree. Two gradient stops and a
 *     facet plane per theme; no specular highlight by design.
 *
 * @See Also:
 *     scripts/brand/build.mjs
 *     scripts/brand/contrast.mjs
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

// The light pair is checked against #FFFFFF: an earlier gradient started at #0FB489 and
// measured 2.65:1, under the 3:1 non-text minimum. teal-600 clears it at 3.74:1.
export const PALETTE = {
  dark:  { c1: '#5EEAD4', c2: '#22D3EE', deep: '#0E8CA8', ink: '#FFFFFF', ground: '#060B14' },
  light: { c1: '#0D9488', c2: '#0E7490', deep: '#0A5566', ink: '#0B1220', ground: '#FFFFFF' },
};
