import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from '../context/ThemeContext';
import AppRoutes from '../AppRoutes';

function renderRoute(initialPath) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe('AppRoutes', () => {
  it('renders the kava landing page at /', async () => {
    renderRoute('/');

    expect(
      await screen.findByRole('heading', { name: /nano.*kava/i })
    ).toBeInTheDocument();
  });
});
