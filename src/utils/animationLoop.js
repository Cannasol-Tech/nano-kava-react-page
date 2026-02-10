// Centralized animation loop — single requestAnimationFrame shared across all canvas components.
// Components register/unregister callbacks; the loop starts when the first registers and
// stops when the last unregisters.

const callbacks = new Map();
let rafId = null;
let frameCount = 0;

function tick(timestamp) {
  frameCount++;
  for (const cb of callbacks.values()) {
    cb(timestamp, frameCount);
  }
  if (callbacks.size > 0) {
    rafId = requestAnimationFrame(tick);
  }
}

export function registerAnimation(id, callback) {
  callbacks.set(id, callback);
  if (callbacks.size === 1) {
    rafId = requestAnimationFrame(tick);
  }
}

export function unregisterAnimation(id) {
  callbacks.delete(id);
  if (callbacks.size === 0 && rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}
