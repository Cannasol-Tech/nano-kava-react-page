/**
 * @file: src/utils/themeStorage.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Persist the visitor's dark/light choice in localStorage so a reload lands on the
 *     same side of the toggle. Safari private mode throws on access; every call is guarded.
 *
 * @See Also:
 *     src/context/ThemeContext.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

export const THEME_STORAGE_KEY = 'cannasol:theme';

/** @returns {boolean} true = dark. Dark is the site default and the prerender snapshot. */
export function readStoredTheme() {
  if (typeof window === 'undefined' || window.__PRERENDER__) return true;
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === 'light') return false;
    if (value === 'dark') return true;
  } catch {
    /* private mode */
  }
  return true;
}

export function writeStoredTheme(isDark) {
  if (typeof window === 'undefined' || window.__PRERENDER__) return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  } catch {
    /* private mode */
  }
}
