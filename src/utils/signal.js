/**
 * @file: src/utils/signal.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Minimal subscribe/emit used to join a deep trigger to a top-level renderer without
 *     threading props or state through App, plus the one modal slot every full-screen overlay
 *     claims before it raises itself. See components/chat/engagement/CLAUDE.md § One modal at a time.
 *
 * @See Also:
 *     src/utils/quiz.js
 *     src/utils/explainer.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

/** `replay` hands the last value to a late subscriber, so an early `emit(true)` is not lost. */
export function createSignal({ replay = false } = {}) {
  const listeners = new Set();
  let last;
  let hasEmitted = false;
  return {
    subscribe(listener) {
      listeners.add(listener);
      if (replay && hasEmitted) listener(last);
      return () => listeners.delete(listener);
    },
    emit(value) {
      last = value;
      hasEmitted = true;
      listeners.forEach((listener) => listener(value));
    },
  };
}

let holder = null;

/**
 * One occupant at a time. Every `.nano-modal-root` overlay is `position: fixed; inset: 0` at the
 * same z-index, so a second one raised in the same turn hides under the first one's scrim.
 */
export const modalSlot = {
  claim(id) {
    if (holder !== null && holder !== id) return false;
    holder = id;
    return true;
  },
  release(id) {
    if (holder === id) holder = null;
  },
};

/** Read by ChatWidget so Escape closes the overlay rather than the whole conversation. */
export const isModalOpen = () => holder !== null;
