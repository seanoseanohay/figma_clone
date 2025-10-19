import MoveInteraction from './MoveInteraction.js'
import { lockObject, unlockObject } from '../services/canvas.service.js'

/**
 * MoveTool - Handles object movement/dragging with auto-selection and multi-selection support
 * 
 * Interaction Model:
 * - Auto-selects objects when clicked (if none selected or different object clicked)
 * - Supports multi-selection movement when multiple objects are selected
 * - Maintains selection after movement for consecutive operations
 * - Single-click selects, drag moves immediately
 * - Multi-selection: moves all selected objects as a group maintaining relative positions
 * 
 * Uses MoveInteraction class for centralized, deterministic movement logic
 */
export class MoveTool {
  constructor() {
    // Current move interaction instance (null when not moving)
    this.moveInteraction = null
  }

  /**
   * Handle mouse down - start moving object (auto-selects if needed)
   * Supports both single and multi-selection movement using MoveInteraction
   */
  async onMouseDown(e, state, helpers) {
    const { pos, canvasId } = helpers
    const { 
      selectedObjectId,
      findObjectAt,
      canEditObject,
      setSelectedObjectId,
      canvasObjects,
      setIsMoving,
      multiSelection,
      clampRectToCanvas,
      clampCircleToCanvas, 
      clampStarToCanvas,
      setLocalRectUpdates
    } = state

    // Clear any existing move interaction
    if (this.moveInteraction) {
      this.moveInteraction.cancel()
      this.moveInteraction = null
    }

    // Auto-select logic: handle object selection
    const clickedObject = findObjectAt(pos)
    
    // Handle auto-selection if no object selected or different object clicked
    if (!selectedObjectId || (clickedObject && clickedObject.id !== selectedObjectId)) {
      if (clickedObject && canEditObject(clickedObject.id)) {
        console.log('👆 Move tool: Auto-selecting object', clickedObject.id)
        
        // Unlock previous selection if exists
        if (selectedObjectId) {
          try {
            await unlockObject(selectedObjectId)
          } catch (error) {
            console.error('Failed to unlock previous object:', error)
          }
        }
        
        // Select and lock the new object
        setSelectedObjectId(clickedObject.id)
        
        try {
          await lockObject(clickedObject.id)
          console.log('✅ Object auto-selected and locked for moving')
        } catch (error) {
          console.error('Failed to lock auto-selected object:', error)
          return
        }
      } else if (!clickedObject) {
        // Clicked empty space - deselect and clear selection
        if (selectedObjectId) {
          try {
            await unlockObject(selectedObjectId)
            setSelectedObjectId(null)
          } catch (error) {
            console.error('Failed to unlock on deselect:', error)
          }
        }
        await multiSelection.clearSelection()
        return
      } else {
        console.log('Move tool: No object clicked or cannot edit clicked object')
        return
      }
    }

    // Determine which objects to move based on selection state
    let objectsToMove = []
    
    // Check multi-selection state
    const hasMultiSelection = multiSelection && multiSelection.selectionInfo.isMulti
    const hasSingleSelection = multiSelection && multiSelection.selectionInfo.isSingle
    
    if (hasMultiSelection) {
      // Multi-selection: move all selected objects as a group
      const selectedIds = Array.from(multiSelection.selectionInfo.all)
      objectsToMove = canvasObjects.filter(obj => 
        selectedIds.includes(obj.id) && canEditObject(obj.id)
      )
      console.log('👥 Move tool: Multi-selection movement for', objectsToMove.length, 'objects')
    } else if (hasSingleSelection) {
      // Single selection from multi-selection hook
      const primaryId = multiSelection.selectionInfo.primaryId
      const primaryObject = canvasObjects.find(o => o.id === primaryId)
      if (primaryObject && canEditObject(primaryObject.id)) {
        objectsToMove = [primaryObject]
      }
      console.log('👤 Move tool: Single selection movement for object:', primaryId)
    } else if (selectedObjectId) {
      // Legacy single selection
      const selectedObject = canvasObjects.find(o => o.id === selectedObjectId)
      if (selectedObject && canEditObject(selectedObject.id)) {
        objectsToMove = [selectedObject]
      }
      console.log('👤 Move tool: Legacy single selection movement for object:', selectedObjectId)
    }

    if (objectsToMove.length === 0) {
      console.warn('❌ No valid objects found for movement')
      return
    }

    // Create MoveInteraction with proper boundary constraint functions
    this.moveInteraction = new MoveInteraction(
      objectsToMove, 
      pos,
      (localUpdates) => {
        // Update local state for immediate visual feedback
        setLocalRectUpdates(prev => ({
          ...prev,
          ...localUpdates
        }))
        setIsMoving(true)
      },
      {
        canvasId,
        canEditObject,
        clampRectToCanvas,
        clampCircleToCanvas,
        clampStarToCanvas
      }
    )

    console.log('✅ MoveInteraction created and ready to move', objectsToMove.length, 'objects')
  }

  /**
   * Handle mouse move - drag selected objects using MoveInteraction
   */
  onMouseMove(e, state, helpers) {
    const { pos } = helpers

    // Delegate to MoveInteraction if active
    if (this.moveInteraction) {
      this.moveInteraction.move(pos)
    }
  }

  /**
   * Handle mouse up - finalize position using MoveInteraction
   */
  async onMouseUp(e, state, helpers) {
    const { recordAction } = helpers
    const {
      isMoving,
      setIsMoving,
      setLocalRectUpdates
    } = state

    if (!this.moveInteraction) {
      // No active move interaction - just a click
      console.log('Move: Click only - objects stay selected')
      return
    }

    if (!isMoving) {
      // Just a click without drag - clean up interaction but keep selection
      console.log('Move: Click without drag - cleaning up interaction')
      this.moveInteraction = null
      return
    }

    try {
      // Finalize the move operation with undo/redo support
      await this.moveInteraction.end(recordAction)
      console.log('✅ Move interaction completed successfully')
      
      // Clear local updates for all moved objects
      const movedObjectIds = Object.keys(this.moveInteraction.getLocalUpdates())
      setLocalRectUpdates(prev => {
        const updated = { ...prev }
        movedObjectIds.forEach(id => {
          delete updated[id]
        })
        return updated
      })
      
    } catch (error) {
      console.error('❌ Failed to finalize move interaction:', error)
      // MoveInteraction handles its own cleanup on error
    }

    // Clean up interaction and movement state
    this.moveInteraction = null
    setIsMoving(false)
    
    console.log('🧹 Move interaction cleaned up, objects remain selected and locked')
  }

  /**
   * Get cursor style for this tool
   */
  getCursor() {
    return 'default'
  }
}

export default MoveTool





