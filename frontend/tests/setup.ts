import "@testing-library/jest-dom/vitest";

// Mock ResizeObserver for Recharts and responsive UI in jsdom
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
