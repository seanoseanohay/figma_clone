# Stage 8: Final Bugs and Beyond

This document tracks bugs and issues discovered after the main implementation phases, along with potential future enhancements.

## 🐛 Known Bugs

### Bug #1: Rectangle Resize + Rotation Undo/Redo State Corruption

**Severity:** High  
**Status:** Open  
**Discovered:** Stage 8 - Property Tracking Implementation  

#### Description
When resizing a rectangle past its bounds (creating negative dimensions) followed by rotation, the undo/redo system exhibits state corruption where the rectangle progressively degrades to a line and then reconstructs through multiple redo operations.

#### Steps to Reproduce
1. Create a rectangle on the canvas
2. Use the resize tool to drag the **left upper corner below the left lower corner** (creating inverted/negative dimensions)
3. Rotate the rectangle using the rotation tool
4. Perform multiple **undo operations** (Ctrl+Z or undo button)
   - **Observed:** Rectangle progressively becomes thinner until it appears as just a line
5. Perform multiple **redo operations** (Ctrl+Y or redo button)  
   - **Observed:** Rectangle gradually reconstructs back to normal through multiple stages

#### Expected Behavior
- Undo/redo should restore the exact previous state in a single operation
- Rectangle dimensions should never become invalid (negative width/height)
- Visual representation should remain consistent throughout undo/redo operations

#### Potential Root Causes
1. **Negative Dimension Handling**: Resize tool may be allowing/storing negative width/height values
2. **State Restoration Issues**: Undo/redo system might not be properly restoring dimension constraints
3. **Rotation + Resize Interaction**: Combined transformations may be creating invalid intermediate states
4. **Boundary Clamping**: Missing validation during state restoration to ensure dimensions remain positive

#### Technical Areas to Investigate
- `ResizeTool.js` - Check for negative dimension validation
- `useHistory.js` - Verify state restoration handles dimension constraints
- `Canvas.jsx` - Ensure boundary clamping is applied during undo/redo
- Rotation + resize interaction in transform operations

#### Impact
- **User Experience**: Confusing behavior that breaks user expectations
- **Data Integrity**: Potentially corrupted object states in undo stack
- **Visual Consistency**: Rectangle rendering becomes unreliable

#### Workaround
Avoid resizing rectangles past their bounds (crossing corners) before rotating.

---

## 🚀 Future Enhancements

### Bug Fixes & Technical Improvements
- **Enhanced Resize Validation**: Prevent negative dimensions during resize operations
- **Improved State Validation**: Add comprehensive validation during undo/redo state restoration
- **Better Transform Handling**: Enhance interaction between resize and rotation operations
- **Debug Visualization**: Add visual indicators for invalid states during development

### Performance Optimizations
- Optimize undo/redo stack for complex transform operations
- Implement state diffing to reduce memory usage
- Add debouncing for rapid property changes

### Dinosaur-Themed UI Enhancements 🦖

#### ✅ Implemented Features

1. **Custom Dinosaur Favicon** ✅
   - Created custom SVG dinosaur icon at `/public/dinosaur.svg`
   - Updated `index.html` to use new favicon
   - Features a friendly green dinosaur with spikes matching the Canvasaurus brand

2. **Loading Animation: "RAWR-ing up..."** ✅
   - Added inline loading screen in `index.html` that displays while React loads
   - Created reusable `Loading.jsx` component at `/src/components/common/Loading.jsx`
   - Features animated bouncing text and rotating dinosaur emoji
   - Automatically replaced when React app mounts

3. **404 Page: "RAWR! This page went extinct"** ✅
   - Created custom 404 component at `/src/components/common/NotFound.jsx`
   - Added route to `App.jsx` for catch-all unmatched paths
   - Features dinosaur skull emoji and humorous extinction-themed message
   - Includes button to return to canvas

4. **Success Messages: "RAWR-some!"** ✅
   - Updated existing success toast messages with dinosaur-themed text:
     - Invitation sent: "RAWR-some! Invitation sent!"
     - Collaborator added: "RAWR-some! Collaborator added successfully!"
     - Token copied: "RAWR-some! Token copied to clipboard!"
     - Token generated: "RAWR-some! API token generated successfully!"
     - Token revoked: "Token sent to extinction! Revoked successfully."
   - Created utility file `/src/utils/toastMessages.js` with pre-defined dinosaur messages
   - Available for future use: `showRAWRsome()`, `showSaved()`, `showCreated()`, etc.

#### Implementation Files
- `/public/dinosaur.svg` - Custom favicon
- `/index.html` - Favicon link + inline loading screen
- `/src/components/common/Loading.jsx` - Reusable loading component
- `/src/components/common/NotFound.jsx` - 404 page component
- `/src/utils/toastMessages.js` - Dinosaur-themed toast utilities
- `/src/App.jsx` - Updated routes to include 404 page
- `/src/components/canvas/InviteModal.jsx` - Updated success messages
- `/src/components/settings/ApiTokenManager.jsx` - Updated success messages
- `/src/hooks/useApiTokens.js` - Updated success messages

---

## 🔧 Investigation Notes

### Debugging Steps
1. Add logging to resize operations to track dimension values
2. Monitor undo/redo stack contents for invalid states
3. Test boundary conditions in resize + rotation combinations
4. Verify state validation in transform operations

### Code Locations
- `/src/tools/ResizeTool.js` - Primary resize logic
- `/src/hooks/useHistory.js` - Undo/redo state management
- `/src/components/canvas/Canvas.jsx` - Canvas transform handling
- `/src/tools/RotateTool.js` - Rotation logic interaction

---

*Last Updated: Stage 8 Implementation*
