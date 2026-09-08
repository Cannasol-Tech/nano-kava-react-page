/**
 * @file: src/utils/labMode.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Triple-clicking the logo spikes NanoScene's particle field and raises a HUD readout for
 *     a few seconds. Timed and self-cancelling — see components/CLAUDE.md § Lab mode.
 *
 * @See Also:
 *     src/components/LabModeHud.jsx
 *     src/components/NanoScene.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { createSignal } from './signal';

// Long enough to notice, short enough that the O(N²) connection pass never outstays its welcome.
export const LAB_MODE_MS = 6000;

const signal = createSignal();
let timerId = null;

export const subscribeLabMode = signal.subscribe;

export function isLabModeActive() {
  return timerId !== null;
}

export function startLabMode() {
  const wasActive = isLabModeActive();
  if (wasActive) clearTimeout(timerId);
  timerId = setTimeout(() => {
    timerId = null;
    signal.emit(false);
  }, LAB_MODE_MS);
  // A re-trigger extends the run; announcing it again would restart every consumer's animation.
  if (!wasActive) signal.emit(true);
}
