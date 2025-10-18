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

// Mock react-konva components globally
import React from 'react';

vi.mock('react-konva', () => {
  // Create a Stage component that provides container() method
  const Stage = React.forwardRef(({ children, ...props }, ref) => {
    const divRef = React.useRef(null);
    
    // Attach Konva Stage methods to the ref
    React.useImperativeHandle(ref, () => ({
      container: () => divRef.current || document.createElement('div'),
      getPointerPosition: () => ({ x: 0, y: 0 }),
      scale: () => ({ x: 1, y: 1 }),
      scaleX: () => 1,
      scaleY: () => 1,
      x: () => 0,
      y: () => 0,
      width: () => 800,
      height: () => 600,
      getStage: () => ref?.current,
      position: () => ({ x: 0, y: 0 }),
      setPosition: vi.fn(),
      setScale: vi.fn(),
      batchDraw: vi.fn(),
      draw: vi.fn(),
      find: vi.fn(() => []),
      findOne: vi.fn(() => null)
    }));
    
    return React.createElement('div', { 
      'data-testid': 'konva-stage', 
      ref: divRef,
      ...props 
    }, children);
  });
  
  return {
  Stage,
  Layer: React.forwardRef(({ children, ...props }, ref) => {
    React.useImperativeHandle(ref, () => ({
      getStage: () => null,
      getParent: () => null,
      attrs: {}
    }));
    return React.createElement('div', { 'data-testid': 'konva-layer', ...props }, children);
  }),
  Group: React.forwardRef(({ children, listening, ...props }, ref) => {
    React.useImperativeHandle(ref, () => ({
      getStage: () => null,
      getParent: () => null,
      attrs: { listening }
    }));
    return React.createElement('div', { 'data-testid': 'konva-group', 'data-listening': String(listening), ...props }, children);
  }),
  Rect: React.forwardRef(({ fill, cornerRadius, shadowColor, shadowOffsetX, shadowOffsetY, shadowBlur, ...props }, ref) => {
    React.useImperativeHandle(ref, () => ({
      getStage: () => null,
      getParent: () => null,
      attrs: { fill, cornerRadius }
    }));
    return React.createElement('div', { 
      'data-testid': 'konva-rect', 
      'data-fill': fill,
      'data-corner-radius': cornerRadius,
      ...props 
    });
  }),
  Text: React.forwardRef(({ text, fontSize, fill, verticalAlign, ...props }, ref) => {
    React.useImperativeHandle(ref, () => ({
      getStage: () => null,
      getParent: () => null,
      attrs: { text, fontSize, fill, verticalAlign }
    }));
    return React.createElement('div', { 
      'data-testid': 'konva-text', 
      'data-text': text,
      'data-font-size': fontSize,
      'data-fill': fill,
      'data-vertical-align': verticalAlign,
      ...props 
    });
  }),
  Circle: React.forwardRef(({ ...props }, ref) => {
    React.useImperativeHandle(ref, () => ({
      getStage: () => null,
      getParent: () => null,
      attrs: {}
    }));
    return React.createElement('div', { 'data-testid': 'konva-circle', ...props });
  }),
  Star: React.forwardRef(({ ...props }, ref) => {
    React.useImperativeHandle(ref, () => ({
      getStage: () => null,
      getParent: () => null,
      attrs: {}
    }));
    return React.createElement('div', { 'data-testid': 'konva-star', ...props });
  }),
  Transformer: React.forwardRef(({ ...props }, ref) => {
    React.useImperativeHandle(ref, () => ({
      getStage: () => null,
      getParent: () => null,
      attrs: {}
    }));
    return React.createElement('div', { 'data-testid': 'konva-transformer', ...props });
  })
  };
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
