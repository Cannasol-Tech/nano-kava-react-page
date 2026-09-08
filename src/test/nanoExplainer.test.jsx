/**
 * @file: src/test/nanoExplainer.test.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Behaviour of the modal Sol raises: it stays unmounted until signalled, is a real dialog
 *     for assistive tech, closes by Escape / scrim / button, and always leaves a route to a
 *     sample request — the reason it exists at all.
 *
 * @See Also:
 *     src/components/NanoExplainer.jsx
 *     src/utils/explainer.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const SLOW = 20_000;

async function setup() {
  vi.resetModules();
  const [NanoExplainer, explainer, { ThemeProvider }] = await Promise.all([
    import('../components/NanoExplainer').then((m) => m.default),
    import('../utils/explainer'),
    import('../context/ThemeContext'),
  ]);
  const view = render(
    <MemoryRouter>
      <ThemeProvider><NanoExplainer /></ThemeProvider>
    </MemoryRouter>
  );
  return { ...view, ...explainer };
}

const open = (openExplainer) => act(() => { openExplainer(); });

describe('NanoExplainer', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }));
  afterEach(() => vi.useRealTimers());

  it('stays out of the DOM until Sol raises it', async () => {
    const { openExplainer } = await setup();
    expect(screen.queryByRole('dialog')).toBeNull();

    open(openExplainer);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  }, SLOW);

  it('is a labelled modal dialog', async () => {
    const { openExplainer } = await setup();
    open(openExplainer);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName(/how small is 18 nanometres/i);
  }, SLOW);

  it('puts 18nm in context against something everyone can picture', async () => {
    const { openExplainer } = await setup();
    open(openExplainer);

    expect(screen.getByText(/human hair/i)).toBeInTheDocument();
    expect(screen.getByText(/~18 nm/i)).toBeInTheDocument();
    // Product-neutral on purpose: the same visual is raised from the mushrooms page.
    expect(screen.getByText(/cannasol droplet/i)).toBeInTheDocument();
  }, SLOW);

  it('shows the clarity before/after and the spec figures', async () => {
    const { openExplainer } = await setup();
    open(openExplainer);

    expect(screen.getByText(/traditional emulsion/i)).toBeInTheDocument();
    expect(screen.getByText(/nano — clear/i)).toBeInTheDocument();
    expect(screen.getByText(/bioavailability/i)).toBeInTheDocument();
    expect(screen.getByText(/onset time/i)).toBeInTheDocument();
  }, SLOW);

  it('states the figures as specs, never as an outcome for a person', async () => {
    const { openExplainer } = await setup();
    open(openExplainer);

    const body = screen.getByRole('dialog').textContent;
    expect(body).not.toMatch(/\b(relax|anxiety|sleep|treat|cure|feel)\b/i);
  }, SLOW);

  it('always offers the sample request — the reason it is shown at all', async () => {
    const { openExplainer } = await setup();
    open(openExplainer);

    const cta = screen.getByRole('link', { name: /request a free sample/i });
    expect(cta).toHaveAttribute('href', expect.stringContaining('inquiry=samples'));
  }, SLOW);

  it('closes on Escape', async () => {
    const { openExplainer } = await setup();
    open(openExplainer);

    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.queryByRole('dialog')).toBeNull();
  }, SLOW);

  it('closes on the close button', async () => {
    const { openExplainer } = await setup();
    open(openExplainer);

    act(() => { fireEvent.click(screen.getByRole('button', { name: /close/i })); });
    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.queryByRole('dialog')).toBeNull();
  }, SLOW);

  it('reopens cleanly after being dismissed', async () => {
    const { openExplainer } = await setup();
    open(openExplainer);
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    act(() => { vi.advanceTimersByTime(400); });

    open(openExplainer);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  }, SLOW);
});
