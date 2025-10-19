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
    this.isDragging = false // internal immediate flag
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
      // Small async delay to ensure previous cleanup and state updates settle
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    // Auto-select logic: handle object selection
    const clickedObject = findObjectAt(pos)
    
    // Check if clicking inside existing multi-selection (skip auto-select to prevent initiator switch lag)
    const clickingInsideExistingMulti =
      !!clickedObject &&
      multiSelection &&
      multiSelection.selectionInfo &&
      multiSelection.selectionInfo.isMulti &&
      typeof multiSelection.selectionInfo.has === 'function' &&
      multiSelection.selectionInfo.has(clickedObject.id)
    
    // Handle auto-selection if no object selected or different object clicked
    // BUT skip if clicking inside existing multi-selection to prevent lag
    if (!clickingInsideExistingMulti && (!selectedObjectId || (clickedObject && clickedObject.id !== selectedObjectId))) {
      if (clickedObject && canEditObject(clickedObject.id)) {
        console.log('👆 Move tool: Auto-selecting object', clickedObject.id)
        
        // Unlock previous selection in background
        if (selectedObjectId) {
          unlockObject(selectedObjectId).catch(err =>
            console.error('Failed to unlock previous object:', err)
          )
        }
        
        // CRITICAL: Clear multi-selection when auto-selecting a single object
        // This prevents moving wrong objects when switching from multi-selection to single
        if (multiSelection && multiSelection.clearSelection) {
          await multiSelection.clearSelection()
        }
        
        // Immediately select the new object
        setSelectedObjectId(clickedObject.id)
        
        // Fire lock call asynchronously (don't block UI)
        lockObject(clickedObject.id)
          .then(() => console.log('✅ Object auto-selected and locked (async)'))
          .catch(err => console.error('Failed to lock auto-selected object:', err))
      } else if (!clickedObject) {
        // Clicked empty space - deselect and clear selection
        if (selectedObjectId) {
          // Unlock in background and immediately clear selection
          unlockObject(selectedObjectId).catch(err =>
            console.error('Failed to unlock on deselect:', err)
          )
          setSelectedObjectId(null)
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
    } else {
      // Use the clicked object if we just auto-selected it, otherwise fall back to selectedObjectId
      // This prevents React state timing issues where selectedObjectId is still the old value
      const targetObjectId = (clickedObject && !clickingInsideExistingMulti) ? clickedObject.id : selectedObjectId
      if (targetObjectId) {
        const targetObject = canvasObjects.find(o => o.id === targetObjectId)
        if (targetObject && canEditObject(targetObject.id)) {
          objectsToMove = [targetObject]
        }
        console.log('👤 Move tool: Single object movement for:', targetObjectId)
      }
    }

    if (objectsToMove.length === 0) {
      console.warn('❌ No valid objects found for movement')
      return
    }

    // Clear previous frame ghosting before starting a fresh session
    setLocalRectUpdates({})

    // Reset dragging flag before creating new interaction
    this.isDragging = false

    // Create MoveInteraction with proper boundary constraint functions
    this.moveInteraction = new MoveInteraction(
      objectsToMove, 
      pos,
      (localUpdates) => {
        // Overwrite to avoid lingering entries for non-moving IDs
        setLocalRectUpdates(localUpdates || {})
        this.isDragging = true // immediate flag, not delayed React state
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
    const { setIsMoving, setLocalRectUpdates } = state

    const interaction = this.moveInteraction
    if (!interaction) {
      console.log('Move: no active interaction, likely a click.')
      return
    }

    if (!this.isDragging) {
      // Click without drag, keep selection, cancel interaction safely
      console.log('Move: click only, cancelling interaction')
      interaction.cancel()
      this.moveInteraction = null
      setIsMoving(false)
      return
    }

    console.log('🖱️ MouseUp: finishing move for', interaction.selectedShapes.length, 'objects')

    try {
      // Prevent double-clean before end finishes
      await interaction.end(recordAction)
      console.log('✅ Move finalized properly')
    } catch (err) {
      console.error('❌ Move finalize failed:', err)
    }

    // Always reset cleanly
    setLocalRectUpdates({})
    setIsMoving(false)
    this.isDragging = false
    this.moveInteraction = null

    console.log('🧹 Cleanup complete, ready for next drag')
  }

  /**
   * Get cursor style for this tool
   */
  getCursor() {
    return 'default'
  }
}

export default MoveTool





