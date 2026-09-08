/**
 * @file: src/utils/explainer.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Open/close signal for the nano explainer modal. Sol triggers it from inside ChatPanel;
 *     the modal renders at App level so it can overlay the page rather than the chat panel.
 *
 * @See Also:
 *     src/components/NanoExplainer.jsx
 *     src/components/chat/panel/ChatPanel.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { createSignal, modalSlot } from './signal';

const SLOT = 'nano-explainer';

// Replay for the same reason as the quiz: an emit before NanoExplainer subscribes is a tool
// that reported success with nothing on screen.
const signal = createSignal({ replay: true });

export const subscribeExplainer = signal.subscribe;

/** Returns whether the visual is actually up — see components/chat/engagement/CLAUDE.md § One modal at a time. */
export function openExplainer() {
  if (!modalSlot.claim(SLOT)) return false;
  signal.emit(true);
  return true;
}

export function closeExplainer() {
  modalSlot.release(SLOT);
  signal.emit(false);
}
