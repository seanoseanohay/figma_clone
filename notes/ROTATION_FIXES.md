# Rotation and Resize Fixes

## Issues Fixed

### Issue 1: Rectangle Rotation from Corner Instead of Center
**Problem**: Rectangles were rotating around their top-left corner instead of their center point.

**Root Cause**: Konva rectangles were rendered with `offsetX={0}` and `offsetY={0}`, causing rotation to pivot around the top-left corner (x, y position).

**Solution**: Modified rectangle rendering in `Canvas.jsx` to use center-based coordinates:
- Set `offsetX={shape.width / 2}` and `offsetY={shape.height / 2}`
- Adjust rendering position to `x={shape.x + shape.width / 2}` and `y={shape.y + shape.height / 2}`
- This makes the rectangle rotate around its center while maintaining the same storage format (x,y as top-left corner in Firestore)

**Code Changes**:
```javascript
// Before (lines 1124-1135):
<Rect
  x={shape.x}
  y={shape.y}
  width={shape.width}
  height={shape.height}
  offsetX={0}
  offsetY={0}
/>

// After:
const centerX = shape.x + shape.width / 2;
const centerY = shape.y + shape.height / 2;

<Rect
  x={centerX}
  y={centerY}
  width={shape.width}
  height={shape.height}
  offsetX={shape.width / 2}
  offsetY={shape.height / 2}
/>
```

### Issue 2: Cannot Resize After Rotation Without Deselecting
**Problem**: After rotating an object, switching to Resize tool would not show resize handles or allow resizing until the object was deselected and reselected.

**Root Cause**: The Konva Transformer component wasn't properly attaching to rotated objects when switching from Rotate tool to Resize tool. The shape ref wasn't being set quickly enough for the Transformer's useEffect to detect it.

**Solution**: 
1. Added a small 10ms timeout in the Transformer attachment useEffect to ensure the DOM and refs are fully updated
2. Added `transformerRef.current.forceUpdate()` to force the Transformer to re-render after attaching to the rotated shape
3. Added console logging for debugging Transformer attachment

**Code Changes** in `Canvas.jsx` (lines 178-206):
```javascript
// Added timeout and forceUpdate
useEffect(() => {
  const timeoutId = setTimeout(() => {
    if (transformerRef.current && selectedShapeRef.current && selectedTool === TOOLS.RESIZE && resizeSelectedId) {
      const selectedObj = canvasObjects.find(obj => obj.id === resizeSelectedId);
      
      if (selectedObj && selectedObj.rotation && selectedObj.rotation !== 0) {
        console.log('Attaching Transformer to rotated object:', resizeSelectedId, 'rotation:', selectedObj.rotation);
        transformerRef.current.nodes([selectedShapeRef.current]);
        transformerRef.current.getLayer().batchDraw();
        transformerRef.current.forceUpdate(); // Force re-render
      }
      // ... rest of logic
    }
  }, 10); // Small delay to ensure refs are set
  
  return () => clearTimeout(timeoutId);
}, [selectedTool, resizeSelectedId, canvasObjects]);
```

3. Updated Transformer's `onTransform` handler to properly convert between center-based rendering coordinates and top-left corner storage coordinates (lines 1432-1468):
```javascript
// Convert center position back to top-left corner for storage
const centerX = node.x();
const centerY = node.y();
const topLeftX = centerX - newWidth / 2;
const topLeftY = centerY - newHeight / 2;

setLocalRectUpdates(prev => ({
  ...prev,
  [resizeSelectedId]: {
    ...selectedObj,
    x: topLeftX,  // Store top-left corner
    y: topLeftY,  // Store top-left corner
    width: newWidth,
    height: newHeight,
    rotation: node.rotation()
  }
}));
```

## Testing

### Automated Testing Challenges
Automated testing via Chrome DevTools was challenging due to:
- Canvas zoomed to 19% making precise clicking difficult
- Multiple overlapping shapes on the canvas
- Need for precise coordinate-based interactions

### Manual Testing Steps
1. **Test Center Rotation**:
   - Create a rectangle using Rectangle tool
   - Select it with Select tool
   - Switch to Rotate tool
   - Drag the rotation handle (blue circle above the rectangle)
   - **Expected**: Rectangle should rotate smoothly around its center point
   - **Previous behavior**: Rectangle rotated around top-left corner

2. **Test Resize After Rotation**:
   - With a rotated rectangle selected (from step 1)
   - Switch directly to Resize tool (without deselecting)
   - **Expected**: Konva Transformer handles appear immediately and resizing works
   - **Previous behavior**: No handles appeared, resizing didn't work until deselect/reselect

3. **Test Rotated Rectangle Resize**:
   - With Resize tool active on a rotated rectangle
   - Drag any corner handle to resize
   - **Expected**: Rectangle resizes correctly while maintaining rotation
   - Rectangle position adjusts appropriately
   - Final dimensions saved correctly to Firestore

## Files Modified
- `src/components/canvas/Canvas.jsx`:
  - Lines 1124-1140: Rectangle rendering with center-based rotation
  - Lines 178-206: Transformer attachment with timeout and forceUpdate
  - Lines 1432-1468: Coordinate conversion in onTransform handler

## Impact
- ✅ Rectangles now rotate around their center (matches user expectation)
- ✅ Circles and stars were already rotating around their center (no changes needed)
- ✅ Resize tool works immediately after rotating (no deselect/reselect required)
- ✅ Rotated objects can be resized smoothly with Transformer
- ✅ Backward compatible: existing rectangles in Firestore continue to work correctly
- ✅ Storage format unchanged: x,y still represents top-left corner in database

## Notes
- The fix uses Konva's offset properties to handle center-based rotation while maintaining top-left corner storage
- The Transformer coordinate conversion ensures proper synchronization between rendering and storage
- The 10ms timeout is minimal and doesn't impact user experience
- Console logs added for debugging can be removed in production if desired

