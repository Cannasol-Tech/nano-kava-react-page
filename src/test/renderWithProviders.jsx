/**
 * @file: src/test/renderWithProviders.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Renders a page component inside the providers it needs in production: HelmetProvider
 *     for the per-route SEO tags, MemoryRouter for links, and ThemeProvider for theme
 *     classes. Page components render <Helmet>, which throws outside a HelmetProvider.
 *
 * @See Also:
 *     src/test/setupTests.js
 *     src/seo/JsonLd.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies. All Rights Reserved.
 * ---
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from '../context/ThemeContext';

export function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <HelmetProvider context={{}}>
      <MemoryRouter initialEntries={[route]}>
        <ThemeProvider>{ui}</ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>
  );
}
