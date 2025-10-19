import { 
  updateActiveObjectPosition,
  updateObjectPosition,
  updateObject,
  clearActiveObject
} from '../services/canvas.service.js'
import { ACTION_TYPES } from '../hooks/useHistory.js'

/**
 * MoveTool - Handles object movement/dragging for PRE-SELECTED objects
 * 
 * Supports both single and multi-object selection:
 * - Single selection: Moves the selected object
 * - Multi-selection: Moves all selected objects together as a group
 * 
 * NOTE: This tool NO LONGER handles selection. Use SelectTool to select objects first.
 * MoveTool only moves objects that are already selected.
 */
export class MoveTool {
  constructor() {
    this.DRAG_THRESHOLD = 5
    this.groupOriginalPositions = {} // Store original positions for group movement
  }

  /**
   * Handle mouse down - start moving if clicked object is part of selection
   */
  async onMouseDown(e, state, helpers) {
    const { pos, canvasId } = helpers
    const { 
      selectedObjectId,
      findObjectAt,
      setMouseDownPos, 
      setIsDragThresholdExceeded,
      setMoveOriginalPos,
      canvasObjects,
      multiSelection
    } = state

    // Move tool requires a pre-selected object
    if (!selectedObjectId) {
      console.log('Move tool: No object selected. Use Select tool first.')
      return
    }

    // Check if clicked object is part of the selection (single or multi)
    const clickedObject = findObjectAt(pos)
    if (!clickedObject || !multiSelection.isSelected(clickedObject.id)) {
      console.log('Move tool: Clicked object is not in the selection')
      return
    }

    // Store original positions for ALL selected objects
    this.groupOriginalPositions = {}
    multiSelection.selectedIdsArray.forEach(id => {
      const obj = canvasObjects.find(o => o.id === id)
      if (obj) {
        this.groupOriginalPositions[id] = { x: obj.x, y: obj.y }
      }
    })

    // Setup for potential movement
    setMouseDownPos(pos)
    setIsDragThresholdExceeded(false)
    
    // Store primary object's position for backward compatibility
    const primaryObject = canvasObjects.find(o => o.id === selectedObjectId)
    if (primaryObject) {
      setMoveOriginalPos({ x: primaryObject.x, y: primaryObject.y })
    }

    const count = multiSelection.selectedCount
    console.log(`Move tool: Ready to move ${count} object(s)`)
  }

  /**
   * Handle mouse move - drag the selected object(s) with threshold detection
   * Supports group movement for multi-selection
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
      setLocalRectUpdates,
      multiSelection
    } = state

    if (!selectedObjectId || !mouseDownPos) return

    // Check if we should start dragging (threshold detection)
    if (!isDragThresholdExceeded) {
      const distance = Math.sqrt(
        Math.pow(pos.x - mouseDownPos.x, 2) + 
        Math.pow(pos.y - mouseDownPos.y, 2)
      )

      if (distance > this.DRAG_THRESHOLD) {
        const count = multiSelection.selectedCount
        console.log(`Move: Drag threshold exceeded, starting movement of ${count} object(s)`)
        setIsDragThresholdExceeded(true)
        setIsMoving(true)
        setMoveStartPos(mouseDownPos)
      }
    }

    // If we're now moving, handle the movement
    if (isDragThresholdExceeded && isMoving && moveStartPos) {
      // Calculate delta from where we started dragging
      const deltaX = pos.x - moveStartPos.x
      const deltaY = pos.y - moveStartPos.y

      // Move ALL selected objects with the same delta
      const updatedObjects = {}
      
      multiSelection.selectedIdsArray.forEach(objectId => {
        const originalObject = canvasObjects.find(o => o.id === objectId)
        const originalPos = this.groupOriginalPositions[objectId]
        
        if (originalObject && originalPos) {
          // Apply delta to original position (prevents accumulation)
          const newObject = {
            ...originalObject,
            x: originalPos.x + deltaX,
            y: originalPos.y + deltaY
          }

          // Apply boundary constraints based on shape type
          let clampedObject
          if (originalObject.type === 'circle') {
            clampedObject = state.clampCircleToCanvas(newObject)
          } else if (originalObject.type === 'star') {
            clampedObject = state.clampStarToCanvas(newObject)
          } else if (originalObject.type === 'rectangle') {
            clampedObject = clampRectToCanvas(newObject)
          } else if (originalObject.type === 'text') {
            // Text: simple position clamping
            clampedObject = {
              ...newObject,
              x: Math.max(0, Math.min(newObject.x, 2000 - (newObject.width || 200))),
              y: Math.max(0, Math.min(newObject.y, 2000 - (newObject.height || 50)))
            }
          } else {
            clampedObject = newObject // Default: no clamping
          }

          updatedObjects[objectId] = clampedObject

          // Send RTDB updates if we own this object
          if (doWeOwnObject(objectId)) {
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
            } else if (originalObject.type === 'star') {
              rtdbData.innerRadius = clampedObject.innerRadius
              rtdbData.outerRadius = clampedObject.outerRadius
            } else if (originalObject.type === 'text') {
              rtdbData.width = clampedObject.width
              rtdbData.height = clampedObject.height
            }
            
            updateActiveObjectPosition(canvasId, objectId, rtdbData)
          }
        }
      })

      // Apply local visual updates for immediate feedback
      setLocalRectUpdates(prev => ({
        ...prev,
        ...updatedObjects
      }))
    }
  }

  /**
   * Handle mouse up - finalize position(s) for all moved objects
   * Supports both single and multi-object movement
   */
  async onMouseUp(e, state, helpers) {
    const { canvasId, recordAction } = helpers
    const {
      isMoving,
      selectedObjectId,
      localRectUpdates,
      moveOriginalPos,
      doWeOwnObject,
      canvasObjects,
      setIsMoving,
      setMoveStartPos,
      setMouseDownPos,
      setIsDragThresholdExceeded,
      setMoveOriginalPos,
      setLocalRectUpdates,
      multiSelection
    } = state

    if (isMoving && multiSelection.selectedCount > 0) {
      try {
        console.log(`Move: Final position sync for ${multiSelection.selectedCount} object(s)`)

        // Process all selected objects in parallel
        const updatePromises = multiSelection.selectedIdsArray.map(async (objectId) => {
          if (!localRectUpdates[objectId] || !doWeOwnObject(objectId)) {
            return // Skip objects we don't own or didn't move
          }

          const finalPosition = localRectUpdates[objectId]
          const originalPos = this.groupOriginalPositions[objectId]
          const fullObject = canvasObjects.find(o => o.id === objectId)
          const objectType = fullObject ? fullObject.type : 'Object'

          try {
            // Clear active object from RTDB (remove real-time tracking)
            await clearActiveObject(canvasId, objectId)

            // Final Firestore update with undo/redo support
            await updateObject(
              objectId, 
              {
                x: finalPosition.x,
                y: finalPosition.y
              },
              recordAction, // Pass recordAction callback
              {
                actionType: ACTION_TYPES.MOVE_OBJECT,
                before: { x: originalPos?.x || 0, y: originalPos?.y || 0 },
                objectType: objectType.charAt(0).toUpperCase() + objectType.slice(1)
              }
            )

            console.log(`Move: Object ${objectId} position synced`)
          } catch (error) {
            console.error(`Failed to sync object ${objectId} position:`, error)
            try {
              await clearActiveObject(canvasId, objectId)
            } catch (clearError) {
              console.error(`Failed to clear active object ${objectId}:`, clearError)
            }
          }
        })

        // Wait for all updates to complete
        await Promise.all(updatePromises)
        console.log('Move: All object positions synced, staying selected')
      } catch (error) {
        console.error('Failed to sync group movement:', error)
      }
    } else if (selectedObjectId && !isMoving) {
      // Just a click without drag - objects stay selected
      console.log('Move: Click only - objects stay selected')
    }

    // Reset movement states
    setIsMoving(false)
    setMoveStartPos(null)
    setMouseDownPos(null)
    setIsDragThresholdExceeded(false)
    setMoveOriginalPos(null)
    this.groupOriginalPositions = {} // Clear group positions

    // Clear local updates for all moved objects
    if (multiSelection.selectedCount > 0) {
      setLocalRectUpdates(prev => {
        const updated = { ...prev }
        multiSelection.selectedIdsArray.forEach(id => {
          delete updated[id]
        })
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





