import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

/**
 * Custom render function that wraps components with common providers
 * Usage: renderWithProviders(<MyComponent />)
 */
export function renderWithProviders(ui, options = {}) {
  const {
    initialEntries = ['/'],
    ...renderOptions
  } = options

  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        {children}
      </BrowserRouter>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * Create mock canvas context for testing
 */
export function createMockCanvasContext(overrides = {}) {
  return {
    currentCanvas: null,
    setCurrentCanvas: vi.fn(),
    ...overrides
  }
}

/**
 * Create mock user for testing
 */
export function createMockUser(overrides = {}) {
  return {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    ...overrides
  }
}

/**
 * Create mock canvas object for testing
 */
export function createMockCanvas(overrides = {}) {
  return {
    id: 'test-canvas-id',
    name: 'Test Canvas',
    ownerId: 'test-user-id',
    collaborators: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

/**
 * Create mock canvas object (rectangle/circle/etc) for testing
 */
export function createMockCanvasObject(type = 'rectangle', overrides = {}) {
  return {
    id: `test-object-${Math.random()}`,
    type,
    x: 100,
    y: 100,
    width: 100,
    height: 100,
    fill: '#000000',
    createdBy: 'test-user-id',
    createdAt: new Date(),
    ...overrides
  }
}

/**
 * Mock Firebase Firestore operations
 */
export function createMockFirestore() {
  const mockDoc = vi.fn(() => ({
    get: vi.fn(() => Promise.resolve({
      exists: () => true,
      data: () => ({}),
      id: 'mock-id'
    })),
    set: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
    onSnapshot: vi.fn(() => vi.fn()) // Returns unsubscribe function
  }))

  const mockCollection = vi.fn(() => ({
    doc: mockDoc,
    add: vi.fn(() => Promise.resolve({ id: 'new-mock-id' })),
    where: vi.fn(() => ({
      get: vi.fn(() => Promise.resolve({
        docs: [],
        empty: true
      })),
      onSnapshot: vi.fn(() => vi.fn())
    })),
    get: vi.fn(() => Promise.resolve({
      docs: [],
      empty: true
    })),
    onSnapshot: vi.fn(() => vi.fn())
  }))

  return {
    collection: mockCollection,
    doc: mockDoc
  }
}

/**
 * Mock Firebase RTDB operations
 */
export function createMockRTDB() {
  const mockRef = vi.fn(() => ({
    set: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(() => Promise.resolve({
      val: () => null
    }))
  }))

  return {
    ref: mockRef
  }
}

/**
 * Wait for async updates to complete
 */
export async function waitForAsync() {
  await new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Simulate mouse event with coordinates
 */
export function createMouseEvent(type, { clientX = 0, clientY = 0, ...rest } = {}) {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    ...rest
  })
}

/**
 * Simulate keyboard event
 */
export function createKeyboardEvent(type, { key, code, ...rest } = {}) {
  return new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    key,
    code,
    ...rest
  })
}

// Re-export everything from testing library
export * from '@testing-library/react'



