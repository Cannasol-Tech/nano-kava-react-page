/**
 * @file: src/utils/browser.js
 * @author: Stephen Boyett
 *
 * @description:
 *     One source of truth for the Safari sniff, which several modules gate expensive effects on,
 *     plus the root attribute that lets CSS do the same. See CLAUDE.md § Safari gets less motion.
 *
 * @See Also:
 *     src/utils/loadSequence.js
 *     src/components/NanoScene.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

// The expression NanoScene and ChatPanel both used before this module existed.
export const IS_SAFARI = typeof navigator !== 'undefined'
  && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

/** Stamps the root so stylesheets can gate on Safari without a second sniff in JS. */
export function markBrowser() {
  if (typeof document === 'undefined' || !IS_SAFARI) return;
  document.documentElement.dataset.safari = 'true';
}
