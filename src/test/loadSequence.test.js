/**
 * @file: src/test/loadSequence.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Unit tests for the first-paint load sequence clock: stage ordering, the gates that
 *     suppress it (prerender, reduced motion), and the pure easing helpers NanoScene
 *     drives its assemble phase from.
 *
 * @See Also:
 *     src/utils/loadSequence.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const FAKE = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'];

/** Fresh module per test — the clock is a module singleton. */
async function loadModule({ reduceMotion = false, prerender = false, safari = false } = {}) {
  vi.resetModules();
  window.__PRERENDER__ = prerender;
  window.matchMedia = vi.fn(() => ({ matches: reduceMotion, addListener() {}, removeListener() {} }));
  vi.doMock('../utils/browser', () => ({ IS_SAFARI: safari, markBrowser: () => {} }));
  return import('../utils/loadSequence');
}

describe('loadSequence timings', () => {
  it('orders the stages assemble -> pulse -> Sol', async () => {
    const { SEQUENCE } = await loadModule();
    expect(SEQUENCE.pulseAtMs).toBeLessThan(SEQUENCE.assembleMs);
    expect(SEQUENCE.assembleMs).toBeLessThan(SEQUENCE.solAtMs);
    expect(SEQUENCE.solAtMs).toBeLessThan(SEQUENCE.pulseAtMs + SEQUENCE.pulseMs);
    // Sol has to have landed and settled before he speaks.
    expect(SEQUENCE.solAtMs + SEQUENCE.arriveMs).toBeLessThanOrEqual(SEQUENCE.greetAtMs);
  });
});

describe('isSequenceEnabled', () => {
  it('is enabled for an ordinary visitor', async () => {
    const { isSequenceEnabled } = await loadModule();
    expect(isSequenceEnabled()).toBe(true);
  });

  it('is disabled while prerendering so the snapshot ships the settled page', async () => {
    const { isSequenceEnabled } = await loadModule({ prerender: true });
    expect(isSequenceEnabled()).toBe(false);
  });

  it('is disabled under prefers-reduced-motion', async () => {
    const { isSequenceEnabled } = await loadModule({ reduceMotion: true });
    expect(isSequenceEnabled()).toBe(false);
  });

  it('runs on Safari now that the shells are affordable there', async () => {
    // Changed 2026-08-26: it used to be disabled because NanoScene did not render on Safari,
    // so the ripple emanated from nothing. The sprite atlas brought the spheres back at 59fps.
    const { isSequenceEnabled } = await loadModule({ safari: true });
    expect(isSequenceEnabled()).toBe(true);
  });
});

describe('shouldGreet', () => {
  it('still greets where the motion is switched off — being greeted is content', async () => {
    const { shouldGreet, isSequenceEnabled } = await loadModule({ reduceMotion: true });
    expect(isSequenceEnabled()).toBe(false);
    expect(shouldGreet()).toBe(true);
  });

  it('never greets the prerenderer, whose snapshot must ship closed', async () => {
    const { shouldGreet } = await loadModule({ prerender: true });
    expect(shouldGreet()).toBe(false);
  });
});

describe('the shared clock', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: FAKE }));
  afterEach(() => vi.useRealTimers());

  it('counts down to a mark and clamps at zero', async () => {
    const { msUntil } = await loadModule();
    expect(msUntil(1000)).toBe(1000);
    vi.advanceTimersByTime(400);
    expect(msUntil(1000)).toBe(600);
    vi.advanceTimersByTime(5000);
    expect(msUntil(1000)).toBe(0);
  });

  it('shares one start across every consumer', async () => {
    const { msUntil, sequenceElapsed } = await loadModule();
    msUntil(0);
    vi.advanceTimersByTime(250);
    expect(sequenceElapsed()).toBe(250);
  });
});

describe('assembleProgress', () => {
  it('runs 0 -> 1 across the assemble window and clamps beyond it', async () => {
    const { assembleProgress, SEQUENCE } = await loadModule();
    expect(assembleProgress(-50)).toBe(0);
    expect(assembleProgress(SEQUENCE.assembleMs / 2)).toBeCloseTo(0.5, 5);
    expect(assembleProgress(SEQUENCE.assembleMs)).toBe(1);
    expect(assembleProgress(SEQUENCE.assembleMs * 3)).toBe(1);
  });
});

describe('smoothstep', () => {
  it('clamps outside the edges and is monotonic between them', async () => {
    const { smoothstep } = await loadModule();
    expect(smoothstep(0.2, 0.8, 0.1)).toBe(0);
    expect(smoothstep(0.2, 0.8, 0.9)).toBe(1);
    expect(smoothstep(0.2, 0.8, 0.5)).toBeCloseTo(0.5, 5);
    let prev = -1;
    for (let x = 0; x <= 1.0001; x += 0.05) {
      const y = smoothstep(0.2, 0.8, x);
      expect(y).toBeGreaterThanOrEqual(prev);
      prev = y;
    }
  });
});
