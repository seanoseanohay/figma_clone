# Selection Testing Guide

## Quick Test Checklist for Selection Improvements

### Test 1: Text Selection with Whitespace
1. **Create Text**:
   - Select Text Tool (📝)
   - Click on canvas
   - Type: "Hello World Testing"
   - Save the text
   
2. **Test Selection**:
   - Switch to Select Tool (➡️)
   - Click elsewhere to deselect
   - Try clicking:
     - ✅ On a letter (should select)
     - ✅ Between two letters in a word (should select)
     - ✅ On the space between "Hello" and "World" (should select)
     - ✅ On the space between "World" and "Testing" (should select)
     - ❌ Far outside the text bounds (should NOT select)

**Expected Result**: Any click within the text's bounding box should select it, including whitespace between words.

### Test 2: Rectangle Edge Selection
1. **Create Rectangle**:
   - Select Rectangle Tool (⬜)
   - Draw a rectangle on canvas
   - Deselect it

2. **Test Edge Selection**:
   - Switch to Select Tool
   - Try clicking:
     - ✅ Top edge
     - ✅ Bottom edge
     - ✅ Left edge
     - ✅ Right edge
     - ✅ Corners
     - ✅ Center/fill area

**Expected Result**: All clicks within the rectangle bounds (including edges) should select it.

### Test 3: Rotated Rectangle Selection
1. **Create and Rotate Rectangle**:
   - Create a rectangle
   - Select Rotate Tool (🔄)
   - Rotate rectangle to 45° (or any angle)
   
2. **Test Rotated Selection**:
   - Switch to Select Tool
   - Try clicking:
     - ✅ On all four edges of the rotated rectangle
     - ✅ On the corners
     - ✅ In the center
     - ❌ Just outside the rotated shape (should NOT select)

**Expected Result**: The rotated rectangle should be selectable at all points within its actual rotated bounds, not just its axis-aligned bounding box.

### Test 4: Rotated Text Selection
1. **Create and Rotate Text**:
   - Create some text ("Test Rotation")
   - Select Rotate Tool
   - Rotate text to various angles (30°, 60°, 90°)
   
2. **Test Rotated Text Selection**:
   - Switch to Select Tool
   - Click on the rotated text at various points
   - Try clicking whitespace within the text bounds

**Expected Result**: Rotated text should be selectable anywhere within its rotated bounding box.

### Test 5: Overlapping Shapes (Z-Index)
1. **Create Multiple Overlapping Shapes**:
   - Create a rectangle
   - Create text that overlaps the rectangle
   - Create a circle that overlaps both

2. **Test Top Shape Selection**:
   - Switch to Select Tool
   - Click in the overlapping area
   
**Expected Result**: The topmost shape (highest z-index) should be selected when clicking in overlapping areas.

## Known Limitations

- Hit detection uses the stored `width` property for text. If a text object doesn't have this property set, it defaults to 200px.
- Very narrow or small shapes might be harder to click (this is expected UX, not a bug).

## How to Report Issues

If any test fails:
1. Note which test failed
2. Describe what you clicked and what happened
3. Take a screenshot if possible
4. Check browser console for any errors
5. Report the canvas zoom level (if not 100%)

## Success Criteria

- ✅ Text can be selected by clicking anywhere in its bounding box
- ✅ Rectangle edges are reliably selectable
- ✅ Rotated shapes select correctly based on their actual (rotated) bounds
- ✅ No console errors during selection
- ✅ Selection works at different zoom levels

