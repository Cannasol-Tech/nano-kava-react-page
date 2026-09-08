/**
 * @file: src/utils/sceneCanvas.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Clear colour and 2d-context flags for NanoScene. The visible canvas is opaque and
 *     filled with the same hex as App.jsx's page background, so compositing skips alpha
 *     blending without changing a pixel. See src/CLAUDE.md § The measured budget.
 *
 * @See Also:
 *     src/components/NanoScene.jsx
 *     src/App.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

// Must match App.jsx: isDark ? 'bg-slate-950' : 'bg-gray-50'
export const SCENE_CLEAR = {
  dark: '#020617',
  light: '#f9fafb',
};

export const SCENE_CONTEXT_OPTIONS = { alpha: false };

export const MAX_SCENE_DPR = 2;

export function sceneClearColor(isDark) {
  return isDark ? SCENE_CLEAR.dark : SCENE_CLEAR.light;
}

export function sceneDpr(raw) {
  const value = raw ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
  return Math.min(value || 1, MAX_SCENE_DPR);
}
