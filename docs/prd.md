---

## Next Steps

1. **Review this PRD** - Confirm scope and tech choices
2. **Set up development environment** - Initialize Firebase, create React app
3. **Build multiplayer sync first** - Don't touch shape features until cursors sync
4. **Test continuously** - Multiple browser windows from hour 1

**Remember:** A simple canvas with bulletproof multiplayer beats a feature-rich app with broken sync.# CollabCanvas MVP - Product Requirements Document

## Executive Summary

CollabCanvas MVP is a real-time collaborative design tool where multiple users can simultaneously create and manipulate shapes on a shared canvas. The focus is on **bulletproof multiplayer infrastructure** rather than feature breadth.

---

## User Stories

### Primary User: Designer/Collaborator

**As a designer, I want to:**
- Create an account and log in so I can have a persistent identity
- See a large canvas workspace so I can create designs without feeling constrained
- Pan and zoom the canvas so I can navigate my design space
- Create basic shapes (rectangles) so I can start designing
- Move and manipulate rectangles so I can arrange my design
- See other users' cursors in real-time so I know where they're working
- See who else is online so I know who I'm collaborating with
- Have my work persist when I leave so I don't lose progress
- Rejoin a session and see all previous work so collaboration is seamless

### Secondary User: Collaborator Joining Global Canvas

**As a new collaborator, I want to:**
- Access the shared global canvas so I can collaborate with my team
- See all existing objects immediately so I'm in sync
- Start editing without conflicts so I can contribute right away

---

## Key Features for MVP

### 1. Authentication System
- **Login page required:** Users must authenticate before accessing the canvas
- Google social login (Firebase Auth)
- Email/password registration (display name defaults to email address)
- User login (email/password or Google)
- User logout functionality
- Persistent user accounts with display names
- Session management
- **Authentication error handling:** Show clear error messages when login fails and prompt to retry
- **Out of scope:** Custom display names during registration, password reset, profile pictures, other social providers (Facebook, GitHub, etc.)

### 2. Canvas Workspace & Tool System
- Canvas size: 5000x5000px with visible boundary (different background color outside bounds)
- Initial view: Centered at (2500, 2500) showing entire canvas area zoomed out to fit screen
- **Three-tool system for interaction:**
  - **Hand Tool:** Pan canvas by click-and-drag (spacebar + drag also works)
  - **Arrow Tool:** Select, move, and resize rectangles (DEFAULT TOOL)
  - **Rectangle Tool:** Create rectangles by click-and-drag
- **Toolbar placement:** Above canvas in separate section, left-aligned
- **Tool behavior:**
  - Only one tool active at a time (required selection)
  - Arrow tool default on canvas load
  - Rectangle tool auto-switches to arrow tool after shape creation (on mouse up)
  - **Independent per user:** Each user has their own tool selection (not synced between users)
  - **Local state only:** Tool selection stored in local React state, not Firebase
- **Cursor feedback:**
  - Hand tool: `grab` cursor (idle), `grabbing` cursor (dragging)
  - Arrow tool: Default arrow cursor  
  - Rectangle tool: `crosshair` cursor
- **Visual tool feedback:** 
  - Active tool highlighted with different background color
  - **Individual per user:** Each user sees their own toolbar highlighting their own selected tool
  - **Not synced:** Tool selection visual state is local to each user
- Smooth interaction during all operations (targeting 30+ FPS)
- **Out of scope:** Infinite canvas, grid snapping, rulers, minimap, keyboard shortcuts

### 3. Shape Creation & Manipulation (Tool-Based)
- **Single shape type for MVP (fixed gray color):**
  - Rectangle (click-and-drag creation, minimum 2x1px, gray fill)
- **Tool-specific shape interactions:**
  - **Rectangle Tool:** Click-and-drag to create rectangle from first corner to opposite corner
  - **Arrow Tool:** Click rectangle body to move, click corners to resize
  - **Hand Tool:** Rectangles ignored during panning (no interaction)
- **Shape creation behavior:**
  - **Visual feedback:** Show preview/ghost rectangle while dragging (Rectangle Tool only)
  - **Minimum constraints:** Rectangle minimum 2x1px to prevent accidental tiny shapes
  - **Auto tool switch:** Rectangle Tool → Arrow Tool after shape creation completion
- **Selection and manipulation (Arrow Tool only):**
  - **Click empty canvas:** Deselect all rectangles
  - **Click rectangle body:** Select rectangle, show selection indicator with resize handles
  - **Click rectangle corners:** Begin resize operation  
  - **Drag selected rectangle:** Move operation
  - **Drag resize handles:** Resize operation
- **Shape creation rules:**
  - Shapes can only be created within the 5000x5000px canvas boundary
  - Creation attempts outside boundary are prevented entirely (no shape created)
- **Basic transformations (Arrow Tool):**
  - Move (drag rectangle body to reposition)
  - Resize (drag corner handles to adjust width/height)
  - **Real-time sync:** Move and resize operations sync across users in real-time (100ms frequency)
  - **Multi-user editing:** Any user can move/resize any rectangle
  - Boundary constraint: Shapes **snap to canvas edges** - no part of any shape can go outside the 5000x5000px boundary
  - When dragging near edges, shape **snaps to boundary** (enforced on both client and server)
- Selection of rectangles (Arrow Tool: click to select, shows selection indicator with resize handles)
- **Tool system:** Hand (pan), Arrow (select/move/resize), Rectangle (create) with visual active state
- **Out of scope:** Delete, copy/paste, multi-select, rotation, borders, shadows, keyboard shortcuts

### 4. Real-Time Collaboration (CRITICAL)
- **Multiplayer cursors:**
  - Show all connected users' cursor positions
  - Display username label above cursor
  - **Position only:** Cursors show position, NOT which tool other users have selected
  - Update positions in <50ms
- **Multiplayer tool behavior:**
  - **Independent selection:** Each user selects their own tools independently
  - **Local tool state:** Tool selection never syncs between users
  - **Actions sync:** Only the results of tool use sync (create, move, resize operations)
  - **Example:** User A uses Hand Tool while User B uses Rectangle Tool simultaneously
- **Object synchronization:**
  - Broadcast all create/move/delete operations
  - Sync across all clients in <100ms
  - Handle concurrent edits without crashes
- **Presence awareness:**
  - Show list of currently connected users
  - Show when users join/leave
  - Display user count
- **Conflict resolution:**
  - Last write wins (acceptable for MVP)
  - Document this approach in code comments
- **State persistence:**
  - Save canvas state to database
  - Restore state when users reconnect
  - Handle disconnects gracefully (save last action before disconnect)
  - **Network error handling:** Preserve user's last successful action when connection is lost

### 5. Performance Targets
- Smooth interaction during pan, zoom, and object manipulation (targeting 30+ FPS, 60 FPS not required for MVP)
- Support 500+ objects without severe performance degradation
- Support 5+ concurrent users without lag
- Cursor sync <50ms
- Object sync <100ms

---

## Tech Stack Recommendations

### Option 1: Firebase (Recommended for MVP)
**Stack:**
- **Backend:** Firebase (Firestore + Realtime Database)
- **Auth:** Firebase Authentication
- **Frontend:** React + TypeScript
- **Canvas:** Konva.js or Fabric.js
- **Hosting:** Firebase Hosting

**Pros:**
- Fastest to implement (integrated auth, database, hosting)
- Real-time sync built-in
- Generous free tier
- Automatic scaling
- No backend code needed

**Cons:**
- Vendor lock-in
- Less control over sync logic
- Firestore charges per read/write (could be costly with cursor updates)
- Learning curve if unfamiliar with Firebase

**Recommendation:** Use Firebase Realtime Database for cursors (ephemeral data) and Firestore for canvas objects (persistent data)

---

### Option 2: Supabase + WebSockets
**Stack:**
- **Backend:** Supabase (PostgreSQL + Realtime)
- **Auth:** Supabase Auth
- **Frontend:** React + TypeScript
- **Canvas:** Konva.js or Fabric.js
- **Hosting:** Vercel

**Pros:**
- Open source alternative to Firebase
- SQL database (more familiar for many devs)
- Real-time subscriptions built-in
- Great documentation
- Easy to self-host later

**Cons:**
- Slightly more setup than Firebase
- Realtime performance may not match Firebase for cursor updates
- Newer ecosystem (fewer community solutions)

---

### Option 3: Custom WebSocket Server
**Stack:**
- **Backend:** Node.js + Socket.io + Redis
- **Database:** MongoDB or PostgreSQL
- **Auth:** Custom (JWT) or Auth0
- **Frontend:** React + TypeScript
- **Canvas:** Konva.js or Fabric.js
- **Hosting:** Render or Railway

**Pros:**
- Full control over sync logic
- Most efficient for real-time updates
- Best performance potential
- No vendor lock-in

**Cons:**
- Significantly more time to build (risky for 24hr MVP)
- Must handle auth, database, WebSockets separately
- More deployment complexity
- More code to maintain

---

### Canvas Library Comparison

**Konva.js (Recommended)**
- React-friendly (react-konva)
- Good performance
- Rich API for shapes and transformations
- Active community

**Fabric.js**
- More features out of the box
- Slightly heavier
- Great for complex manipulations

**PixiJS**
- Best performance (WebGL)
- Overkill for simple shapes
- Steeper learning curve

**HTML5 Canvas (Raw)**
- Maximum control
- Too low-level for 24-hour MVP

---

## Finalized Tech Stack for MVP

**Selected: Firebase + React + Konva.js**

```
Frontend:
- React 18 + JavaScript (ES6+)
- react-konva (for canvas)
- Firebase SDK
- TailwindCSS (for UI)

Backend:
- Firebase Authentication
- Firebase Realtime Database (cursor positions)
- Firestore (canvas objects, user presence)

Deployment:
- Firebase Hosting
```

**Decision rationale:** This combination offers the fastest path to a working MVP with robust real-time sync, minimal backend code, and reliable hosting. Firebase provides the best balance of development speed and real-time capabilities for the 24-hour timeline.

---

## Out of Scope for MVP

These features are explicitly excluded to maintain focus:

### Canvas Features
- Rotation of objects
- Multi-select (shift-click, drag-to-select)
- Layer management/z-index controls
- Copy/paste functionality
- Undo/redo
- Grouping objects
- Locking objects
- Alignment guides
- Snapping to grid
- Export to image/PDF

### Collaboration Features
- Chat functionality
- Comments on objects
- User avatars
- Permissions/roles
- Canvas history/versioning
- Conflict resolution UI (beyond last-write-wins)

### UI/UX
- Keyboard shortcuts (beyond basic delete)
- Right-click context menus
- Toolbars with icons
- Properties panels
- Color palettes
- Custom fonts

### Performance Optimizations
- Viewport culling (only render visible objects)
- Object batching
- WebSocket connection pooling
- Operational transforms for better conflict resolution
- **Real-time resize optimization:** Throttle resize updates to 100ms during drag

---

## Post-MVP: AI Integration

**Note:** AI features are explicitly **out of scope** for the 24-hour MVP. These features will be implemented in a subsequent phase after the core collaborative canvas is proven to work reliably.

### Planned AI Features (Future Development)
- **AI-powered design suggestions:** Integration with external AI APIs for generating design recommendations
- **Smart shape creation:** AI assistance for creating complex shapes and layouts
- **Content generation:** AI-generated text and visual elements
- **Design optimization:** AI analysis of design patterns and suggestions for improvements

### Technical Considerations for AI Integration
- **API Integration:** The current Firebase architecture will support additional API calls to AI services
- **Real-time AI:** AI-generated content will need to sync across all users using the existing multiplayer infrastructure
- **Performance:** AI features should not impact the core canvas performance (30+ FPS requirement)

---

## Critical Success Criteria

The MVP must demonstrate:

1. **Two users in different browsers can:**
   - See each other's cursors moving in real-time
   - Create shapes that appear instantly for both
   - Move shapes that update for both
   - See accurate presence (who's online)

2. **Persistence works:**
   - User refreshes mid-session → returns to same state
   - All users leave → come back later → work is still there

3. **Performance holds:**
   - Smooth 30+ FPS during interactions (60 FPS target for post-MVP)
   - No lag with multiple users
   - Quick sync (<100ms for objects, <50ms for cursors)

4. **Deployed and accessible:**
   - Public URL anyone can visit
   - No local setup required for testing

---

## Potential Pitfalls & Mitigation

### Pitfall 1: Cursor Updates Overwhelming Database
**Risk:** Cursor position updates every few milliseconds could exhaust Firebase quotas or cause lag.

**Mitigation:**
- Use Firebase Realtime Database (not Firestore) for cursors
- Throttle cursor updates to every 50-100ms
- Use ephemeral presence system that auto-cleans

### Pitfall 2: Race Conditions on Object Updates
**Risk:** Two users editing the same object simultaneously could cause conflicts.

**Mitigation:**
- Implement "last write wins" with timestamps
- Document limitation clearly
- Consider optimistic updates (show locally, then sync)

### Pitfall 3: Large Canvas State on Initial Load
**Risk:** Loading 500+ objects on canvas join could be slow.

**Mitigation:**
- Paginate initial load if needed
- Use Firestore query limits
- Implement loading state

### Pitfall 4: WebSocket Connection Drops
**Risk:** Network issues could disconnect users without graceful recovery.

**Mitigation:**
- Firebase handles reconnection automatically
- Show connection status indicator
- Queue updates during disconnect, replay on reconnect

### Pitfall 6: Firebase Quota Limits
**Risk:** Firebase free tier has limits on reads, writes, and concurrent connections that could be exceeded.

**Mitigation:**
- **Monitor usage:** Set up Firebase usage alerts at 80% of limits
- **Optimize cursor updates:** Use throttling (50-100ms) and consider reducing update frequency during high load
- **Graceful degradation:** If quota exceeded, show "high traffic" message and temporarily disable real-time cursor updates while keeping object sync
- **Prepare upgrade path:** Document process to upgrade to Blaze plan if needed
- **Alternative strategy:** Switch cursor updates to WebSocket fallback if Realtime DB quota exceeded

### Pitfall 7: Running Out of Time
**Risk:** Spending too long on features, not enough on sync.

**Mitigation:**
- Build multiplayer sync FIRST
- Test with 2+ browser windows constantly
- Simplify features if needed (e.g., fixed-size shapes, no resize)

---

## Data Model

### Users Collection (Firestore)
```javascript
// User document structure
{
  uid: string,              // Firebase Auth UID
  displayName: string,      // From Google profile or email
  email: string,            // From auth provider
  photoURL: string,         // From Google profile (optional)
  createdAt: timestamp,
  lastSeen: timestamp
}
```

### Canvas Objects Collection (Firestore)
```javascript
// Canvas object document structure (single shape type for MVP)
{
  id: string,               // Unique object ID
  type: 'rectangle',        // Only rectangle for MVP
  position: {
    x: number,              // Top-left corner X (clamped to canvas bounds)
    y: number               // Top-left corner Y (clamped to canvas bounds)  
  },
  // Rectangle properties
  width: number,            // Minimum 2px, user-defined via drag
  height: number,           // Minimum 1px, user-defined via drag
  
  // Metadata
  createdBy: string,        // User UID
  createdAt: timestamp,
  lastModifiedBy: string,   // User UID  
  lastModifiedAt: timestamp,
  
  // Fixed gray color for MVP
  color: '#808080'          // Fixed gray color
}
```

### Presence Collection (Firebase Realtime Database)
```javascript
// User presence structure (global canvas)
{
  userId: string,
  displayName: string,
  cursor: {
    x: number,
    y: number
  },
  lastUpdate: timestamp,
  connected: boolean
}

// Structure in Realtime DB:
// /globalCanvas/users/{userId}
```

### Global Canvas State (Firestore)
```javascript
// Global canvas document structure
{
  id: 'global',             // Fixed ID for global canvas
  objects: [string],        // Array of object IDs (references)
  createdAt: timestamp,
  lastModifiedAt: timestamp,
  
  // Metadata
  activeUsers: number,
  totalObjects: number
}
```

### Database Structure Overview

**Firestore (Persistent Data):**
```
/users/{userId}
/globalCanvas (single document)
/canvasObjects/{objectId}
```

**Realtime Database (Ephemeral Data):**
```
/globalCanvas/users/{userId}
  - cursor: {x, y}
  - displayName: string
  - connected: boolean
  - lastUpdate: timestamp
```

### Key Design Decisions

1. **Separate Presence from Objects:** Cursor positions update frequently (every 50-100ms) and don't need persistence, so they live in Realtime Database. Canvas objects update less frequently and need persistence, so they live in Firestore.

2. **Flat Object Structure:** Each canvas object is a separate Firestore document for easier querying and real-time updates. Reference them by ID in the session document.

3. **Fixed Gray Color:** All shapes are gray (#808080) to simplify MVP. Color is stored but not editable.

4. **Last Modified Tracking:** Every object tracks who created it and who last modified it for potential debugging and future features.

5. **Global Canvas Design:** Single shared canvas accessible to all authenticated users. No session management needed for MVP.

6. **Boundary Enforcement:** Position and resize operations are constrained to canvas boundaries. Shapes snap to boundaries when created or resized near edges. Resize handles are disabled/constrained when shapes reach canvas limits.

7. **Initial Canvas View:** Canvas loads centered at (2500, 2500) with zoom level adjusted to show the entire 5000x5000px area within the viewport.

8. **Real-time Resize:** Resize operations broadcast to all users in real-time with 100ms throttling during active resize, immediate sync on release.

---

## Development Checklist

### Setup & Infrastructure
- [ ] Create Firebase project
- [ ] Enable Google Authentication in Firebase Console
- [ ] Set up Firestore database (production mode)
- [ ] Set up Realtime Database
- [ ] Configure Firebase security rules
- [ ] Create React app with JavaScript
- [ ] Install dependencies (react-konva, firebase, tailwind)
- [ ] Set up environment variables for Firebase config
- [ ] Deploy skeleton app to Firebase Hosting or Vercel

### Authentication
- [ ] Implement Google Sign-In button
- [ ] Implement email/password registration form
- [ ] Implement email/password login form
- [ ] Handle Firebase auth state changes
- [ ] Store user profile in Firestore on first login (use email as display name for email/password users)
- [ ] Create protected route (require auth to access canvas)
- [ ] Display logged-in user's name in UI
- [ ] Implement sign-out functionality

### Canvas Foundation
- [ ] Set up Konva Stage and Layer
- [ ] Implement pan (drag canvas with mouse)
- [ ] Implement zoom (mouse wheel)
- [ ] Set canvas size to 5000x5000px
- [ ] Add visual boundary (different background color outside 5000x5000 area)
- [ ] Set initial view: centered at (2500, 2500), zoomed to fit entire canvas
- [ ] Test smooth interaction at 30+ FPS

### Multiplayer Presence (CRITICAL - DO FIRST)
- [ ] Set up Realtime Database listener for presence
- [ ] Broadcast cursor position every 50-100ms
- [ ] Render other users' cursors on canvas
- [ ] Display username labels above cursors
- [ ] Show list of online users in UI
- [ ] Handle user connect/disconnect events
- [ ] Auto-cleanup stale presence data
- [ ] Test with 2+ browser windows

### Shape Creation & Sync
- [ ] Create toolbar with 3 shape buttons (rectangle, circle, text)
- [ ] Implement boundary validation for shape creation (prevent creation outside 5000x5000)
- [ ] Implement rectangle creation (200x100px, gray, clamped to bounds)
- [ ] Implement circle creation (100px diameter, gray, clamped to bounds)
- [ ] Implement text creation (prompt for text input, clamped to bounds)
- [ ] Write shape data to Firestore on creation
- [ ] Set up Firestore listener for new objects
- [ ] Render all shapes from Firestore on canvas
- [ ] Test: Create shape in window 1, see it appear in window 2
- [ ] Test: Try to create shape outside boundary, verify it's prevented

### Object Manipulation & Sync
- [ ] Implement click to select (highlight selected object)
- [ ] Implement drag to move selected object
- [ ] Implement boundary clamping on drag (no part of shape can go outside 5000x5000)
- [ ] Broadcast move updates to Firestore (throttled)
- [ ] Listen for object updates and re-render
- [ ] Handle concurrent edits (last write wins)
- [ ] Test: Move object in window 1, see it move in window 2
- [ ] Test: Drag object to edge, verify it stops at boundary

### State Persistence
- [ ] Load all canvas objects from Firestore on mount
- [ ] Ensure objects persist after page refresh
- [ ] Test: Refresh page mid-session, verify all objects remain
- [ ] Test: All users leave, return later, verify canvas state intact

### Multi-User Testing
- [ ] Test with 2 simultaneous users
- [ ] Test with 3-4 simultaneous users
- [ ] Test rapid shape creation across users
- [ ] Test rapid object movement across users
- [ ] Test network throttling (slow 3G)
- [ ] Test user disconnect/reconnect scenarios

### Performance Testing
- [ ] Add 100 objects, test interaction smoothness
- [ ] Add 500 objects, test interaction smoothness
- [ ] Monitor cursor sync latency (<50ms target)
- [ ] Monitor object sync latency (<100ms target)
- [ ] Test with 5+ concurrent users

### UI Polish
- [ ] Add loading state while connecting
- [ ] Add connection status indicator
- [ ] Add online user count display
- [ ] Add basic error handling (connection lost, etc.)
- [ ] Make UI responsive (basic mobile support optional)

### Deployment & Documentation
- [ ] Deploy to Firebase Hosting or Vercel
- [ ] Test deployed version with multiple users
- [ ] Create README with setup instructions
- [ ] Document architecture in README
- [ ] Add deployed URL to README
- [ ] Create demo video (for post-MVP)

---

## Development Phases (24-Hour Plan)

### Phase 1: Foundation (Hours 0-6)
- Complete Setup & Infrastructure checklist
- Complete Authentication checklist
- Complete Canvas Foundation checklist
- Deploy skeleton to hosting

### Phase 2: Core Sync (Hours 6-14) - MOST CRITICAL
- Complete Multiplayer Presence checklist
- Test extensively with multiple browser windows
- Don't move to Phase 3 until cursors sync perfectly

### Phase 3: Features (Hours 14-20)
- Complete Shape Creation & Sync checklist
- Complete Object Manipulation & Sync checklist
- Complete State Persistence checklist
- Test continuously

### Phase 4: Testing & Polish (Hours 20-24)
- Complete Multi-User Testing checklist
- Complete Performance Testing checklist
- Complete UI Polish checklist
- Final deployment and documentation

## Success Metrics

**MVP Pass Criteria:**
- ✅ 2+ users can connect and see each other's cursors with name labels
- ✅ Objects sync in real-time across all users
- ✅ State persists through refresh and reconnect
- ✅ Performance stays smooth (30+ FPS) with multiple users
- ✅ Deployed and publicly accessible
- ✅ Users can authenticate with Google
- ✅ Users can create and move rectangles **SIMPLIFIED - Single shape type for MVP**
- ✅ Rectangle creation uses click-and-drag interaction with minimum 2x1px size **NEW BEHAVIOR**
- ✅ Three-tool system works correctly (Hand, Arrow, Rectangle) **NEW FEATURE**
- ✅ Independent tool selection per user (not synced between users) **NEW MULTIPLAYER BEHAVIOR**
- ✅ Tool state stored locally, cursors show position only **NEW ARCHITECTURE**
- ✅ Arrow tool default, proper tool switching after rectangle creation **NEW BEHAVIOR**
- ✅ Tool-specific cursors and visual feedback work **NEW FEATURE**
- ✅ Arrow tool can move and resize rectangles with handles **NEW CAPABILITY**
- ✅ Hand tool pans without affecting rectangles **NEW BEHAVIOR**
- ✅ Users can resize rectangles using corner/edge handles **NEW FEATURE - Added to MVP**
- ✅ Resize operations sync in real-time across users (100ms throttle) **NEW FEATURE**
- ✅ Any authenticated user can resize any rectangle **NEW CAPABILITY**

**Stretch Goals (if time permits):**
- Object deletion
- Text shape creation (click-and-drag text boxes) **MOVED from MVP**
- Circle shape creation (click center, drag radius) **MOVED from MVP**
- Color customization
- Multi-select operations
- Shape rotation
- Better visual feedback for selections
- Improved error handling and reconnection UI

---

## Next Steps

1. **Review this PRD** - Confirm scope and tech choices
2. **Set up development environment** - Initialize Firebase, create React app
3. **Build multiplayer sync first** - Don't touch shape features until cursors sync
4. **Test continuously** - Multiple browser windows from hour 1

**Remember:** A simple canvas with bulletproof multiplayer beats a feature-rich app with broken sync.