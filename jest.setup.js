require('@testing-library/jest-dom');

// Polyfill window.matchMedia for JSDOM
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Polyfill IntersectionObserver for JSDOM
if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  window.IntersectionObserver = global.IntersectionObserver;
}

// Polyfill ResizeObserver for JSDOM
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = global.ResizeObserver;
}
