import '@testing-library/jest-dom';

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
