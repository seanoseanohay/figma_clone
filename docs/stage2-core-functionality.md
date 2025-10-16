# Stage 2: Core Functionality Tasks

## Overview
Primary features that extend the platform with project management, sharing, connection monitoring, and REST API infrastructure for AI agents.

## Current Status
- **C1**: ✅ Complete - Project/Canvas Management System
- **C6**: ✅ Complete - Canvas-Scoped Presence
- **C3**: 🔄 40% complete (status display exists, needs edit prevention and retry queue)
- **C2**: ⏸️ Not started - NEXT PRIORITY
- **C4-C5**: ⏸️ Not started
- **C7-C9**: ⏸️ Not started (REST API infrastructure)

---

## Task C1: Build Canvas Management System ✅ COMPLETE

**Objective**: Implement canvas-only management with simplified dropdown functionality

**Files Created**:
- `src/components/canvas/CanvasSelector.jsx`
- `src/hooks/useCanvases.js`

**Files Deleted**:
- `src/components/project/ProjectCanvasSelector.jsx`
- `src/hooks/useProjects.js`

**Files Modified**:
- `src/components/layout/Header.jsx`
- `src/contexts/CanvasContext.jsx`

**Features Implemented**:
1. Canvas selector dropdown showing current canvas name
2. useCanvases hook to fetch accessible canvases (owned + collaborated)
3. "Create canvas" functionality within dropdown
4. Canvas selection and navigation
5. Loading states during operations
6. Alphabetical sorting for canvas list
7. Error handling for failures
8. Projects remain in backend (invisible) with projectId = canvasId

**Status**: ✅ Complete

---

## Task C2: Implement Canvas Invitation System ✅ COMPLETE

**Objective**: Build canvas invitation system with pending invite support for non-registered users

**Dependencies**: 
- Requires Task F4 ✅ Complete
- Requires Task C1 ✅ Complete

**Files Created**:
- `src/components/canvas/InviteButton.jsx`
- `src/components/canvas/InviteModal.jsx`
- `src/components/canvas/EmptyState.jsx`

**Files Modified**:
- `src/services/canvas.service.js` (added addCollaboratorToCanvas)
- `src/services/auth.service.js` (added processPendingInvites)
- `src/components/canvas/Toolbar.jsx` (added InviteButton)
- Firestore rules for pendingInvites collection

**Features Implemented**:
1. InviteButton component in toolbar with UserPlus icon
2. InviteModal with email validation and canvas name display
3. addCollaboratorToCanvas function with user lookup
4. Pending invite system for non-registered users
5. processPendingInvites function called on login
6. Toast notifications for success/error feedback
7. Edge case handling (empty email, invalid format, self-invite)
8. Collaborators array on canvas documents
9. EmptyState component for when no canvas selected

**Acceptance Criteria**:
- [x] Invite modal has clean interface with email input
- [x] All collaborators get full edit permissions
- [x] Registered users added immediately to collaborators array
- [x] Non-registered users receive pending invites
- [x] Pending invites processed automatically on user login
- [x] Toast notifications provide clear feedback
- [x] Edge cases handled gracefully
- [x] Users can only invite to canvases they own or collaborate on

**Testing Steps**:
1. Invite registered user and verify immediate access
2. Invite non-registered user and verify pending invite created
3. New user registers and verify pending invite processed
4. Test edge cases (self-invite, invalid emails, duplicate invites)
5. Verify only users with canvas access can send invites

**Status**: ✅ Complete

---

## Task C3: Add Connection Status Monitoring

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
- [x] Connection status is accurately detected and displayed
- [ ] Edit operations are disabled when offline
- [ ] Clear user feedback provided during offline state
- [ ] Operations retry automatically when connection restored
- [x] Visual indicators clearly show connection state
- [ ] No data loss occurs during connection interruptions

**Testing Steps**:
1. Disconnect internet and verify offline detection
2. Attempt to edit objects and verify operations are blocked
3. Reconnect internet and verify automatic retry of queued operations
4. Test visual feedback displays correctly in all states
5. Verify no data corruption occurs during offline/online transitions

**Status**: 🔄 40% complete

---

## Task C4: Extract Canvas Tool Handlers

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

**Status**: ⏸️ Not started

---

## Task C5: Implement Central Ownership Management

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

**Status**: ⏸️ Not started

---

## Task C6: Implement Canvas-Scoped Presence System ✅ COMPLETE

**Objective**: Replace MVP global canvas with production canvas-scoped presence so users only see cursors and user lists for others on the same project+canvas

**Dependencies**: 
- Requires Task F4 ✅ Complete
- Requires Task C1 ✅ Complete

**Files Created**:
- `src/contexts/CanvasContext.jsx`
- `src/hooks/useCanvas.js`

**Files Modified**:
- `src/services/presence.service.js`
- `src/hooks/useCursorTracking.js`
- `src/hooks/usePresence.js`
- `src/components/canvas/UserCursor.jsx`
- `src/components/presence/OnlineUsers.jsx`
- `src/App.jsx`
- `database.rules.json`

**Features Implemented**:
1. CanvasContext for current canvas tracking (projectId removed from UI)
2. Updated presence data structure to `/canvases/{canvasId}/presence/{userId}`
3. Canvas-scoped presence service functions
4. Updated cursor tracking to use canvas context
5. Updated presence subscription to be canvas-scoped
6. Updated UI components to show only canvas-scoped users
7. Firebase Realtime Database security rules
8. Removed MVP global canvas code
9. Canvas navigation handling with localStorage persistence
10. Simplified architecture with projects invisible in backend

**Status**: ✅ COMPLETE - See CANVAS_SCOPED_PRESENCE_DEPLOYMENT.md

---

## Task C7: Implement REST API Infrastructure for AI/External Access

**Objective**: Create REST API using Firebase Cloud Functions to enable AI agents and external applications to interact with canvases programmatically

**Dependencies**: 
- Requires Task F4 ✅ Complete
- Requires Task C1 ✅ Complete
- Requires Task C6 ✅ Complete
- Requires Task C8 (should implement together)

**Files to Create**:
- `functions/` directory for Firebase Cloud Functions
- `functions/src/api/projects.js`
- `functions/src/api/canvases.js`
- `functions/src/api/objects.js`
- `functions/src/middleware/auth.js`
- `functions/src/middleware/rateLimit.js`
- `functions/src/utils/tokenValidator.js`

**Files to Modify**:
- Update `firebase.json`
- Update `package.json`

**API Endpoints Structure**:
```
Authentication & Tokens:
POST   /api/tokens/generate
DELETE /api/tokens/{tokenId}

Projects:
GET    /api/projects
POST   /api/projects
GET    /api/projects/{id}
PUT    /api/projects/{id}
DELETE /api/projects/{id}

Canvases:
GET    /api/projects/{pid}/canvases
POST   /api/projects/{pid}/canvases
GET    /api/canvases/{id}
PUT    /api/canvases/{id}
DELETE /api/canvases/{id}

Canvas Objects (Primary AI Usage):
GET    /api/canvases/{id}/objects
POST   /api/canvases/{id}/objects
GET    /api/canvases/{id}/objects/{oid}
PUT    /api/canvases/{id}/objects/{oid}
PATCH  /api/canvases/{id}/objects/{oid}
DELETE /api/canvases/{id}/objects/{oid}

Batch Operations (AI Efficiency):
POST   /api/canvases/{id}/objects/batch
PUT    /api/canvases/{id}/objects/batch
DELETE /api/canvases/{id}/objects/batch

Canvas State:
GET    /api/canvases/{id}/snapshot
```

**Key Features**:
1. Firebase Cloud Functions setup with Express.js
2. Authentication middleware for token validation
3. Rate limiting middleware (200 reads/min, 50 writes/min)
4. Project CRUD endpoints
5. Canvas CRUD endpoints
6. Object manipulation endpoints
7. Batch operations for AI efficiency
8. Canvas snapshot endpoint
9. Comprehensive error handling
10. Request/response logging

**Acceptance Criteria**:
- [ ] All API endpoints respond with consistent JSON format
- [ ] Token authentication works correctly for all endpoints
- [ ] Rate limiting prevents abuse
- [ ] Batch operations handle 10+ objects efficiently
- [ ] Canvas snapshot returns complete state in <2 seconds
- [ ] All operations enforce canvas boundaries and constraints
- [ ] Error responses provide clear, actionable messages
- [ ] API handles concurrent requests without data corruption
- [ ] Request logging captures all API activity
- [ ] CORS configured properly for external access

**Status**: ⏸️ Not started

---

## Task C8: Create API Token Management System

**Objective**: Implement canvas-scoped access token generation and management for AI agents and external applications

**Dependencies**: 
- Requires Task F4 ✅ Complete
- Requires Task C1 ✅ Complete
- Should be implemented alongside Task C7

**Files to Create**:
- `src/services/apiToken.service.js`
- `src/components/settings/ApiTokenManager.jsx`
- `src/hooks/useApiTokens.js`

**Files to Modify**:
- Update `firestore.rules`
- Update `src/components/layout/Header.jsx`

**Token Data Structure**:
```javascript
// Firestore: /users/{userId}/apiTokens/{tokenId}
{
  tokenId: string,
  token: string,                // Hashed
  name: string,
  canvasId: string,
  canvasName: string,
  projectId: string,
  permissions: string[],        // ["read", "create_objects", "update_objects", "delete_objects"]
  rateLimit: {
    read: number,               // Default: 200
    write: number               // Default: 50
  },
  createdAt: timestamp,
  expiresAt: timestamp,         // Default: 90 days
  lastUsedAt: timestamp,
  usageCount: number,
  isRevoked: boolean,
  createdBy: string
}
```

**Key Features**:
1. Token service with core functions (generate, validate, revoke, list, updateUsage, cleanup)
2. Secure token generation (64 characters, hashed storage)
3. Token validation logic
4. Permission system (read, create, update, delete)
5. Token management UI component
6. Token generation modal
7. Token display and copy functionality
8. Token revocation
9. Usage tracking
10. Firebase security rules
11. Background cleanup job

**Acceptance Criteria**:
- [ ] Users can generate tokens for accessible canvases
- [ ] Tokens are cryptographically secure
- [ ] Token plaintext only shown once at creation
- [ ] Token validation works correctly in API endpoints
- [ ] Permission system enforces restrictions
- [ ] Token management UI displays all tokens
- [ ] Token revocation works immediately
- [ ] Usage tracking updates correctly
- [ ] Expired tokens are automatically cleaned up
- [ ] Firebase security rules prevent unauthorized access
- [ ] Copy to clipboard works reliably
- [ ] UI provides security best practices guidance

**Status**: ⏸️ Not started

---

## Task C9: Create Comprehensive API Documentation with OpenAPI/Swagger

**Objective**: Create detailed, interactive API documentation for developers and AI agents using OpenAPI 3.0 specification

**Dependencies**: 
- Requires Task C7 ✅ Complete
- Requires Task C8 ✅ Complete

**Files to Create**:
- `docs/api/openapi.yaml`
- `docs/api/getting-started.md`
- `docs/api/authentication.md`
- `docs/api/examples.md`
- `docs/api/rate-limits.md`
- `functions/src/swagger.js`

**Files to Modify**:
- Update `README.md`

**Key Features**:
1. OpenAPI 3.0 specification with all endpoints
2. Authentication flow documentation
3. Getting started guide (5 minutes to first API call)
4. Code examples in multiple languages (JavaScript, Python, cURL)
5. Object types and properties documentation
6. Interactive Swagger UI at `/api/docs`
7. Rate limiting details
8. Error handling guide
9. AI agent integration guide
10. Webhook documentation (optional future)
11. Versioning strategy
12. Troubleshooting section

**Acceptance Criteria**:
- [ ] OpenAPI 3.0 spec is complete and valid
- [ ] Swagger UI is accessible at `/api/docs`
- [ ] All endpoints documented with examples
- [ ] Getting started guide enables first API call in 5 minutes
- [ ] Code examples in JavaScript, Python, and cURL
- [ ] Authentication flow clearly explained
- [ ] Rate limiting documented with strategies
- [ ] Error codes documented with troubleshooting
- [ ] AI agent integration guide with specific examples
- [ ] Documentation is searchable and easy to navigate

**Status**: ⏸️ Not started

---

## Next Steps

1. **Immediate Priority**: Complete remaining C3 work (edit prevention, retry queue)
2. **Consider**: Tasks C4-C5 for better code organization
3. **Future**: REST API infrastructure (C7-C9) for AI agent access

**Note**: C1, C2, and C6 are complete with new canvas-only architecture.

After completing Stage 2, proceed to **Stage 3: Enhanced Tools & Advanced Features**.

