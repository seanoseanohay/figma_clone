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

## PR #1: Project Setup & Infrastructure

**Goal:** Initialize the project with Firebase, React, and all dependencies configured.

### Tasks:
- [ ] **1.1** Create React app using `create-react-app`
  - Files: Initial project structure
  - Command: `npx create-react-app collabcanvas-mvp`

- [ ] **1.2** Install dependencies
  - Files: `package.json`
  - Dependencies: `firebase`, `react-konva`, `konva`, `react-router-dom`, `tailwindcss`
  - Dev dependencies: `@testing-library/react`, `@testing-library/jest-dom`, `jest`

- [ ] **1.3** Configure Tailwind CSS
  - Files: `tailwind.config.js`, `src/index.css`
  - Add Tailwind directives to index.css

- [ ] **1.4** Create Firebase project and get config
  - External: Firebase Console
  - Enable Google Authentication in Firebase Console
  - Enable Firestore Database (production mode)
  - Enable Realtime Database

- [ ] **1.5** Set up environment variables
  - Files: `.env.example`, `.env` (local only)
  - Add Firebase config keys

- [ ] **1.6** Initialize Firebase in app
  - Files: `src/services/firebase.js`
  - Export `auth`, `db` (Firestore), `rtdb` (Realtime Database) instances

- [ ] **1.7** Create constants file
  - Files: `src/constants/canvas.constants.js`
  - Define: CANVAS_WIDTH (5000), CANVAS_HEIGHT (5000), default shape sizes, colors

- [ ] **1.8** Set up Firebase security rules
  - Files: `firestore.rules`, `database.rules.json`
  - Basic rules for authenticated users

- [ ] **1.9** Configure Firebase Hosting
  - Files: `firebase.json`, `.firebaserc`
  - Set up deployment configuration

- [ ] **1.10** Create basic README
  - Files: `README.md`
  - Add project description, setup instructions

- [ ] **1.11** Deploy skeleton app
  - Command: `firebase deploy`
  - Verify deployed URL is accessible

**Files Created/Modified:**
- All initial project files
- `package.json`, `tailwind.config.js`, `firebase.json`, `.firebaserc`
- `src/services/firebase.js`, `src/constants/canvas.constants.js`
- `firestore.rules`, `database.rules.json`, `README.md`

**Testing:** Manual verification - app loads without errors

---

## PR #2: Authentication System

**Goal:** Implement user authentication with Google and email/password.

### Tasks:
- [ ] **2.1** Create authentication service
  - Files: `src/services/auth.service.js`
  - Functions: `signInWithGoogle()`, `signUpWithEmail()`, `signInWithEmail()`, `signOut()`, `onAuthChange()`

- [ ] **2.2** Create AuthProvider context
  - Files: `src/components/auth/AuthProvider.jsx`
  - Manages auth state, provides user context

- [ ] **2.3** Create custom auth hook
  - Files: `src/hooks/useAuth.js`
  - Hook to access auth context

- [ ] **2.4** Build Login form component
  - Files: `src/components/auth/LoginForm.jsx`
  - Email/password fields, Google sign-in button

- [ ] **2.5** Build Register form component
  - Files: `src/components/auth/RegisterForm.jsx`
  - Email/password fields, display name defaults to email

- [ ] **2.6** Store user profile in Firestore on first login
  - Files: `src/services/auth.service.js`
  - Create user document with uid, displayName, email, photoURL, timestamps

- [ ] **2.7** Create ProtectedRoute component
  - Files: `src/components/layout/ProtectedRoute.jsx`
  - Redirects to login if not authenticated

- [ ] **2.8** Set up routing with login page requirement
  - Files: `src/App.jsx`
  - Routes: `/` (redirect to login), `/login`, `/register`, `/canvas` (protected)
  - **NEW REQUIREMENT:** Users must land on login page before accessing canvas

- [ ] **2.9** Create Header component with sign-out
  - Files: `src/components/layout/Header.jsx`
  - Display user name, sign-out button

- [ ] **2.10** Update Firestore rules for users collection
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

## PR #3: Canvas Foundation

**Goal:** Set up the canvas with pan, zoom, and boundary visualization.

### Tasks:
- [ ] **3.1** Create Canvas component
  - Files: `src/components/canvas/Canvas.jsx`
  - Initialize Konva Stage and Layer

- [ ] **3.2** Implement pan functionality
  - Files: `src/components/canvas/Canvas.jsx`
  - Click-and-drag or spacebar + drag to pan

- [ ] **3.3** Implement zoom functionality
  - Files: `src/components/canvas/Canvas.jsx`
  - Mouse wheel to zoom, maintain smooth interaction

- [ ] **3.4** Set initial view (centered at 2500, 2500)
  - Files: `src/components/canvas/Canvas.jsx`
  - Calculate zoom level to fit entire canvas in viewport

- [ ] **3.5** Add visual boundary
  - Files: `src/components/canvas/Canvas.jsx`
  - Different background color for canvas area vs outside boundary

- [ ] **3.6** Add Canvas to protected route
  - Files: `src/App.jsx`
  - Canvas accessible at `/canvas` route

- [ ] **3.7** Test performance
  - Manual testing: Verify 30+ FPS during pan/zoom

**Files Created/Modified:**
- `src/components/canvas/Canvas.jsx`
- `src/App.jsx`

**Testing:** Manual verification - smooth pan/zoom, visible boundary

---

## PR #4: Multiplayer Presence System (CRITICAL)

**Goal:** Implement real-time cursor tracking and user presence.

### Tasks:
- [ ] **4.1** Create presence service for global canvas
  - Files: `src/services/presence.service.js`
  - Functions: `updateCursorPosition()`, `setUserOnline()`, `setUserOffline()`, `subscribeToGlobalPresence()`
  - **UPDATED:** Use global canvas structure `/globalCanvas/users/{userId}` instead of sessions

- [ ] **4.2** Create cursor tracking hook
  - Files: `src/hooks/useCursorTracking.js`
  - Throttle cursor updates to 50-100ms
  - Broadcast to Realtime Database

- [ ] **4.3** Create presence hook
  - Files: `src/hooks/usePresence.js`
  - Subscribe to other users' presence data
  - Return array of connected users with cursor positions

- [ ] **4.4** Create UserCursor component
  - Files: `src/components/canvas/UserCursor.jsx`
  - Render cursor with username label

- [ ] **4.5** Integrate cursor tracking into Canvas
  - Files: `src/components/canvas/Canvas.jsx`
  - Track mouse movement on canvas
  - Render all user cursors

- [ ] **4.6** Create OnlineUsers component
  - Files: `src/components/presence/OnlineUsers.jsx`
  - Display list of connected users

- [ ] **4.7** Implement auto-cleanup for stale presence
  - Files: `src/services/presence.service.js`
  - Use Firebase onDisconnect() to clean up

- [ ] **4.8** Add ConnectionStatus indicator
  - Files: `src/components/presence/ConnectionStatus.jsx`
  - Show online/offline status

- [ ] **4.9** Update Realtime Database rules for global canvas
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

---

## PR #5: Boundary Validation Utilities

**Goal:** Create utilities for boundary enforcement before implementing shapes.

### Tasks:
- [ ] **5.1** Create boundary utils with snapping behavior
  - Files: `src/services/boundary.utils.js`
  - Functions:
    - `isPositionInBounds(x, y)`
    - `snapRectangle(x, y, width, height)` - returns snapped position **CHANGED from clamp**
    - `snapCircle(x, y, radius)` - returns snapped position **CHANGED from clamp**
    - `snapText(x, y, width, height)` - returns snapped position **CHANGED from clamp**
    - `canCreateShapeAt(x, y, width, height)` - boolean check
  - **UPDATED:** Shapes now **snap to boundaries** instead of being clamped

- [ ] **5.2** Add comprehensive documentation
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

## PR #6: Canvas Service & Data Layer

**Goal:** Create service layer for canvas object operations.

### Tasks:
- [ ] **6.1** Create canvas service
  - Files: `src/services/canvas.service.js`
  - Functions:
    - `createObject(type, position, properties)` - validates bounds, writes to Firestore
    - `updateObjectPosition(objectId, newPosition)` - validates bounds, updates Firestore
    - `subscribeToObjects(callback)` - real-time listener
    - `deleteObject(objectId)` - removes from Firestore

- [ ] **6.2** Implement last-write-wins with timestamps
  - Files: `src/services/canvas.service.js`
  - Add `lastModifiedAt` timestamp to all updates

- [ ] **6.3** Create canvas objects hook
  - Files: `src/hooks/useCanvasObjects.js`
  - Subscribe to Firestore objects collection
  - Return array of canvas objects

- [ ] **6.4** Update Firestore rules for canvas objects
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

## PR #7: Shape Creation & Rendering

**Goal:** Implement shape creation with toolbar and render shapes on canvas.

### Tasks:
- [ ] **7.1** Create Toolbar component with single shape tool
  - Files: `src/components/canvas/Toolbar.jsx`
  - Button for Rectangle tool only (Text and Circle moved to post-MVP)
  - Active tool state (default: rectangle)

- [ ] **7.2** Create CanvasObject component for rectangles
  - Files: `src/components/canvas/CanvasObject.jsx`
  - Render rectangle shapes only (Text and Circle moved to post-MVP)
  - Use Konva Rect shape
  - **NEW:** Include resize handles for selected rectangles

- [ ] **7.3** Implement rectangle creation with click-and-drag
  - Files: `src/components/canvas/Canvas.jsx`
  - Click-and-drag to create rectangle from first corner to opposite corner
  - **NEW:** Show preview/ghost rectangle while dragging
  - **NEW:** Enforce minimum 2x1px size
  - Validate position is in bounds during creation

- [ ] **7.4** REMOVED - Text creation moved to post-MVP stretch goals

- [ ] **7.5** Integrate canvas objects hook
  - Files: `src/components/canvas/Canvas.jsx`
  - Load rectangles from Firestore
  - Render all rectangles using CanvasObject component

- [ ] **7.6** Show rectangle creation feedback
  - Files: `src/components/canvas/Canvas.jsx`
  - Prevent rectangle creation outside bounds with user feedback

**Files Created/Modified:**
- `src/components/canvas/Toolbar.jsx`, `CanvasObject.jsx`, `Canvas.jsx`

**Testing:**
- [ ] **Integration Test:** `tests/integration/canvas-sync.integration.test.js`
  - Test rectangle creation with click-and-drag in one client appears in another **UPDATED**
  - Test minimum size constraints work properly (2x1px) **NEW**
  - Test rectangle creation prevented outside bounds
  - Test preview/ghost rectangle during creation **NEW**
  - Mock Firebase for testing

---

## PR #8: Object Selection, Movement & Resize (UPDATED)

**Goal:** Implement selection, drag-to-move, and resize for rectangles with boundary constraints and real-time sync.

### Tasks:
- [ ] **8.1** Implement click-to-select rectangles with resize handles
  - Files: `src/components/canvas/CanvasObject.jsx`
  - Add click handler, highlight selected rectangle
  - **NEW:** Show resize handles on selected rectangles (corner and edge handles)
  - Store selected rectangle ID in state

- [ ] **8.2** Implement rectangle drag-to-move and resize operations
  - Files: `src/components/canvas/CanvasObject.jsx`
  - Enable dragging on Konva rectangles for movement
  - **NEW:** Enable resize handles for rectangle width/height adjustment
  - Throttle position/size updates during drag/resize (100ms)

- [ ] **8.3** Implement boundary constraints for rectangle move and resize
  - Files: `src/components/canvas/CanvasObject.jsx`
  - Use boundary utils to snap rectangle position and size to canvas bounds
  - Apply constraints during drag/resize and on operation end
  - **NEW:** Disable resize handles when rectangles reach canvas limits
  - **NEW:** Constrain resize operations to maintain minimum rectangle sizes (2x1px)

- [ ] **8.4** Broadcast rectangle position and size updates to Firestore
  - Files: `src/components/canvas/CanvasObject.jsx`
  - Call canvas service to update rectangle position and dimensions
  - **NEW:** Real-time sync of rectangle resize operations (100ms throttle)
  - **NEW:** Immediate sync on operation completion (move or resize end)
  - Throttle updates to avoid excessive writes

- [ ] **8.5** Handle optimistic updates for rectangle move and resize
  - Files: `src/components/canvas/CanvasObject.jsx`
  - Update rectangle position and size locally immediately
  - Then sync to Firestore with conflict resolution
  - **NEW:** Handle concurrent rectangle resize conflicts with last-write-wins

- [ ] **8.6** Add visual feedback for rectangle selection and resize
  - Files: `src/components/canvas/CanvasObject.jsx`
  - Border/highlight on selected rectangle
  - **NEW:** Resize handles (corner squares and edge midpoints) for rectangles
  - **NEW:** Visual feedback during rectangle resize operations
  - **NEW:** Cursor changes for different rectangle resize directions

**Files Created/Modified:**
- `src/components/canvas/CanvasObject.jsx`, `Canvas.jsx`

**Testing:**
- [ ] **Integration Test:** `tests/integration/canvas-sync.integration.test.js` (extend existing)
  - Test rectangle movement syncs across clients **UPDATED**
  - **NEW:** Test rectangle resizing syncs across clients in real-time
  - **NEW:** Test resize handle interactions and constraints for rectangles
  - **NEW:** Test minimum size enforcement during rectangle resize (2x1px)
  - Test boundary constraints during rectangle move and resize **UPDATED**
  - Test concurrent edits (last-write-wins) for both rectangle move and resize **UPDATED**
  - **NEW:** Verify rectangle resize sync latency <100ms during operation
  - Verify rectangle sync latency <100ms

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