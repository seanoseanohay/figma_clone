import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Extend expect with jest-dom matchers
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock Firebase services globally
vi.mock('@/config/firebase', () => ({
  db: {
    collection: vi.fn(),
    doc: vi.fn(),
  },
  rtdb: {
    ref: vi.fn(),
  },
  auth: {
    currentUser: {
      uid: 'test-user-id',
      email: 'bobtester@test.com',
      displayName: 'Bob Tester',
    },
    onAuthStateChanged: vi.fn(),
  },
  storage: {
    ref: vi.fn(),
  },
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock HTMLCanvasElement methods
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
}));

// Suppress console errors during tests (unless needed for debugging)
// global.console = {
//   ...console,
//   error: vi.fn(),
//   warn: vi.fn(),
// };
