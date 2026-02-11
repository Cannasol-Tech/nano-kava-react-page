// Centralized animation loop — single requestAnimationFrame shared across all canvas components.
// Components register/unregister callbacks; the loop starts when the first registers and
// stops when the last unregisters. Pauses automatically when the browser tab is hidden.

const callbacks = new Map();
let rafId = null;
let frameCount = 0;
let paused = false;

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

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    paused = true;
    stopLoop();
  } else {
    paused = false;
    startLoop();
  }
});

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
