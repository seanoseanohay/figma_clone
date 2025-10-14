# CollabCanvas MVP - Development Task List

## Project File Structure

```
collabcanvas-mvp/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.jsx
│   │   │   ├── RegisterForm.jsx
│   │   │   └── AuthProvider.jsx
│   │   ├── canvas/
│   │   │   ├── Canvas.jsx
│   │   │   ├── CanvasObject.jsx
│   │   │   ├── Toolbar.jsx
│   │   │   └── UserCursor.jsx
│   │   ├── presence/
│   │   │   ├── OnlineUsers.jsx
│   │   │   └── ConnectionStatus.jsx
│   │   └── layout/
│   │       ├── Header.jsx
│   │       └── ProtectedRoute.jsx
│   ├── services/
│   │   ├── firebase.js
│   │   ├── auth.service.js
│   │   ├── presence.service.js
│   │   ├── canvas.service.js
│   │   └── boundary.utils.js
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── usePresence.js
│   │   ├── useCanvasObjects.js
│   │   └── useCursorTracking.js
│   ├── constants/
│   │   └── canvas.constants.js
│   ├── App.jsx
│   ├── index.js
│   └── index.css
├── tests/
│   ├── unit/
│   │   ├── boundary.utils.test.js
│   │   ├── canvas.service.test.js
│   │   └── presence.service.test.js
│   └── integration/
│       ├── auth.integration.test.js
│       ├── canvas-sync.integration.test.js
│       └── multiplayer.integration.test.js
├── .env.example
├── .gitignore
├── package.json
├── tailwind.config.js
├── firebase.json
├── .firebaserc
├── firestore.rules
├── database.rules.json
└── README.md
```

---

## ✅ PR #1: Project Setup & Infrastructure - COMPLETE

**Goal:** Initialize the project with Firebase, React, and all dependencies configured.

### Tasks:
- [x] **1.1** Create React app using `create-react-app`
  - Files: Initial project structure
  - Command: `npx create-react-app collabcanvas-mvp`

- [x] **1.2** Install dependencies
  - Files: `package.json`
  - Dependencies: `firebase`, `react-konva`, `konva`, `react-router-dom`, `tailwindcss`
  - Dev dependencies: `@testing-library/react`, `@testing-library/jest-dom`, `jest`

- [x] **1.3** Configure Tailwind CSS
  - Files: `tailwind.config.js`, `src/index.css`
  - Add Tailwind directives to index.css

- [x] **1.4** Create Firebase project and get config
  - External: Firebase Console
  - Enable Google Authentication in Firebase Console
  - Enable Firestore Database (production mode)
  - Enable Realtime Database

- [x] **1.5** Set up environment variables
  - Files: `.env.example`, `.env` (local only)
  - Add Firebase config keys

- [x] **1.6** Initialize Firebase in app
  - Files: `src/services/firebase.js`
  - Export `auth`, `db` (Firestore), `rtdb` (Realtime Database) instances

- [x] **1.7** Create constants file
  - Files: `src/constants/canvas.constants.js`
  - Define: CANVAS_WIDTH (5000), CANVAS_HEIGHT (5000), default shape sizes, colors

- [x] **1.8** Set up Firebase security rules
  - Files: `firestore.rules`, `database.rules.json`
  - Basic rules for authenticated users

- [x] **1.9** Configure Firebase Hosting
  - Files: `firebase.json`, `.firebaserc`
  - Set up deployment configuration

- [x] **1.10** Create basic README
  - Files: `README.md`
  - Add project description, setup instructions

- [x] **1.11** Deploy skeleton app
  - Command: `firebase deploy`
  - Verify deployed URL is accessible

**Files Created/Modified:**
- All initial project files
- `package.json`, `tailwind.config.js`, `firebase.json`, `.firebaserc`
- `src/services/firebase.js`, `src/constants/canvas.constants.js`
- `firestore.rules`, `database.rules.json`, `README.md`

**Testing:** Manual verification - app loads without errors

---

## ✅ PR #2: Authentication System - COMPLETE

**Goal:** Implement user authentication with Google and email/password.

### Tasks:
- [x] **2.1** Create authentication service
  - Files: `src/services/auth.service.js`
  - Functions: `signInWithGoogle()`, `signUpWithEmail()`, `signInWithEmail()`, `signOut()`, `onAuthChange()`

- [x] **2.2** Create AuthProvider context
  - Files: `src/components/auth/AuthProvider.jsx`
  - Manages auth state, provides user context

- [x] **2.3** Create custom auth hook
  - Files: `src/hooks/useAuth.js`
  - Hook to access auth context

- [x] **2.4** Build Login form component
  - Files: `src/components/auth/LoginForm.jsx`
  - Email/password fields, Google sign-in button

- [x] **2.5** Build Register form component
  - Files: `src/components/auth/RegisterForm.jsx`
  - Email/password fields, display name defaults to email

- [x] **2.6** Store user profile in Firestore on first login
  - Files: `src/services/auth.service.js`
  - Create user document with uid, displayName, email, photoURL, timestamps

- [x] **2.7** Create ProtectedRoute component
  - Files: `src/components/layout/ProtectedRoute.jsx`
  - Redirects to login if not authenticated

- [x] **2.8** Set up routing with login page requirement
  - Files: `src/App.jsx`
  - Routes: `/` (redirect to login), `/login`, `/register`, `/canvas` (protected)
  - **NEW REQUIREMENT:** Users must land on login page before accessing canvas

- [x] **2.9** Create Header component with sign-out
  - Files: `src/components/layout/Header.jsx`
  - Display user name, sign-out button

- [x] **2.10** Update Firestore rules for users collection
  - Files: `firestore.rules`
  - Users can read/write their own document
  - **NEW:** Add authentication error handling with clear error messages and retry prompts

**Files Created/Modified:**
- `src/services/auth.service.js`
- `src/components/auth/AuthProvider.jsx`, `LoginForm.jsx`, `RegisterForm.jsx`
- `src/components/layout/ProtectedRoute.jsx`, `Header.jsx`
- `src/hooks/useAuth.js`
- `src/App.jsx`
- `firestore.rules`

**Testing:**
- [ ] **Integration Test:** `tests/integration/auth.integration.test.js`
  - Test email/password registration flow
  - Test login flow
  - Test user document creation in Firestore
  - Test sign-out functionality
  - Mock Firebase auth for testing

---

## ✅ PR #3: Canvas Foundation & Testing Infrastructure - COMPLETE

**Goal:** Set up the canvas with pan, zoom, boundary visualization, and comprehensive testing framework.

### Tasks:
- [x] **3.1** Create Canvas component with tool system
  - Files: `src/components/canvas/Canvas.jsx`
  - Initialize Konva Stage and Layer
  - **NEW:** Implement tool state management (hand, arrow, rectangle)
  - **NEW:** Tool-specific mouse event handling

- [x] **3.2** Implement tool-based pan functionality (Hand Tool)
  - Files: `src/components/canvas/Canvas.jsx`
  - **UPDATED:** Pan only active when Hand Tool is selected
  - **NEW:** Ignore rectangle interactions during Hand Tool panning
  - **NEW:** Cursor changes to grab/grabbing during Hand Tool use

- [x] **3.3** Implement zoom functionality
  - Files: `src/components/canvas/Canvas.jsx`
  - Mouse wheel to zoom, maintain smooth interaction

- [x] **3.4** Set initial view (centered at 2500, 2500)
  - Files: `src/components/canvas/Canvas.jsx`
  - Calculate zoom level to fit entire canvas in viewport

- [x] **3.5** Add visual boundary
  - Files: `src/components/canvas/Canvas.jsx`
  - Different background color for canvas area vs outside boundary

- [x] **3.6** Create Toolbar component with independent tool state
  - Files: `src/components/canvas/Toolbar.jsx`
  - **NEW:** Three tool buttons: Hand, Arrow (default), Rectangle
  - **NEW:** Active tool visual feedback (background color change)
  - **NEW:** Local tool state management (React state, NOT Firebase)
  - **NEW:** Each user has independent tool selection (not synced between users)
  - **NEW:** Left-aligned placement above canvas
  - **NEW:** Integration with Canvas component for tool state

- [x] **3.7** Add Canvas to protected route with Toolbar
  - Files: `src/App.jsx`
  - **UPDATED:** Canvas accessible at `/canvas` route with Toolbar above canvas
  - **NEW:** Page layout: Header → Toolbar Section → Canvas Section

- [x] **3.8** Implement comprehensive testing framework
  - Files: `src/components/__tests__/Canvas.test.jsx`, `Toolbar.test.jsx`, `canvasUtils.test.js`, `integration.test.jsx`
  - **Testing Categories:**
    - **Unit Tests:** Individual component behavior and utility functions
    - **Integration Tests:** Multi-component workflows and user interactions  
    - **Visual Feedback Tests:** Tool states, cursor changes, selection feedback
    - **Performance Tests:** FPS during pan/zoom operations
    - **Boundary Tests:** Canvas limit enforcement and edge cases
  - **Test Requirements:**
    - All tool selection and cursor state changes
    - Rectangle creation, selection, and manipulation workflows
    - Boundary constraint enforcement
    - Visual feedback responsiveness
    - Error handling and edge cases
    - Cross-browser compatibility for critical interactions

- [x] **3.9** Test performance with tool system
  - Manual testing: Verify 30+ FPS during pan/zoom with tool switching
  - Test tool cursor changes and visual feedback

**Definition of Done:**
- ✅ Canvas renders correctly with proper boundaries
- ✅ All three tools (Hand, Arrow, Rectangle) work independently
- ✅ Tool selection provides appropriate cursor feedback
- ✅ Pan and zoom work smoothly (30+ FPS target)
- ✅ Visual feedback for active tool is clear and responsive
- ✅ Tool state is local to each user (not synced)
- ✅ Initial view is centered and properly scaled
- ✅ Comprehensive test suite covers all functionality
- ✅ All tests pass with 100% success rate
- ✅ Performance meets requirements during all operations

**Files Created/Modified:**
- `src/components/canvas/Canvas.jsx`, `Toolbar.jsx` **NEW**
- `src/App.jsx`
- `src/components/__tests__/*.test.jsx` **NEW**

**Testing Categories & Requirements:**

### Unit Tests
- **Toolbar Component:**
  - Renders all three tool buttons correctly
  - Shows proper visual feedback for selected tool
  - Calls onToolChange when tools are clicked
  - Updates appearance when selectedTool prop changes
  - Displays correct tool hints and labels

- **Canvas Component:**
  - Renders Konva Stage and Layer components
  - Handles mouse events appropriately for each tool
  - Manages tool selection and cursor states
  - Enforces canvas boundaries correctly
  - Initializes with proper view settings

- **Utility Functions:**
  - Boundary constraint enforcement
  - Point-in-rectangle collision detection  
  - Rectangle validation and normalization
  - Resize handle detection algorithms

### Integration Tests  
- **Tool Workflow Tests:**
  - Complete rectangle creation workflow (Rectangle → Arrow auto-switch)
  - Tool selection synchronization between Toolbar and Canvas
  - Cursor state changes during tool switching
  - Visual feedback consistency across components

- **User Experience Tests:**
  - Rectangle creation → selection → manipulation workflow
  - Error handling for invalid operations
  - Boundary enforcement during various operations
  - Performance during rapid tool switching

### Performance Tests
- Smooth interaction (30+ FPS) during:
  - Canvas panning with Hand tool
  - Zooming at different scale levels  
  - Tool switching between all three tools
  - Rectangle creation and manipulation
- Memory usage remains stable during extended use
- No visual artifacts during rapid interactions

---

## ✅ PR #4: Multiplayer Presence System (CRITICAL) - COMPLETE

**Goal:** Implement real-time cursor tracking and user presence.

### Tasks:
- [x] **4.1** Create presence service for global canvas
  - Files: `src/services/presence.service.js`
  - Functions: `updateCursorPosition()`, `setUserOnline()`, `setUserOffline()`, `subscribeToGlobalPresence()`
  - **UPDATED:** Use global canvas structure `/globalCanvas/users/{userId}` instead of sessions

- [x] **4.2** Create cursor tracking hook for position only
  - Files: `src/hooks/useCursorTracking.js`
  - Throttle cursor updates to 50-100ms
  - Broadcast **position only** to Realtime Database
  - **NOT INCLUDED:** Tool selection (stays local to each user)

- [x] **4.3** Create presence hook
  - Files: `src/hooks/usePresence.js`
  - Subscribe to other users' presence data
  - Return array of connected users with cursor positions

- [x] **4.4** Create UserCursor component for position display
  - Files: `src/components/canvas/UserCursor.jsx`
  - Render cursor with username label
  - **POSITION ONLY:** Show cursor position, NOT tool selection of other users
  - **COMPLETED:** Cursors display correctly with colors and names after Firebase database rules fix

- [x] **4.5** Integrate cursor tracking into Canvas
  - Files: `src/components/canvas/Canvas.jsx`
  - Track mouse movement on canvas
  - Render all user cursors
  - **COMPLETED:** UserCursor components render correctly when other users move mouse

- [x] **4.6** Create OnlineUsers component
  - Files: `src/components/presence/OnlineUsers.jsx`
  - Display list of connected users
  - **COMPLETED:** Moved to Header component as compact colored squares with hover tooltips showing full names

- [x] **4.7** Implement auto-cleanup for stale presence
  - Files: `src/services/presence.service.js`
  - Use Firebase onDisconnect() to clean up

- [x] **4.8** Add ConnectionStatus indicator
  - Files: `src/components/presence/ConnectionStatus.jsx`
  - Show online/offline status

- [x] **4.9** Update Realtime Database rules for global canvas
  - Files: `database.rules.json`
  - Allow authenticated users to read/write presence at `/globalCanvas/users/{userId}`
  - **UPDATED:** Global canvas structure instead of sessions

**Files Created/Modified:**
- `src/services/presence.service.js`
- `src/hooks/useCursorTracking.js`, `usePresence.js`
- `src/components/canvas/UserCursor.jsx`, `Canvas.jsx`
- `src/components/presence/OnlineUsers.jsx`, `ConnectionStatus.jsx`
- `database.rules.json`

**Testing:**
- [ ] **Integration Test:** `tests/integration/multiplayer.integration.test.js`
  - Test cursor position updates
  - Test presence subscription
  - Test user connect/disconnect events
  - Verify cursor sync latency <50ms (performance test)
  - Mock Realtime Database for testing

**Critical:** Test with 2+ browser windows before proceeding!
- **Test independent tool selection:** Each user should be able to select different tools
- **Test tool state isolation:** Tool changes in one browser should NOT affect other browsers
- **Test cursor position sync:** Only cursor position should sync, NOT tool selection

---

## ✅ PR #5: Boundary Validation Utilities - COMPLETE

**Goal:** Create utilities for boundary enforcement before implementing shapes.

### Tasks:
- [x] **5.1** Create boundary utils with snapping behavior
  - Files: `src/services/boundary.utils.js`
  - Functions:
    - `isPositionInBounds(x, y)`
    - `snapRectangle(x, y, width, height)` - returns snapped position **CHANGED from clamp**
    - `snapCircle(x, y, radius)` - returns snapped position **CHANGED from clamp**
    - `snapText(x, y, width, height)` - returns snapped position **CHANGED from clamp**
    - `canCreateShapeAt(x, y, width, height)` - boolean check
  - **UPDATED:** Shapes now **snap to boundaries** instead of being clamped

- [x] **5.2** Add comprehensive documentation
  - Files: `src/services/boundary.utils.js`
  - Document boundary rules and constraints

**Files Created/Modified:**
- `src/services/boundary.utils.js`

**Testing:**
- [ ] **Unit Test:** `tests/unit/boundary.utils.test.js`
  - Test `isPositionInBounds()` with various coordinates
  - Test `snapRectangle()` with shapes at/beyond edges **CHANGED from clamp**
  - Test `snapCircle()` with circles at/beyond edges **CHANGED from clamp**
  - Test `canCreateShapeAt()` with valid/invalid positions
  - Test snapping behavior (shapes should snap to boundary when dragged near edges)
  - Test edge cases (exactly at boundary, one pixel over, etc.)

---

## ✅ PR #6: Canvas Service & Data Layer - COMPLETE

**Goal:** Create service layer for canvas object operations.

### Tasks:
- [x] **6.1** Create canvas service
  - Files: `src/services/canvas.service.js`
  - Functions:
    - `createObject(type, position, properties)` - validates bounds, writes to Firestore
    - `updateObjectPosition(objectId, newPosition)` - validates bounds, updates Firestore
    - `subscribeToObjects(callback)` - real-time listener
    - `deleteObject(objectId)` - removes from Firestore

- [x] **6.2** Implement last-write-wins with timestamps
  - Files: `src/services/canvas.service.js`
  - Add `lastModifiedAt` timestamp to all updates

- [x] **6.3** Create canvas objects hook
  - Files: `src/hooks/useCanvasObjects.js`
  - Subscribe to Firestore objects collection
  - Return array of canvas objects

- [x] **6.4** Update Firestore rules for canvas objects
  - Files: `firestore.rules`
  - Authenticated users can create/update/delete objects

**Files Created/Modified:**
- `src/services/canvas.service.js`
- `src/hooks/useCanvasObjects.js`
- `firestore.rules`

**Testing:**
- [ ] **Unit Test:** `tests/unit/canvas.service.test.js`
  - Test `createObject()` with valid positions
  - Test `createObject()` rejects out-of-bounds positions
  - Test `updateObjectPosition()` with valid positions
  - Test `updateObjectPosition()` clamps positions at boundaries
  - Mock Firestore for testing

---

## ✅ PR #7: Shape Creation & Enhanced User Experience - COMPLETE

**Goal:** Implement rectangle creation with toolbar integration, enhanced visual feedback, and detailed cursor state management.

### Tasks:
- [x] **7.1** Update Toolbar component for Rectangle Tool with enhanced feedback
  - Files: `src/components/canvas/Toolbar.jsx`
  - **UPDATED:** Toolbar already exists from PR #3, now add Rectangle Tool functionality
  - **Enhanced visual feedback:**
    - Selected tool: Blue background (#2563eb) with white text
    - Unselected tools: White background (#ffffff) with gray text (#374151)
    - Hover states: Subtle background change (#f3f4f6)
    - Smooth transitions (150ms) between all states
    - Tool hint text updates dynamically based on selection
  - **NEW:** Auto-switch to Arrow Tool after rectangle creation

- [x] **7.2** Create CanvasObject component for rectangles with visual enhancements
  - Files: `src/components/canvas/CanvasObject.jsx`
  - Render rectangle shapes only (Text and Circle moved to post-MVP)
  - Use Konva Rect shape
  - **Enhanced visual feedback:**
    - Default rectangle: Gray fill (#808080) with subtle border (#333333, 1px)
    - Selected rectangle: Blue border (#2563eb, 2px width) for clear selection feedback
    - Semi-transparent states (70% opacity) during operations
  - **NEW:** Include large resize handles (20px) for selected rectangles

- [x] **7.3** Implement Rectangle Tool creation with advanced cursor management
  - Files: `src/components/canvas/Canvas.jsx`
  - **UPDATED:** Only active when Rectangle Tool is selected
  - **Enhanced cursor states:**
    - Rectangle Tool idle: `crosshair` cursor
    - During creation: `crosshair` maintains throughout drag operation
    - Tool switching: Immediate cursor updates (no lag)
    - Hover feedback: Cursor preview before tool selection
  - **Visual creation feedback:**
    - Click-and-drag to create rectangle from first corner to opposite corner
    - Show semi-transparent preview rectangle (70% opacity) while dragging
    - Preview rectangle updates in real-time during mouse movement
    - Ghost rectangle shows final dimensions during creation
    - Minimum size visual indicator when approaching 2x1px limit
  - **Enhanced creation behavior:**
    - Enforce minimum 2x1px size with visual feedback
    - Prevent creation outside canvas bounds with clear user indication
    - Automatic dimension normalization (handle negative width/height gracefully)
    - Auto-switch to Arrow Tool after rectangle creation (smooth transition)
    - Creation cancellation on escape key (future enhancement point)

- [x] **7.4** Implement comprehensive cursor state management system
  - Files: `src/components/canvas/Canvas.jsx`
  - **Tool-specific cursor states:**
    - **Hand Tool:** 
      - Idle: `grab` cursor
      - Active dragging: `grabbing` cursor
      - Immediate state changes on tool switch
    - **Arrow Tool:**
      - Default: `default` cursor (arrow)
      - Hovering over rectangle: `move` cursor
      - Hovering over resize handles: Directional cursors (`nw-resize`, `ne-resize`, `sw-resize`, `se-resize`)
      - During move operation: `move` cursor
      - During resize operation: Appropriate directional cursor
    - **Rectangle Tool:**
      - Always: `crosshair` cursor
      - No state variations (consistent creation experience)
  - **State transition management:**
    - Instant cursor updates on tool changes
    - Smooth transitions without flicker
    - Proper cursor restoration after operations
    - Handle edge cases (mouse leaving canvas during operations)

- [x] **7.5** Integrate canvas objects hook with enhanced loading states
  - Files: `src/components/canvas/Canvas.jsx`
  - Load rectangles from Firestore
  - Render all rectangles using CanvasObject component
  - **Enhanced loading experience:**
    - Loading indicator while fetching initial rectangles
    - Progressive rendering for large numbers of rectangles
    - Error states with retry functionality
    - Empty state messaging when no rectangles exist

- [x] **7.6** Implement enhanced user feedback for rectangle creation
  - Files: `src/components/canvas/Canvas.jsx`
  - **Boundary feedback:**
    - Visual indication when attempting creation outside bounds
    - Temporary error message or visual cue
    - Cursor changes to indicate invalid creation area
    - Graceful handling of partial out-of-bounds creation attempts
  - **Size feedback:**
    - Real-time dimension display during creation (optional enhancement)
    - Visual feedback when approaching minimum size constraints
    - Clear indication when creation meets minimum requirements

**Definition of Done:**
- ✅ Rectangle Tool creates rectangles with click-and-drag interaction
- ✅ Semi-transparent preview appears during rectangle creation
- ✅ Rectangle creation enforces minimum size (2x1px) with visual feedback
- ✅ Creation is prevented outside canvas bounds with user indication
- ✅ Tool automatically switches from Rectangle to Arrow after creation
- ✅ All cursor states work correctly for each tool and interaction
- ✅ Cursor changes are immediate and responsive
- ✅ Visual feedback is clear and consistent across all operations
- ✅ Loading states provide good user experience
- ✅ Error handling is graceful with helpful feedback
- ✅ Rectangle selection and creation workflows are intuitive
- ✅ Performance remains smooth (30+ FPS) during all operations

**Files Created/Modified:**
- `src/components/canvas/Toolbar.jsx`, `CanvasObject.jsx`, `Canvas.jsx`

**Testing Requirements:**
- [ ] Rectangle creation with click-and-drag works in one client and appears in another
- [ ] Minimum size constraints work properly (2x1px)
- [ ] Rectangle creation prevented outside bounds
- [ ] Semi-transparent preview rectangle during creation
- [ ] Tool switching works correctly (Rectangle → Arrow after creation)
- [ ] All cursor states change appropriately
- [ ] Visual feedback responds correctly to user interactions
- [ ] Loading states display properly
- [ ] Error handling works for various edge cases
- [ ] Performance remains smooth during rectangle creation and selection

---

## ✅ PR #8: Object Selection, Movement & Enhanced Resize System - COMPLETE

**Goal:** Implement Arrow Tool selection, drag-to-move, and advanced resize for rectangles with automatic dimension flipping, boundary constraints, and real-time sync.

### Tasks:
- [x] **8.1** Implement Arrow Tool selection with enhanced resize handles
  - Files: `src/components/canvas/CanvasObject.jsx`
  - **Requirements:**
    - Only active when Arrow Tool is selected
    - Click empty canvas with Arrow Tool deselects all rectangles
    - Click rectangle body selects and shows resize handles
    - Default arrow cursor during Arrow Tool use
    - Store selected rectangle ID in state
  - **Enhanced resize handles:**
    - 20px corner handles for improved usability (2.5x larger than standard)
    - 4-corner resize: NW, NE, SW, SE corner handles for full resize control
    - Blue color (#2563eb) with white border for visibility
    - Handle visibility only when rectangle is selected

- [x] **8.2** Implement advanced resize behavior with dimension flipping
  - Files: `src/components/canvas/CanvasObject.jsx`
  - **Automatic dimension flipping logic:**
    - When user drags past opposite corner, rectangle automatically flips dimensions
    - Handle role switching: Resize handles dynamically switch roles during flip
    - Visual integrity: Rectangle always remains visible and properly oriented
    - Internal coordinate management: System handles coordinate swapping transparently
    - Maintain positive width/height values internally while preserving visual appearance
  - **Resize handle behavior:**
    - NW handle becomes SE when dragged past SE corner
    - NE handle becomes SW when dragged past SW corner  
    - And vice versa for all handles
    - Smooth transition without visual artifacts
  - **ISSUE TABLED:** Rectangle becomes invisible at crossover instead of maintaining 2x2px minimum and growing in opposite direction

- [x] **8.3** Implement Arrow Tool move operations
  - Files: `src/components/canvas/CanvasObject.jsx`
  - **Requirements:**
    - Only active when Arrow Tool is selected
    - Click rectangle body + drag = move rectangle
    - Boundary constraints using boundary utils
    - Throttle position updates during drag (100ms)
    - Visual feedback during move operations

- [x] **8.4** Implement boundary constraints for move and resize
  - Files: `src/components/canvas/CanvasObject.jsx`
  - **Boundary enforcement:**
    - Use boundary utils to snap rectangle position and size to canvas bounds
    - Apply constraints during drag/resize and on operation end
    - Disable resize handles when rectangles reach canvas limits
    - Constrain resize operations to maintain minimum rectangle sizes (2x1px)
    - Handle flipping rectangles near boundaries gracefully

- [x] **8.5** Implement real-time sync for move and resize operations
  - Files: `src/components/canvas/CanvasObject.jsx`
  - **Sync behavior:**
    - Call canvas service to update rectangle position and dimensions
    - Real-time sync of rectangle resize operations (100ms throttle during drag)
    - Immediate sync on operation completion (move or resize end)
    - Handle concurrent rectangle resize conflicts with last-write-wins
    - Throttle updates to avoid excessive writes during drag operations

- [x] **8.6** Add enhanced visual feedback and cursor states
  - Files: `src/components/canvas/CanvasObject.jsx`
  - **Visual feedback requirements:**
    - Blue border (#2563eb, 2px width) on selected rectangle
    - 20px blue resize handles (#2563eb) with white border (1px)
    - Visual feedback during rectangle resize operations
    - Cursor changes for different rectangle resize directions:
      - NW/SE handles: `nw-resize` and `se-resize` cursors
      - NE/SW handles: `ne-resize` and `sw-resize` cursors
    - Semi-transparent preview (70% opacity) during operations
    - Smooth transitions for all visual state changes

- [x] **8.7** Handle optimistic updates with conflict resolution
  - Files: `src/components/canvas/CanvasObject.jsx`
  - **Optimistic update strategy:**
    - Update rectangle position and size locally immediately
    - Then sync to Firestore with conflict resolution
    - Handle concurrent rectangle resize conflicts with last-write-wins
    - Rollback local changes if sync fails
    - Display error feedback for failed operations

**Definition of Done:**
- ✅ Rectangle selection works only with Arrow Tool
- ✅ Rectangle resize handles are 20px and highly visible
- ✅ Rectangles automatically flip dimensions when dragged past opposite corners
- ✅ Resize handles switch roles during flipping operations
- ✅ Rectangles never disappear or become invisible during resize
- ✅ All resize operations maintain minimum size constraints (2x1px)
- ✅ Boundary enforcement works correctly with flipped rectangles
- ✅ Real-time sync works for both move and resize operations
- ✅ Cursor states change appropriately for different interactions
- ✅ Visual feedback is clear and responsive
- ✅ Optimistic updates provide smooth user experience
- ✅ Concurrent editing conflicts are resolved gracefully

**Files Created/Modified:**
- `src/components/canvas/CanvasObject.jsx`, `Canvas.jsx`

**Testing Requirements:**
- [ ] Rectangle movement syncs across clients
- [ ] Rectangle resizing syncs across clients in real-time  
- [ ] Dimension flipping works correctly in all directions
- [ ] Resize handle interactions and constraints work properly
- [ ] Minimum size enforcement during rectangle resize (2x1px)
- [ ] Boundary constraints during rectangle move and resize
- [ ] Concurrent edits (last-write-wins) for both move and resize
- [ ] Cursor state changes during different operations
- [ ] Visual feedback responds to user interactions
- [ ] Verify rectangle resize sync latency <100ms during operation

---

## PR #9: State Persistence & Recovery

**Goal:** Ensure canvas state persists through refresh and reconnection.

### Tasks:
- [ ] **9.1** Implement load all objects on mount
  - Files: `src/hooks/useCanvasObjects.js`
  - Query all objects from Firestore on component mount

- [ ] **9.2** Add loading state
  - Files: `src/components/canvas/Canvas.jsx`
  - Show loading indicator while fetching initial state

- [ ] **9.3** Implement reconnection handling with last action preservation
  - Files: `src/services/firebase.js`, `src/components/canvas/Canvas.jsx`
  - Handle Firebase connection state changes
  - **NEW:** Save user's last action before disconnect
  - **NEW:** Preserve last successful action when connection is lost
  - Queue updates during disconnect, replay on reconnect

- [ ] **9.4** Update user lastSeen timestamp
  - Files: `src/services/auth.service.js`
  - Update timestamp on user activity

**Files Created/Modified:**
- `src/hooks/useCanvasObjects.js`
- `src/components/canvas/Canvas.jsx`
- `src/services/firebase.js`, `auth.service.js`

**Testing:** Manual verification
- Refresh page mid-session, verify all objects remain
- All users leave, return later, verify canvas intact
- Test disconnect/reconnect scenarios

---

## PR #10: Performance Optimization & Testing

**Goal:** Optimize performance and conduct comprehensive testing.

### Tasks:
- [ ] **10.1** Optimize Konva rendering
  - Files: `src/components/canvas/Canvas.jsx`
  - Ensure Konva layer caching is effective

- [ ] **10.2** Throttle cursor updates
  - Files: `src/hooks/useCursorTracking.js`
  - Verify 50-100ms throttling is working

- [ ] **10.3** Throttle object position updates
  - Files: `src/components/canvas/CanvasObject.jsx`
  - Batch Firestore writes during drag

- [ ] **10.4** Add performance monitoring
  - Files: `src/components/canvas/Canvas.jsx`
  - Log FPS, measure sync latency

- [ ] **10.5** Load test with 100 objects
  - Manual testing: Create 100 objects, verify smooth interaction

- [ ] **10.6** Load test with 500 objects
  - Manual testing: Create 500 objects, verify acceptable performance

- [ ] **10.7** Test with 5+ concurrent users
  - Manual testing: Multiple browsers/devices

- [ ] **10.8** Test network throttling
  - Manual testing: Chrome DevTools slow 3G

**Files Created/Modified:**
- `src/components/canvas/Canvas.jsx`, `CanvasObject.jsx`
- `src/hooks/useCursorTracking.js`

**Testing:**
- [ ] **Performance Test:** Manual verification
  - 30+ FPS with 500 objects
  - Cursor sync <50ms
  - Object sync <100ms
  - Smooth interaction with 5+ users

---

## PR #11: UI Polish & Error Handling

**Goal:** Add polish, error handling, and improve UX.

### Tasks:
- [ ] **11.1** Add error boundaries
  - Files: `src/components/layout/ErrorBoundary.jsx`
  - Catch and display React errors gracefully

- [ ] **11.2** Improve loading states
  - Files: `src/components/canvas/Canvas.jsx`, `src/components/auth/LoginForm.jsx`
  - Add spinners and loading messages

- [ ] **11.3** Add error notifications
  - Files: `src/components/layout/ErrorNotification.jsx`
  - Toast-style notifications for errors

- [ ] **11.4** Handle connection lost gracefully
  - Files: `src/components/presence/ConnectionStatus.jsx`
  - Show clear message when disconnected

- [ ] **11.5** Add keyboard shortcuts
  - Files: `src/components/canvas/Canvas.jsx`
  - ESC to deselect, Delete to remove object (stretch goal)

- [ ] **11.6** Improve mobile responsiveness
  - Files: `src/components/canvas/Canvas.jsx`, `src/index.css`
  - Basic touch support for pan/zoom

- [ ] **11.7** Add user count display
  - Files: `src/components/presence/OnlineUsers.jsx`
  - Show total number of online users

- [ ] **11.8** Style improvements
  - Files: `src/components/**/*.jsx`, `src/index.css`
  - Polish UI with consistent styling

**Files Created/Modified:**
- `src/components/layout/ErrorBoundary.jsx`, `ErrorNotification.jsx`
- `src/components/canvas/Canvas.jsx`
- `src/components/presence/ConnectionStatus.jsx`, `OnlineUsers.jsx`
- `src/index.css`

**Testing:** Manual verification of error states and UX improvements

---

## PR #11.5: Firebase Quota Management (NEW)

**Goal:** Implement Firebase quota monitoring and graceful degradation strategies.

### Tasks:
- [ ] **11.5.1** Set up Firebase usage monitoring
  - Files: `src/services/firebase.js`
  - Implement usage tracking for Realtime Database operations
  - Log cursor update frequency and connection counts

- [ ] **11.5.2** Implement graceful quota degradation
  - Files: `src/hooks/useCursorTracking.js`, `src/services/presence.service.js`
  - Detect quota approaching limits
  - Reduce cursor update frequency during high load (50ms → 100ms → 200ms)
  - Show "high traffic" message to users when quota stressed

- [ ] **11.5.3** Add Firebase alerts configuration
  - External: Firebase Console
  - Set up alerts at 80% of free tier limits
  - Document upgrade path to Blaze plan

- [ ] **11.5.4** Create WebSocket fallback for cursor updates
  - Files: `src/services/presence.service.js` 
  - **Stretch Goal:** Alternative cursor sync method if Realtime DB quota exceeded
  - Keep object sync on Firestore, fallback cursors to alternative method

**Files Created/Modified:**
- `src/services/firebase.js`, `presence.service.js`
- `src/hooks/useCursorTracking.js`

**Testing:** Manual testing with simulated high load

---

## PR #12: Final Deployment & Documentation

**Goal:** Deploy production version and complete documentation.

### Tasks:
- [ ] **12.1** Update README with complete instructions
  - Files: `README.md`
  - Setup, installation, deployment steps
  - Architecture overview
  - Known limitations

- [ ] **12.2** Add architecture documentation
  - Files: `README.md` or `ARCHITECTURE.md`
  - Data model, Firebase structure, sync strategy

- [ ] **12.3** Test production build locally
  - Command: `npm run build` and test
  - Verify build succeeds and works correctly

- [ ] **12.4** Deploy to Firebase Hosting (finalized platform)
  - Command: `firebase deploy`
  - **FINALIZED:** Firebase Hosting is the confirmed deployment platform
  - Verify deployed version works

- [ ] **12.5** Update Firebase security rules for production
  - Files: `firestore.rules`, `database.rules.json`
  - Tighten security rules

- [ ] **12.6** Test deployed version with multiple users
  - Manual testing: Share URL, test with real users

- [ ] **12.7** Add deployed URL to README
  - Files: `README.md`
  - Include live demo link

- [ ] **12.8** Create .env.example with instructions
  - Files: `.env.example`
  - Clear instructions for Firebase setup

**Files Created/Modified:**
- `README.md`, `ARCHITECTURE.md` (optional)
- `.env.example`
- `firestore.rules`, `database.rules.json`

**Testing:**
- [ ] **Final Integration Test:** Complete end-to-end test
  - Multiple users on deployed version
  - Test all features: auth, presence, shapes, persistence
  - Verify success criteria from PRD

---

## Success Criteria Checklist (Updated)

After all PRs are complete, verify:

- [ ] ✅ 2+ users can connect and see each other's cursors with name labels
- [ ] ✅ Objects sync in real-time across all users
- [ ] ✅ State persists through refresh and reconnect
- [ ] ✅ Performance stays smooth (30+ FPS) with multiple users **UPDATED TARGET**
- [ ] ✅ Deployed and publicly accessible via Firebase Hosting **FINALIZED PLATFORM**
- [ ] ✅ Users can authenticate with Google
- [ ] ✅ Users must land on login page before accessing canvas **NEW REQUIREMENT**
- [ ] ✅ Authentication errors show clear messages with retry prompts **NEW REQUIREMENT**
- [ ] ✅ Users can create and move rectangles **SIMPLIFIED - Single shape type for MVP**
- [ ] ✅ Rectangle creation uses click-and-drag interaction with minimum 2x1px size **NEW BEHAVIOR**
- [ ] ✅ Three-tool system works correctly (Hand, Arrow, Rectangle) **NEW FEATURE**
- [ ] ✅ Independent tool selection per user (not synced between users) **NEW MULTIPLAYER BEHAVIOR**
- [ ] ✅ Tool state stored locally, cursors show position only **NEW ARCHITECTURE**
- [ ] ✅ Users can resize rectangles using corner/edge handles **NEW FEATURE - Added to MVP**
- [ ] ✅ Resize operations sync in real-time across users (100ms throttle) **NEW FEATURE**
- [ ] ✅ Any authenticated user can resize any rectangle **NEW CAPABILITY**
- [ ] ✅ Boundary enforcement works with snapping behavior **UPDATED from clamping**
- [ ] ✅ Shapes snap to canvas boundaries when dragged near edges **NEW BEHAVIOR**
- [ ] ✅ Global canvas accessible to all authenticated users **UPDATED ARCHITECTURE**
- [ ] ✅ Cursor sync <50ms, object sync <100ms
- [ ] ✅ Network disconnection preserves last user action **NEW REQUIREMENT**
- [ ] ✅ Firebase quota monitoring and graceful degradation implemented **NEW REQUIREMENT**

---

## Notes (Updated)

- **Critical Path:** PRs #1 → #2 → #3 → #4 must be completed in order. PR #4 is the most critical and should be tested extensively before moving forward.
- **Parallel Work:** After PR #4, PRs #5-6 can be worked on in parallel, then #7-8.
- **Testing Strategy:** Unit tests for utilities, integration tests for critical features (auth, sync, multiplayer).
- **Time Management:** If running behind, skip stretch goals and focus on core multiplayer functionality.
- **Git Strategy:** Create feature branches for each PR, merge to main after testing.
- **NEW - Architecture:** Single global canvas simplifies implementation - no session management needed for MVP.
- **NEW - Boundaries:** Snapping behavior provides better UX than hard clamping.
- **NEW - Firebase:** Quota monitoring is critical for production readiness.
- **NEW - Auth Flow:** Login page requirement ensures proper authentication before canvas access.
- **NEW - Rectangle Focus:** Single shape type (rectangle) demonstrates all core functionality while keeping MVP simple and achievable.
- **NEW - Multiplayer Tools:** Each user has independent tool selection (local state only). Tool selection never syncs between users, only the results of tool actions sync.

---

## 🔗 PRD Requirement Traceability Matrix

This matrix links each PRD requirement to the specific tasks that implement it:

### Authentication System (PRD Section 1)
| PRD Requirement | Implementing Tasks | Status |
|-----------------|-------------------|---------|
| Login page required | PR #2: Tasks 2.8, 2.4 | ✅ |
| Google social login | PR #2: Tasks 2.1, 2.4 | ✅ |
| Email/password registration | PR #2: Tasks 2.1, 2.5 | ✅ |
| Authentication error handling | PR #2: Tasks 2.10, 2.4, 2.5 | ✅ |
| User logout functionality | PR #2: Tasks 2.9, 2.1 | ✅ |
| Persistent user accounts | PR #2: Tasks 2.6, 2.1 | ✅ |

### Canvas Workspace & Tool System (PRD Section 2)
| PRD Requirement | Implementing Tasks | Status |
|-----------------|-------------------|---------|
| Canvas size: 5000x5000px | PR #3: Tasks 3.1, 3.4, 3.5 | ✅ |
| Initial view: Centered at (2500, 2500) | PR #3: Task 3.4 | ✅ |
| Three-tool system | PR #3: Tasks 3.1, 3.6, 3.2 | ✅ |
| Tool-specific cursors | PR #7: Task 7.4 | ✅ |
| Enhanced visual feedback | PR #7: Tasks 7.1, 7.2 | ✅ |
| Independent per user tool selection | PR #3: Task 3.6 | ✅ |
| Smooth interaction (30+ FPS) | PR #3: Tasks 3.8, 3.9 | ✅ |

### Shape Creation & Manipulation (PRD Section 3)
| PRD Requirement | Implementing Tasks | Status |
|-----------------|-------------------|---------|
| Rectangle creation with click-drag | PR #7: Task 7.3 | ✅ |
| Minimum constraints (2x1px) | PR #7: Tasks 7.3, 7.6 | ✅ |
| Auto tool switch (Rectangle → Arrow) | PR #7: Tasks 7.1, 7.3 | ✅ |
| **Advanced resize behavior** | **PR #8: Task 8.2** | 🚧 |
| **Automatic dimension flipping** | **PR #8: Task 8.2** | 🚧 |
| **Handle role switching** | **PR #8: Task 8.2** | 🚧 |
| Enhanced resize system (20px handles) | PR #8: Task 8.1 | ✅ |
| 4-corner resize (NW, NE, SW, SE) | PR #8: Task 8.1 | ✅ |
| Visual feedback for selection | PR #8: Task 8.6 | ✅ |
| Boundary constraints | PR #8: Task 8.4 | ✅ |

### Real-Time Collaboration (PRD Section 4)
| PRD Requirement | Implementing Tasks | Status |
|-----------------|-------------------|---------|
| Multiplayer cursors | PR #4: Tasks 4.2, 4.4, 4.5 | ✅ |
| Position-only cursor sync | PR #4: Task 4.2 | ✅ |
| Independent tool behavior | PR #4: Task 4.2 (explicitly NOT synced) | ✅ |
| Object synchronization | PR #8: Task 8.5 | ✅ |
| Presence awareness | PR #4: Tasks 4.3, 4.6 | ✅ |
| Conflict resolution (last-write-wins) | PR #8: Tasks 8.5, 8.7 | ✅ |
| State persistence | PR #9: Tasks 9.1, 9.2, 9.3 | ✅ |

### Performance Targets (PRD Section 5)
| PRD Requirement | Implementing Tasks | Status |
|-----------------|-------------------|---------|
| 30+ FPS during interactions | PR #3: Task 3.9, PR #10: Tasks 10.1-10.4 | ✅ |
| Support 500+ objects | PR #10: Tasks 10.5, 10.6 | ✅ |
| Support 5+ concurrent users | PR #10: Task 10.7 | ✅ |
| Cursor sync <50ms | PR #4: Task 4.2, PR #10: Task 10.4 | ✅ |
| Object sync <100ms | PR #8: Task 8.5, PR #10: Task 10.4 | ✅ |

### Enhanced UX Details (Implementation-Driven)
| UX Requirement | Implementing Tasks | Status |
|-----------------|-------------------|---------|
| Comprehensive cursor state management | PR #7: Task 7.4 | ✅ |
| Enhanced visual feedback system | PR #7: Tasks 7.1, 7.2, 7.6 | ✅ |
| Sophisticated testing infrastructure | PR #3: Task 3.8 | ✅ |
| **Rectangle dimension flipping** | **PR #8: Task 8.2** | 🚧 |
| Large resize handles (20px) | PR #8: Task 8.1 | ✅ |
| Real-time resize synchronization | PR #8: Task 8.5 | ✅ |

### Legend:
- ✅ **Implemented**: Feature is complete and working
- 🚧 **Needs Enhancement**: Current implementation needs improvement for full PRD compliance
- ❌ **Not Implemented**: Feature missing from current implementation

### Critical Gaps to Address:
1. **Rectangle Dimension Flipping (PR #8, Task 8.2)**: This is the main issue identified by the user where rectangles disappear when resized past opposite corners.

2. **Enhanced Testing Coverage (PR #3, Task 3.8)**: While testing infrastructure exists, comprehensive coverage needs improvement.

3. **Performance Validation (PR #10)**: Systematic performance testing under load conditions.

---

## 📝 Notes on Documentation Philosophy

**PRD Focus**: Defines WHAT the system should do, user requirements, and business logic.
**Tasks.md Focus**: Defines HOW to implement each requirement, technical specifications, and implementation details.

**Cross-References**: Each task references the relevant PRD section it implements.
**Traceability**: This matrix ensures no PRD requirement is left unimplemented.
**Definition of Done**: Each task has clear success criteria for completion.

**Remember**: A simple canvas with bulletproof multiplayer beats a feature-rich app with broken sync.