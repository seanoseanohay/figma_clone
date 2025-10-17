import { 
  updateActiveObjectPosition,
  updateObjectPosition,
  clearActiveObject
} from '../services/canvas.service.js'

/**
 * MoveTool - Handles object movement/dragging for PRE-SELECTED objects
 * 
 * NOTE: This tool NO LONGER handles selection. Use SelectTool to select objects first.
 * MoveTool only moves objects that are already selected.
 */
export class MoveTool {
  constructor() {
    this.DRAG_THRESHOLD = 5
  }

  /**
   * Handle mouse down - start moving if clicked object is already selected
   */
  async onMouseDown(e, state, helpers) {
    const { pos, canvasId } = helpers
    const { 
      selectedObjectId,
      findObjectAt,
      setMouseDownPos, 
      setIsDragThresholdExceeded,
      setMoveOriginalPos,
      canvasObjects
    } = state

    // Move tool requires a pre-selected object
    if (!selectedObjectId) {
      console.log('Move tool: No object selected. Use Select tool first.')
      return
    }

    // Check if clicked object is the selected one
    const clickedObject = findObjectAt(pos)
    if (!clickedObject || clickedObject.id !== selectedObjectId) {
      console.log('Move tool: Clicked object is not the selected object')
      return
    }

    // Find the full object data
    const fullObject = canvasObjects.find(o => o.id === selectedObjectId)
    if (!fullObject) {
      console.log('Move tool: Selected object not found')
      return
    }

    // Setup for potential movement
    setMouseDownPos(pos)
    setIsDragThresholdExceeded(false)
    setMoveOriginalPos({ x: fullObject.x, y: fullObject.y })

    console.log('Move tool: Ready to move selected object')
  }

  /**
   * Handle mouse move - drag the pre-selected object with threshold detection
   */
  onMouseMove(e, state, helpers) {
    const { pos, canvasId } = helpers
    const {
      selectedObjectId,
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

    if (!selectedObjectId || !mouseDownPos) return

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

      // Find the object being moved (could be rectangle or circle)
      const originalObject = canvasObjects.find(o => o.id === selectedObjectId)
      if (originalObject) {
        // Apply delta to original position (prevents accumulation)
        const newObject = {
          ...originalObject,
          x: moveOriginalPos.x + deltaX,
          y: moveOriginalPos.y + deltaY
        }

        // Apply boundary constraints based on shape type
        let clampedObject
        if (originalObject.type === 'circle') {
          clampedObject = state.clampCircleToCanvas(newObject)
        } else if (originalObject.type === 'rectangle') {
          clampedObject = clampRectToCanvas(newObject)
        } else {
          clampedObject = newObject // Default: no clamping
        }

        // Apply local visual update for immediate feedback
        setLocalRectUpdates(prev => ({
          ...prev,
          [selectedObjectId]: clampedObject
        }))

        // Send updates if we own this object
        if (doWeOwnObject(selectedObjectId)) {
          // ONLY update RTDB during drag for real-time broadcasting (throttled to 75ms)
          // Firestore writes happen ONLY on drag end to avoid excessive database load
          const rtdbData = {
            x: clampedObject.x,
            y: clampedObject.y
          }
          
          // Add shape-specific properties
          if (originalObject.type === 'rectangle') {
            rtdbData.width = clampedObject.width
            rtdbData.height = clampedObject.height
          } else if (originalObject.type === 'circle') {
            rtdbData.radius = clampedObject.radius
          }
          
          updateActiveObjectPosition(canvasId, selectedObjectId, rtdbData)
        }
      }
    }
  }

  /**
   * Handle mouse up - finalize position (object stays selected and locked)
   */
  async onMouseUp(e, state, helpers) {
    const { canvasId } = helpers
    const {
      isMoving,
      selectedObjectId,
      localRectUpdates,
      doWeOwnObject,
      setIsMoving,
      setMoveStartPos,
      setMouseDownPos,
      setIsDragThresholdExceeded,
      setMoveOriginalPos,
      setLocalRectUpdates
    } = state

    if (isMoving && selectedObjectId && localRectUpdates[selectedObjectId] && doWeOwnObject(selectedObjectId)) {
      const finalRect = localRectUpdates[selectedObjectId]
      try {
        console.log('Move: Final position sync (keeping object locked)')

        // Clear active object from RTDB (remove real-time tracking)
        await clearActiveObject(canvasId, selectedObjectId)

        // Final Firestore update WITHOUT unlock (false = keep locked for continued editing)
        await updateObjectPosition(selectedObjectId, {
          x: finalRect.x,
          y: finalRect.y
        }, false) // false = keep locked since object is still selected

        console.log('Move: Object position synced, staying selected')
      } catch (error) {
        console.error('Failed to sync object position:', error)
        try {
          await clearActiveObject(canvasId, selectedObjectId)
        } catch (clearError) {
          console.error('Failed to clear active object:', clearError)
        }
      }
    } else if (selectedObjectId && !isMoving) {
      // Just a click without drag - object stays selected
      console.log('Move: Click only - object stays selected')
    }

    // Reset movement states
    setIsMoving(false)
    setMoveStartPos(null)
    setMouseDownPos(null)
    setIsDragThresholdExceeded(false)
    setMoveOriginalPos(null)

    // Clear local updates after sync
    if (selectedObjectId) {
      setLocalRectUpdates(prev => {
        const updated = { ...prev }
        delete updated[selectedObjectId]
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





