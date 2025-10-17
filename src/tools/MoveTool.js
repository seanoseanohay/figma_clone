import { 
  lockObject, 
  unlockObject,
  updateActiveObjectPosition,
  updateObjectPosition,
  clearActiveObject
} from '../services/canvas.service.js'

/**
 * MoveTool - Handles object movement/dragging
 */
export class MoveTool {
  constructor() {
    this.DRAG_THRESHOLD = 5
  }

  /**
   * Handle mouse down - select and lock object
   */
  async onMouseDown(e, state, helpers) {
    const { pos, canvasId } = helpers
    const { 
      findRectAt, 
      canEditObject, 
      moveSelectedId,
      setMoveSelectedId, 
      setMouseDownPos, 
      setIsDragThresholdExceeded,
      setMoveOriginalPos
    } = state

    // Click empty space = deselect
    const clickedRect = findRectAt(pos)
    if (!clickedRect) {
      if (moveSelectedId) {
        try {
          await unlockObject(moveSelectedId)
          console.log('Move tool: Deselected and unlocked object')
        } catch (error) {
          console.error('Failed to unlock on deselect:', error)
        }
      }
      setMoveSelectedId(null)
      return
    }

    // Check if we can edit this object
    if (!canEditObject(clickedRect.id)) {
      console.log('Cannot select - object is locked by another user')
      return
    }

    // Select object for potential movement
    setMoveSelectedId(clickedRect.id)
    setMouseDownPos(pos)
    setIsDragThresholdExceeded(false)
    setMoveOriginalPos({ x: clickedRect.x, y: clickedRect.y })

    // Lock the object to prevent others from grabbing it
    try {
      await lockObject(clickedRect.id)
      console.log('Move tool: Object locked for potential movement')
    } catch (error) {
      console.error('Failed to lock object:', error)
    }
  }

  /**
   * Handle mouse move - drag object with threshold detection
   */
  onMouseMove(e, state, helpers) {
    const { pos, canvasId } = helpers
    const {
      moveSelectedId,
      mouseDownPos,
      isDragThresholdExceeded,
      isMoving,
      moveStartPos,
      moveOriginalPos,
      canvasObjects,
      doWeOwnObject,
      clampRectToCanvas,
      setIsDragThresholdExceeded,
      setIsMoving,
      setMoveStartPos,
      setLocalRectUpdates
    } = state

    if (!moveSelectedId || !mouseDownPos) return

    // Check if we should start dragging (threshold detection)
    if (!isDragThresholdExceeded) {
      const distance = Math.sqrt(
        Math.pow(pos.x - mouseDownPos.x, 2) + 
        Math.pow(pos.y - mouseDownPos.y, 2)
      )

      if (distance > this.DRAG_THRESHOLD) {
        console.log('Move: Drag threshold exceeded, starting movement')
        setIsDragThresholdExceeded(true)
        setIsMoving(true)
        setMoveStartPos(mouseDownPos)
      }
    }

    // If we're now moving, handle the movement
    if (isDragThresholdExceeded && isMoving && moveStartPos && moveOriginalPos) {
      // Calculate delta from where we started dragging
      const deltaX = pos.x - moveStartPos.x
      const deltaY = pos.y - moveStartPos.y

      // Find the actual rectangle to get its dimensions
      const originalRect = canvasObjects.find(r => r.id === moveSelectedId && r.type === 'rectangle')
      if (originalRect) {
        // Apply delta to original position (prevents accumulation)
        const newRect = {
          ...originalRect,
          x: moveOriginalPos.x + deltaX,
          y: moveOriginalPos.y + deltaY
        }

        // Apply boundary constraints
        const clampedRect = clampRectToCanvas(newRect)

        // Apply local visual update for immediate feedback
        setLocalRectUpdates(prev => ({
          ...prev,
          [moveSelectedId]: clampedRect
        }))

        // Send updates if we own this object
        if (doWeOwnObject(moveSelectedId)) {
          // ONLY update RTDB during drag for real-time broadcasting (throttled to 75ms)
          // Firestore writes happen ONLY on drag end to avoid excessive database load
          updateActiveObjectPosition(canvasId, moveSelectedId, {
            x: clampedRect.x,
            y: clampedRect.y,
            width: clampedRect.width,
            height: clampedRect.height
          })
        }
      }
    }
  }

  /**
   * Handle mouse up - finalize position and unlock
   */
  async onMouseUp(e, state, helpers) {
    const { canvasId } = helpers
    const {
      isMoving,
      moveSelectedId,
      localRectUpdates,
      doWeOwnObject,
      setIsMoving,
      setMoveStartPos,
      setMouseDownPos,
      setIsDragThresholdExceeded,
      setMoveOriginalPos,
      setLocalRectUpdates
    } = state

    if (isMoving && moveSelectedId && localRectUpdates[moveSelectedId] && doWeOwnObject(moveSelectedId)) {
      const finalRect = localRectUpdates[moveSelectedId]
      try {
        console.log('Move: Final position sync and unlock')

        // Clear active object from RTDB (remove real-time tracking)
        await clearActiveObject(canvasId, moveSelectedId)

        // Final Firestore update with unlock
        await updateObjectPosition(moveSelectedId, {
          x: finalRect.x,
          y: finalRect.y
        }, true) // true = final update, unlocks object

        console.log('Move: Rectangle position synced and unlocked')
      } catch (error) {
        console.error('Failed to sync rectangle position:', error)
        try {
          await clearActiveObject(canvasId, moveSelectedId)
          await unlockObject(moveSelectedId)
        } catch (unlockError) {
          console.error('Failed to unlock object:', unlockError)
        }
      }
    } else if (moveSelectedId && !isMoving) {
      // Just a click without drag - keep object locked since it's selected
      // Don't unlock here since user might want to start moving it
      console.log('Move: Click only - keeping object selected and locked')
    }

    // Reset movement states
    setIsMoving(false)
    setMoveStartPos(null)
    setMouseDownPos(null)
    setIsDragThresholdExceeded(false)
    setMoveOriginalPos(null)

    // Clear local updates after sync
    if (moveSelectedId) {
      setLocalRectUpdates(prev => {
        const updated = { ...prev }
        delete updated[moveSelectedId]
        return updated
      })
    }
  }

  /**
   * Get cursor style for this tool
   */
  getCursor() {
    return 'default'
  }
}

export default MoveTool




