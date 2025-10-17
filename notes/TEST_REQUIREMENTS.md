# Test Requirements - Canvas Foundation

## 🎯 Testing Philosophy

**CRITICAL RULE**: All functionality must have passing tests before any code changes are made.

This document defines the comprehensive test suite that validates PR #3 Canvas Foundation functionality. Tests must pass before any edits to components.

---

## 📋 Test Categories

### 1. Component Unit Tests

#### A. Toolbar Component Tests ✅
**File**: `src/components/__tests__/Toolbar.test.jsx`

**Must Test**:
- [ ] Renders all three tool buttons (Hand, Arrow, Rectangle)
- [ ] Shows correct visual feedback for selected tool (background color)
- [ ] Calls `onToolChange` when tool is clicked
- [ ] Displays correct tool hint text
- [ ] Updates visual feedback when `selectedTool` prop changes
- [ ] Has correct default selected tool (Arrow)

**Expected Behavior**:
- Selected tool: Blue background (#2563eb), white text
- Unselected tools: White background (#ffffff), gray text
- Smooth transitions and hover states

#### B. Canvas Component Tests 
**File**: `src/components/__tests__/Canvas.test.jsx`

**Must Test**:
- [ ] Renders Konva Stage and Layer components
- [ ] Renders canvas boundary and main canvas area
- [ ] Handles different tool selections (Hand, Arrow, Rectangle)
- [ ] Processes mouse events (down, move, up, wheel)
- [ ] Manages rectangle creation workflow
- [ ] Enforces boundary constraints
- [ ] Initializes with correct view settings

**Mock Requirements**:
- Konva Stage with proper API methods (container, getPointerPosition, etc.)
- Canvas constants (CANVAS_WIDTH, CANVAS_HEIGHT)
- Event simulation capabilities

### 2. Utility Function Tests ✅
**File**: `src/components/__tests__/canvasUtils.test.js`

**Must Test**:
- [ ] `clampRectToCanvas()` - boundary enforcement
- [ ] `isPointInRect()` - point collision detection
- [ ] `getResizeHandle()` - resize handle detection
- [ ] Rectangle validation (minimum sizes)

**Boundary Test Cases**:
- Rectangle within bounds (unchanged)
- Rectangle beyond left edge (clamped to x=0)
- Rectangle beyond right edge (clamped to canvas width)
- Rectangle beyond top edge (clamped to y=0) 
- Rectangle beyond bottom edge (clamped to canvas height)
- Rectangle larger than canvas (resized to fit)

### 3. Integration Tests
**File**: `src/components/__tests__/integration.test.jsx`

**Must Test**:
- [ ] Toolbar and Canvas tool selection synchronization
- [ ] Complete rectangle creation workflow
- [ ] Tool switching during operations
- [ ] User experience workflows (create → select → move)
- [ ] Error handling and edge cases

### 4. End-to-End Workflow Tests

**Must Validate**:
- [ ] **Rectangle Creation Flow**:
  1. Select Rectangle tool → cursor changes to crosshair
  2. Click and drag → ghost rectangle appears
  3. Release mouse → solid rectangle created + auto-switch to Arrow
  4. Minimum size enforcement (2x1px)

- [ ] **Rectangle Selection & Movement**:
  1. Select Arrow tool → cursor changes to default
  2. Click rectangle → blue border + resize handles appear
  3. Drag rectangle body → moves with boundary enforcement
  4. Click empty area → deselects rectangle

- [ ] **Rectangle Resize**:
  1. Select rectangle → resize handles visible
  2. Click corner handle → starts resize operation
  3. Drag handle → rectangle resizes with constraints
  4. Release → finalizes resize with boundary enforcement

- [ ] **Canvas Navigation**:
  1. Select Hand tool → cursor changes to grab
  2. Click and drag → cursor changes to grabbing + canvas pans
  3. Mouse wheel → zooms in/out regardless of tool
  4. Tool switching → maintains canvas position

---

## 🚨 Test Failure Protocol

**If ANY test fails**:
1. ❌ **STOP** - Do not make code changes
2. 🔍 **Investigate** - Identify root cause of failure
3. 🔧 **Fix** - Update code OR test (if test is incorrect)
4. ✅ **Verify** - Ensure all tests pass
5. 📝 **Document** - Update test requirements if needed

**No exceptions** - Tests must pass before proceeding with development.

---

## 🎯 Success Criteria

All tests must achieve:
- [ ] **100% pass rate** for unit tests
- [ ] **100% pass rate** for integration tests
- [ ] **No console errors** during test execution
- [ ] **Proper mocking** of external dependencies (Konva, Firebase)
- [ ] **Performance** - Tests complete within reasonable time (<30s)

---

## 📊 Current Test Status

### ✅ Working Tests
- Canvas utility functions (boundary enforcement, collision detection)

### ⚠️ Tests Needing Fixes
- Toolbar visual feedback tests (style assertion issues)
- Canvas component tests (Konva mocking complexity)
- Integration tests (component interaction)

### 🔧 Required Fixes
1. **Toolbar Tests**: Fix style assertion to work with inline styles
2. **Canvas Tests**: Simplify Konva mocking or use different approach
3. **Integration Tests**: Focus on behavior rather than implementation details

---

## 💡 Testing Best Practices

### DO:
- Test behavior, not implementation
- Use realistic mocks that simulate actual API behavior
- Test edge cases and error conditions
- Verify state changes and side effects
- Test user workflows end-to-end

### DON'T:
- Test internal component state directly
- Mock everything - test real interactions where possible
- Ignore failing tests or skip them
- Test styling details that don't affect functionality
- Create tests that are fragile to minor changes

---

## 🚀 Next Steps

1. **Fix Current Test Issues**:
   - Resolve Toolbar style assertions
   - Simplify Canvas component testing
   - Create reliable integration test patterns

2. **Establish Test Pipeline**:
   - Add pre-commit hooks to run tests
   - Configure CI/CD to prevent merging with failing tests
   - Add test coverage reporting

3. **Expand Test Coverage**:
   - Add performance tests (FPS during operations)
   - Add accessibility tests
   - Add browser compatibility tests

**Remember**: Tests are documentation of expected behavior. They protect against regressions and ensure consistent functionality across changes.
