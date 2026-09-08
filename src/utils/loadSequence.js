/**
 * @file: src/utils/loadSequence.js
 * @author: Stephen Boyett
 *
 * @description:
 *     One shared clock for the first-paint load sequence — sphere assemble, ultrasonic
 *     pulse, Sol's arrival. Consumers read marks off this clock instead of signalling each
 *     other, so no stage transition re-renders the page tree. See components/CLAUDE.md § Load sequence.
 *
 * @See Also:
 *     src/components/LoadPulse.jsx
 *     src/components/NanoScene.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

export const SEQUENCE = {
  assembleMs: 1500,
  crossfadeFrom: 0.72,
  pulseAtMs: 1280,
  pulseMs: 1900,
  solAtMs: 2150,
  arriveMs: 1150,
  greetAtMs: 3800,
};

let startedAt = null;

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function ensureStarted() {
  if (startedAt === null) startedAt = now();
  return startedAt;
}

/** True only where the snapshot, the visitor's preference and the browser can all afford it. */
export function isSequenceEnabled() {
  if (typeof window === 'undefined') return false;
  if (window.__PRERENDER__ === true) return false;
  if (typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
}

/**
 * Sol still introduces himself where the motion is switched off — being greeted is content, not
 * decoration, and a Safari visitor losing the sale because the sphere is absent would be absurd.
 * Only the prerenderer opts out, because its snapshot must ship closed.
 */
export function shouldGreet() {
  if (typeof window === 'undefined') return false;
  return window.__PRERENDER__ !== true;
}

export function sequenceElapsed() {
  return now() - ensureStarted();
}

export function msUntil(markMs) {
  const remaining = markMs - sequenceElapsed();
  return remaining > 0 ? remaining : 0;
}

/** Linear 0..1 across the assemble window; NanoScene shapes it with smoothstep per point. */
export function assembleProgress(elapsedMs) {
  const p = elapsedMs / SEQUENCE.assembleMs;
  if (p <= 0) return 0;
  return p >= 1 ? 1 : p;
}

export function smoothstep(edge0, edge1, x) {
  let t = (x - edge0) / (edge1 - edge0);
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}
