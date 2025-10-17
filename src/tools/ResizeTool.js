import { auth } from '../services/firebase.js'
import { 
  lockObject, 
  unlockObject,
  updateActiveObjectPosition,
  updateObjectPosition,
  clearActiveObject
} from '../services/canvas.service.js'

/**
 * ResizeTool - Handles object resizing via corner handles
 */
export class ResizeTool {
  constructor() {
    this.minSize = 2
  }

  /**
   * Handle mouse down - select object or start resizing
   */
  async onMouseDown(e, state, helpers) {
    const { pos, canvasId } = helpers
    const {
      resizeSelectedId,
      rectangles,
      isResizing,
      findRectAt,
      canEditObject,
      getClosestCorner,
      setResizeSelectedId,
      setIsResizing,
      setResizeHandle,
      setResizeStartData
    } = state

    console.log('Resize tool mouse down')

    // FIRST: Check if we clicked on a resize handle of the currently selected rectangle
    // This must come BEFORE checking for empty space, because handles extend outside rectangle bounds
    if (resizeSelectedId) {
      const currentlySelected = rectangles.find(r => r.id === resizeSelectedId)
      if (currentlySelected) {
        console.log('=== RECTANGLE DATA DEBUG ===')
        console.log('Selected rectangle ID:', resizeSelectedId)
        console.log('Rectangle locked by:', currentlySelected.lockedBy)
        console.log('Current user:', auth.currentUser?.uid)
        console.log('=== END RECTANGLE DEBUG ===')

        const handle = getClosestCorner(pos, currentlySelected)
        console.log('Checking closest corner on currently selected rectangle:', handle)
        if (handle) {
          console.log('Starting resize on corner:', handle, 'for selected rectangle')

          // CRITICAL: Only start new resize if we're not already resizing
          if (!isResizing) {
            // Lock the object for consecutive resizes (skip for test data)
            if (!currentlySelected.id.match(/^[12]$/)) {
              try {
                await lockObject(resizeSelectedId)
                console.log('Re-locked object for consecutive resize')
              } catch (error) {
                console.error('Failed to lock object for consecutive resize:', error)
                return
              }
            }

            setIsResizing(true)
            setResizeHandle(handle)
            setResizeStartData({
              rect: { ...currentlySelected },
              startPos: pos
            })

            return // Handle click found - start resizing immediately
          } else {
            console.log('Already resizing - ignoring click to prevent jumping')
            return
          }
        }
      }
    }

    // SECOND: Check if we clicked on a rectangle (for selection)
    const resizeClickedRect = findRectAt(pos)
    console.log('Found rectangle:', resizeClickedRect ? resizeClickedRect.id : 'none')

    if (!resizeClickedRect) {
      // Click empty space = deselect
      if (resizeSelectedId) {
        try {
          await unlockObject(resizeSelectedId)
        } catch (error) {
          console.error('Failed to unlock on deselect:', error)
        }
      }
      setResizeSelectedId(null)
      return
    }

    // Check if we can edit this object
    if (!canEditObject(resizeClickedRect.id)) {
      console.log('Cannot select - object is locked by another user')
      return
    }

    // Select object for resizing and show handles
    console.log('Selecting rectangle for resize:', resizeClickedRect.id)
    setResizeSelectedId(resizeClickedRect.id)

    // Lock the object (skip for test data)
    if (!resizeClickedRect.id.match(/^[12]$/)) {
      try {
        await lockObject(resizeClickedRect.id)
      } catch (error) {
        console.error('Failed to lock object:', error)
      }
    }
  }

  /**
   * Handle mouse move - resize object
   */
  onMouseMove(e, state, helpers) {
    const { pos, canvasId } = helpers
    const {
      isResizing,
      resizeStartData,
      resizeHandle,
      resizeSelectedId,
      doWeOwnObject,
      clampRectToCanvas,
      handleCrossoverDetection,
      setResizeHandle,
      setLocalRectUpdates
    } = state

    if (!isResizing || !resizeStartData || !resizeHandle) return

    const { rect: startRect, startPos } = resizeStartData
    const deltaX = pos.x - startPos.x
    const deltaY = pos.y - startPos.y

    let newRect = { ...startRect }
    let currentHandle = resizeHandle

    // Apply resize transformation based on current handle
    switch (currentHandle) {
      case 'nw':
        newRect.x = startRect.x + deltaX
        newRect.y = startRect.y + deltaY
        newRect.width = startRect.width - deltaX
        newRect.height = startRect.height - deltaY
        break
      case 'ne':
        newRect.y = startRect.y + deltaY
        newRect.width = startRect.width + deltaX
        newRect.height = startRect.height - deltaY
        break
      case 'sw':
        newRect.x = startRect.x + deltaX
        newRect.width = startRect.width - deltaX
        newRect.height = startRect.height + deltaY
        break
      case 'se':
        newRect.width = startRect.width + deltaX
        newRect.height = startRect.height + deltaY
        break
    }

    // Check for crossover and handle coordinate flipping
    const crossoverResult = handleCrossoverDetection(pos, currentHandle, startRect)
    if (crossoverResult.flipped) {
      newRect = crossoverResult.rect

      // Update the resize handle if crossover occurred
      if (crossoverResult.handle !== currentHandle) {
        console.log(`🔄 Crossover detected: ${currentHandle} → ${crossoverResult.handle}`)
        setResizeHandle(crossoverResult.handle)
      }
    }

    // Enforce minimum size FIRST to prevent disappearing rectangles
    if (newRect.width < this.minSize) newRect.width = this.minSize
    if (newRect.height < this.minSize) newRect.height = this.minSize

    // Enforce boundary constraints
    newRect = clampRectToCanvas(newRect)

    // Apply local visual update for immediate feedback
    setLocalRectUpdates(prev => ({
      ...prev,
      [resizeSelectedId]: newRect
    }))

    // Send updates if we own this object (skip for test data)
    if (doWeOwnObject(resizeSelectedId) && !resizeSelectedId.match(/^[12]$/)) {
      // ONLY update RTDB during drag for real-time broadcasting (throttled to 75ms)
      // Firestore writes happen ONLY on drag end to avoid excessive database load
      updateActiveObjectPosition(canvasId, resizeSelectedId, {
        x: newRect.x,
        y: newRect.y,
        width: newRect.width,
        height: newRect.height
      })
    }
  }

  /**
   * Handle mouse up - finalize resize
   */
  async onMouseUp(e, state, helpers) {
    const { canvasId } = helpers
    const {
      isResizing,
      resizeSelectedId,
      localRectUpdates,
      doWeOwnObject,
      setIsResizing,
      setResizeHandle,
      setResizeStartData,
      setLocalRectUpdates
    } = state

    if (isResizing && resizeSelectedId && localRectUpdates[resizeSelectedId] && doWeOwnObject(resizeSelectedId)) {
      const finalRect = localRectUpdates[resizeSelectedId]
      try {
        console.log('Resize: Final resize sync and unlock')

        // Clear active object from RTDB (remove real-time tracking)
        await clearActiveObject(canvasId, resizeSelectedId)

        // Final Firestore update with unlock
        await updateObjectPosition(resizeSelectedId, {
          x: finalRect.x,
          y: finalRect.y,
          width: finalRect.width,
          height: finalRect.height
        }, true) // true = final update, unlocks object

        console.log('Resize: Rectangle resize synced and unlocked')
      } catch (error) {
        console.error('Failed to sync rectangle resize:', error)
        try {
          await clearActiveObject(canvasId, resizeSelectedId)
          await unlockObject(resizeSelectedId)
        } catch (unlockError) {
          console.error('Failed to unlock object:', unlockError)
        }
      }
    }

    // Reset resize states but keep object selected for consecutive resizes
    setIsResizing(false)
    setResizeHandle(null)
    setResizeStartData(null)

    // Don't clear resizeSelectedId - keep object selected for consecutive resizes
    // Only clear when user clicks elsewhere or switches tools

    // Clear local updates after sync
    if (resizeSelectedId) {
      setLocalRectUpdates(prev => {
        const updated = { ...prev }
        delete updated[resizeSelectedId]
        return updated
      })
    }
  }

  /**
   * Get cursor style for this tool
   */
  getCursor() {
    return 'nw-resize'
  }
}

export default ResizeTool




