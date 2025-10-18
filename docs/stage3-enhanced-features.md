# Stage 3: Enhanced Tools & Advanced Features

## Overview
Tasks that extend canvas capabilities with new tools and advanced features for a polished user experience.

## Current Status
- **E1**: ✅ Complete - Circle Creation Tool
- **E4**: ✅ Complete - Fix Critical Rectangle Resize Bug
- **E2**: ✅ Complete - Properties Display in Toolbar
- **E6**: ✅ Complete - Object Rotation Tool
- **E7**: ✅ Complete - Star Shape Tool
- **E8**: ✅ Complete - Color Picker for Shapes
- **E9**: ✅ Complete - Z-Index Management (Layer Ordering)
- **E3**: ✅ Complete - Text Tool with Formatting
- **E10**: ✅ Complete - Continuous Text Editing (Re-edit Existing Text)
- **E11**: ⏸️ Not Started - Comprehensive Testing Framework (Unit, Integration, Regression)
- **E5**: ⏸️ Not Started - Owner-Only Edit Restrictions
- **A0**: ❌ Deferred - Performance Optimization & Monitoring (moved to end)
- **A1**: ⏸️ Not Started - Canvas Export Functionality
- **A2**: ⏸️ Not Started - Undo/Redo System
- **A3**: ⏸️ Not Started - Toolbar Design Enhancement
- **A4**: ⏸️ Not Started - Object Deletion (depends on A2)

---

## 🛠️ ENHANCED TOOLS

### Task E1: Add Circle Creation Tool ✅ COMPLETE

**Objective**: Implement circle tool with creation, selection, and manipulation capabilities

**Files to Modify**:
- Create `src/tools/CircleTool.js`
- Update `src/components/canvas/Toolbar.jsx`
- Update `src/components/canvas/Canvas.jsx`
- Update `src/services/canvas.service.js`

**Specific Changes**:
1. Add Circle tool to toolbar with appropriate icon and styling
2. Create CircleTool handler with mouse down/move/up logic for circle creation
3. Implement circle rendering in Canvas component using Konva Circle shape
4. Add circle objects to canvas.service for persistence
5. Enable circle selection, movement, and resizing with existing tools
6. Ensure circles work with ownership system and collaborative editing
7. Add circle-specific resize handles and constraints
8. Implement proper boundary checking for circles

**Acceptance Criteria**:
- [x] Circle tool appears in toolbar and can be selected
- [x] Users can create circles by dragging on canvas
- [x] Circles can be selected, moved, and resized
- [x] Circles work properly in multiplayer environment
- [x] Circles respect canvas boundaries
- [x] Circle ownership and locking works correctly

**Testing Steps**:
1. ✅ Select circle tool and create circles of various sizes
2. ✅ Test circle selection and movement with move tool
3. ✅ Test circle resizing with resize tool
4. ✅ Test multiplayer collaboration with circles
5. ✅ Verify circles save and load correctly
6. ✅ Test circle boundary constraints

**Status**: ✅ COMPLETE

**Implementation Details**:
- Created `CircleTool.js` handler with center-radius creation method
- Added circle rendering to Canvas.jsx using Konva Circle shape
- Added circle icon (⭕) to Toolbar
- Circles support ownership, locking, and real-time collaboration
- Circles can be selected, moved, and manipulated like rectangles
- Full integration with existing tool architecture

---

### Task E2: Create Properties Display in Toolbar ✅ COMPLETE

**Objective**: Integrate object properties and canvas information into toolbar description area

**Files Modified**:
- Updated `src/components/canvas/Toolbar.jsx`
- Updated `src/App.jsx`
- Updated `src/components/canvas/Canvas.jsx`

**Specific Changes**:
1. ✅ Created two-line description area in toolbar
2. ✅ Line 1 shows object properties when selected (type, dimensions, position)
3. ✅ Line 2 shows tool name, cursor position, and zoom level
4. ✅ Real-time cursor position tracking
5. ✅ Zoom level display as percentage
6. ✅ Removed parenthetical text from tool labels
7. ✅ Moved hotkeys to button tooltips
8. ✅ Clean, minimal layout with bullet separators

**Acceptance Criteria**:
- [x] Object properties display correctly when objects are selected
- [x] Canvas properties (cursor, zoom) show appropriately
- [x] Real-time cursor updates work smoothly
- [x] Zoom level updates automatically
- [x] Layout is clean and uncluttered
- [x] Tooltips show hotkeys on hover
- [x] Tool labels are concise

**Testing Steps**:
1. ✅ Verified properties display with no selection
2. ✅ Verified cursor position updates in real-time
3. ✅ Selected rectangle and verified object property display
4. ✅ Verified zoom level display and updates
5. ✅ Verified tooltips show correct hotkeys
6. ✅ Tested visual appearance with screenshots

**Status**: ✅ COMPLETE

**Implementation Details**:
- Object properties format: `Rectangle: 150×100 at (250, 320)` or `Circle: r=75 at (250, 320)`
- Canvas info format: `Select Tool • Cursor: (425, 680) • Zoom: 100%`
- Read-only property display (inline editing not included)
- Full visual testing completed with Chrome DevTools
- See notes/E2_PROPERTIES_TOOLBAR_IMPLEMENTATION.md for details

---

### Task E3: Implement Text Tool with Basic Formatting ✅ COMPLETE

**Objective**: Add text creation tool with bold, italic, underline formatting and color options

**Files Modified**:
- Created `src/components/canvas/TextEditor.jsx` - HTML overlay editor
- Created/Updated `src/tools/TextTool.js` - Text tool handler
- Updated `src/components/canvas/Toolbar.jsx` - Text properties display
- Updated `src/components/canvas/Canvas.jsx` - Full text integration

**Specific Changes**:
1. ✅ Add Text tool to toolbar with text icon (📝)
2. ✅ Implement text creation on canvas click with inline editing
3. ✅ Create text editor component with formatting controls (B, I, U buttons)
4. ✅ Add text color picker integration
5. ✅ Handle text selection and editing states
6. ✅ Implement text object movement and selection
7. ✅ Add text-specific properties in properties panel
8. ✅ Ensure text works with ownership and collaboration system
9. ✅ Integrate with Rotate tool
10. ✅ Integrate with Z-Index controls

**Acceptance Criteria**:
- [x] Text tool allows creating text objects on canvas
- [x] Text can be edited inline with formatting options
- [x] Bold, italic, underline formatting works correctly
- [x] Text color can be changed
- [x] Text objects can be moved and selected like other objects
- [x] Text properties appear in properties panel
- [x] Text works in multiplayer environment

**Testing Steps**:
1. ✅ Create text objects and verify inline editing works
2. ✅ Test bold, italic, underline formatting
3. ✅ Test text color changes
4. ✅ Test text selection and movement
5. ✅ Test text properties in properties panel
6. ✅ Test multiplayer text editing collaboration (ownership/locking)

**Status**: ✅ COMPLETE (Enhanced Oct 18, 2025 with Font Size & Family controls)

**Implementation Details**:
- TextEditor overlay with formatting toolbar (B, I, U, color picker, font size, font family, save/cancel)
- Font size selector: 8px, 10px, 12px, 14px, 16px, 18px, 24px, 32px, 48px, 64px, 72px
- Font family selector: Arial, Times New Roman, Courier New, Georgia, Verdana, Comic Sans MS, Trebuchet MS, Impact
- Konva Text rendering with bold, italic, underline support
- Text properties display: `Text: "Preview..." • 24px Arial [BIU] at (x, y, z) • rotation°`
- Full integration with Move, Rotate, Z-Index tools
- Multi-line text support (Shift+Enter)
- Keyboard shortcuts (Ctrl+B/I/U, Enter to save, Escape to cancel)
- See notes/E3_TEXT_TOOL_IMPLEMENTATION_COMPLETE.md for original implementation
- See notes/E3_TEXT_FONT_SIZE_AND_FAMILY_ENHANCEMENT.md for font controls enhancement

---

### Task E10: Enable Continuous Text Editing (Re-edit Existing Text)

**Objective**: Allow users to re-edit existing text objects after creation, changing both content and formatting

**Interaction Methods**:
- **Primary**: Double-click text with Select Tool → Opens text editor with current content
- **Secondary**: Click existing text with Text Tool active → Opens text editor with current content
- **Optional**: Select text object + press Enter key → Opens text editor

**What Can Be Edited**:
- Text content (change the words)
- Text formatting (bold, italic, underline)
- Text color
- All changes save to the same text object ID (no duplication)

**Files to Modify**:
- Update `src/tools/TextTool.js` - Detect clicks on existing text vs empty canvas
- Update `src/tools/SelectTool.js` - Add double-click event handler
- Update `src/components/canvas/Canvas.jsx` - Handle double-click detection and edit mode trigger
- Update `src/components/canvas/TextEditor.jsx` - Ensure it works with pre-populated data (likely already works)

**Specific Changes**:
1. Add double-click event listener to Canvas component
2. In SelectTool: Detect double-click on text objects → Trigger edit mode
3. In TextTool: Check if click is on existing text before creating new text
4. If editing existing text:
   - Lock the text object (prevent others from editing)
   - Pre-populate TextEditor with current text, formatting, and color
   - Show TextEditor overlay at text's current position
   - Pass text object ID to TextEditor
5. On save: Update existing text object (use `updateObject` not `createObject`)
6. On cancel: Unlock text object, close editor without changes
7. Ensure ownership/locking prevents conflicts during editing
8. Add keyboard shortcut: Select text + Enter → Edit mode

**Acceptance Criteria**:
- [ ] Double-clicking text with Select Tool opens text editor
- [ ] Clicking existing text with Text Tool opens text editor (not create new)
- [ ] Text editor pre-populates with current text and all formatting
- [ ] Color picker shows current text color
- [ ] Bold/Italic/Underline buttons reflect current formatting state
- [ ] Saving updates the existing text object (verified in Firestore)
- [ ] Canceling leaves text unchanged
- [ ] Text object ID remains the same after editing (no duplication)
- [ ] Ownership/locking works correctly during editing
- [ ] Other users see "locked" indicator while text is being edited
- [ ] Multiple users cannot edit the same text simultaneously

**Testing Steps**:
1. Create text "Hello World" with bold formatting
2. Deselect the text
3. Double-click the text with Select Tool → Editor should open with "Hello World" in bold
4. Change text to "Goodbye World" and make it italic instead of bold
5. Save → Text should update to "Goodbye World" in italic (not bold)
6. Verify in Firestore that same document ID was updated (not new document created)
7. Test with Text Tool: Click existing text → Should edit, not create new text over it
8. Test ownership: User A edits text, User B should see locked indicator and cannot edit
9. Test cancel: Make changes but click cancel → Text should remain unchanged
10. Test Enter key shortcut: Select text + press Enter → Should open editor

**Edge Cases to Handle**:
- What if user double-clicks while text is being edited by another user? → Show "Text is being edited by [User Name]" message
- What if network disconnects during editing? → Save to local storage, sync when reconnected
- What if text is rotated? → Editor should still appear correctly positioned
- What if text is very long? → Editor should handle long text (already supported via TextEditor)

**Dependencies**: 
- Requires E3 (Text Tool with Formatting) ✅ Complete
- Uses existing TextEditor component (should work with pre-populated data)

**Status**: ✅ COMPLETE

**Implementation Details**:
- Added double-click detection to SelectTool with 300ms threshold
- Added Enter key shortcut in Canvas keyboard handler
- TextEditor component already supported pre-populated data (no changes needed)
- Canvas save logic correctly distinguishes update vs create based on `textEditData.object`
- Text objects are properly locked/unlocked during editing
- Same object ID is updated (no duplication)
- See notes/E10_TEXT_RE_EDITING_COMPLETE.md for full details

---

### Task E11: Implement Comprehensive Testing Framework

**Objective**: Establish robust testing infrastructure to prevent regressions and ensure code reliability through unit tests, integration tests, and regression tests for all critical functionality.

**Testing Strategy**:
- **Unit Tests**: Test individual functions, utilities, and pure logic in isolation
- **Integration Tests**: Test tool interactions, service + hook combinations, component integration
- **Regression Tests**: Specific tests for each past bug fix to prevent reoccurrence
- **Test-Driven Development (TDD)**: Write failing tests BEFORE implementing new features going forward
- **Mock-First Approach**: Use full mocking for Firebase (fast, simple, no emulator needed)

**Framework Stack**:
- **Vitest**: Modern, fast, Vite-native test runner with built-in coverage
- **React Testing Library**: User-centric component testing
- **@testing-library/jest-dom**: Additional DOM matchers
- **@testing-library/user-event**: Realistic user interaction simulation
- **MSW (Mock Service Worker)**: Mock Firebase and API calls
- **Vitest UI**: Visual test runner interface (optional but helpful)

**Files to Create**:
- `vitest.config.js` - Vitest configuration
- `src/test/setup.js` - Global test setup and mocks
- `src/test/mocks/firebase.js` - Firebase service mocks
- `src/test/mocks/auth.js` - Authentication mocks
- `src/test/fixtures/testData.js` - Reusable test fixtures (shapes, users, canvas states)
- `src/test/utils/testHelpers.js` - Custom render functions, test utilities
- `.github/workflows/test.yml` - CI/CD pipeline for automated testing
- `docs/TESTING_GUIDE.md` - Testing guidelines and best practices
- Individual test files co-located with source code (e.g., `SelectTool.test.js` next to `SelectTool.js`)

**Files to Refactor** (for testability):
- `src/components/canvas/Canvas.jsx` - Break into smaller components (1000+ lines currently)
  - Extract rendering logic to `CanvasRenderer.jsx`
  - Extract event handlers to hooks or utility functions
  - Separate concerns: rendering, state, event handling, sync
- Tool handlers - Extract pure calculation functions
- Complex components - Split into presentation and container components

**Phase 1: Setup & Infrastructure (Week 1)**

1. **Install Testing Dependencies**:
   ```bash
   npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw
   ```

2. **Configure Vitest**:
   - Create `vitest.config.js` with jsdom environment
   - Enable globals, coverage reporting, and parallel test execution
   - Set coverage thresholds: 75% overall, 90% for critical paths

3. **Set Up Test Infrastructure**:
   - Create global test setup file with beforeAll/afterEach/afterAll hooks
   - Mock Firebase Firestore, RTDB, Auth, and Storage
   - Create mock user data (bobtester@test.com)
   - Set up MSW for network request mocking

4. **Create Test Utilities**:
   - Custom `renderWithProviders()` function for testing components with context
   - `createTestCanvas()` factory for canvas state
   - `createTestUser()` factory for user data
   - `createTestShape()` factories for rectangles, circles, stars, text

**Phase 2: Critical Path Testing (Week 2)**

5. **Tools Testing** (90% coverage target):
   - `src/tools/SelectTool.test.js`:
     - Object selection (single click)
     - Double-click to edit text
     - Deselection on canvas click
     - Ownership checks
     - Keyboard shortcuts (Escape, Enter)
   
   - `src/tools/MoveTool.test.js`:
     - Object dragging and position updates
     - Boundary constraints
     - Real-time sync simulation
     - Ownership/locking during move
   
   - `src/tools/ResizeTool.test.js`:
     - Corner handle resizing
     - Maintain aspect ratio (with Shift)
     - Boundary constraints during resize
     - Rotated object resizing
     - **REGRESSION**: E4 resize bug - handle crossover stability
   
   - `src/tools/RotateTool.test.js`:
     - Rotation handle dragging
     - Angle snapping (Shift + 15° increments)
     - Manual angle input
     - Rotation sync
   
   - `src/tools/TextTool.test.js`:
     - Text creation on click
     - Text editing with formatting (B, I, U)
     - Font size and family changes
     - Color picker integration
     - Multi-line text (Shift+Enter)
     - Save/Cancel functionality
   
   - `src/tools/RectangleTool.test.js`, `CircleTool.test.js`, `StarTool.test.js`:
     - Shape creation by dragging
     - Minimum size constraints
     - Color application
     - Ownership assignment

6. **Geometry & Transform Utilities** (90% coverage target):
   - Test rotation calculations and matrix transformations
   - Test hit detection for rotated objects
   - Test boundary checking algorithms
   - Test resize calculations (normal and rotated objects)
   - **REGRESSION**: Star hit detection fixes
   - **REGRESSION**: Rotated text selection fixes
   - **REGRESSION**: Star boundary and resize fixes

7. **Services & Hooks** (80% coverage target):
   - `src/services/canvas.service.test.js`:
     - createObject(), updateObject(), deleteObject()
     - CRUD operations with Firestore mocks
     - Error handling and edge cases
   
   - `src/hooks/useObjectOwnership.test.js`:
     - Object locking/unlocking
     - Ownership acquisition and release
     - Timeout handling
     - Multi-user conflict scenarios
   
   - `src/hooks/useCollaboration.test.js`:
     - Real-time object sync
     - Cursor tracking and display
     - Presence system integration
   
   - `src/hooks/useCursorTracking.test.js`:
     - Cursor position updates
     - Throttling (50-100ms)
     - Multi-user cursor rendering

**Phase 3: Component & Integration Testing (Week 3)**

8. **Component Tests** (70% coverage target):
   - `src/components/canvas/Canvas.test.jsx`:
     - Canvas rendering with objects
     - Tool switching
     - Keyboard shortcuts (V, M, R, T, etc.)
     - Object rendering (rectangles, circles, stars, text)
     - Integration with tool handlers
   
   - `src/components/canvas/Toolbar.test.jsx`:
     - Tool button rendering and selection
     - Properties display (object info, cursor, zoom)
     - Color picker integration
     - Z-index controls
     - Rotation angle input
   
   - `src/components/canvas/TextEditor.test.jsx`:
     - Editor overlay positioning
     - Formatting button toggles
     - Font size/family selectors
     - Save/cancel functionality
     - Keyboard shortcuts in editor
   
   - `src/components/layout/Sidebar.test.jsx`:
     - User list rendering
     - Active users display
     - Canvas list and switching

9. **Integration Tests**:
   - Full user flow: Create rectangle → Move it → Resize it → Rotate it → Verify saved
   - Multi-tool workflow: Text tool → Create text → Select tool → Edit text → Verify updates
   - Ownership flow: User A creates shape → User B cannot edit → User A releases → User B can edit
   - Z-index flow: Create overlapping shapes → Bring to front → Send to back → Verify order

**Phase 4: Regression Tests (Week 4)**

10. **Create Regression Test Suite**:
    - `src/test/regression/E4_resize_crossover.test.js` - Rectangle resize handle crossover bug
    - `src/test/regression/star_hit_detection.test.js` - Star hit detection fixes
    - `src/test/regression/star_resize.test.js` - Star resize handle and boundary fixes
    - `src/test/regression/text_selection.test.js` - Rotated text selection fixes
    - `src/test/regression/circle_boundary.test.js` - Circle boundary constraint fixes
    - `src/test/regression/z_index_rendering.test.js` - Z-index rendering order fixes
    - Each test should:
      - Reproduce the original bug (commented out or in describe block)
      - Verify the fix works correctly
      - Link to bug documentation in notes/

**Phase 5: CI/CD & Documentation (Week 4)**

11. **Set Up GitHub Actions**:
    - Create `.github/workflows/test.yml`:
      - Run on every push and pull request
      - Test on Node 18 and 20 (matrix)
      - Cache node_modules for speed
      - Run `npm test` with coverage
      - Upload coverage reports
      - Fail if coverage drops below 75%
      - Fail if any tests fail (block merge)

12. **Create Testing Documentation**:
    - `docs/TESTING_GUIDE.md`:
      - How to run tests (`npm test`, `npm run test:ui`, `npm run test:coverage`)
      - How to write new tests (examples for tools, components, hooks)
      - Testing best practices (arrange-act-assert, descriptive names, isolated tests)
      - Mock patterns and examples
      - Regression test procedures
      - TDD workflow for new features

13. **Update package.json Scripts**:
    ```json
    {
      "scripts": {
        "test": "vitest run",
        "test:watch": "vitest",
        "test:ui": "vitest --ui",
        "test:coverage": "vitest run --coverage",
        "test:e2e": "playwright test"
      }
    }
    ```

**Testing Priorities** (by criticality):

**🔴 Critical (90% coverage required)**:
- SelectTool, MoveTool, ResizeTool, RotateTool, TextTool
- Geometry calculations (rotation, hit detection, boundaries)
- Ownership/locking logic
- All regression tests for past bugs

**🟡 Important (80% coverage required)**:
- canvas.service.js CRUD operations
- useObjectOwnership, useCollaboration hooks
- Shape tools (Rectangle, Circle, Star)
- useCursorTracking

**🟢 Standard (70% coverage required)**:
- Canvas, Toolbar, TextEditor components
- Sidebar, Header components
- Z-index management
- Color picker integration

**⚪ Optional (no minimum)**:
- Simple UI wrappers
- Styling components
- One-line utility functions

**Test-Driven Development (TDD) Going Forward**:

From this point forward, for ALL new features and bug fixes:

1. **Write Failing Test First**:
   - Reproduce the bug or define expected behavior
   - Run test → should fail (red)

2. **Implement Fix/Feature**:
   - Write minimal code to make test pass
   - Run test → should pass (green)

3. **Refactor**:
   - Clean up code while keeping tests green
   - Ensure no regressions

4. **Document**:
   - Add comments explaining why test exists
   - Link to bug reports or feature specs

**Acceptance Criteria**:
- [ ] Vitest installed and configured with coverage reporting
- [ ] Test infrastructure set up (mocks, utilities, fixtures)
- [ ] All critical tools have comprehensive unit tests (90%+ coverage)
- [ ] Geometry/transform utilities fully tested (90%+ coverage)
- [ ] Services and hooks have integration tests (80%+ coverage)
- [ ] Key components have rendering and interaction tests (70%+ coverage)
- [ ] Regression test suite covers all past bugs (E4, star issues, text issues, etc.)
- [ ] GitHub Actions CI runs tests on every PR
- [ ] CI fails if coverage drops below 75% or any test fails
- [ ] TESTING_GUIDE.md documents testing practices and examples
- [ ] Canvas.jsx refactored into smaller, testable components
- [ ] All tests pass consistently (no flaky tests)
- [ ] Test output is clear and helpful when failures occur

**Testing Steps** (to verify testing framework):
1. Run `npm test` → All tests pass
2. Run `npm run test:coverage` → Coverage meets thresholds (75% overall, 90% critical)
3. Intentionally break a tool → Test fails and shows clear error message
4. Fix the tool → Test passes again
5. Push to GitHub → CI runs and passes
6. Lower coverage → CI fails with coverage error
7. Run `npm run test:ui` → Visual test interface works
8. Run `npm run test:watch` → Watch mode re-runs tests on file changes

**Ongoing Maintenance**:
- Run tests before every commit (`git hooks` optional)
- Review test failures in CI before merging PRs
- Update tests when changing functionality
- Add regression tests for every new bug fix
- Refactor tests as code evolves
- Keep test runtime under 30 seconds for fast feedback

**Success Metrics**:
- 75%+ overall code coverage maintained
- 90%+ coverage on critical paths (tools, geometry, ownership)
- Zero flaky tests (tests pass consistently)
- CI test runs complete in under 2 minutes
- Zero regressions of previously fixed bugs
- New features delivered with tests (TDD)

**Dependencies**: None - this task establishes foundation for future development

**Status**: ⏸️ Not Started

**Deferred to Stage 4**:
- **End-to-End (E2E) Testing** with Playwright/Cypress:
  - Browser automation testing with real user interactions
  - Full user flow testing (login → create → edit → save → verify)
  - Visual regression testing (screenshot comparisons)
  - Cross-browser testing
  - Deferred because: E2E tests are slow, flaky, and high-maintenance. Unit/integration tests provide 80% of value with 20% of effort. E2E tests are best added once all features are complete and stable.

---

### Task E4: Fix Critical Rectangle Resize Bug ✅ COMPLETE

**Objective**: Fix coordinate jumping bug when dragging resize handles past opposite corners

**Files to Modify**:
- `src/components/canvas/Canvas.jsx` (crossover detection logic)
- `src/components/canvas/CanvasObject.jsx` (if needed)

**Specific Changes**:
1. Fix rectangle position jumping when corner handle is dragged past opposite corner
2. Ensure smooth handle role transition (NW becomes SE when dragged past SE corner)
3. Maintain rectangle visibility during crossover (minimum 2x2px at crossover point)
4. Prevent coordinate snapping back to original position during handle transitions
5. Ensure consistent resize behavior in all directions
6. Add visual feedback during crossover operations
7. Test resize operations near canvas boundaries during crossover

**Current Problem**: 
When dragging NW handle past SE corner, rectangle jumps back to original position while handle identity changes, breaking user expectation of smooth interaction.

**Expected Behavior**: 
Drag NW handle past SE → handle smoothly becomes SE, rectangle stays at current position (becomes line at crossover), resize continues smoothly.

**Acceptance Criteria**:
- [x] Rectangle position remains stable during handle crossover operations
- [x] Handle role transitions happen smoothly without position jumping
- [x] Rectangle maintains minimum visibility (2x2px) at exact crossover point
- [x] Resize continues smoothly after crossover in expected direction
- [x] Crossover behavior works consistently for all corner combinations
- [x] No visual artifacts or coordinate jumping during transitions
- [x] Boundary constraints work properly during crossover operations

**Testing Steps**:
1. ✅ Drag NW handle past SE corner and verify smooth transition
2. ✅ Test all corner handle crossover combinations (NW↔SE, NE↔SW)
3. ✅ Test crossover behavior near canvas boundaries
4. ✅ Verify resize continues smoothly after crossover
5. ✅ Test with multiple users to ensure sync works during crossover
6. ✅ Verify minimum size constraints work during crossover

**Dependencies**: Requires Task C5 (ownership system) ✅ Complete

**Status**: ✅ COMPLETE - See notes/E4_RESIZE_BUG_FIX.md

---

### Task E5: Add Owner-Only Edit Restrictions

**Objective**: Implement visual indicators and restrictions for object ownership in collaborative editing

**Files to Modify**:
- Update `src/hooks/useObjectOwnership.js`
- Update `src/components/canvas/Canvas.jsx`
- Update all tool handlers

**Specific Changes**:
1. Add visual highlighting of objects with border color matching owner's avatar color
2. Prevent non-owners from selecting or editing objects owned by others
3. Show tooltip or indicator when hovering over objects owned by others
4. Implement "Currently being edited by [User Name]" feedback
5. Ensure ownership indicators update in real-time across all connected users
6. Add smooth color transitions when ownership changes
7. Handle edge cases like ownership expiration during editing

**Acceptance Criteria**:
- [ ] Objects display ownership with matching user avatar colors
- [ ] Non-owners cannot select or edit owned objects
- [ ] Clear feedback shows who owns each object
- [ ] Ownership indicators update in real-time for all users
- [ ] Color transitions are smooth and visually appealing
- [ ] Edge cases are handled gracefully

**Testing Steps**:
1. Have multiple users select different objects and verify color indicators
2. Test that non-owners cannot interact with owned objects
3. Verify real-time updates of ownership indicators
4. Test ownership expiration and visual feedback
5. Test tooltip/feedback messages for owned objects

---

### Task E6: Implement Object Rotation Tool ✅ COMPLETE

**Objective**: Enable users to rotate shapes (rectangles, circles, text, stars, etc.) with interactive handles and toolbar input.

**Files Modified**:
- Created `src/tools/RotateTool.js`
- Updated `src/components/canvas/Canvas.jsx`
- Updated `src/components/canvas/Toolbar.jsx`
- Updated `src/tools/index.js`

**Specific Changes**:
1. ✅ Add rotation handle to selected objects (blue circular handle 30px above object)
2. ✅ Implement rotation logic on drag of rotation handle
3. ✅ Display rotation angle in properties display (e.g., "• 45°")
4. ✅ Add angle input field in toolbar for manual rotation (0-359°)
5. ✅ Support Shift+drag snapping to 15° increments
6. ✅ Save and sync rotation value via Firestore and RTDB
7. ✅ Ensure rotations persist and update across all clients
8. ✅ Add keyboard shortcut 'T' to activate rotation tool

**Acceptance Criteria**:
- [x] Rotation handle appears for selected objects
- [x] Dragging handle rotates object smoothly
- [x] Rotation angle updates in real time in properties display
- [x] Manual rotation input works correctly (with arrow key support)
- [x] Rotation persists in Firestore and syncs for all users
- [x] Shift+drag snapping works correctly
- [x] Undo/redo respects rotation (pending A2 implementation)

**Testing Steps**:
1. ✅ Select shape and rotate with handle
2. ✅ Verify angle display updates live
3. ✅ Rotate while holding Shift to confirm 15° snapping
4. ✅ Test manual angle input field and arrow keys
5. ✅ Reload canvas to confirm rotation persists
6. ✅ Test multi-user sync for rotation changes

**Status**: ✅ COMPLETE

**Implementation Details**:
- Visual rotation handle (blue circle) appears above selected object
- Dashed line connects object center to rotation handle
- Real-time rotation updates via RTDB during drag
- Final rotation saved to Firestore on mouse up
- Manual angle input with arrow key fine control (up/down)
- Works with all shape types (rectangles, circles, stars, text)
- Full integration with existing tool architecture
- See notes/E6_ROTATION_TOOL_COMPLETE.md for full details

---

### Task E7: Add Star Shape Tool

**Objective**: Allow users to create star shapes with adjustable points, inner radius, and outer radius.

**Files to Modify**:
- Create `src/tools/StarTool.js`
- Update `src/components/canvas/Canvas.jsx`
- Update `src/components/canvas/Toolbar.jsx`
- Update `src/services/canvas.service.js`

**Specific Changes**:
1. Add Star tool to toolbar with a star icon (⭐)
2. Implement drag-to-create star logic using Konva.Star
3. Default to 5 points; allow user to modify `numPoints`, `innerRadius`, and `outerRadius`
4. Integrate color picker (from E8) for star fill
5. Ensure star behaves like other shapes (move, resize, rotate)
6. Store star parameters in Firestore
7. Add display to properties toolbar: `Star: 5 points at (x, y)`

**Acceptance Criteria**:
- [ ] Star tool appears and is selectable
- [ ] User can drag to create a star
- [ ] Star supports move, resize, and rotate
- [ ] Point count and radius adjustments work
- [ ] Color picker integration works correctly
- [ ] Star persists and syncs across users

**Testing Steps**:
1. Create stars with various point counts and sizes
2. Move, resize, and rotate stars
3. Change star colors and verify persistence
4. Confirm multiplayer synchronization

---

### Task E8: Add Color Picker for Shapes

**Objective**: Add a universal color picker for assigning and changing shape colors.

**Files to Modify**:
- Update `src/components/canvas/Toolbar.jsx`
- Update `src/components/canvas/Canvas.jsx`
- Update `src/services/canvas.service.js`
- Create `src/components/common/ColorPicker.jsx`

**Specific Changes**:
1. Add color picker component in toolbar using `react-color` or similar
2. When a tool is active, color picker defines default fill color for new shapes
3. When an object is selected, color picker updates its fill color in real time
4. Display selected color in toolbar next to picker
5. Save color property to Firestore for persistence
6. Add color info to properties display (`Color: #RRGGBB`)
7. Handle synchronization so all clients see updated colors instantly

**Acceptance Criteria**:
- [ ] Color picker appears in toolbar
- [ ] Selected color applies to new shapes
- [ ] Selected objects update color when picker changes
- [ ] Colors persist across reloads
- [ ] Color updates sync for all users
- [ ] Color shows correctly in properties display

**Testing Steps**:
1. Create shapes with different colors
2. Select object and change color via picker
3. Reload to confirm color persistence
4. Verify color sync across users
5. Confirm color hex code updates in properties bar

---

### Task E9: Implement Z-Index Management (Layer Ordering)

**Objective**: Allow users to control stacking order (front/back) of canvas objects.

**Files to Modify**:
- Update `src/components/canvas/Toolbar.jsx`
- Update `src/components/canvas/Canvas.jsx`
- Update `src/services/canvas.service.js`

**Specific Changes**:
1. Add Z-Index control buttons: Bring to Front, Send to Back, Move Forward, Move Back
2. Update canvas service to store z-index ordering per object
3. Sync z-index changes to Firestore for all clients
4. Ensure proper redraw order in Canvas.jsx
5. Integrate visual confirmation (temporary highlight or notification)
6. Prepare for future undo/redo support (A2)
7. Maintain consistent ordering on reload

**Acceptance Criteria**:
- [ ] Z-Index buttons appear in toolbar
- [ ] Bring to Front/Send to Back works correctly
- [ ] Move Forward/Move Back adjust order relative to peers
- [ ] Z-order changes persist and sync for all users
- [ ] Redraw order is visually correct
- [ ] Undo/redo works when available

**Testing Steps**:
1. Create overlapping shapes
2. Test all four z-index buttons
3. Verify stacking order changes persist after reload
4. Test z-order updates in multi-user environment

---

## ✨ ADVANCED FEATURES

### Task A1: Implement Canvas Export Functionality

**Objective**: Add PNG and SVG export capabilities for entire canvas or selected objects

**Files to Modify**:
- Create `src/services/export.service.js`
- Update `src/components/layout/Header.jsx`
- Create `src/components/export/ExportModal.jsx`

**Specific Changes**:
1. Implement PNG export using Konva's built-in export functionality
2. Add SVG export capability for vector format
3. Create export modal with options: entire canvas vs. selected objects, format selection, quality settings
4. Add "Export" button to header menu
5. Handle large canvas exports with progress indication
6. Implement proper cropping for selected object exports
7. Add filename generation and download handling

**Acceptance Criteria**:
- [ ] PNG export works for entire canvas and selected objects
- [ ] SVG export maintains vector quality
- [ ] Export modal provides clear options and feedback
- [ ] Export button is easily accessible in header
- [ ] Large exports show progress indication
- [ ] Downloaded files have appropriate names and quality

**Testing Steps**:
1. Export entire canvas as PNG and SVG
2. Select objects and export selection only
3. Test various quality settings and file sizes
4. Verify exported files open correctly in other applications
5. Test export progress indication for large canvases

---

### Task A2: Add Undo/Redo System

**Objective**: Implement comprehensive undo/redo functionality for all canvas operations

**Files to Modify**:
- Create `src/hooks/useHistory.js`
- Update `src/services/canvas.service.js`
- Update all tool handlers
- Add keyboard shortcuts

**Specific Changes**:
1. Create history management system that tracks all canvas operations
2. Implement undo/redo stack with configurable history limit (50 operations)
3. Add Ctrl+Z (undo) and Ctrl+Y (redo) keyboard shortcuts
4. Include undo/redo buttons in toolbar or header
5. Handle collaborative editing scenarios with conflict resolution
6. Optimize history storage to prevent memory bloat
7. Add visual feedback for undo/redo operations

**Acceptance Criteria**:
- [ ] All canvas operations can be undone and redone
- [ ] Keyboard shortcuts work correctly
- [ ] History is limited to prevent memory issues
- [ ] Collaborative undo/redo works without conflicts
- [ ] Visual feedback indicates undo/redo actions
- [ ] System performance remains good with history enabled

**Testing Steps**:
1. Perform various operations and test undo/redo functionality
2. Test keyboard shortcuts for undo/redo
3. Test undo/redo with multiple users collaborating
4. Test history limit and memory management
5. Verify visual feedback and user experience

---

### Task A3: Enhance Toolbar Design

**Objective**: Redesign toolbar with cleaner, more polished button styling and better visual hierarchy

**Files to Modify**:
- Update `src/components/canvas/Toolbar.jsx`
- Update related CSS/styling

**Specific Changes**:
1. Redesign toolbar buttons with modern, clean styling
2. Improve button hover and active states
3. Add better visual feedback for selected tools
4. Implement consistent spacing and alignment
5. Add tool tooltips with keyboard shortcuts
6. Improve responsive behavior of toolbar
7. Consider grouping related tools visually

**Acceptance Criteria**:
- [ ] Toolbar has modern, professional appearance
- [ ] Button states (hover, active, selected) are clear and consistent
- [ ] Tooltips provide helpful information
- [ ] Toolbar works well on different screen sizes
- [ ] Visual hierarchy guides user attention appropriately

**Testing Steps**:
1. Test all toolbar button interactions and visual states
2. Verify tooltips appear and provide useful information
3. Test toolbar appearance on different screen sizes
4. Compare before/after toolbar design for improvement
5. Get user feedback on toolbar usability

---

### Task A4: Implement Object Deletion

**Objective**: Add ability to delete selected objects using the Delete key, with undo/redo support as safety net

**Dependencies**: 
- Requires A2 (Undo/Redo System) to be implemented first

**Files to Modify**:
- Update `src/components/canvas/Canvas.jsx` (keyboard handler)
- Update `src/services/canvas.service.js` (add deleteObject function)
- Update `src/hooks/useHistory.js` (integrate deletion with undo/redo)

**Specific Changes**:
1. Add Delete/Backspace key handler in Canvas keyboard shortcuts
2. Create `deleteObject()` function in canvas.service.js
3. Delete selected object from Firestore on key press
4. Clear object from RTDB active objects if being dragged
5. Record deletion in undo/redo history for easy recovery
6. Support deleting multiple selected objects at once (if selection system supports it)
7. Respect ownership restrictions - only allow deletion of objects user owns/can edit
8. Provide visual feedback (brief fade-out animation optional)
9. Handle edge cases (offline deletion, concurrent edits, etc.)

**Acceptance Criteria**:
- [ ] Delete key removes selected object immediately
- [ ] Backspace key also works for deletion
- [ ] Deletion respects ownership/locking (can't delete objects being edited by others)
- [ ] Deleted objects can be restored via Undo (Ctrl+Z)
- [ ] Deletion syncs across all users in real-time
- [ ] No warning prompt (undo is the safety net)
- [ ] Multiple selected objects can be deleted at once
- [ ] Deletion works correctly in offline mode (queued and synced on reconnect)

**Testing Steps**:
1. Select object and press Delete key → object should disappear
2. Press Ctrl+Z → object should reappear (undo)
3. Press Ctrl+Y → object should disappear again (redo)
4. Test with Backspace key
5. Test deleting object locked by another user → should show error/prevent deletion
6. Test deleting multiple selected objects
7. Test deletion in offline mode → should queue and sync on reconnect
8. Test in multiplayer: User A deletes object → User B should see it disappear
9. Verify deletion removes object from both Firestore and RTDB

**Edge Cases to Handle**:
- What if object is locked by another user? → Show "Cannot delete: object is being edited by [User Name]"
- What if user is offline? → Queue deletion, sync when reconnected
- What if object was already deleted by another user? → Silently handle (already gone)
- What if undo/redo history is full? → Oldest deletion should be forgotten (can't undo anymore)
- What if object has dependencies? → For now, no dependencies exist, but design for future extensibility

**Implementation Notes**:
- Use soft delete pattern initially (mark as deleted) vs hard delete
- Consider adding `deletedAt` timestamp for future recovery features
- Integration with undo/redo system is critical - deletion must be recorded as a history action
- Ensure proper cleanup of all references (local state, RTDB, Firestore)

**Status**: ⏸️ Not Started (waiting for A2: Undo/Redo System)

---

### Task A0: Performance Optimization & Monitoring ❌ DEFERRED

**Objective**: Optimize canvas performance and add comprehensive monitoring for production readiness

**Status**: ❌ DEFERRED - Moved to end of Stage 3 or future stage per user request

**Rationale for Deferral**:
- Current performance is acceptable for typical use cases
- Optimization is best done after all features are complete
- Not blocking any other features
- Can be addressed in Stage 4 or as needed

**Files to Modify** (when implemented):
- Update `src/components/canvas/Canvas.jsx`
- Update `src/components/canvas/CanvasObject.jsx`
- Update `src/hooks/useCursorTracking.js`
- Create `src/utils/performanceMonitor.js`

**Specific Changes** (when implemented):
1. **Konva Rendering Optimization**:
   - Enable Konva layer caching for better performance
   - Optimize redraw regions to minimize full canvas redraws
   - Implement object pooling for frequently created/destroyed elements
   - Add performance-conscious rendering for large object counts

2. **Cursor Update Optimization**:
   - Verify 50-100ms throttling is working effectively
   - Implement adaptive throttling based on user count
   - Add cursor update batching for multiple rapid movements
   - Optimize cursor rendering to avoid unnecessary redraws

3. **Object Position Update Optimization**:
   - Batch Firestore writes during drag operations
   - Implement local caching to reduce database reads
   - Add intelligent update scheduling to prevent write conflicts
   - Optimize object transformation calculations

4. **Performance Monitoring System**:
   - Add FPS monitoring and logging
   - Measure and log cursor sync latency
   - Track object sync latency and update performance
   - Add memory usage monitoring for object collections
   - Implement performance alerts for degraded experience

5. **Load Testing Capabilities**:
   - Create development tools for generating test objects
   - Add stress testing utilities for multi-user scenarios
   - Implement performance regression testing

**Acceptance Criteria**:
- [ ] Canvas maintains 30+ FPS with 500 objects
- [ ] Cursor sync latency stays under 50ms
- [ ] Object sync latency stays under 100ms
- [ ] Performance monitoring provides real-time metrics
- [ ] System handles 5+ concurrent users smoothly
- [ ] Memory usage remains stable during extended use
- [ ] Performance degrades gracefully under high load

**Testing Steps**:
1. Create 100 objects and verify smooth interaction
2. Create 500 objects and verify acceptable performance (>20 FPS)
3. Test with 5+ concurrent users
4. Test with Chrome DevTools slow 3G throttling
5. Monitor memory usage during extended sessions

---

## Next Steps

**Stage 3 Progress: 9/15 tasks complete**

Completed Enhanced Tools:
- ✅ E1: Add Circle Creation Tool
- ✅ E2: Create Properties Display in Toolbar
- ✅ E3: Implement Text Tool with Basic Formatting
- ✅ E4: Fix Critical Rectangle Resize Bug
- ✅ E6: Implement Object Rotation Tool
- ✅ E7: Add Star Shape Tool
- ✅ E8: Add Color Picker for Shapes
- ✅ E9: Implement Z-Index Management
- ✅ E10: Enable Continuous Text Editing (Re-edit Existing Text)

Remaining Enhanced Tools:
- ⏸️ E5: Add Owner-Only Edit Restrictions
- ⏸️ E11: Comprehensive Testing Framework (Unit, Integration, Regression)

Remaining Advanced Features:
- ⏸️ A1: Implement Canvas Export Functionality
- ⏸️ A2: Add Undo/Redo System
- ⏸️ A3: Enhance Toolbar Design
- ⏸️ A4: Implement Object Deletion (depends on A2)

Deferred (moved to end or separate stage):
- ❌ A0: Performance Optimization & Monitoring

**Recommended Order**:
1. **E11 (Testing Framework)** - Establish testing infrastructure and prevent future regressions ← **DOING NOW**
2. **E5 (Ownership UI)** - Visual ownership indicators and edit restrictions
3. **A2 (Undo/Redo System)** - Critical safety net for destructive operations
4. **A4 (Object Deletion)** - Delete key functionality (safe with undo/redo)
5. **A1 (Canvas Export)** - PNG/SVG export functionality
6. **A3 (Toolbar Design)** - Visual polish and refinement
7. **A0 (Performance)** - Optimization and monitoring (deferred to end)

**Why E11 First?**
- Establishes testing foundation to prevent regressions going forward
- Creates safety net before implementing complex features (E5, A2, A4)
- Enables Test-Driven Development (TDD) for all future work
- Catches bugs early and reduces debugging time
- Critical for maintaining code quality as codebase grows
- Should have been implemented from the beginning, doing it now before more complexity is added

**Why E5 Next (After E11)?**
- Completes all Enhanced Tools (E1-E11)
- Visual ownership indicators improve collaborative UX
- Edit restrictions prevent conflicts in multi-user scenarios
- Foundation for safe deletion (A4) - users need to know who owns what before deleting
- Relatively contained scope (visual indicators + interaction blocking)
- Can be developed with TDD using new testing framework

**Why A2 Before A4?**
- Undo/Redo is the safety net for deletion
- Without undo, accidental deletions are permanent (bad UX)
- A4 explicitly depends on A2 per user requirements

**Why A0 Deferred?**
- Current performance is acceptable for typical use cases
- Optimization is best done after all features are complete
- Can be moved to Stage 4 or addressed as needed
- Not blocking any other features

After completing Stage 3, proceed to **Stage 4: Production Ready** tasks for deployment preparation.

