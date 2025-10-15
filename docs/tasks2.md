# CollabCanvas MVP Enhancement Tasks

## Overview
This document contains detailed implementation tasks for enhancing the CollabCanvas MVP with improved UI, project management, canvas refactoring, and new tools. Tasks are organized by priority for a 4-day development sprint.

## Task Priority Structure
- **🔥 Foundation**: Must complete first - core UI and infrastructure improvements
- **⚡ Core Functionality**: Primary features that extend the platform
- **🛠️ Enhanced Tools**: New capabilities and tools
- **✨ Advanced Features**: Polish and scaling features
- **🚀 Future Enhancements**: Post-MVP improvements

---

## 🔥 FOUNDATION TASKS (Must Complete First)

### Task F1: Convert Login to Google-Only Authentication

**Objective**: Remove email/password authentication and streamline login to Google OAuth only

**Files to Modify**:
- `src/components/auth/LoginForm.jsx`
- `src/services/auth.service.js` (if needed)

**Specific Changes**:
1. Remove all state variables related to email/password (formData, handleInputChange)
2. Remove the handleEmailSignIn function completely
3. Remove the email/password form JSX section (lines containing input fields for email/password)
4. Remove the "Or continue with email" divider section
5. Center the Google sign-in button as the primary and only login method
6. Update button styling to be more prominent (larger, better spacing)
7. Ensure error handling for Google OAuth still works correctly

**Acceptance Criteria**:
- [ ] Login page shows only Google sign-in button
- [ ] Email/password form is completely removed
- [ ] Google OAuth flow works correctly
- [ ] Error handling displays for Google sign-in failures
- [ ] Button is visually centered and prominent
- [ ] Page layout looks clean without form elements

**Testing Steps**:
1. Navigate to `/login` route
2. Verify only Google sign-in button is visible
3. Click Google button and complete OAuth flow
4. Verify successful redirect to canvas/dashboard
5. Test error handling by canceling OAuth flow

---

### Task F2: Redesign Header with Project/Canvas Dropdown

**Objective**: Create new header layout with nested project/canvas dropdown, user squares, and responsive design

**Files to Modify**:
- `src/components/layout/Header.jsx`

**Specific Changes**:
1. Replace current header layout with new structure: `[Logo] [Project>Canvas ▼] [User Squares] [Current User] [Share] [Sign Out]`
2. Create nested dropdown component showing format "ProjectName > CanvasName"
3. Add placeholder dropdown that shows "Select Project > Canvas" when nothing selected
4. Limit user squares to maximum 6 visible users plus "+N more" indicator
5. Make user squares actual squares (32x32px) with user initials, not full user info
6. Add responsive breakpoints: ≥1200px (full layout), 768-1199px (hide "Share" text), <768px (hamburger menu)
7. Implement consistent color generation for user avatars based on user ID
8. Add proper spacing and alignment for all header elements

**Acceptance Criteria**:
- [ ] Header uses new layout with correct element ordering
- [ ] Dropdown shows "Select Project > Canvas" placeholder
- [ ] User squares are 32x32px with user initials only
- [ ] Maximum 6 user squares visible with "+N" for overflow
- [ ] Responsive design works at all breakpoints
- [ ] User avatar colors are consistent per user
- [ ] All existing functionality (sign out, user info) still works

**Testing Steps**:
1. Load app and verify header layout matches specification
2. Test dropdown placeholder text appears correctly
3. Test with multiple users to verify user squares and overflow behavior
4. Test responsive behavior by resizing browser window
5. Verify sign out and other header actions still function

---

### Task F3: Implement Responsive Navigation with Hamburger Menu

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

**Testing Steps**:
1. Resize browser to <768px width
2. Verify hamburger menu icon appears
3. Click icon and verify menu slides out
4. Test all menu items function correctly
5. Test close behavior (outside click, escape key)
6. Test on actual mobile device if possible

---

### Task F4: Set Up Project/Canvas Data Models

**Objective**: Create Firebase data structure for projects and canvases with proper relationships

**Files to Modify**:
- Create `src/services/project.service.js`
- Update `src/services/canvas.service.js`
- Update Firebase security rules

**Specific Changes**:
1. Design Firestore collections structure:
   - `projects/{projectId}`: name, ownerId, collaborators[], isSharedProject, originalProjectId, createdAt
   - `canvases/{canvasId}`: projectId, ownerId, createdBy, projectOwnerId, name, createdAt
2. Create project service functions: createProject, getProjectsForUser, addCollaborator, removeCollaborator
3. Update canvas service to include project relationship methods
4. Implement Firebase security rules for project-based access control
5. Add data validation for required fields and proper types
6. Create helper functions for permission checking (canUserAccessProject, isProjectCollaborator)

**Acceptance Criteria**:
- [ ] Firestore collections created with correct schema
- [ ] Project service functions work correctly
- [ ] Canvas service updated with project relationships
- [ ] Firebase security rules prevent unauthorized access  
- [ ] Data validation works for all operations
- [ ] Permission helper functions return correct results

**Testing Steps**:
1. Create a new project and verify Firestore document structure
2. Add/remove collaborators and verify permission changes
3. Test canvas creation within project context
4. Verify security rules block unauthorized access attempts
5. Test permission helper functions with various user scenarios

---

## ⚡ CORE FUNCTIONALITY TASKS (Primary Features)

### Task C1: Build Project/Canvas Management System

**Objective**: Implement full project and canvas management with dropdown functionality

**Files to Modify**:
- Create `src/components/project/ProjectCanvasSelector.jsx`
- Create `src/hooks/useProjects.js`
- Update `src/components/layout/Header.jsx`

**Specific Changes**:
1. Create project/canvas selector dropdown component with nested display format
2. Implement useProjects hook to fetch user's accessible projects
3. Add "Create new project" and "Create new canvas" options in dropdown
4. Handle project/canvas selection and navigation
5. Show loading states during project/canvas operations
6. Implement alphabetical sorting for project and canvas lists
7. Add proper error handling for failed operations
8. Create modal dialogs for naming new projects/canvases

**Acceptance Criteria**:
- [ ] Dropdown shows all accessible projects in "Project > Canvas" format
- [ ] Users can create new projects and canvases from dropdown
- [ ] Selection properly navigates to chosen canvas
- [ ] Loading states display during operations
- [ ] Error handling works for all failure scenarios
- [ ] Projects and canvases are sorted alphabetically

**Testing Steps**:
1. Open dropdown and verify project/canvas listings
2. Create new project and verify it appears correctly
3. Create new canvas within existing project
4. Test navigation between different canvases
5. Test error scenarios (network issues, permission failures)

---

### Task C2: Implement Canvas Sharing with Auto-Project Creation

**Objective**: Build canvas sharing system that creates isolated shared projects for privacy

**Files to Modify**:
- Update `src/services/project.service.js`
- Update `src/services/canvas.service.js`
- Create `src/components/sharing/ShareCanvasModal.jsx`

**Specific Changes**:
1. Implement shareCanvas function that creates new "Shared: [CanvasName]" project
2. Move canvas from original project to new shared project
3. Add recipient as collaborator to shared project
4. Create share modal with email input and permission selection
5. Generate shareable links with format `/project/{projectId}/canvas/{canvasId}`
6. Handle edge cases: sharing already shared canvas, sharing with existing collaborators
7. Add share button to header and canvas context menu
8. Implement proper success/error feedback for sharing operations

**Acceptance Criteria**:
- [ ] Sharing creates isolated project with "Shared: [Name]" format
- [ ] Canvas moves to shared project correctly
- [ ] Recipients get appropriate access permissions
- [ ] Shareable links work correctly
- [ ] Share modal provides clear user feedback
- [ ] Edge cases are handled gracefully

**Testing Steps**:
1. Share a canvas and verify new project creation
2. Check recipient can access shared canvas but not original project
3. Test shareable link functionality
4. Verify original owner retains access to shared canvas
5. Test edge cases (sharing with self, re-sharing, etc.)

---

### Task C3: Add Connection Status Monitoring

**Objective**: Monitor internet connectivity and prevent edits when offline

**Files to Modify**:
- Create `src/hooks/useConnectionStatus.js`
- Update `src/components/canvas/Canvas.jsx`
- Create `src/components/status/ConnectionBanner.jsx`

**Specific Changes**:
1. Create connection monitoring hook using navigator.onLine and network events
2. Add visual connection status indicator (banner or icon in header)
3. Disable all edit operations when connection is lost
4. Show "Connection lost - changes will be saved when reconnected" message
5. Queue failed operations for retry when connection restored
6. Add visual feedback to indicate objects cannot be edited when offline
7. Test connection recovery and automatic retry of queued operations

**Acceptance Criteria**:
- [ ] Connection status is accurately detected and displayed
- [ ] Edit operations are disabled when offline
- [ ] Clear user feedback provided during offline state
- [ ] Operations retry automatically when connection restored
- [ ] Visual indicators clearly show connection state
- [ ] No data loss occurs during connection interruptions

**Testing Steps**:
1. Disconnect internet and verify offline detection
2. Attempt to edit objects and verify operations are blocked
3. Reconnect internet and verify automatic retry of queued operations
4. Test visual feedback displays correctly in all states
5. Verify no data corruption occurs during offline/online transitions

---

### Task C4: Extract Canvas Tool Handlers

**Objective**: Refactor Canvas component by extracting tool-specific logic into focused function modules

**Files to Modify**:
- Create `src/tools/MoveTool.js`
- Create `src/tools/ResizeTool.js`
- Create `src/tools/RectangleTool.js`
- Create `src/tools/PanTool.js`
- Update `src/components/canvas/Canvas.jsx`

**Specific Changes**:
1. Extract move tool logic into MoveTool function module with onMouseDown, onMouseMove, onMouseUp methods
2. Extract resize tool logic into ResizeTool function module
3. Extract rectangle creation logic into RectangleTool function module
4. Extract pan tool logic into PanTool function module
5. Create tool registry object that maps tool names to handler functions
6. Update Canvas component to use tool handlers instead of switch statements
7. Ensure all existing functionality works identically after refactor
8. Add proper error handling and logging to tool handlers

**Acceptance Criteria**:
- [ ] Canvas component is significantly smaller and more maintainable
- [ ] All tool functionality works identically to before refactor
- [ ] Tool handlers are properly separated and focused
- [ ] Tool registry allows easy addition of new tools
- [ ] No functionality regressions occur
- [ ] Code is cleaner and easier to understand

**Testing Steps**:
1. Test all existing tools (pan, move, resize, rectangle) work correctly
2. Verify multi-user collaboration still functions properly
3. Test edge cases and complex interactions between tools
4. Verify performance is equivalent or better than before
5. Code review to ensure clean separation of concerns

---

### Task C5: Implement Central Ownership Management

**Objective**: Create centralized object ownership system with 10-second auto-release timers

**Files to Modify**:
- Create `src/hooks/useObjectOwnership.js`
- Update `src/components/canvas/Canvas.jsx`
- Update tool handler files created in C4

**Specific Changes**:
1. Create useObjectOwnership hook with claimOwnership, releaseOwnership, isOwnedBy, getOwnershipColor methods
2. Implement event-driven timer system using setTimeout for exact 10-second ownership
3. Replace existing lockObject/unlockObject system with new ownership management
4. Add visual ownership indicators with border colors matching user avatar colors
5. Handle ownership conflicts with first-click-wins timestamp logic
6. Implement ownership release on connection loss
7. Add ownership extension on edit actions (reset 10-second timer)
8. Integrate with all tool handlers for consistent ownership behavior

**Acceptance Criteria**:
- [ ] Objects show clear ownership indicators with user colors
- [ ] Ownership automatically releases after 10 seconds of inactivity
- [ ] Timer resets on edit actions
- [ ] First-click-wins conflict resolution works correctly
- [ ] Connection loss releases ownership immediately
- [ ] All tools use consistent ownership behavior
- [ ] Performance is excellent with many concurrent ownerships

**Testing Steps**:
1. Select object and verify ownership visual indicators
2. Wait 10 seconds without interaction and verify ownership release
3. Test edit actions reset the ownership timer
4. Test multiple users trying to claim same object simultaneously
5. Test ownership release on connection loss/page refresh
6. Performance test with many objects and multiple users

---

## 🛠️ ENHANCED TOOLS TASKS (Extend Capabilities)

### Task E1: Add Circle Creation Tool

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
- [ ] Circle tool appears in toolbar and can be selected
- [ ] Users can create circles by dragging on canvas
- [ ] Circles can be selected, moved, and resized
- [ ] Circles work properly in multiplayer environment
- [ ] Circles respect canvas boundaries
- [ ] Circle ownership and locking works correctly

**Testing Steps**:
1. Select circle tool and create circles of various sizes
2. Test circle selection and movement with move tool
3. Test circle resizing with resize tool
4. Test multiplayer collaboration with circles
5. Verify circles save and load correctly
6. Test circle boundary constraints

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

### Task E4: Add Owner-Only Edit Restrictions

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

## ✨ ADVANCED FEATURES TASKS (Polish & Scale)

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

## 🚀 FUTURE ENHANCEMENTS TASKS (Post-MVP)

### Task FE1: Add Recently Used Sorting

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

**Testing Steps**:
1. Access various projects/canvases and verify recent sorting
2. Test activity tracking performance
3. Verify dropdown UI clearly shows recent vs. all items
4. Test activity data management and cleanup

---

### Task FE2: Implement Theme Selector

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

**Testing Steps**:
1. Switch between light and dark themes
2. Verify all UI components adapt correctly
3. Test canvas background options
4. Test theme persistence across browser sessions
5. Verify accessibility compliance for both themes

---

### Task FE3: Add Grid System with Snap-to-Grid

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

**Testing Steps**:
1. Toggle grid display on/off
2. Test object snapping to grid points
3. Test different grid spacing options
4. Verify grid performance with many objects
5. Test grid behavior in collaborative editing

---

## 🎯 POST-MVP PHASE 1 TASKS (Advanced Collaboration Features)

### Task P1: Implement Role-Based Permission System

**Objective**: Add Admin/Editor/Viewer role system with admin-only role management

**Files to Modify**:
- Create `src/contexts/RoleContext.js`
- Create `src/services/role.service.js`
- Create `src/components/roles/RoleManager.jsx`
- Update `src/components/presence/OnlineUsers.jsx`

**Specific Changes**:
1. Create role context that manages user permissions across the app
2. Implement role service functions: assignRole, getUserRole, checkPermission
3. Add role assignment to user sidebar (Admin-only feature)
4. Update Firebase security rules to enforce role-based access
5. Store roles permanently in Firestore `/canvases/{canvasId}/roles` collection
6. Add role caching with 5-minute refresh and immediate updates on changes
7. Prevent admins from demoting themselves (last admin protection)
8. First user on canvas automatically becomes Admin

**Acceptance Criteria**:
- [ ] Three roles work correctly: Admin (full access), Editor (create/edit), Viewer (read-only)
- [ ] Only Admins can see and modify user roles
- [ ] Roles persist permanently in database
- [ ] First user on canvas becomes Admin automatically
- [ ] Admins cannot demote themselves
- [ ] Role changes update immediately for all users
- [ ] Firebase security rules enforce role permissions

**Testing Steps**:
1. Create canvas and verify first user becomes Admin
2. Add users and assign different roles
3. Test that Viewers cannot edit anything (cursor shows but no interactions work)
4. Verify Editors can create and edit objects
5. Test Admin-only role management visibility
6. Test role persistence across browser sessions

---

### Task P2: Build Advanced Selection Ownership System

**Objective**: Implement selection-based ownership with 30-second timeout and expandable architecture

**Files to Modify**:
- Create `src/hooks/useSelectionManager.js`
- Update `src/components/canvas/Canvas.jsx`
- Update all tool handler files
- Create `src/services/ownership.service.js`

**Specific Changes**:
1. Create SelectionManager hook with mode switching capability (`single` or `multi`)
2. Implement 30-second ownership timeout with automatic release
3. Add immediate ownership release on disconnect/browser close
4. Create ownership service with Firebase listeners for real-time sync
5. Add visual ownership indicators using user's cursor color for borders
6. Implement "unclickable" state - objects owned by others cannot be selected
7. Build expandable architecture that supports future multi-select mode
8. Add ownership transfer on selection (first-come-first-serve)

**Database Schema**:
```
/canvases/{canvasId}/ownership/{objectId}: {
  selectedBy: userId | null,
  selectedAt: timestamp | null,
  ownerCursorColor: string | null
}
```

**Acceptance Criteria**:
- [ ] Objects show colored borders matching owner's cursor color when selected
- [ ] Other users cannot click objects that are currently owned
- [ ] Ownership automatically releases after 30 seconds of inactivity
- [ ] Ownership releases immediately when user disconnects
- [ ] SelectionManager supports both single and multi modes (ready for Phase 2)
- [ ] All interactions reset the 30-second timer
- [ ] Real-time ownership updates work for all connected users

**Testing Steps**:
1. Select object and verify colored border appears
2. Have second user try to select same object (should be unclickable)
3. Wait 30 seconds and verify ownership releases automatically
4. Test ownership release on browser close/refresh
5. Test multiple users selecting different objects simultaneously
6. Verify ownership indicators update in real-time

---

### Task P3: Implement 24-Color Cursor System

**Objective**: Create expanded cursor color palette with base/light/dark variants

**Files to Modify**:
- Create `src/utils/colorPalette.js`
- Update `src/services/presence.service.js`
- Update `src/components/canvas/UserCursor.jsx`

**Specific Changes**:
1. Create 24-color palette: 8 base colors + 8 light variants + 8 dark variants
2. Implement deterministic color assignment: base → light → dark → repeat cycle
3. Update cursor assignment to prioritize unique colors before duplicates
4. Ensure color consistency - same user gets same color on reconnect
5. Store user color assignment in Firebase presence data
6. Update ownership borders to match assigned cursor colors
7. Handle edge case of 25+ users (acceptable color collisions)

**Color Palette Structure**:
```javascript
const CURSOR_COLORS = {
  blue: { base: '#2563eb', light: '#60a5fa', dark: '#1e40af' },
  red: { base: '#dc2626', light: '#f87171', dark: '#b91c1c' },
  // ... 8 total color families
}
```

**Acceptance Criteria**:
- [ ] 24 distinct cursor colors available before any collisions
- [ ] Users get assigned colors in base → light → dark priority order
- [ ] Same user gets consistent color across sessions
- [ ] Ownership borders match cursor colors exactly
- [ ] Color assignment handles 25+ users gracefully
- [ ] All colors meet minimum contrast requirements for visibility

**Testing Steps**:
1. Test with 1-8 users (should all get base colors)
2. Test with 9-16 users (should get light variants)  
3. Test with 17-24 users (should get dark variants)
4. Test user reconnection gets same color
5. Verify ownership borders match cursor colors
6. Test 25+ users for graceful collision handling

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
- [ ] Deletion works for both single objects and multiple selections (ready for Phase 2)
- [ ] Deleted objects can be undone if undo system exists
- [ ] Clear error messages if deletion fails

**Testing Steps**:
1. Select object and press DEL key
2. Test confirmation modal appears and works correctly
3. Test role permissions (Viewer should not be able to delete)
4. Test ownership restrictions (cannot delete others' selected objects)
5. Test deletion of multiple objects
6. Test undo functionality if available

---

### Task P5: Enhanced User Feedback System

**Objective**: Add comprehensive visual feedback for viewer restrictions and ownership conflicts

**Files to Modify**:
- Create `src/components/feedback/ToastSystem.jsx`
- Update `src/components/canvas/Canvas.jsx`
- Update CSS for cursor states

**Specific Changes**:
1. Add cursor state changes: `not-allowed` cursor when Viewer hovers over objects
2. Implement toast notification system for user feedback
3. Show "Viewer mode - read only access" toast when Viewer tries to interact
4. Add "Object currently selected by [User Name]" tooltip for owned objects
5. Create smooth 150ms transitions for all visual state changes
6. Add 2-second auto-dismiss for informational toasts
7. Ensure feedback is non-intrusive and doesn't block workflow

**Acceptance Criteria**:
- [ ] Viewer cursor changes to `not-allowed` when hovering over objects
- [ ] Toast appears when Viewer attempts to interact with objects
- [ ] Tooltips show owner information for selected objects
- [ ] All visual transitions are smooth and polished
- [ ] Toasts auto-dismiss and don't accumulate
- [ ] Feedback system doesn't impact canvas performance

**Testing Steps**:
1. Login as Viewer and hover over objects (verify cursor change)
2. Try to click object as Viewer (verify toast appears)
3. Hover over objects selected by other users (verify owner tooltip)
4. Test toast auto-dismiss functionality
5. Verify smooth visual transitions
6. Performance test feedback system with many users

---

## 🚀 POST-MVP PHASE 2 TASKS (Advanced Multi-Select Features)

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
5. Maintain independent selections per user (User A and User B have separate selections)
6. Add "X objects selected" counter in properties panel
7. Show multi-colored borders (each object keeps its owner's color)
8. Handle mixed ownership in multi-selections (some owned, some not)

**Acceptance Criteria**:
- [ ] Ctrl+Click adds/removes objects from current selection
- [ ] Drag on empty canvas creates selection rectangle
- [ ] Selection box visually indicates what will be selected
- [ ] Each user maintains independent multi-selection
- [ ] Selected objects show count in properties panel
- [ ] Mixed ownership selections handle gracefully
- [ ] Performance remains smooth with large selections

**Testing Steps**:
1. Ctrl+Click to build multi-selection of various objects
2. Drag on empty space to select multiple objects
3. Test with multiple users selecting different object sets
4. Test performance with 50+ objects selected
5. Verify selection counter updates correctly
6. Test mixed ownership scenarios

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

**Testing Steps**:
1. Select multiple objects and test bulk movement
2. Test bulk deletion with proper confirmation
3. Test mixed ownership bulk operations (some succeed, some fail)
4. Test bulk undo functionality
5. Performance test with large selections
6. Test error handling and user feedback

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

**Testing Steps**:
1. Test overlapping multi-selections between users
2. Test rapid selection changes with multiple users
3. Test partial selection failures and user feedback
4. Test disconnection during multi-select operations
5. Performance test multi-select with many concurrent users

---

## 🔮 FUTURE OPTIMIZATION TASKS (Long-term Enhancements)

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

## Implementation Notes

### Getting Started
1. Begin with Foundation tasks as they establish the core infrastructure
2. Complete tasks in order within each priority level
3. Test thoroughly after each task completion
4. Maintain existing functionality while adding new features

### Code Quality Standards
- Follow existing code patterns and styling
- Add comprehensive error handling
- Include proper TypeScript types if applicable
- Write clear, self-documenting code
- Add appropriate comments for complex logic

### Testing Requirements
- Test all functionality manually after implementation
- Verify collaborative editing works for new features
- Test responsive behavior on different screen sizes
- Ensure accessibility compliance
- Performance test with realistic data volumes

### Collaboration Guidelines
- Communicate with team before starting each task
- Update task status and any blockers encountered
- Request code review for complex changes
- Document any architectural decisions or trade-offs made
