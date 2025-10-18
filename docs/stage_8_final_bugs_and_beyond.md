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

### Potential Improvements
- **Enhanced Resize Validation**: Prevent negative dimensions during resize operations
- **Improved State Validation**: Add comprehensive validation during undo/redo state restoration
- **Better Transform Handling**: Enhance interaction between resize and rotation operations
- **Debug Visualization**: Add visual indicators for invalid states during development

### Performance Optimizations
- Optimize undo/redo stack for complex transform operations
- Implement state diffing to reduce memory usage
- Add debouncing for rapid property changes

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
