/**
 * @file: src/utils/nanoRainbow.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Timed "rainbow nano" state for the secret phrase easter egg. NanoScene adds a cycling hue
 *     offset while it runs — see components/chat/panel/CLAUDE.md § The secret phrase.
 *
 * @See Also:
 *     src/components/chat/panel/secretPhrases.js
 *     src/components/NanoScene.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { createSignal } from './signal';

export const RAINBOW_MS = 5000;

const signal = createSignal();
let timerId = null;

export const subscribeRainbow = signal.subscribe;

export function isRainbowActive() {
  return timerId !== null;
}

export function startRainbow() {
  const wasActive = isRainbowActive();
  if (wasActive) clearTimeout(timerId);
  timerId = setTimeout(() => {
    timerId = null;
    signal.emit(false);
  }, RAINBOW_MS);
  if (!wasActive) signal.emit(true);
}
