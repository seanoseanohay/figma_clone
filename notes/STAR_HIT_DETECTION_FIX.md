# Star Hit Detection Fix

## Issue
Stars were using circular bounding box hit detection, which made objects positioned in the gaps between star points unclickable. The circular boundary included empty space, blocking clicks on objects visually positioned in those gaps.

**User Report:** "I cannot click anything that's in that space between its two points [of a large star]. I think it has something to do with parts of it that are either invisible or how the area is calculated."

## Root Cause
The `isPointInStar` function (lines 378-386) was using a simple circular approximation:
```javascript
// OLD CODE - Circular bounding approximation
const dx = point.x - star.x;
const dy = point.y - star.y;
const distanceSquared = dx * dx + dy * dy;
const outerRadius = star.outerRadius || 40;
return distanceSquared <= outerRadius * outerRadius;
```

This created a circular hit area that included all the empty space between the star's points, preventing clicks on objects positioned in those visual gaps.

## Solution
Implemented accurate point-in-polygon detection using the **ray casting algorithm**:

```javascript
// NEW CODE - Accurate polygon detection (lines 378-413)
const isPointInStar = useCallback((point, star) => {
  // Calculate actual star vertices
  const numPoints = star.numPoints || 5;
  const innerRadius = star.innerRadius || 20;
  const outerRadius = star.outerRadius || 40;
  const rotation = star.rotation || 0;
  
  // Generate star points (alternating outer and inner vertices)
  const points = [];
  const angleStep = Math.PI / numPoints;
  const rotationRad = (rotation * Math.PI) / 180;
  
  for (let i = 0; i < numPoints * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * angleStep - Math.PI / 2 + rotationRad;
    points.push({
      x: star.x + radius * Math.cos(angle),
      y: star.y + radius * Math.sin(angle)
    });
  }
  
  // Point-in-polygon test using ray casting algorithm
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}, []);
```

## How It Works

### 1. **Vertex Calculation**
- Calculates all actual vertices of the star polygon
- Alternates between outer points (tips) and inner points (valleys)
- Accounts for star properties: numPoints, innerRadius, outerRadius, rotation

### 2. **Ray Casting Algorithm**
- Classic computational geometry technique for point-in-polygon testing
- Casts a ray from the test point to infinity
- Counts how many polygon edges the ray crosses
- Odd number of crossings = inside polygon
- Even number of crossings = outside polygon

### 3. **Accurate Hit Area**
- Only the filled star area registers clicks
- Empty spaces between points are transparent to clicks
- Objects positioned in gaps are now clickable

## Benefits

✅ **Accurate Selection:** Only clicks on the actual star shape are detected  
✅ **Gap Transparency:** Empty spaces between star points don't block clicks  
✅ **Rotation Support:** Works correctly with rotated stars  
✅ **Configurable:** Respects numPoints, innerRadius, outerRadius parameters  
✅ **Performance:** Efficient algorithm suitable for real-time interaction  

## Files Changed
- `src/components/canvas/Canvas.jsx` - Updated `isPointInStar` function (lines 378-413)

## Testing
✅ Created large star with small star positioned in gap between points  
✅ Small star in gap is now clickable/selectable  
✅ Large star only responds to clicks on filled area  
✅ No linter errors introduced  
✅ Canvas page renders correctly  
✅ All tools functional  

## Technical Notes

**Ray Casting Algorithm:**
- Time Complexity: O(n) where n = number of vertices
- Space Complexity: O(1) - no additional storage needed
- Robust: Handles concave and convex polygons
- Standard: Widely used in computer graphics

**Star Vertex Order:**
- Vertices alternate: outer, inner, outer, inner, ...
- For 5-point star: 10 vertices total (5 tips + 5 valleys)
- Angle step: π / numPoints radians
- Starting angle: -π/2 (points upward by default)

## Date
October 17, 2025

