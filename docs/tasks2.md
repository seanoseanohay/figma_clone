# CollabCanvas MVP Enhancement Tasks

> **⚠️ This document has been reorganized into separate stage documents for better navigation.**
> 
> **See [STAGES_README.md](./STAGES_README.md) for the organized task structure.**

---

## 📊 CURRENT STATUS (Updated: October 16, 2025)

### ✅ Stage 1: Foundation - COMPLETE
- **F1: Google-Only Authentication** ✅ Complete
- **F2: Header Redesign** ✅ 95% complete (Share button pending)
- **F4: Project/Canvas Data Models** ✅ Complete

### 🔄 Stage 2: Core Functionality - IN PROGRESS (2/9 complete)
- **C1: Project/Canvas Management System** ✅ Complete
- **C2: Canvas Sharing** ⏸️ NEXT PRIORITY
- **C3: Connection Status Monitoring** 🔄 40% complete
- **C4: Tool Handler Extraction** ⏸️ Not started
- **C5: Ownership Management** ⏸️ Not started
- **C6: Canvas-Scoped Presence** ✅ Complete
- **C7: REST API Infrastructure** ⏸️ Not started
- **C8: API Token Management** ⏸️ Not started
- **C9: API Documentation** ⏸️ Not started

### ⏸️ Stage 3: Enhanced Features - NOT STARTED (0/9 tasks)
Enhanced Tools (E1-E5) + Advanced Features (A0-A3)

### ⏸️ Stage 4: Production Ready - NOT STARTED (0/3 tasks)
Production tasks (PR1-PR3)

### ⏸️ Stage 5: Future Work - NOT STARTED (0/14 tasks)
Future Enhancements + Post-MVP Phases + Optimizations

---

## 🎯 Quick Navigation

For detailed task information, see the stage documents:

- **[Stage 1: Foundation](./stage1-foundation.md)** - ✅ Complete
- **[Stage 2: Core Functionality](./stage2-core-functionality.md)** - 🔄 Active
- **[Stage 3: Enhanced Features](./stage3-enhanced-features.md)** - ⏸️ Upcoming
- **[Stage 4: Production Ready](./stage4-production-ready.md)** - ⏸️ Future
- **[Stage 5: Future Work](./stage5-future-work.md)** - ⏸️ Future

**→ [Read STAGES_README.md for complete overview](./STAGES_README.md) ←**

---

## 📋 Overview
This project enhances the CollabCanvas MVP with improved UI, project management, canvas refactoring, and **REST API for AI agent access**. Tasks are organized into 5 development stages for better manageability.

**New in this version**: REST API infrastructure (Tasks C7-C9) enables AI agents and external applications to programmatically manipulate canvases via HTTP endpoints with token-based authentication.

---

## 📖 Stage Summaries

### Stage 1: Foundation (✅ Complete)
Core UI and infrastructure improvements that everything else builds upon.
- Google-only authentication
- Redesigned header with project/canvas dropdown
- Project/canvas data models and services
- Canvas-scoped presence system foundation

### Stage 2: Core Functionality (🔄 In Progress)
Primary features that extend the platform.
- Project and canvas management system ✅
- Canvas-scoped presence ✅
- Canvas sharing with simplified permissions (NEXT)
- Connection status monitoring and retry logic
- Tool handler extraction and refactoring
- Central ownership management
- REST API infrastructure for AI agents
- API token management system
- Comprehensive API documentation

### Stage 3: Enhanced Features (⏸️ Not Started)
New tools and advanced features for polished UX.
- **Enhanced Tools**: Circle tool, properties sidebar, text tool, resize bug fixes, owner-only restrictions
- **Advanced Features**: Performance optimization, canvas export, undo/redo, toolbar redesign

### Stage 4: Production Ready (⏸️ Not Started)
Deployment preparation and production reliability.
- UI polish and comprehensive error handling
- Firebase quota management and monitoring
- Final deployment with complete documentation

### Stage 5: Future Work (⏸️ Not Started)
Post-MVP improvements and advanced collaboration.
- Mobile navigation with hamburger menu
- Recently used sorting
- Theme selector (light/dark mode)
- Grid system with snap-to-grid
- Advanced ownership system (30-second timeout)
- 24-color cursor palette
- Intentional deletion system
- Multi-select functionality
- Performance and scalability improvements
- Accessibility features

---

## 🔔 Key Implementation Notes

### Architecture Highlights
- **Canvas-Scoped Presence**: Production uses `/projects/{projectId}/canvases/{canvasId}/presence/{userId}` (MVP's global canvas is deprecated)
- **Simplified Permissions**: All collaborators have equal edit permissions (no viewer role)
- **REST API for AI**: Tasks C7-C9 enable programmatic canvas manipulation via Cloud Functions
- **Token-Based Access**: AI agents use canvas-scoped tokens with rate limiting (200 reads/min, 50 writes/min)

### Critical Path
1. **Stage 1** (Foundation) → ✅ Complete
2. **Stage 2** (Core) → Complete C2 (sharing) next, then C3-C5, then C7-C9 for API
3. **Stage 3** (Enhanced) → Start after Stage 2 completion
4. **Stage 4** (Production) → Required before deployment
5. **Stage 5** (Future) → Post-deployment enhancements

**⚠️ Do not skip stages** - each builds on the previous with explicit dependencies.

---

## 📝 Additional Resources

### Implementation Guidelines
- **Code Quality**: Follow existing patterns, add comprehensive error handling, write clear code
- **Testing**: Test manually after each task, verify collaborative editing works, test responsive behavior
- **Canvas Testing**: After ANY changes, verify canvas page still renders and works correctly (per user rules)
- **Documentation**: Update progress docs, document architectural decisions

### Related Documents
- **[STAGES_README.md](./STAGES_README.md)** - Comprehensive stage overview and navigation
- **[stage1-foundation.md](./stage1-foundation.md)** - Foundation tasks (F1-F4)
- **[stage2-core-functionality.md](./stage2-core-functionality.md)** - Core functionality (C1-C9)
- **[stage3-enhanced-features.md](./stage3-enhanced-features.md)** - Enhanced tools & features
- **[stage4-production-ready.md](./stage4-production-ready.md)** - Production deployment
- **[stage5-future-work.md](./stage5-future-work.md)** - Future enhancements
- **[CANVAS_SCOPED_PRESENCE_DEPLOYMENT.md](../CANVAS_SCOPED_PRESENCE_DEPLOYMENT.md)** - C6 deployment guide
- **[prd.md](./prd.md)** - Original product requirements
- **[arch.mermaid](./arch.mermaid)** - System architecture

### Migration Notes
**MVP → Production**: The MVP used a global canvas at `/globalCanvas/users/{userId}`. Production now uses canvas-scoped presence at `/projects/{projectId}/canvases/{canvasId}/presence/{userId}`. All references to "global canvas" are deprecated.

---

## 📌 Note

**This overview document has been simplified.** All detailed task specifications, acceptance criteria, testing steps, and implementation notes have been moved to the individual stage documents for better organization and navigation.

**To view detailed tasks:**
1. See [STAGES_README.md](./STAGES_README.md) for an overview
2. Navigate to the specific stage document (stage1-foundation.md through stage5-future-work.md)
3. Each stage document contains complete task details with acceptance criteria and testing steps

---

**Last Updated**: October 16, 2025  
**Total Tasks**: 50+ tasks across 5 development stages  
**Current Focus**: Stage 2, Task C2 (Canvas Sharing)
