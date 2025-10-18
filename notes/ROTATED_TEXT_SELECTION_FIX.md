# Rotated Text Selection Fix

## Date: October 18, 2025

## Issue Reported

When text is rotated (e.g., 45 degrees), clicking on the visually displayed rotated text does NOT select it. Instead, there's an "invisible box" where the text used to be (before rotation) that gets selected. This means:

- ❌ Click on rotated text (where it appears visually) → No selection
- ❌ Click on empty space (where text was before rotation) → Text gets selected

**Expected behavior**: Click anywhere on the visually rotated text should select it.

## Root Cause

The hit detection function `findTextAt()` was using the **wrong rotation origin**.

### The Problem:
- In Konva, **Text objects rotate around their top-left corner** `(x, y)` by default
- My initial fix assumed text rotates around its **center** `(x + width/2, y + height/2)`
- This mismatch meant hit detection checked a bounding box that didn't match where the text actually appears on screen

### Why It Failed:
When checking if a click is inside rotated text:
```javascript
// WRONG (my initial code):
const centerX = text.x + textWidth / 2;  // Rotating around center
const centerY = text.y + textHeight / 2;
// This created an "invisible box" offset from the actual text
```

```javascript
// CORRECT (fixed code):
const translatedX = pos.x - text.x;  // Rotating around top-left corner
const translatedY = pos.y - text.y;
// This matches where Konva actually renders the rotated text
```

## Solution Implemented

### Updated `findTextAt()` Function
**Location**: `src/components/canvas/Canvas.jsx` lines 557-600

**Key Changes**:
1. Changed rotation origin from center to **top-left corner** `(text.x, text.y)`
2. Updated coordinate transformation to match Konva's rotation behavior
3. Updated bounding box check to use origin at top-left (0, 0) instead of center

### Before vs After

**Before (Wrong)**:
```javascript
// Assumed rotation around center
const centerX = text.x + textWidth / 2;
const centerY = text.y + textHeight / 2;
const translatedX = pos.x - centerX;
const translatedY = pos.y - centerY;
// ... rotation math ...
// Check: localX >= -halfWidth && localX <= halfWidth
```

**After (Correct)**:
```javascript
// Rotation around top-left corner (matches Konva)
const translatedX = pos.x - text.x;
const translatedY = pos.y - text.y;
// ... rotation math ...
// Check: localX >= 0 && localX <= textWidth
```

## Technical Details

### Konva Text Rotation Behavior
- By default, Konva Text rotates around its position `(x, y)` which is the **top-left corner**
- This is DIFFERENT from rectangles, which I fixed to rotate around their center
- The text rendering code in Canvas.jsx shows:
  ```jsx
  <Text
    x={shape.x}       // Top-left corner
    y={shape.y}       // Top-left corner
    rotation={shape.rotation || 0}
    ...
  />
  ```

### Coordinate Transformation Math

For a point `(px, py)` and text rotated by angle `θ` around its top-left corner `(text.x, text.y)`:

1. **Translate relative to rotation origin (top-left)**:
   ```
   translatedX = px - text.x
   translatedY = py - text.y
   ```

2. **Rotate by -θ** (inverse rotation):
   ```
   angleRad = (-θ × π) / 180
   localX = translatedX × cos(angleRad) - translatedY × sin(angleRad)
   localY = translatedX × sin(angleRad) + translatedY × cos(angleRad)
   ```

3. **Check if inside unrotated box** (origin at top-left):
   ```
   inside = (localX >= 0 && localX <= textWidth && 
             localY >= 0 && localY <= textHeight)
   ```

## Files Modified

- `src/components/canvas/Canvas.jsx`:
  - Fixed `findTextAt()` function (lines 577-596)
  - Changed rotation origin from center to top-left corner
  - Updated bounding box check to match new origin

## Testing Instructions

### Manual Test Procedure:

1. **Create Text**:
   - Select Text Tool
   - Create text: "Hello World Testing"
   
2. **Rotate Text**:
   - Select the text
   - Switch to Rotate Tool (🔄)
   - Rotate text to 45° (or any angle)
   
3. **Test Selection - These Should Now Work**:
   - Switch to Select Tool
   - Click elsewhere to deselect
   - ✅ Click on the word "Hello" in its **rotated position** → Should select
   - ✅ Click on the word "World" in its **rotated position** → Should select
   - ✅ Click on the space between words in **rotated position** → Should select
   - ✅ Click anywhere in the rotated text bounds → Should select
   
4. **Test "Invisible Box" is Gone**:
   - ❌ Click where the text WAS before rotation (empty space) → Should NOT select
   - The old "invisible box" problem should be gone

### Additional Test Cases:
- Test at various rotation angles: 30°, 45°, 60°, 90°, 135°, 180°
- Test with different text lengths (short and long)
- Test with multi-line text
- Test selection near the edges of rotated text

## Impact

- **Fixed**: Rotated text now selectable at its visual position
- **Fixed**: "Invisible box" problem eliminated
- **Improved UX**: Users can click on rotated text where they see it
- **No Breaking Changes**: Works with existing data
- **Consistent**: Non-rotated text continues to work as before

## Notes

- This fix is specific to **text objects** because they rotate around top-left
- **Rectangles** rotate around their center (already fixed correctly)
- **Circles** are rotationally symmetric (rotation doesn't affect hit detection)
- **Stars** use ray-casting with rotation already accounted for

## Related Files

- `notes/SELECTION_HIT_DETECTION_IMPROVEMENTS.md` - Initial selection fixes
- `notes/SELECTION_TESTING_GUIDE.md` - General selection testing
- `notes/E3_SELECTION_FIXES_COMPLETE.md` - Previous status (now superseded)

## Status

✅ **CODE FIX COMPLETE** - Rotation origin corrected  
⏳ **MANUAL TESTING REQUIRED** - User must verify rotated text selection

The code fix is mathematically correct and matches Konva's rendering behavior. Manual testing will confirm it works as expected in practice.

