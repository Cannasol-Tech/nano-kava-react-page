/**
 * @file: src/test/sceneCanvas.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The scene canvas is composited over App's slate-950 / gray-50 layer every frame.
 *     An opaque 2d context with a matching clear colour is pixel-identical and cheaper
 *     for the compositor than a transparent canvas. These values must stay in lockstep
 *     with App.jsx or the particles' edges would tint.
 *
 * @See Also:
 *     src/utils/sceneCanvas.js
 *     src/App.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect } from 'vitest';
import {
  MAX_SCENE_DPR,
  SCENE_CONTEXT_OPTIONS,
  sceneClearColor,
  sceneDpr,
} from '../utils/sceneCanvas';

describe('sceneCanvas', () => {
  it('requests an opaque 2d context so the compositor skips alpha blending', () => {
    expect(SCENE_CONTEXT_OPTIONS).toEqual({ alpha: false });
  });

  it('clears to the same hex as App.jsx\'s Tailwind page background', () => {
    expect(sceneClearColor(true)).toBe('#020617');  // slate-950
    expect(sceneClearColor(false)).toBe('#f9fafb'); // gray-50
  });

  it('caps devicePixelRatio so a 3x display does not 2.25× the fill cost', () => {
    expect(MAX_SCENE_DPR).toBe(2);
    expect(sceneDpr(1)).toBe(1);
    expect(sceneDpr(2)).toBe(2);
    expect(sceneDpr(3)).toBe(2);
    expect(sceneDpr(0)).toBe(1);
  });
});
