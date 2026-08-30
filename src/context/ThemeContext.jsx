/**
 * @file: src/context/ThemeContext.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Site-wide dark/light toggle. The choice is persisted in localStorage so a reload
 *     restores it; see src/utils/themeStorage.js.
 *
 * @See Also:
 *     src/utils/themeStorage.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { readStoredTheme, writeStoredTheme } from '../utils/themeStorage';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDarkState] = useState(readStoredTheme);
  const setIsDark = useCallback((next) => {
    setIsDarkState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      writeStoredTheme(value);
      return value;
    });
  }, []);
  const value = useMemo(() => ({ isDark, setIsDark }), [isDark, setIsDark]);
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
