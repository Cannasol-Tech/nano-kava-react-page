// Centralized animation loop — single requestAnimationFrame shared across all canvas components.
// Components register/unregister callbacks; the loop starts when the first registers and
// stops when the last unregisters. Pauses automatically when the browser tab is hidden
// (minimised, backgrounded, or otherwise not visible) and pauses CSS animations with it.

export const ANIMATIONS_PAUSED_CLASS = 'animations-paused';

const callbacks = new Map();
let rafId = null;
let frameCount = 0;
let paused = typeof document !== 'undefined' && document.hidden;

function startLoop() {
  if (rafId === null && callbacks.size > 0 && !paused) {
    rafId = requestAnimationFrame(tick);
  }
}

function stopLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function tick(timestamp) {
  if (paused) return;
  frameCount++;
  for (const cb of callbacks.values()) {
    cb(timestamp, frameCount);
  }
  if (callbacks.size > 0 && !paused) {
    rafId = requestAnimationFrame(tick);
  }
}

function syncVisibility() {
  if (typeof document === 'undefined') return;
  if (document.hidden) {
    paused = true;
    stopLoop();
    document.documentElement.classList.add(ANIMATIONS_PAUSED_CLASS);
  } else {
    paused = false;
    document.documentElement.classList.remove(ANIMATIONS_PAUSED_CLASS);
    startLoop();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', syncVisibility);
  if (document.hidden) syncVisibility();
}

export function registerAnimation(id, callback) {
  callbacks.set(id, callback);
  startLoop();
}

export function unregisterAnimation(id) {
  callbacks.delete(id);
  if (callbacks.size === 0) {
    stopLoop();
  }
}
