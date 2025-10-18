import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

/**
 * Custom render function that wraps components with necessary providers
 */
export const renderWithProviders = (ui, options = {}) => {
  const { route = '/', ...renderOptions } = options;

  // Mock router navigation
  window.history.pushState({}, 'Test page', route);

  const Wrapper = ({ children }) => (
    <BrowserRouter>{children}</BrowserRouter>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};

/**
 * Wait for a condition to be true (useful for async operations)
 */
export const waitFor = async (condition, { timeout = 5000, interval = 50 } = {}) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

/**
 * Create a mock mouse event
 */
export const createMouseEvent = (type, { x = 0, y = 0, button = 0, ...rest } = {}) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button,
    ...rest,
  });
  
  return event;
};

/**
 * Create a mock keyboard event
 */
export const createKeyboardEvent = (type, { key = '', code = '', ...rest } = {}) => {
  const event = new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    key,
    code,
    ...rest,
  });
  
  return event;
};

/**
 * Simulate a drag operation
 */
export const simulateDrag = (element, { from, to, steps = 10 } = {}) => {
  const { x: startX, y: startY } = from;
  const { x: endX, y: endY } = to;
  
  // Mouse down at start position
  element.dispatchEvent(createMouseEvent('mousedown', { x: startX, y: startY }));
  
  // Move in steps
  const deltaX = (endX - startX) / steps;
  const deltaY = (endY - startY) / steps;
  
  for (let i = 1; i <= steps; i++) {
    const x = startX + deltaX * i;
    const y = startY + deltaY * i;
    element.dispatchEvent(createMouseEvent('mousemove', { x, y }));
  }
  
  // Mouse up at end position
  element.dispatchEvent(createMouseEvent('mouseup', { x: endX, y: endY }));
};

/**
 * Mock console methods for cleaner test output
 */
export const mockConsole = () => {
  const originalConsole = { ...console };
  
  const restore = () => {
    global.console = originalConsole;
  };
  
  global.console = {
    ...console,
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };
  
  return {
    restore,
    log: global.console.log,
    warn: global.console.warn,
    error: global.console.error,
    info: global.console.info,
    debug: global.console.debug,
  };
};

/**
 * Wait for next animation frame (useful for Konva rendering)
 */
export const waitForNextFrame = () => {
  return new Promise(resolve => requestAnimationFrame(resolve));
};

/**
 * Create a mock Konva stage
 */
export const createMockStage = () => ({
  container: vi.fn(() => document.createElement('div')),
  width: vi.fn(() => 800),
  height: vi.fn(() => 600),
  getPointerPosition: vi.fn(() => ({ x: 0, y: 0 })),
  batchDraw: vi.fn(),
  draw: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  findOne: vi.fn(),
  find: vi.fn(() => []),
  getLayers: vi.fn(() => []),
  getIntersection: vi.fn(),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
});

/**
 * Create a mock Konva layer
 */
export const createMockLayer = () => ({
  add: vi.fn(),
  draw: vi.fn(),
  batchDraw: vi.fn(),
  find: vi.fn(() => []),
  findOne: vi.fn(),
  destroyChildren: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
});

/**
 * Assert that two positions are approximately equal (within tolerance)
 */
export const assertPositionEqual = (actual, expected, tolerance = 1) => {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(tolerance);
};

/**
 * Assert that an angle is approximately equal (within tolerance)
 */
export const assertAngleEqual = (actual, expected, tolerance = 1) => {
  // Normalize angles to 0-360 range
  const normalizeAngle = (angle) => ((angle % 360) + 360) % 360;
  const normalizedActual = normalizeAngle(actual);
  const normalizedExpected = normalizeAngle(expected);
  
  const diff = Math.abs(normalizedActual - normalizedExpected);
  const wrappedDiff = Math.min(diff, 360 - diff);
  
  expect(wrappedDiff).toBeLessThanOrEqual(tolerance);
};

