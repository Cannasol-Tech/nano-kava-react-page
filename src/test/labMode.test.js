/**
 * @file: src/test/labMode.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Lab mode is a timed easter egg that spikes NanoScene's particle count, so it must expire
 *     on its own and must never stack timers when it is re-triggered mid-run.
 *
 * @See Also:
 *     src/utils/labMode.js
 *     src/components/LabModeHud.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

async function loadModule() {
  vi.resetModules();
  return import('../utils/labMode');
}

describe('lab mode', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('announces activation, then expires on its own', async () => {
    const { startLabMode, subscribeLabMode, isLabModeActive, LAB_MODE_MS } = await loadModule();
    const seen = [];
    subscribeLabMode((active) => seen.push(active));

    startLabMode();
    expect(seen).toEqual([true]);
    expect(isLabModeActive()).toBe(true);

    vi.advanceTimersByTime(LAB_MODE_MS + 10);
    expect(seen).toEqual([true, false]);
    expect(isLabModeActive()).toBe(false);
  });

  it('extends rather than re-announcing when re-triggered mid-run', async () => {
    const { startLabMode, subscribeLabMode, isLabModeActive, LAB_MODE_MS } = await loadModule();
    const seen = [];
    subscribeLabMode((active) => seen.push(active));

    startLabMode();
    vi.advanceTimersByTime(LAB_MODE_MS - 100);
    startLabMode();

    expect(seen).toEqual([true]);
    // The original timer must not fire and end the extended run.
    vi.advanceTimersByTime(200);
    expect(isLabModeActive()).toBe(true);

    vi.advanceTimersByTime(LAB_MODE_MS);
    expect(seen).toEqual([true, false]);
  });

  it('stops notifying an unsubscribed listener', async () => {
    const { startLabMode, subscribeLabMode, LAB_MODE_MS } = await loadModule();
    const seen = [];
    const off = subscribeLabMode((active) => seen.push(active));

    startLabMode();
    off();
    vi.advanceTimersByTime(LAB_MODE_MS + 10);
    expect(seen).toEqual([true]);
  });
});
