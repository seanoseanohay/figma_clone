# RTDB Migration Verification

## ✅ Rules Deployed Successfully

The new canvas-scoped RTDB structure is now live.

---

## 🧹 Clean Up Old Data (Optional)

The old `/globalCanvas/` data won't interfere, but you can delete it:

1. Open Firebase Console → Realtime Database
2. Click on `globalCanvas` node
3. Click trash icon to delete
4. Confirm deletion

---

## 🧪 Test Real-Time Movement

### Step 1: Refresh Both Browser Windows
```bash
# Hard refresh to clear any cached code
# Mac: Cmd + Shift + R
# Windows: Ctrl + Shift + R
```

### Step 2: Check Console Logs
Open DevTools console in BOTH windows and look for:

**Expected messages:**
```
✅ "Cursor tracking initialized for canvas: {canvasId}"
✅ "Subscribed to canvas presence (canvas: {canvasId})"
✅ "Setting up active objects subscription for canvas: {canvasId}"
✅ "Subscribed to active objects (canvas: {canvasId})"
```

**Bad signs:**
```
❌ "Cannot update cursor: missing canvasId"
❌ "RTDB permission denied"
❌ Any errors mentioning "globalCanvas"
```

### Step 3: Test Drag Movement
1. **Window 1**: Drag a rectangle around
2. **Window 2**: Should see:
   - ✅ Rectangle moving smoothly in real-time (~10 updates/sec)
   - ✅ Orange border on locked object
   - ✅ 70% opacity while being dragged
   - ✅ Final position when released

### Step 4: Check Firebase Console
While Window 1 drags:

1. Open Firebase Console → Realtime Database
2. Navigate to: `/canvases/{your-canvas-id}/activeObjects`
3. Should see:
   ```
   /canvases
     /{canvasId}
       /activeObjects
         /{objectId}
           x: 1234
           y: 567
           width: 100
           height: 50
           isBeingDragged: true
           draggedBy: "userId123"
           lastUpdate: 1697567890123
   ```

4. When drag ends, the `activeObjects/{objectId}` entry should **disappear**

### Step 5: Verify Cursors Too
While testing, also verify:
- Both users see each other's cursors moving
- Cursors are in: `/canvases/{canvasId}/presence/{userId}`

---

## 🐛 If Still Not Working

### Check 1: Canvas ID in Console
Add this temporarily to Canvas.jsx (top of component):
```javascript
console.log('🔷 Current canvasId:', canvasId);
```

**Should see**: A valid ID like "abc123def456"
**Bad sign**: `null` or `undefined`

### Check 2: Network Tab
1. Open DevTools → Network tab
2. Filter: "firebaseio.com"
3. While dragging, should see:
   - WebSocket messages OR
   - Long-polling requests (~10 per second)

### Check 3: RTDB Rules
In Firebase Console → Realtime Database → Rules tab, verify:
```json
{
  "rules": {
    "canvases": {
      "$canvasId": {
        "presence": { ... },
        "activeObjects": { ... }
      }
    }
  }
}
```

---

## 🎯 Success Criteria

✅ Console shows all subscription messages
✅ Firebase Console shows data in `/canvases/{canvasId}/`
✅ Dragged rectangles move smoothly in real-time
✅ No teleporting or jumping
✅ Objects disappear from activeObjects on drag end
✅ Both users see each other's cursors

---

## 💡 Quick Debug

If you see the rectangle **teleporting** still:

**Symptom**: Object doesn't move, then suddenly appears at final position

**Cause**: RTDB updates not reaching Window 2

**Check**:
1. Console in Window 2 - any errors?
2. Firebase Console - is activeObjects updating?
3. Network tab - are WebSocket messages coming in?

---

**Next Step**: Refresh both windows and test!

