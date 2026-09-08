/**
 * @file: src/test/viewport.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Viewport gating runs in jsdom and in the prerenderer, neither of which is guaranteed a
 *     working matchMedia, so these cover the degraded paths as closely as the happy one.
 *
 * @See Also:
 *     src/utils/viewport.js
 *     src/test/labMode.test.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { MOBILE_QUERY, isMobileViewport, subscribeViewport } from '../utils/viewport';

const original = window.matchMedia;

function stubMatchMedia(impl) {
  window.matchMedia = impl;
}

function modernList(matches) {
  const handlers = new Set();
  return {
    matches,
    addEventListener: (type, fn) => type === 'change' && handlers.add(fn),
    removeEventListener: (type, fn) => type === 'change' && handlers.delete(fn),
    fire: (next) => handlers.forEach((fn) => fn({ matches: next })),
  };
}

function legacyList(matches) {
  const handlers = new Set();
  return {
    matches,
    addListener: (fn) => handlers.add(fn),
    removeListener: (fn) => handlers.delete(fn),
    fire: (next) => handlers.forEach((fn) => fn({ matches: next })),
  };
}

afterEach(() => {
  window.matchMedia = original;
});

describe('viewport', () => {
  it('reports mobile when the phone-width query matches', () => {
    stubMatchMedia((query) => modernList(query === MOBILE_QUERY));
    expect(isMobileViewport()).toBe(true);
  });

  it('reports not mobile on a wider viewport', () => {
    stubMatchMedia(() => modernList(false));
    expect(isMobileViewport()).toBe(false);
  });

  it('reports not mobile when the browser has no matchMedia', () => {
    stubMatchMedia(undefined);
    expect(isMobileViewport()).toBe(false);
  });

  it('reports not mobile when matchMedia throws', () => {
    stubMatchMedia(() => { throw new Error('unsupported query'); });
    expect(isMobileViewport()).toBe(false);
  });

  it('tells a subscriber when the viewport crosses the breakpoint', () => {
    const list = modernList(false);
    stubMatchMedia(() => list);
    const seen = [];
    subscribeViewport((isMobile) => seen.push(isMobile));

    list.fire(true);
    list.fire(false);
    expect(seen).toEqual([true, false]);
  });

  it('stops telling a subscriber once it unsubscribes', () => {
    const list = modernList(false);
    stubMatchMedia(() => list);
    const seen = [];
    const off = subscribeViewport((isMobile) => seen.push(isMobile));

    list.fire(true);
    off();
    list.fire(false);
    expect(seen).toEqual([true]);
  });

  it('still subscribes and unsubscribes on browsers with only the deprecated API', () => {
    const list = legacyList(false);
    stubMatchMedia(() => list);
    const seen = [];
    const off = subscribeViewport((isMobile) => seen.push(isMobile));

    list.fire(true);
    off();
    list.fire(false);
    expect(seen).toEqual([true]);
  });

  it('returns a harmless unsubscribe when the browser has no matchMedia', () => {
    stubMatchMedia(undefined);
    const off = subscribeViewport(vi.fn());
    expect(off).toBeTypeOf('function');
    expect(() => off()).not.toThrow();
  });
});
