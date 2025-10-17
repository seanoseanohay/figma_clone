import { lockObject, unlockObject } from '../services/canvas.service.js'

/**
 * SelectTool - Handles object selection for collaborative editing
 * 
 * This tool is used to select shapes on the canvas. Once selected,
 * shapes can be modified using other tools (Move, Resize).
 * 
 * Key behaviors:
 * - Click on object to select it
 * - Click on empty space to deselect
 * - Locked objects (owned by others) cannot be selected
 * - Selection persists when switching to modification tools
 */
export class SelectTool {
  constructor() {
    this.name = 'select'
  }

  /**
   * Handle mouse down - select or deselect object
   */
  async onMouseDown(e, state, helpers) {
    const { pos, canvasId } = helpers
    const { 
      findObjectAt, 
      canEditObject,
      selectedObjectId,
      setSelectedObjectId
    } = state

    // Check if user clicked on an object
    const clickedObject = findObjectAt(pos)

    // Clicking empty space = deselect
    if (!clickedObject) {
      if (selectedObjectId) {
        try {
          await unlockObject(selectedObjectId)
          console.log('Select tool: Deselected and unlocked object')
        } catch (error) {
          console.error('Failed to unlock on deselect:', error)
        }
      }
      setSelectedObjectId(null)
      return
    }

    // If clicking the already-selected object, keep it selected
    if (clickedObject.id === selectedObjectId) {
      console.log('Select tool: Object already selected')
      return
    }

    // Check if we can select this object (not locked by another user)
    if (!canEditObject(clickedObject.id)) {
      console.log('Cannot select - object is locked by another user')
      return
    }

    // Unlock previously selected object if any
    if (selectedObjectId) {
      try {
        await unlockObject(selectedObjectId)
        console.log('Select tool: Unlocked previous selection')
      } catch (error) {
        console.error('Failed to unlock previous selection:', error)
      }
    }

    // Select new object and lock it
    try {
      await lockObject(clickedObject.id)
      setSelectedObjectId(clickedObject.id)
      console.log('Select tool: Selected and locked object', clickedObject.id)
    } catch (error) {
      console.error('Failed to lock object:', error)
    }
  }

  /**
   * Handle mouse move - no action for select tool
   */
  onMouseMove(e, state, helpers) {
    // Select tool doesn't do anything on mouse move
    // Future: Could add hover effects or tooltip previews
  }

  /**
   * Handle mouse up - no action for select tool
   */
  onMouseUp(e, state, helpers) {
    // Select tool completes on mouse down
  }

  /**
   * Get cursor style for this tool
   */
  getCursor() {
    return 'default' // Standard arrow pointer
  }
}

export default SelectTool

