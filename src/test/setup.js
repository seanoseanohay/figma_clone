import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { createElement } from 'react'

// Mock Konva Stage API with proper methods
const mockStage = {
  container: vi.fn(() => ({
    offsetWidth: 800,
    offsetHeight: 600,
    style: { cursor: 'default' }
  })),
  getPointerPosition: vi.fn(() => ({ x: 100, y: 100 })),
  getAbsoluteTransform: vi.fn(() => ({
    copy: vi.fn(() => ({
      invert: vi.fn(),
      point: vi.fn((point) => point)
    }))
  })),
  scale: vi.fn(),
  position: vi.fn(),
  scaleX: vi.fn(() => 1),
  scaleY: vi.fn(() => 1),
  x: vi.fn(() => 0),
  y: vi.fn(() => 0)
}

// Mock Konva since it requires canvas
vi.mock('konva', () => ({
  Stage: vi.fn(),
  Layer: vi.fn(),
  Rect: vi.fn(),
}))

// Create a more realistic Stage mock that can be referenced
const StageComponent = ({ children, onWheel, onMouseDown, onMouseMove, onMouseUp, ...props }) => {
  const stageElement = createElement('div', {
    'data-testid': 'konva-stage',
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    ...props
  }, children)
  
  // Attach mock methods to the element for ref access
  Object.defineProperty(stageElement, 'container', {
    value: mockStage.container
  })
  Object.defineProperty(stageElement, 'getPointerPosition', {
    value: mockStage.getPointerPosition
  })
  Object.defineProperty(stageElement, 'getAbsoluteTransform', {
    value: mockStage.getAbsoluteTransform
  })
  Object.defineProperty(stageElement, 'scale', {
    value: mockStage.scale
  })
  Object.defineProperty(stageElement, 'position', {
    value: mockStage.position
  })
  Object.defineProperty(stageElement, 'scaleX', {
    value: mockStage.scaleX
  })
  Object.defineProperty(stageElement, 'scaleY', {
    value: mockStage.scaleY
  })
  Object.defineProperty(stageElement, 'x', {
    value: mockStage.x
  })
  Object.defineProperty(stageElement, 'y', {
    value: mockStage.y
  })
  
  return stageElement
}

vi.mock('react-konva', () => ({
  Stage: StageComponent,
  Layer: ({ children, ...props }) => createElement('div', { 'data-testid': 'konva-layer', ...props }, children),
  Rect: ({ listening, ...props }) => createElement('div', { 'data-testid': 'konva-rect', 'data-listening': String(listening), ...props }),
}))

// Mock Firebase
vi.mock('../services/firebase.js', () => ({
  auth: {},
  db: {},
  rtdb: {},
}))

// Mock window methods that might not exist in test environment
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
})

// Mock window.innerWidth and innerHeight
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
})
Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
})
