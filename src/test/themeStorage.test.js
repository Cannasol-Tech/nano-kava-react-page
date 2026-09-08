/**
 * @file: src/test/themeStorage.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The theme toggle must survive a reload. localStorage is the persistence layer;
 *     Safari private mode throws on access, so every read and write is guarded.
 *
 * @See Also:
 *     src/utils/themeStorage.js
 *     src/context/ThemeContext.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { THEME_STORAGE_KEY, readStoredTheme, writeStoredTheme } from '../utils/themeStorage';

describe('themeStorage', () => {
  beforeEach(() => {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    delete window.__PRERENDER__;
  });

  afterEach(() => {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    delete window.__PRERENDER__;
    vi.restoreAllMocks();
  });

  it('defaults to dark when nothing is stored', () => {
    expect(readStoredTheme()).toBe(true);
  });

  it('restores a saved light preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(readStoredTheme()).toBe(false);
  });

  it('restores a saved dark preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readStoredTheme()).toBe(true);
  });

  it('ignores garbage values rather than crashing', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    expect(readStoredTheme()).toBe(true);
  });

  it('writes dark and light as stable string tokens', () => {
    writeStoredTheme(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    writeStoredTheme(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('stays on the dark default under prerender so the snapshot does not leak a visitor preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    window.__PRERENDER__ = true;
    expect(readStoredTheme()).toBe(true);
  });

  it('swallows a private-mode throw on read and write', () => {
    const boom = () => { throw new Error('private mode'); };
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(boom);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(boom);
    expect(readStoredTheme()).toBe(true);
    expect(() => writeStoredTheme(false)).not.toThrow();
  });
});
