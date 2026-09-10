import '@testing-library/jest-dom';
import { THEME_STORAGE_KEY } from '../utils/themeStorage';

if (typeof globalThis.IntersectionObserver === 'undefined') {
  class MockIntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }

  globalThis.IntersectionObserver = MockIntersectionObserver;
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  class MockResizeObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  globalThis.ResizeObserver = MockResizeObserver;
}

// Mock window.scrollTo
window.scrollTo = () => {};

// jsdom does not implement scrollIntoView at all (undefined, not a no-op) — ChatPanel calls it
// on a freshly mounted lead card, so any test rendering one throws without this.
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = () => {};
}

// Mock matchMedia
window.matchMedia = () => ({
  matches: false,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
});

// Mock canvas context for NanoScene tests. jsdom defines getContext as a stub that throws,
// so this must overwrite unconditionally rather than only filling in a missing method.
HTMLCanvasElement.prototype.getContext = function (contextType) {
  if (contextType === '2d') {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      setTransform: () => {},
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      arc: () => {},
      ellipse: () => {},
      createRadialGradient: () => ({
        addColorStop: () => {},
      }),
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
      drawImage: () => {},
      save: () => {},
      restore: () => {},
    };
  }
  return null;
};

// Node 22+ defines global localStorage that is unavailable without --localstorage-file,
// and that shadows jsdom's implementation on window. Tests and ThemeProvider need a store.
function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(String(key), String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null,
  };
}

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  writable: true,
  value: createMemoryStorage(),
});

beforeEach(() => {
  try {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    /* jsdom without storage */
  }
});
