import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from '../AppRoutes';

function renderRoute(initialPath) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe('AppRoutes', () => {
  it('renders the mushrooms landing page at /mushrooms', () => {
    renderRoute('/mushrooms');

    expect(
      screen.getByRole('heading', { name: /nanoemulsified\s+functional\s+mushrooms/i })
    ).toBeInTheDocument();

    expect(screen.getByText(/lion's mane/i)).toBeInTheDocument();
    expect(screen.getByText(/reishi/i)).toBeInTheDocument();
    expect(screen.getByText(/cordyceps/i)).toBeInTheDocument();

    const contactSales = screen.getAllByRole('link', { name: /contact sales/i })[0];
    expect(contactSales).toHaveAttribute('href', '/contact');
  });
});
