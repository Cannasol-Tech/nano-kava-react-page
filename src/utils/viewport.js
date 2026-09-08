/**
 * @file: src/utils/viewport.js
 * @author: Stephen Boyett
 *
 * @description:
 *     One source of truth for the "is this a phone?" test that behaviour gating reads. Every
 *     path degrades to "not mobile" rather than throwing, because the prerenderer runs this
 *     code and a throw there fails the build.
 *
 * @See Also:
 *     src/utils/browser.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

// 767px is one below Tailwind's `md` breakpoint, so JS and CSS gate at the same width.
export const MOBILE_QUERY = '(max-width: 767px)';

function mobileQueryList() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  try {
    return window.matchMedia(MOBILE_QUERY);
  } catch {
    return null;
  }
}

export function isMobileViewport() {
  return mobileQueryList()?.matches === true;
}

/** Returns an unsubscribe function; a no-op one where matchMedia is unavailable. */
export function subscribeViewport(listener) {
  const list = mobileQueryList();
  if (!list) return () => {};

  const onChange = (event) => listener(event.matches);
  if (typeof list.addEventListener === 'function') {
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }
  // Safari below 14 exposes only the deprecated pair on MediaQueryList.
  list.addListener(onChange);
  return () => list.removeListener(onChange);
}
