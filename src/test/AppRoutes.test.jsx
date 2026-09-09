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
  it('renders the mushrooms landing page at /mushrooms', async () => {
    renderRoute('/mushrooms');

    // The route is lazy, so this waits on a dynamic import. RTL's 1s default flakes on a
    // loaded machine — the failure was always a timeout, never a missing heading.
    expect(
      await screen.findByRole(
        'heading',
        { name: /nanoemulsified\s+functional\s+mushrooms/i },
        { timeout: 15_000 }
      )
    ).toBeInTheDocument();

    // Each name now also appears in the mushroomLine.summary prose, not just the card heading.
    expect(screen.getAllByText(/lion's mane/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/reishi/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/cordyceps/i).length).toBeGreaterThan(0);

    const contactSales = screen.getAllByRole('link', { name: /contact sales/i })[0];
    expect(contactSales).toHaveAttribute('href', '/contact');
  }, 25_000);
});
