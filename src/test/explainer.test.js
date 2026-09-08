/**
 * @file: src/test/explainer.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The nano explainer is opened by a model tool call from inside ChatPanel but renders at
 *     App level, so the two are joined by a signal rather than by prop drilling.
 *
 * @See Also:
 *     src/utils/explainer.js
 *     src/components/NanoExplainer.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, vi } from 'vitest';

async function loadModule() {
  vi.resetModules();
  return import('../utils/explainer');
}

describe('explainer signal', () => {
  it('carries open and close to every subscriber', async () => {
    const { openExplainer, closeExplainer, subscribeExplainer } = await loadModule();
    const a = [];
    const b = [];
    subscribeExplainer((open) => a.push(open));
    subscribeExplainer((open) => b.push(open));

    openExplainer();
    closeExplainer();

    expect(a).toEqual([true, false]);
    expect(b).toEqual([true, false]);
  });

  it('stops notifying an unsubscribed listener', async () => {
    const { openExplainer, subscribeExplainer } = await loadModule();
    const seen = [];
    const off = subscribeExplainer((open) => seen.push(open));
    off();
    openExplainer();
    expect(seen).toEqual([]);
  });
});
