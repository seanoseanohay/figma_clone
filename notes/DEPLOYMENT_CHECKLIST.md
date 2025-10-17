# Deployment Checklist - Smooth Object Movement

## ⚠️ IMPORTANT: Deploy in This Order

### Step 1: Deploy Firebase Realtime Database Rules
```bash
firebase deploy --only database
```

**Why first?** The app will try to write to RTDB as soon as you start testing. Rules must be deployed before testing.

**Verify**: Check Firebase Console → Realtime Database → Rules tab

---

### Step 2: Test Locally (Before Deploying Code)

#### Quick Test (2 minutes):
1. Open browser window 1 → Sign in → Create a canvas
2. Open incognito window 2 → Sign in (different user) → Navigate to same canvas
3. Window 1: Create rectangle → Drag it around
4. Window 2: **Should see smooth real-time movement** ✅

#### If Movement is Smooth:
✅ Proceed to Step 3

#### If Not Working:
1. Check browser console for errors
2. Verify RTDB rules deployed correctly
3. Check `/canvases/{canvasId}/activeObjects` in Firebase Console
4. Review `SMOOTH_OBJECT_MOVEMENT_IMPLEMENTATION.md` troubleshooting section

---

### Step 3: Build and Deploy to Vercel (Optional)

Only after confirming local tests pass:

```bash
npm run build
# Deploy to Vercel via your normal process
```

---

## Quick Verification Script

```bash
# 1. Deploy RTDB rules
firebase deploy --only database

# 2. Start dev server
npm run dev

# 3. Open in browser
# - Main window: http://localhost:5173
# - Incognito: http://localhost:5173

# 4. Test drag movement between windows
```

---

## Expected Behavior

### ✅ Success Indicators:
- Object moves smoothly (no stuttering)
- ~13 position updates/second visible in Network tab
- No console errors
- Object stops at correct final position
- RTDB entry removed after drag ends

### ❌ Failure Indicators:
- Permission denied errors in console
- Object doesn't move for other user
- Choppy/stuttering movement
- Active objects not cleaning up

---

## Rollback Plan (If Issues Found)

```bash
# 1. Revert RTDB rules (comment out activeObjects section)
firebase deploy --only database

# 2. Revert code changes
git checkout HEAD~1 src/services/canvas.service.js
git checkout HEAD~1 src/components/canvas/Canvas.jsx

# 3. Redeploy
npm run build
```

---

## Post-Deployment Monitoring

### First 24 Hours:
- [ ] Monitor Firebase Console → Realtime Database → Usage
- [ ] Check for RTDB permission errors in error logs
- [ ] Verify costs are within expected range (~13 writes/sec per drag)
- [ ] Test with 3+ concurrent users dragging

### First Week:
- [ ] Gather user feedback on smoothness
- [ ] Monitor Firebase costs (should be minimal)
- [ ] Check for orphaned activeObjects entries
- [ ] Performance test with 10+ concurrent users

---

## Testing Requirements (From User Rules)

### ⚠️ Canvas Page Testing Required
After deployment, you MUST verify:

1. ✅ Canvas page still renders correctly
2. ✅ All interactive elements work (click, drag, etc.)
3. ✅ Test any animations or visual effects
4. ✅ Confirm no console errors appear

**Changes that could affect canvas**:
- ✅ Canvas-related components (Canvas.jsx)
- ✅ Shared utilities used by canvas (canvas.service.js)
- ✅ State management affecting canvas (activeObjects state)
- ✅ Styling that might impact canvas (none in this change)

### Testing Confirmation Template:
```
✅ Canvas page renders correctly
✅ Click interactions work (select tool, select objects)
✅ Drag interactions work (move tool, smooth movement)
✅ Visual effects work (object locking, color indicators)
✅ No console errors
✅ Real-time movement is smooth across users
```

---

## Quick Start (TL;DR)

```bash
# 1. Deploy RTDB rules
firebase deploy --only database

# 2. Test with 2 browser windows
npm run dev

# 3. Verify smooth drag movement between windows

# 4. If working, deploy to production
npm run build
```

That's it! 🚀

