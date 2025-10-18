
# Testing Guide

## Overview

This project uses a comprehensive testing framework built on **Vitest** and **React Testing Library** to ensure code reliability and prevent regressions.

## Table of Contents

- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Testing Patterns](#testing-patterns)
- [Mocking](#mocking)
- [Test Fixtures](#test-fixtures)
- [Test-Driven Development (TDD)](#test-driven-development-tdd)
- [Regression Tests](#regression-tests)
- [Coverage Requirements](#coverage-requirements)
- [Best Practices](#best-practices)

---

## Running Tests

### Basic Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with visual UI interface
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### Running Specific Tests

```bash
# Run tests for a specific file
npm test SelectTool.test.js

# Run tests matching a pattern
npm test -- -t "onMouseDown"

# Run tests in a specific directory
npm test src/tools/
```

---

## Test Structure

Tests are co-located with source files:

```
src/
  tools/
    SelectTool.js
    SelectTool.test.js      # Unit tests for SelectTool
  components/
    canvas/
      Canvas.jsx
      Canvas.test.jsx        # Component tests for Canvas
  test/
    setup.js                 # Global test setup
    mocks/
      firebase.js            # Firebase mocks
    fixtures/
      testData.js            # Reusable test data
    utils/
      testHelpers.js         # Test utilities
    regression/
      E4_resize_crossover.test.js  # Regression tests
```

---

## Writing Tests

### Basic Test Template

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MyComponent } from './MyComponent.js';

describe('MyComponent', () => {
  let mockState;
  
  beforeEach(() => {
    // Setup before each test
    mockState = {
      value: 0,
      setValue: vi.fn(),
    };
  });
  
  afterEach(() => {
    // Cleanup after each test
    vi.clearAllMocks();
  });
  
  describe('Feature Group', () => {
    it('should perform expected behavior', () => {
      // Arrange: Set up test data and conditions
      const input = 'test';
      
      // Act: Execute the code being tested
      const result = MyComponent.process(input);
      
      // Assert: Verify the results
      expect(result).toBe('expected');
    });
  });
});
```

### Tool Testing Pattern

```javascript
import { SelectTool } from './SelectTool.js';
import { createTestRectangle } from '../test/fixtures/testData.js';
import * as canvasService from '../services/canvas.service.js';

// Mock external dependencies
vi.mock('../services/canvas.service.js', () => ({
  lockObject: vi.fn(),
  unlockObject: vi.fn(),
}));

describe('SelectTool', () => {
  let tool;
  let mockState;
  let mockHelpers;

  beforeEach(() => {
    tool = new SelectTool();
    
    mockState = {
      findObjectAt: vi.fn(),
      canEditObject: vi.fn(() => true),
      selectedObjectId: null,
      setSelectedObjectId: vi.fn(),
    };
    
    mockHelpers = {
      pos: { x: 0, y: 0 },
      canvasId: 'test-canvas-id',
    };
  });

  it('should select an object when clicked', async () => {
    const rectangle = createTestRectangle();
    mockState.findObjectAt.mockReturnValue(rectangle);
    mockHelpers.pos = { x: 150, y: 150 };
    
    await tool.onMouseDown({}, mockState, mockHelpers);
    
    expect(canvasService.lockObject).toHaveBeenCalledWith(rectangle.id);
    expect(mockState.setSelectedObjectId).toHaveBeenCalledWith(rectangle.id);
  });
});
```

### Component Testing Pattern

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@test/utils/testHelpers.js';
import { Toolbar } from './Toolbar.jsx';

describe('Toolbar Component', () => {
  it('should render all tool buttons', () => {
    render(<Toolbar onToolChange={vi.fn()} selectedTool="select" />);
    
    expect(screen.getByTitle('Select Tool')).toBeInTheDocument();
    expect(screen.getByTitle('Move Tool')).toBeInTheDocument();
    expect(screen.getByTitle('Resize Tool')).toBeInTheDocument();
  });
  
  it('should call onToolChange when button clicked', () => {
    const mockOnToolChange = vi.fn();
    render(<Toolbar onToolChange={mockOnToolChange} selectedTool="select" />);
    
    fireEvent.click(screen.getByTitle('Move Tool'));
    
    expect(mockOnToolChange).toHaveBeenCalledWith('move');
  });
});
```

---

## Testing Patterns

### Arrange-Act-Assert (AAA) Pattern

Always structure tests with clear separation:

```javascript
it('should calculate rectangle area', () => {
  // Arrange: Set up test data
  const width = 10;
  const height = 20;
  
  // Act: Execute the function
  const area = calculateArea(width, height);
  
  // Assert: Verify the result
  expect(area).toBe(200);
});
```

### Testing Async Code

```javascript
it('should fetch data from API', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

it('should handle errors', async () => {
  await expect(fetchInvalidData()).rejects.toThrow('Not found');
});
```

### Testing Side Effects

```javascript
it('should call callback on completion', () => {
  const mockCallback = vi.fn();
  
  performAction(mockCallback);
  
  expect(mockCallback).toHaveBeenCalledTimes(1);
  expect(mockCallback).toHaveBeenCalledWith('success');
});
```

---

## Mocking

### Mocking Modules

```javascript
// Mock entire module
vi.mock('../services/canvas.service.js', () => ({
  createObject: vi.fn(),
  updateObject: vi.fn(),
  deleteObject: vi.fn(),
}));

// Partial module mock (keep some real implementations)
vi.mock('../services/canvas.service.js', async () => {
  const actual = await vi.importActual('../services/canvas.service.js');
  return {
    ...actual,
    createObject: vi.fn(), // Override only this
  };
});
```

### Mocking Functions

```javascript
// Create a mock function
const mockFunction = vi.fn();

// Mock return value
mockFunction.mockReturnValue(42);

// Mock resolved promise
mockFunction.mockResolvedValue({ data: 'test' });

// Mock rejected promise
mockFunction.mockRejectedValue(new Error('Failed'));

// Mock implementation
mockFunction.mockImplementation((x) => x * 2);
```

### Firebase Mocking

Firebase is mocked globally in `src/test/setup.js`. Use the provided mock utilities:

```javascript
import { createMockFirestore, createMockRTDB } from '@test/mocks/firebase.js';

const mockDB = createMockFirestore();
mockDB.mockData.set('doc-id', { name: 'Test' });
```

---

## Test Fixtures

Use pre-defined test fixtures for consistency:

```javascript
import {
  createTestUser,
  createTestRectangle,
  createTestCircle,
  createTestText,
  createTestCanvasState,
} from '@test/fixtures/testData.js';

// Create test objects with default values
const rectangle = createTestRectangle();

// Override specific properties
const customRectangle = createTestRectangle({
  x: 200,
  y: 300,
  fill: '#FF0000',
});

// Create complete canvas state
const canvasState = createTestCanvasState();
```

---

## Test-Driven Development (TDD)

Follow the Red-Green-Refactor cycle:

### 1. **Red**: Write a Failing Test First

```javascript
describe('New Feature', () => {
  it('should calculate total price with tax', () => {
    const result = calculateTotalWithTax(100, 0.08);
    expect(result).toBe(108);
  });
});
```

Run test → It fails (feature doesn't exist yet) ❌

### 2. **Green**: Write Minimal Code to Pass

```javascript
function calculateTotalWithTax(price, taxRate) {
  return price + (price * taxRate);
}
```

Run test → It passes ✅

### 3. **Refactor**: Clean Up Code

```javascript
function calculateTotalWithTax(price, taxRate) {
  if (price < 0) throw new Error('Price cannot be negative');
  return price * (1 + taxRate);
}
```

Run test → Still passes ✅

---

## Regression Tests

For every bug fix, create a regression test to prevent it from happening again.

### Regression Test Structure

```javascript
/**
 * REGRESSION TEST for Task E4: Fix Critical Rectangle Resize Bug
 * 
 * Original Bug:
 * When dragging NW handle past SE corner, rectangle jumped back to original position.
 * 
 * Expected Behavior:
 * Handle transitions smoothly, no position jumping.
 * 
 * Documentation: See notes/E4_RESIZE_BUG_FIX.md
 */
describe('E4 Regression: Rectangle Resize Handle Crossover Bug', () => {
  it('should prevent coordinate jumping when handle crosses over', () => {
    // Test implementation
  });
});
```

Place regression tests in `src/test/regression/` directory.

---

## Coverage Requirements

### Coverage Thresholds

```
Overall:     75% minimum
Critical:    90% (tools, geometry, ownership)
Important:   80% (services, hooks)
Standard:    70% (components, UI)
```

### Check Coverage

```bash
npm run test:coverage
```

This generates:
- Console summary
- HTML report in `coverage/` directory
- LCOV report for CI integration

### What to Cover

**Critical (90%+ coverage):**
- SelectTool, MoveTool, ResizeTool, RotateTool, TextTool
- Geometry calculations (rotation, hit detection)
- Ownership/locking logic
- All regression tests

**Important (80%+ coverage):**
- canvas.service.js CRUD operations
- useObjectOwnership, useCollaboration hooks
- Shape tools (Rectangle, Circle, Star)

**Standard (70%+ coverage):**
- Canvas, Toolbar, TextEditor components
- Layout components
- Z-index management

---

## Best Practices

### 1. **Descriptive Test Names**

✅ Good:
```javascript
it('should deselect object when clicking empty space')
it('should apply boundary constraints during rectangle resize')
```

❌ Bad:
```javascript
it('test1')
it('works correctly')
```

### 2. **Test Isolation**

Each test should be independent:

```javascript
beforeEach(() => {
  // Reset state before EACH test
  mockState = createFreshMockState();
});

afterEach(() => {
  // Clean up after EACH test
  vi.clearAllMocks();
});
```

### 3. **Single Responsibility**

Test one thing per test:

✅ Good:
```javascript
it('should select object when clicked', () => { /* ... */ });
it('should lock object after selection', () => { /* ... */ });
```

❌ Bad:
```javascript
it('should select and lock object and update state and notify users', () => {
  // Testing too many things
});
```

### 4. **No Magic Numbers**

```javascript
// ❌ Bad
expect(result).toBe(42);

// ✅ Good
const EXPECTED_AREA = 10 * 20; // width * height
expect(result).toBe(EXPECTED_AREA);
```

### 5. **Use Test Helpers**

```javascript
import { assertPositionEqual, assertAngleEqual } from '@test/utils/testHelpers.js';

// Instead of:
expect(Math.abs(actual.x - expected.x) < 1).toBe(true);

// Use:
assertPositionEqual(actual, expected, 1);
```

### 6. **Mock External Dependencies**

Always mock:
- Firebase (Firestore, RTDB, Auth, Storage)
- Network requests
- Timers
- File system operations

```javascript
// Mock timers for time-dependent code
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.useRealTimers();
```

### 7. **Test Edge Cases**

```javascript
describe('Edge Cases', () => {
  it('should handle null input', () => { /* ... */ });
  it('should handle empty array', () => { /* ... */ });
  it('should handle very large numbers', () => { /* ... */ });
  it('should handle negative values', () => { /* ... */ });
});
```

### 8. **Keep Tests Fast**

- Use mocks instead of real Firebase
- Avoid unnecessary async operations
- Keep test suite under 30 seconds

### 9. **Maintain Tests**

- Update tests when changing functionality
- Remove obsolete tests
- Refactor tests as code evolves
- Keep tests as clean as production code

---

## Continuous Integration

Tests run automatically on every push and pull request via GitHub Actions:

```yaml
# .github/workflows/test.yml
- Run on: push, pull_request
- Test on: Node 18, 20
- Fail if: Tests fail OR coverage < 75%
```

---

## Troubleshooting

### Tests Failing Randomly (Flaky Tests)

```javascript
// ❌ Bad: Relying on exact timing
setTimeout(() => expect(result).toBe(true), 100);

// ✅ Good: Use waitFor
import { waitFor } from '@testing-library/react';
await waitFor(() => expect(result).toBe(true));
```

### Mocks Not Working

```javascript
// Ensure mocks are defined BEFORE imports
vi.mock('../services/canvas.service.js');
import { MyComponent } from './MyComponent.js';
```

### Coverage Not Accurate

```javascript
// Exclude test files from coverage
// Already configured in vitest.config.js
```

---

## Examples

See existing tests for examples:
- `src/tools/SelectTool.test.js` - Tool testing
- `src/tools/MoveTool.test.js` - Async and state management
- `src/components/canvas/Toolbar.test.jsx` - Component testing
- `src/test/regression/E4_resize_crossover.test.js` - Regression testing

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://testingjavascript.com/)

---

**Remember**: Tests are documentation. They show how code should be used and what it should do. Write tests that future developers (including yourself) will appreciate.

