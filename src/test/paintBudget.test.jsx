/**
 * @file: src/test/paintBudget.test.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Guards the two CSS paint traps that recap the page below 60fps without changing
 *     how anything looks: a filter on the hero's animated gradient text, and a blur
 *     filter on the same element that scales. See src/CLAUDE.md § The measured budget.
 *
 * @See Also:
 *     src/components/KavaLandingPage.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from './renderWithProviders';
import KavaLandingPage from '../components/KavaLandingPage';

vi.mock('../hooks/useScrollDepth', () => ({
  useScrollDepth: () => null,
}));

vi.mock('../hooks/useScrollTransform', () => ({
  useScrollTransform: () => ({}),
}));

vi.mock('../hooks/useInView', () => ({
  useInView: () => [vi.fn(), true],
}));

describe('paint budget', () => {
  it('keeps filter:drop-shadow off the animating gradient heading', () => {
    const { container } = renderWithProviders(<KavaLandingPage />);
    const fill = container.querySelector('.animate-gradient-slow');
    expect(fill).not.toBeNull();
    expect(fill.style.filter).toBe('');
    expect(fill.textContent).toContain('Nano Kava');
  });

  it('keeps the heading drop-shadow on a static replica so the filter is not re-rasterised', () => {
    const { container } = renderWithProviders(<KavaLandingPage />);
    const replica = container.querySelector('[data-hero-shadow]');
    expect(replica).not.toBeNull();
    expect(replica.getAttribute('aria-hidden')).toBe('true');
    expect(replica.style.filter).toMatch(/drop-shadow/);
    expect(replica.textContent).toContain('Nano Kava');
  });

  it('animates glow orbs on a wrapper that does not itself carry the blur filter', () => {
    const { container } = renderWithProviders(<KavaLandingPage />);
    const motion = [...container.querySelectorAll('header [style]')].filter((el) =>
      (el.getAttribute('style') || '').includes('glow-orb'),
    );
    expect(motion.length).toBe(3);
    motion.forEach((el) => {
      expect(el.className).not.toMatch(/blur-/);
      expect(el.querySelector('[class*="blur-"]')).not.toBeNull();
    });
  });
});
