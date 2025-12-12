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
