# Stage 3: Enhanced Tools & Advanced Features

## Overview
Tasks that extend canvas capabilities with new tools and advanced features for a polished user experience.

## Current Status
- **E1**: ✅ Complete - Circle Creation Tool
- **E4**: ✅ Complete - Fix Critical Rectangle Resize Bug
- **E2**: ⏸️ Not Started - Properties Sidebar
- **E3**: ⏸️ Not Started - Text Tool with Formatting
- **E5**: ⏸️ Not Started - Owner-Only Edit Restrictions
- **A0**: ⏸️ Not Started - Performance Optimization & Monitoring
- **A1**: ⏸️ Not Started - Canvas Export Functionality
- **A2**: ⏸️ Not Started - Undo/Redo System
- **A3**: ⏸️ Not Started - Toolbar Design Enhancement

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

### Task E2: Create Properties Sidebar

**Objective**: Build collapsible properties panel showing object and canvas information

**Files to Modify**:
- Create `src/components/properties/PropertiesPanel.jsx`
- Create `src/components/properties/ObjectProperties.jsx`
- Create `src/components/properties/CanvasProperties.jsx`
- Update main layout component

**Specific Changes**:
1. Create collapsible sidebar panel (300px width) on right side of screen
2. Show object properties when object is selected: position (X, Y), size (width, height), fill color
3. Show canvas properties when nothing selected: zoom level, cursor position, canvas size
4. Add collapse/expand toggle button and remember state in localStorage
5. Implement property editing with immediate visual feedback
6. Add color picker for object fill colors
7. Ensure panel is responsive and works on different screen sizes
8. Add proper validation for property value inputs

**Acceptance Criteria**:
- [ ] Properties panel appears on right side and can be collapsed/expanded
- [ ] Object properties display correctly when objects are selected
- [ ] Canvas properties show when nothing is selected
- [ ] Property edits update objects in real-time
- [ ] Color picker works for fill color changes
- [ ] Panel state persists across browser sessions
- [ ] Panel is responsive on different screen sizes

**Testing Steps**:
1. Select objects and verify properties display correctly
2. Edit property values and verify real-time updates
3. Test color picker functionality
4. Test panel collapse/expand behavior
5. Test canvas properties display when nothing selected
6. Test responsive behavior on different screen sizes

---

### Task E3: Implement Text Tool with Basic Formatting

**Objective**: Add text creation tool with bold, italic, underline formatting and color options

**Files to Modify**:
- Create `src/tools/TextTool.js`
- Update `src/components/canvas/Toolbar.jsx`
- Update `src/components/canvas/Canvas.jsx`
- Create `src/components/text/TextEditor.jsx`
- Update properties panel for text formatting

**Specific Changes**:
1. Add Text tool to toolbar with text icon
2. Implement text creation on canvas click with inline editing
3. Create text editor component with formatting controls (B, I, U buttons)
4. Add text color picker integration
5. Handle text selection and editing states
6. Implement text object movement and selection
7. Add text-specific properties in properties panel
8. Ensure text works with ownership and collaboration system

**Acceptance Criteria**:
- [ ] Text tool allows creating text objects on canvas
- [ ] Text can be edited inline with formatting options
- [ ] Bold, italic, underline formatting works correctly
- [ ] Text color can be changed
- [ ] Text objects can be moved and selected like other objects
- [ ] Text properties appear in properties panel
- [ ] Text works in multiplayer environment

**Testing Steps**:
1. Create text objects and verify inline editing works
2. Test bold, italic, underline formatting
3. Test text color changes
4. Test text selection and movement
5. Test text properties in properties panel
6. Test multiplayer text editing collaboration

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

## ✨ ADVANCED FEATURES

### Task A0: Performance Optimization & Monitoring

**Objective**: Optimize canvas performance and add comprehensive monitoring for production readiness

**Files to Modify**:
- Update `src/components/canvas/Canvas.jsx`
- Update `src/components/canvas/CanvasObject.jsx`
- Update `src/hooks/useCursorTracking.js`
- Create `src/utils/performanceMonitor.js`

**Specific Changes**:
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

## Next Steps

**Stage 3 Progress: 2/9 tasks complete**

Completed:
- ✅ E1: Add Circle Creation Tool
- ✅ E4: Fix Critical Rectangle Resize Bug

Remaining Enhanced Tools:
- ⏸️ E2: Create Properties Sidebar
- ⏸️ E3: Implement Text Tool with Basic Formatting
- ⏸️ E5: Add Owner-Only Edit Restrictions

Remaining Advanced Features:
- ⏸️ A0: Performance Optimization & Monitoring
- ⏸️ A1: Implement Canvas Export Functionality
- ⏸️ A2: Add Undo/Redo System
- ⏸️ A3: Enhance Toolbar Design

**Recommended Order**:
1. **A0 (Performance Optimization)** - Establish baseline performance monitoring ← **RECOMMENDED NEXT**
2. **E2-E3 (New Tools)** - Properties sidebar and Text tool
3. **E5 (Ownership UI)** - Visual ownership indicators
4. **A1-A3 (Polish)** - Export, Undo/Redo, Toolbar design

**Note**: E1 (Circle Tool) and E4 (Resize Bug Fix) are already complete.

After completing Stage 3, proceed to **Stage 4: Production Ready** tasks for deployment preparation.

