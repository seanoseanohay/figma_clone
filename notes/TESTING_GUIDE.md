# Testing Guide

## Overview

This project uses **Vitest** with **React Testing Library** for unit and integration testing. All new code must include comprehensive tests before being merged.

## Quick Start

```bash
# Run tests in watch mode (recommended for development)
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui
```

## Test File Organization

```
src/
├── components/
│   ├── canvas/
│   │   ├── Canvas.jsx
│   │   └── __tests__/
│   │       └── Canvas.test.jsx
│   └── ...
├── hooks/
│   ├── useCanvas.js
│   └── __tests__/
│       └── useCanvas.test.js
├── services/
│   ├── canvas.service.js
│   └── __tests__/
│       └── canvas.service.test.js
└── test/
    ├── setup.js          # Global test setup
    └── testUtils.jsx     # Shared test utilities
```

## Writing Tests

### Test Structure (AAA Pattern)

Follow the **Arrange-Act-Assert** pattern:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/testUtils'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render correctly', () => {
    // Arrange
    const props = { title: 'Test' }
    
    // Act
    render(<MyComponent {...props} />)
    
    // Assert
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```

### Testing Components

```javascript
import { render, screen, fireEvent } from '@/test/testUtils'
import { createMockUser, createMockCanvas } from '@/test/testUtils'

describe('CanvasSelector', () => {
  it('should display list of canvases', async () => {
    const mockCanvases = [
      createMockCanvas({ id: '1', name: 'Canvas 1' }),
      createMockCanvas({ id: '2', name: 'Canvas 2' })
    ]
    
    render(<CanvasSelector canvases={mockCanvases} />)
    
    expect(screen.getByText('Canvas 1')).toBeInTheDocument()
    expect(screen.getByText('Canvas 2')).toBeInTheDocument()
  })

  it('should handle canvas selection', async () => {
    const onSelect = vi.fn()
    const mockCanvases = [createMockCanvas({ name: 'Test Canvas' })]
    
    render(<CanvasSelector canvases={mockCanvases} onSelect={onSelect} />)
    
    fireEvent.click(screen.getByText('Test Canvas'))
    
    expect(onSelect).toHaveBeenCalledWith(mockCanvases[0].id)
  })
})
```

### Testing Hooks

```javascript
import { renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import useCanvases from '../useCanvases'

// Mock the service
vi.mock('@/services/canvas.service', () => ({
  getAccessibleCanvases: vi.fn()
}))

describe('useCanvases', () => {
  it('should fetch canvases on mount', async () => {
    const mockCanvases = [{ id: '1', name: 'Canvas 1' }]
    const { getAccessibleCanvases } = await import('@/services/canvas.service')
    getAccessibleCanvases.mockResolvedValue(mockCanvases)
    
    const { result } = renderHook(() => useCanvases('user-id'))
    
    await waitFor(() => {
      expect(result.current.canvases).toEqual(mockCanvases)
      expect(result.current.loading).toBe(false)
    })
  })

  it('should handle errors', async () => {
    const { getAccessibleCanvases } = await import('@/services/canvas.service')
    getAccessibleCanvases.mockRejectedValue(new Error('Failed to fetch'))
    
    const { result } = renderHook(() => useCanvases('user-id'))
    
    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch')
      expect(result.current.loading).toBe(false)
    })
  })
})
```

### Testing Services

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockFirestore } from '@/test/testUtils'
import * as canvasService from '../canvas.service'

// Mock Firebase
vi.mock('@/services/firebase', () => ({
  db: createMockFirestore()
}))

describe('canvas.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createCanvas', () => {
    it('should create a canvas with correct data', async () => {
      const { db } = await import('@/services/firebase')
      const mockAdd = vi.fn().mockResolvedValue({ id: 'new-canvas-id' })
      db.collection.mockReturnValue({ add: mockAdd })
      
      const canvasData = {
        name: 'New Canvas',
        ownerId: 'user-123'
      }
      
      const result = await canvasService.createCanvas(canvasData)
      
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Canvas',
          ownerId: 'user-123',
          createdAt: expect.any(Object)
        })
      )
      expect(result.id).toBe('new-canvas-id')
    })
  })

  describe('updateCanvasObject', () => {
    it('should update object position', async () => {
      const mockUpdate = vi.fn().mockResolvedValue()
      const { db } = await import('@/services/firebase')
      db.doc.mockReturnValue({ update: mockUpdate })
      
      await canvasService.updateCanvasObject('canvas-1', 'object-1', {
        x: 150,
        y: 200
      })
      
      expect(mockUpdate).toHaveBeenCalledWith({
        x: 150,
        y: 200,
        updatedAt: expect.any(Object)
      })
    })
  })
})
```

### Testing Tool Handlers

```javascript
import { describe, it, expect, vi } from 'vitest'
import { MoveTool } from '../../tools/MoveTool'
import { createMockCanvasObject } from '@/test/testUtils'

describe('MoveTool', () => {
  let moveTool
  let mockState
  let mockHelpers

  beforeEach(() => {
    moveTool = new MoveTool()
    
    mockState = {
      objects: [createMockCanvasObject('rectangle', { id: 'obj-1' })],
      selectedObjectId: 'obj-1',
      isConnected: true
    }
    
    mockHelpers = {
      updateObject: vi.fn(),
      claimOwnership: vi.fn(),
      releaseOwnership: vi.fn()
    }
  })

  describe('onMouseDown', () => {
    it('should claim ownership of selected object', () => {
      const event = { target: { attrs: { id: 'obj-1' } } }
      const stage = { getPointerPosition: () => ({ x: 100, y: 100 }) }
      
      moveTool.onMouseDown(event, stage, mockState, mockHelpers)
      
      expect(mockHelpers.claimOwnership).toHaveBeenCalledWith('obj-1')
    })

    it('should not claim ownership when offline', () => {
      mockState.isConnected = false
      const event = { target: { attrs: { id: 'obj-1' } } }
      const stage = { getPointerPosition: () => ({ x: 100, y: 100 }) }
      
      moveTool.onMouseDown(event, stage, mockState, mockHelpers)
      
      expect(mockHelpers.claimOwnership).not.toHaveBeenCalled()
    })
  })

  describe('onMouseMove', () => {
    it('should update object position', () => {
      // Setup: mouse down first
      const downEvent = { target: { attrs: { id: 'obj-1' } } }
      const stage = { getPointerPosition: () => ({ x: 100, y: 100 }) }
      moveTool.onMouseDown(downEvent, stage, mockState, mockHelpers)
      
      // Act: move mouse
      stage.getPointerPosition = () => ({ x: 150, y: 150 })
      moveTool.onMouseMove({}, stage, mockState, mockHelpers)
      
      // Assert
      expect(mockHelpers.updateObject).toHaveBeenCalledWith('obj-1', {
        x: expect.any(Number),
        y: expect.any(Number)
      })
    })
  })

  describe('onMouseUp', () => {
    it('should release ownership', () => {
      const event = { target: { attrs: { id: 'obj-1' } } }
      const stage = { getPointerPosition: () => ({ x: 100, y: 100 }) }
      
      moveTool.onMouseDown(event, stage, mockState, mockHelpers)
      moveTool.onMouseUp({}, stage, mockState, mockHelpers)
      
      expect(mockHelpers.releaseOwnership).toHaveBeenCalledWith('obj-1')
    })
  })
})
```

## Test Coverage Requirements

### Minimum Coverage Targets
- **Components**: 80%+ coverage
- **Hooks**: 90%+ coverage  
- **Services**: 90%+ coverage
- **Utilities**: 95%+ coverage

### What to Test

✅ **DO Test:**
- Component rendering with different props
- User interactions (clicks, typing, etc.)
- State changes and effects
- Error handling and edge cases
- Hook behavior and side effects
- Service function success and error paths
- Integration between components

❌ **DON'T Test:**
- Third-party libraries (Firebase, Konva, etc.)
- Implementation details (internal state, private methods)
- CSS styling (use visual verification instead)
- Obvious code (simple getters/setters)

## Best Practices

### 1. Test Naming
Use descriptive test names that explain what is being tested:

```javascript
// ✅ Good
it('should display error message when canvas creation fails')

// ❌ Bad  
it('error test')
```

### 2. Mock External Dependencies
Always mock Firebase, network calls, and other external systems:

```javascript
vi.mock('@/services/firebase', () => ({
  db: createMockFirestore(),
  rtdb: createMockRTDB()
}))
```

### 3. Keep Tests Isolated
Each test should be independent and not rely on others:

```javascript
beforeEach(() => {
  vi.clearAllMocks()
  // Reset any shared state
})
```

### 4. Test User Behavior, Not Implementation
Focus on what users see and do:

```javascript
// ✅ Good - tests user behavior
expect(screen.getByRole('button', { name: /create canvas/i })).toBeInTheDocument()

// ❌ Bad - tests implementation
expect(wrapper.find('.create-button').length).toBe(1)
```

### 5. Use Testing Library Queries Properly

**Query Priority:**
1. `getByRole` - Best for accessibility
2. `getByLabelText` - Good for forms
3. `getByPlaceholderText` - Acceptable for inputs
4. `getByText` - Good for content
5. `getByTestId` - Last resort

### 6. Async Testing
Always await async operations:

```javascript
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
})
```

## Common Testing Patterns

### Pattern: Testing Error Boundaries

```javascript
it('should display error message when component throws', () => {
  const ThrowError = () => { throw new Error('Test error') }
  
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  )
  
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
})
```

### Pattern: Testing Loading States

```javascript
it('should show loading spinner while fetching data', () => {
  render(<CanvasSelector userId="test-user" />)
  
  expect(screen.getByRole('status')).toBeInTheDocument()
})
```

### Pattern: Testing Form Submissions

```javascript
it('should submit form with entered values', async () => {
  const onSubmit = vi.fn()
  render(<CreateCanvasForm onSubmit={onSubmit} />)
  
  const input = screen.getByLabelText(/canvas name/i)
  await userEvent.type(input, 'New Canvas')
  
  const button = screen.getByRole('button', { name: /create/i })
  await userEvent.click(button)
  
  expect(onSubmit).toHaveBeenCalledWith({ name: 'New Canvas' })
})
```

## Debugging Tests

### View Test Output
```bash
npm run test:ui  # Opens Vitest UI in browser
```

### Debug Rendered Output
```javascript
import { screen, render } from '@testing-library/react'
import { debug } from '@testing-library/react'

render(<MyComponent />)
screen.debug()  // Prints DOM to console
```

### Check Element Queries
```javascript
// Use *ByRole with empty string to see all available roles
screen.getByRole('')  // Shows all roles in error message
```

## CI/CD Integration

Tests run automatically on:
- Pre-commit hooks (via husky - to be set up)
- Pull requests (GitHub Actions - to be set up)
- Deployments (blocks if tests fail)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Getting Help

If you're unsure how to test something:
1. Check existing tests in the codebase for similar patterns
2. Refer to this guide
3. Check the [Testing Library docs](https://testing-library.com/)
4. Ask the team for code review feedback


