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

## Task C1: Build Project/Canvas Management System ✅ COMPLETE

**Objective**: Implement full project and canvas management with dropdown functionality

**Files Created**:
- `src/components/project/ProjectCanvasSelector.jsx`
- `src/hooks/useProjects.js`

**Files Modified**:
- `src/components/layout/Header.jsx`

**Features Implemented**:
1. Project/canvas selector dropdown with nested format
2. useProjects hook to fetch accessible projects
3. "Create new project" and "Create new canvas" options
4. Project/canvas selection and navigation
5. Loading states during operations
6. Alphabetical sorting for lists
7. Error handling for failures
8. Modal dialogs for naming

**Status**: ✅ Complete

---

## Task C2: Implement Canvas Sharing (Simplified)

**Objective**: Build simplified canvas sharing system where all collaborators have equal edit permissions

**Dependencies**: 
- Requires Task F4 ✅ Complete
- Requires Task C1 ✅ Complete

**Files to Modify**:
- Update `src/services/project.service.js`
- Update `src/services/canvas.service.js`
- Create `src/components/sharing/ShareCanvasModal.jsx`

**Specific Changes**:
1. Create share modal with simple email input (no role selection needed)
2. Implement shareCanvas function in project.service.js
3. Add recipient as collaborator to project with full edit permissions
4. Generate shareable links with format `/project/{projectId}/canvas/{canvasId}`
5. Add share button to header (already specified in F2)
6. Handle edge cases: sharing with self, re-sharing, invalid emails
7. Implement proper success/error feedback for sharing operations
8. Send email notification to recipient (optional enhancement)

**Acceptance Criteria**:
- [ ] Share modal has simple, clean interface with email input only
- [ ] All shared collaborators get full edit permissions (no role selection)
- [ ] Recipients can access shared canvas immediately after being added
- [ ] Shareable links work correctly and navigate to proper canvas
- [ ] Share modal provides clear user feedback
- [ ] Edge cases handled gracefully (duplicate shares, invalid emails)
- [ ] Users can only share canvases they have access to

**Testing Steps**:
1. Share a canvas via email and verify recipient gets access
2. Test shareable link functionality
3. Verify recipient can edit canvas (has full permissions)
4. Test edge cases (sharing with self, duplicate shares, invalid emails)
5. Verify only users with canvas access can share it

**Status**: ⏸️ NEXT PRIORITY

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
1. CanvasContext for current project+canvas tracking
2. Updated presence data structure to `/projects/{projectId}/canvases/{canvasId}/presence/{userId}`
3. Canvas-scoped presence service functions
4. Updated cursor tracking to use canvas context
5. Updated presence subscription to be canvas-scoped
6. Updated UI components to show only canvas-scoped users
7. Firebase Realtime Database security rules
8. Removed MVP global canvas code
9. Canvas navigation handling with localStorage persistence

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

1. **Immediate Priority**: Complete Task C2 (Canvas Sharing)
2. **Then**: Complete remaining C3 work (edit prevention, retry queue)
3. **Consider**: Tasks C4-C5 for better code organization
4. **Future**: REST API infrastructure (C7-C9) for AI agent access

After completing Stage 2, proceed to **Stage 3: Enhanced Tools & Advanced Features**.

