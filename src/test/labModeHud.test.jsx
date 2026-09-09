/**
 * @file: src/test/labModeHud.test.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     The lab-mode easter egg end to end: three clicks on the logo arm it, fewer do not, the
 *     HUD appears and then leaves on its own so nothing keeps painting after the run.
 *
 * @See Also:
 *     src/components/LabModeHud.jsx
 *     src/utils/labMode.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './renderWithProviders';
import LabModeHud from '../components/LabModeHud';
import KavaLandingPage from '../components/KavaLandingPage';
import { startLabMode, isLabModeActive, LAB_MODE_MS } from '../utils/labMode';

const SLOW = 20_000;

describe('LabModeHud', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] }));
  afterEach(() => {
    act(() => { vi.advanceTimersByTime(LAB_MODE_MS * 2); });
    vi.useRealTimers();
  });

  it('is absent until lab mode is armed, and leaves when it expires', () => {
    render(<LabModeHud />);
    expect(screen.queryByText(/lab mode/i)).toBeNull();

    act(() => { startLabMode(); });
    expect(screen.getByText(/lab mode/i)).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(LAB_MODE_MS + 50); });
    expect(screen.queryByText(/lab mode/i)).toBeNull();
  }, SLOW);

  it('settles its readout onto Cannasol\'s particle size', () => {
    render(<LabModeHud />);
    act(() => { startLabMode(); });
    act(() => { vi.advanceTimersByTime(3000); });

    const readout = screen.getByText(/DROPLET/i).textContent;
    const nm = Number(readout.match(/([\d.]+)\s*nm/)[1]);
    expect(nm).toBeGreaterThan(18);
    expect(nm).toBeLessThan(22);
  }, SLOW);
});

describe('the logo easter egg', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] }));
  afterEach(() => {
    act(() => { vi.advanceTimersByTime(LAB_MODE_MS * 2); });
    vi.useRealTimers();
  });

  it('ignores an ordinary click on the logo', () => {
    renderWithProviders(<KavaLandingPage />);
    const logo = screen.getAllByAltText(/cannasol technologies logo/i)[0].parentElement;

    act(() => { fireEvent.click(logo, { detail: 1 }); });
    expect(isLabModeActive()).toBe(false);
  }, SLOW);

  it('arms lab mode on the third click', () => {
    renderWithProviders(<KavaLandingPage />);
    const logo = screen.getAllByAltText(/cannasol technologies logo/i)[0].parentElement;

    act(() => { fireEvent.click(logo, { detail: 3 }); });
    expect(isLabModeActive()).toBe(true);
  }, SLOW);
});
