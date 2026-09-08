/**
 * @file: src/test/animationLoop.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The shared RAF loop must halt when the tab is hidden (minimised or backgrounded)
 *     and CSS animations must pause with it, so a parked window does not keep spinning.
 *
 * @See Also:
 *     src/utils/animationLoop.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

async function loadLoop() {
  vi.resetModules();
  document.documentElement.classList.remove('animations-paused');
  return import('../utils/animationLoop');
}

function setHidden(hidden) {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
}

describe('animationLoop visibility', () => {
  afterEach(() => {
    setHidden(false);
    document.documentElement.classList.remove('animations-paused');
  });

  it('pauses CSS animations when the document is hidden', async () => {
    setHidden(false);
    const { ANIMATIONS_PAUSED_CLASS } = await loadLoop();
    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(document.documentElement.classList.contains(ANIMATIONS_PAUSED_CLASS)).toBe(true);
  });

  it('releases the pause when the document is visible again', async () => {
    setHidden(false);
    const { ANIMATIONS_PAUSED_CLASS } = await loadLoop();
    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    setHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(document.documentElement.classList.contains(ANIMATIONS_PAUSED_CLASS)).toBe(false);
  });

  it('starts paused if the page loaded already hidden', async () => {
    setHidden(true);
    const { ANIMATIONS_PAUSED_CLASS } = await loadLoop();
    expect(document.documentElement.classList.contains(ANIMATIONS_PAUSED_CLASS)).toBe(true);
  });
});
