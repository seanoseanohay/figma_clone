# Stage 5: Future Work & Enhancements

## Overview
Post-MVP improvements, advanced collaboration features, and long-term optimizations.

## Current Status
All tasks in this stage are **⏸️ Not Started** and should only be tackled after Stages 1-4 are complete.

---

## 🚀 FUTURE ENHANCEMENTS (Post-MVP)

### Task FE1: Implement Responsive Navigation with Hamburger Menu

**Objective**: Add mobile-responsive navigation with hamburger menu for screens <768px

**Files to Modify**:
- `src/components/layout/Header.jsx`
- Create `src/components/layout/MobileMenu.jsx`

**Specific Changes**:
1. Add hamburger menu icon (☰) that appears only on screens <768px
2. Create slide-out mobile menu component with vertical layout
3. Include in mobile menu: Project/Canvas selector, User list (vertical), Share canvas, Sign out
4. Add CSS transitions for smooth menu open/close animation
5. Implement click-outside-to-close and escape-key-to-close functionality
6. Ensure mobile menu overlays content properly with correct z-index
7. Add proper touch handling for mobile interactions

**Acceptance Criteria**:
- [ ] Hamburger menu icon appears only on screens <768px
- [ ] Mobile menu slides out smoothly with animation
- [ ] All header functionality available in mobile menu
- [ ] Menu closes when clicking outside or pressing escape
- [ ] Touch interactions work properly on mobile devices
- [ ] Menu has proper z-index and doesn't break layout

---

### Task FE2: Add Recently Used Sorting

**Objective**: Implement recently used sorting for project/canvas dropdown with user activity tracking

**Files to Modify**:
- Update `src/services/project.service.js`
- Create `src/services/activity.service.js`
- Update `src/hooks/useProjects.js`

**Specific Changes**:
1. Track user activity timestamps for project/canvas access
2. Implement recently used sorting algorithm
3. Store activity data efficiently in Firestore
4. Update dropdown to show recently used items first
5. Add "Recently Used" section header in dropdown
6. Limit recent items tracking to prevent database bloat

**Acceptance Criteria**:
- [ ] Recently accessed projects/canvases appear first in dropdown
- [ ] Activity tracking works efficiently without performance impact
- [ ] Recent items are clearly distinguished in dropdown UI
- [ ] Activity data is managed efficiently in database

---

### Task FE3: Implement Theme Selector

**Objective**: Add light/dark mode theme support with canvas background options

**Files to Modify**:
- Create `src/contexts/ThemeContext.js`
- Update all component styling
- Create `src/components/settings/ThemeSelector.jsx`

**Specific Changes**:
1. Create theme context with light/dark mode support
2. Update all components to use theme-aware styling
3. Add theme selector in user menu or settings
4. Implement canvas background color options (white/dark gray)
5. Store theme preference in localStorage
6. Ensure proper contrast and accessibility in both themes

**Acceptance Criteria**:
- [ ] Users can switch between light and dark themes
- [ ] All UI components adapt to selected theme
- [ ] Canvas background options work with theme selection
- [ ] Theme preference persists across sessions
- [ ] Both themes meet accessibility contrast requirements

---

### Task FE4: Add Grid System with Snap-to-Grid

**Objective**: Implement optional grid display with snap-to-grid functionality for precise object placement

**Files to Modify**:
- Update `src/components/canvas/Canvas.jsx`
- Create `src/components/canvas/GridLayer.jsx`
- Add grid controls to properties panel

**Specific Changes**:
1. Add optional grid overlay to canvas
2. Implement snap-to-grid functionality for object placement and movement
3. Add grid spacing controls (10px, 20px, 50px options)
4. Create grid toggle in view menu or properties panel
5. Ensure grid performance is optimized for large canvases
6. Add visual feedback when objects snap to grid

**Acceptance Criteria**:
- [ ] Grid can be toggled on/off
- [ ] Objects snap to grid when enabled
- [ ] Grid spacing is configurable
- [ ] Grid performance is acceptable on large canvases
- [ ] Visual feedback indicates snap behavior

---

## 🎯 POST-MVP PHASE 1 (Advanced Collaboration)

### Task P2: Build Advanced Selection Ownership System

**Objective**: Implement selection-based ownership with 30-second timeout and expandable architecture

**Files to Modify**:
- Create `src/hooks/useSelectionManager.js`
- Update `src/components/canvas/Canvas.jsx`
- Update all tool handler files
- Create `src/services/ownership.service.js`

**Database Schema**:
```
/canvases/{canvasId}/ownership/{objectId}: {
  selectedBy: userId | null,
  selectedAt: timestamp | null,
  ownerCursorColor: string | null
}
```

**Specific Changes**:
1. Create SelectionManager hook with mode switching capability (`single` or `multi`)
2. Implement 30-second ownership timeout with automatic release
3. Add immediate ownership release on disconnect/browser close
4. Create ownership service with Firebase listeners for real-time sync
5. Add visual ownership indicators using user's cursor color for borders
6. Implement "unclickable" state - objects owned by others cannot be selected
7. Build expandable architecture that supports future multi-select mode
8. Add ownership transfer on selection (first-come-first-serve)

**Acceptance Criteria**:
- [ ] Objects show colored borders matching owner's cursor color when selected
- [ ] Other users cannot click objects that are currently owned
- [ ] Ownership automatically releases after 30 seconds of inactivity
- [ ] Ownership releases immediately when user disconnects
- [ ] SelectionManager supports both single and multi modes (ready for Phase 2)
- [ ] All interactions reset the 30-second timer
- [ ] Real-time ownership updates work for all connected users

---

### Task P3: Implement 24-Color Cursor System

**Objective**: Create expanded cursor color palette with base/light/dark variants

**Files to Modify**:
- Create `src/utils/colorPalette.js`
- Update `src/services/presence.service.js`
- Update `src/components/canvas/UserCursor.jsx`

**Color Palette Structure**:
```javascript
const CURSOR_COLORS = {
  blue: { base: '#2563eb', light: '#60a5fa', dark: '#1e40af' },
  red: { base: '#dc2626', light: '#f87171', dark: '#b91c1c' },
  // ... 8 total color families
}
```

**Specific Changes**:
1. Create 24-color palette: 8 base colors + 8 light variants + 8 dark variants
2. Implement deterministic color assignment: base → light → dark → repeat cycle
3. Update cursor assignment to prioritize unique colors before duplicates
4. Ensure color consistency - same user gets same color on reconnect
5. Store user color assignment in Firebase presence data
6. Update ownership borders to match assigned cursor colors
7. Handle edge case of 25+ users (acceptable color collisions)

**Acceptance Criteria**:
- [ ] 24 distinct cursor colors available before any collisions
- [ ] Users get assigned colors in base → light → dark priority order
- [ ] Same user gets consistent color across sessions
- [ ] Ownership borders match cursor colors exactly
- [ ] Color assignment handles 25+ users gracefully
- [ ] All colors meet minimum contrast requirements for visibility

---

### Task P4: Add Intentional Deletion System

**Objective**: Replace accidental resize-to-delete with intentional DEL key deletion

**Files to Modify**:
- Update `src/hooks/useKeyboardShortcuts.js` (create if needed)
- Create `src/components/canvas/DeleteConfirmModal.jsx`
- Update `src/services/canvas.service.js`

**Specific Changes**:
1. Remove any existing resize-to-zero deletion behavior
2. Add keyboard event listener for DEL key when objects are selected
3. Create simple confirmation modal: "Delete X objects? [Yes] [No]"
4. Implement role-based deletion permissions (Admin/Editor only, Viewer cannot)
5. Add deletion to object history system for undo functionality
6. Ensure deletion works with ownership system (can only delete owned objects)
7. Add bulk deletion support (delete multiple selected objects)
8. Show clear feedback during deletion process

**Acceptance Criteria**:
- [ ] DEL key triggers deletion for selected objects
- [ ] Confirmation modal appears with clear messaging
- [ ] Only Admin/Editor roles can delete objects
- [ ] Users can only delete objects they currently own/have selected
- [ ] Deletion works for both single objects and multiple selections
- [ ] Deleted objects can be undone if undo system exists
- [ ] Clear error messages if deletion fails

---

### Task P5: Enhanced User Feedback System

**Objective**: Add comprehensive visual feedback for ownership conflicts and user interactions

**Files to Modify**:
- Create `src/components/feedback/ToastSystem.jsx`
- Update `src/components/canvas/Canvas.jsx`
- Update CSS for cursor states

**Specific Changes**:
1. Implement toast notification system for user feedback
2. Add "Object currently selected by [User Name]" tooltip for owned objects
3. Create smooth 150ms transitions for all visual state changes
4. Add 2-second auto-dismiss for informational toasts
5. Ensure feedback is non-intrusive and doesn't block workflow

**Acceptance Criteria**:
- [ ] Tooltips show owner information for selected objects
- [ ] All visual transitions are smooth and polished
- [ ] Toasts auto-dismiss and don't accumulate
- [ ] Feedback system doesn't impact canvas performance

---

## 🚀 POST-MVP PHASE 2 (Multi-Select Features)

### Task P2-1: Implement Multi-Select UI System

**Objective**: Add Ctrl+Click and drag-to-select multi-selection capabilities

**Files to Modify**:
- Update `src/hooks/useSelectionManager.js`
- Update `src/components/canvas/Canvas.jsx`
- Create `src/components/canvas/SelectionBox.jsx`

**Specific Changes**:
1. Switch SelectionManager to `multi` mode
2. Implement Ctrl+Click to add/remove objects from selection
3. Add drag-to-select rectangle functionality (click empty space and drag)
4. Create visual selection box during drag-to-select
5. Maintain independent selections per user
6. Add "X objects selected" counter in properties panel
7. Show multi-colored borders (each object keeps its owner's color)
8. Handle mixed ownership in multi-selections

**Acceptance Criteria**:
- [ ] Ctrl+Click adds/removes objects from current selection
- [ ] Drag on empty canvas creates selection rectangle
- [ ] Selection box visually indicates what will be selected
- [ ] Each user maintains independent multi-selection
- [ ] Selected objects show count in properties panel
- [ ] Mixed ownership selections handle gracefully
- [ ] Performance remains smooth with large selections

---

### Task P2-2: Add Bulk Operations System

**Objective**: Implement bulk move and delete operations for multi-selected objects

**Files to Modify**:
- Update tool handlers for bulk operations
- Update `src/components/canvas/DeleteConfirmModal.jsx`
- Create `src/hooks/useBulkOperations.js`

**Specific Changes**:
1. Enable bulk movement: drag any selected object to move entire selection
2. Implement bulk deletion: DEL key deletes all selected objects
3. Update confirmation modal: "Delete 5 objects? [Yes] [No]"
4. Add bulk operations only work on objects user owns/can edit
5. Show clear visual feedback during bulk operations
6. Handle partial bulk operations (some objects fail due to permissions)
7. Add bulk operation history entries for undo system
8. Optimize performance for large bulk operations

**Acceptance Criteria**:
- [ ] Dragging one selected object moves entire selection together
- [ ] DEL key deletes all selected objects with proper confirmation
- [ ] Bulk operations respect ownership and permission rules
- [ ] Clear feedback for partial operation failures
- [ ] Bulk operations can be undone as single action
- [ ] Performance optimized for 50+ object operations

---

### Task P2-3: Advanced Conflict Resolution System

**Objective**: Handle complex multi-select ownership conflicts and edge cases

**Files to Modify**:
- Update `src/hooks/useSelectionManager.js`
- Create `src/services/conflictResolver.service.js`
- Update ownership service

**Specific Changes**:
1. Handle case: User A selects Object 1, User B tries to Ctrl+Click Object 1 (should fail silently)
2. Implement selection conflict indicators in UI
3. Add "Some objects unavailable" feedback for partial selection failures
4. Handle rapid selection changes between multiple users
5. Optimize database writes for multi-select operations
6. Add selection conflict resolution with timestamps
7. Handle edge case of user disconnecting mid-multi-select

**Acceptance Criteria**:
- [ ] Selection conflicts are handled gracefully without crashes
- [ ] Users get clear feedback when selections partially fail
- [ ] Rapid multi-user selection changes work smoothly
- [ ] Database performance optimized for frequent selection updates
- [ ] Edge cases like disconnection are handled properly

---

## 🔮 FUTURE OPTIMIZATION (Long-term)

### Task FO0: Performance & Scalability Improvements

**Objective**: Advanced performance optimizations for handling larger user bases and object counts

**Specific Changes**:

1. **Advanced Canvas Rendering**:
   - Implement viewport-based object culling (only render visible objects)
   - Add object-level caching for complex shapes
   - Implement render batching for multiple object updates
   - Add progressive loading for large canvases

2. **Database Optimization**:
   - Implement object pagination for large canvases
   - Add intelligent prefetching based on user viewport
   - Optimize query patterns to reduce reads/writes
   - Implement canvas partitioning for massive scale

3. **Advanced Caching**:
   - Add Redis caching layer for frequently accessed data
   - Implement client-side object caching with smart invalidation
   - Add CDN integration for static assets
   - Implement edge caching for global user base

4. **Scalability Architecture**:
   - Design multi-region deployment strategy
   - Implement horizontal scaling for user presence
   - Add load balancing for canvas operations
   - Design database sharding strategy

**Acceptance Criteria**:
- [ ] System handles 10,000+ objects smoothly
- [ ] Supports 50+ concurrent users per canvas
- [ ] Renders only visible objects for performance
- [ ] Database queries are optimized for scale
- [ ] Caching reduces server load significantly

---

### Task FO1: Add Accessibility Features

**Objective**: Implement colorblind support, high contrast mode, and color name tooltips

**Files to Modify**:
- Create `src/utils/accessibility.js`
- Update `src/utils/colorPalette.js`
- Add accessibility settings panel

**Specific Changes**:
1. Add colorblind-friendly cursor color alternatives
2. Implement high contrast mode for better visibility
3. Add color name tooltips ("Blue cursor", "Red selection") 
4. Test with colorblind simulator tools
5. Add keyboard navigation for canvas interactions
6. Implement screen reader compatibility for canvas state
7. Add accessibility settings in user preferences

**Acceptance Criteria**:
- [ ] Colorblind users can distinguish between different cursors/selections
- [ ] High contrast mode improves visibility significantly
- [ ] Color tooltips provide alternative identification method
- [ ] Keyboard navigation allows basic canvas interaction
- [ ] Screen readers can announce canvas state changes

---

## Implementation Priority

**Stage 5 should only be started after Stages 1-4 are complete and deployed.**

**Recommended Order within Stage 5**:
1. Start with FE1 (Mobile Menu) for immediate UX improvement
2. Then P2-P3 (Advanced ownership and colors) for better collaboration
3. Then FE2-FE4 (Quality of life improvements)
4. Finally FO0-FO1 (Long-term optimizations)

**Note**: These are enhancement features. Core product should be functional and deployed before tackling Stage 5.

