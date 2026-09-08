/**
 * @file: src/test/themeProvider.test.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     ThemeProvider must initialise from localStorage and write back when the visitor
 *     toggles, so a reload lands on the same side of the sun/moon control.
 *
 * @See Also:
 *     src/context/ThemeContext.jsx
 *     src/utils/themeStorage.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { THEME_STORAGE_KEY } from '../utils/themeStorage';

function Probe() {
  const { isDark, setIsDark } = useTheme();
  return (
    <button type="button" onClick={() => setIsDark(!isDark)}>
      {isDark ? 'dark' : 'light'}
    </button>
  );
}

describe('ThemeProvider persistence', () => {
  beforeEach(() => window.localStorage.removeItem(THEME_STORAGE_KEY));
  afterEach(() => window.localStorage.removeItem(THEME_STORAGE_KEY));

  it('starts dark when the visitor has never chosen', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('dark');
  });

  it('starts light when a previous visit stored light', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('light');
  });

  it('writes the new preference when the visitor toggles', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });
});
