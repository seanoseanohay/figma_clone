# Performance Optimizations - Lag Reduction

## Date: October 17, 2025

---

## ⚡ Critical Fixes Applied

### 1. ✅ Removed Firestore Writes During Drag (BIGGEST IMPACT)

**Problem**: Writing to both RTDB AND Firestore during drag
- Before: 13 RTDB + 60 Firestore = **73 writes/sec** 😱
- After: 13 RTDB only = **13 writes/sec** ✅

**Changes**:
- Removed `updateObjectPosition()` calls during drag
- Now only writes to RTDB for real-time broadcasting
- Firestore updates ONLY on drag end (final position)

**Expected Impact**: **82% reduction in database writes** → Much smoother drag

---

### 2. ✅ Increased RTDB Throttle (75ms → 100ms)

**Why**: Fewer updates = less network traffic + faster performance

- Before: ~13 updates/sec (75ms throttle)
- After: ~10 updates/sec (100ms throttle)
- Still smooth (human eye perceives 8+ FPS as continuous)

**Expected Impact**: 23% fewer network requests

---

### 3. ✅ Added useMemo to Rectangle Mapping

**Problem**: Rectangle list recalculated on every render
**Solution**: Memoized to only recalculate when dependencies change

```javascript
const rectangles = useMemo(() => {
  // mapping logic...
}, [canvasObjects, localRectUpdates, activeObjects]);
```

**Expected Impact**: Reduced CPU load, fewer unnecessary re-renders

---

## 📊 Performance Before vs After

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Database writes/sec** | 73 | 13 | 82% ↓ |
| **RTDB updates/sec** | 13 | 10 | 23% ↓ |
| **Firestore writes during drag** | 60/sec | 0 | 100% ↓ |
| **Rectangle mapping** | Every render | Memoized | Variable ↓ |

---

## 🧪 Test the Improvements

```bash
# 1. Restart dev server
npm run dev

# 2. Open 2 browser windows
# 3. Drag object in Window 1
# 4. Should be MUCH smoother now in Window 2
```

**What to check**:
- [ ] Dragging feels responsive (no lag for current user)
- [ ] Other users see smooth movement (not choppy)
- [ ] Network tab shows ~10 RTDB writes/sec (not 73)
- [ ] No console errors

---

## 🔧 Additional Optimizations (If Still Laggy)

### Option A: Increase RTDB Throttle Further

Edit `src/services/canvas.service.js`:
```javascript
const ACTIVE_OBJECT_THROTTLE = 150  // 150ms = ~6.5 updates/sec
```

**Trade-off**: Fewer updates = slightly choppier (but still acceptable)

---

### Option B: Reduce Local Update Frequency

For the dragging user's local visual feedback, consider throttling:

```javascript
// In Canvas.jsx, wrap setLocalRectUpdates with throttle
import { throttle } from 'lodash'; // or implement your own

const throttledSetLocalUpdates = useRef(
  throttle((updates) => {
    setLocalRectUpdates(updates);
  }, 16) // 60 FPS
).current;
```

---

### Option C: Implement Position Delta (Advanced)

Instead of sending absolute positions, send deltas:

```javascript
// RTDB payload
{
  dx: 10,  // Change in x
  dy: 5,   // Change in y
  // Instead of absolute x, y
}
```

**Benefit**: Smaller payloads, less bandwidth

---

### Option D: Add Request Animation Frame

For even smoother rendering on watching users:

```javascript
// In Canvas.jsx, wrap active object updates with RAF
useEffect(() => {
  let rafId;
  
  const updatePositions = () => {
    // Update positions from activeObjects
    rafId = requestAnimationFrame(updatePositions);
  };
  
  rafId = requestAnimationFrame(updatePositions);
  
  return () => cancelAnimationFrame(rafId);
}, [activeObjects]);
```

---

### Option E: Optimize Konva Layer

Add these props to `<Layer>` in Canvas.jsx:

```javascript
<Layer
  listening={false}  // Disable event listening (we use Stage events)
  perfectDrawEnabled={false}  // Faster rendering, slight quality loss
>
```

**Benefit**: Faster canvas rendering

---

## 🐛 Debugging Lag Sources

### Check 1: Network Latency
```bash
# Chrome DevTools → Network tab
# Filter by "Firebase"
# Check "Timing" column for slow requests
```

**If slow**: Increase RTDB throttle or check Firebase region

---

### Check 2: CPU Usage
```bash
# Chrome DevTools → Performance tab
# Record during drag
# Check for long frames (>16ms)
```

**If high**: 
- Add `useMemo` to more computed values
- Reduce object count on canvas
- Check for unnecessary re-renders

---

### Check 3: Memory Leaks
```bash
# Chrome DevTools → Memory tab
# Take heap snapshot before/after drag
# Look for detached DOM nodes
```

**If leaking**: Check that RTDB subscriptions are properly cleaned up

---

### Check 4: React Dev Tools Profiler
```bash
# React DevTools → Profiler tab
# Record during drag
# Look for components rendering too frequently
```

**If frequent renders**: Add more `useMemo`, `useCallback`, or `React.memo`

---

## 🎯 Expected Performance After Fixes

### Optimal Performance Metrics:
- **60 FPS** for dragging user (instant local feedback)
- **10-12 FPS** for watching users (smooth real-time updates)
- **<50ms** latency for position updates
- **<30% CPU** usage during drag
- **~10 KB/sec** bandwidth during active drag

### Acceptable Performance Metrics:
- **30-60 FPS** for dragging user
- **8-10 FPS** for watching users (still appears smooth)
- **<100ms** latency
- **<50% CPU** usage
- **~15 KB/sec** bandwidth

### Poor Performance Indicators:
- **<30 FPS** for dragging user (noticeable lag)
- **<8 FPS** for watching users (choppy, stuttering)
- **>200ms** latency (feels disconnected)
- **>70% CPU** usage (browser struggles)
- **>50 KB/sec** bandwidth (too much data)

---

## 🚀 Quick Wins Ranking

1. **✅ Remove Firestore writes during drag** (Done - 82% improvement)
2. **✅ Increase RTDB throttle to 100ms** (Done - 23% improvement)
3. **✅ Memoize rectangle mapping** (Done - variable improvement)
4. **Consider**: Add Konva `perfectDrawEnabled={false}` (~10% improvement)
5. **Consider**: Increase throttle to 150ms if still laggy (~30% more improvement)
6. **Advanced**: Implement RAF for smoother interpolation (~20% improvement)

---

## 📝 Configuration Summary

Current optimal settings:
```javascript
// RTDB throttle
ACTIVE_OBJECT_THROTTLE = 100ms  // ~10 updates/sec

// Firestore writes
During drag: NONE (0 writes/sec)
On drag end: 1 final write

// Local updates
Instant (no throttle for immediate feedback)

// Rectangle mapping
Memoized (only recalculates when needed)
```

---

## 🎬 Testing Script

Run this to verify performance:

```javascript
// In browser console during drag
let writeCount = 0;
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0].includes('firebaseio.com')) {
    writeCount++;
    console.log(`RTDB writes: ${writeCount}`);
  }
  return originalFetch.apply(this, args);
};

// Drag for 1 second
// Expected: ~10 writes (not 73!)
```

---

## ⚠️ Important Notes

1. **Don't over-optimize**: Start with the critical fixes (already done)
2. **Test after each change**: Ensure no regressions
3. **Monitor Firebase costs**: Fewer writes = lower costs
4. **Balance UX vs performance**: Some lag is acceptable vs poor UX

---

## 🎯 Success Criteria

Performance is acceptable when:
- ✅ Dragging user feels instant response (<16ms lag)
- ✅ Watching users see smooth motion (8+ FPS)
- ✅ No visible stuttering or jank
- ✅ CPU usage stays reasonable (<50%)
- ✅ No console errors or warnings
- ✅ Firebase costs remain low (<100 writes/min worst case)

---

## 🔄 Next Steps

1. **Test the current changes** (should be MUCH better)
2. **If still laggy**: Try Option A (increase throttle to 150ms)
3. **If still laggy**: Try Option E (Konva optimization)
4. **If still laggy**: Consider hardware/network issues

---

## 💡 Pro Tips

1. **Test on slower networks**: Use Chrome DevTools throttling
2. **Test with multiple users**: 3-5 concurrent drag operations
3. **Monitor Firebase Console**: Watch real-time database usage
4. **Profile in production mode**: Dev mode has extra overhead
5. **Consider user's hardware**: Older devices will be slower

---

**Status**: Critical optimizations applied. Should see **significant improvement** immediately.

Test now and report back if still experiencing lag!

