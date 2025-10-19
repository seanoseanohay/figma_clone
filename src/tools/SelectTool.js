import { lockObject, unlockObject } from '../services/canvas.service.js'

/**
 * SelectTool - Handles object selection for collaborative editing
 * 
 * This tool is used to select shapes on the canvas. Once selected,
 * shapes can be modified using other tools (Move, Resize).
 * 
 * Key behaviors:
 * - Click on object to select it (single selection)
 * - Shift+click to toggle object in multi-selection
 * - Drag on empty space to create selection rectangle
 * - Click on empty space to deselect all
 * - Locked objects (owned by others) cannot be selected
 * - Selection persists when switching to modification tools
 * 
 * Multi-Selection Features:
 * - Drag selection rectangle (contains mode - objects must be fully inside)
 * - Shift+click to add/remove objects from selection
 * - Visual distinction: blue border for single, purple border for multi
 * - Batch operations work on all selected objects
 */
export class SelectTool {
  constructor() {
    this.name = 'select'
    this.lastClickTime = 0
    this.lastClickedObjectId = null
    this.DOUBLE_CLICK_THRESHOLD = 300 // milliseconds
  }

  /**
   * Handle mouse down - select or deselect object, or start drag selection
   * Also detects double-click to edit text objects
   * 
   * Behavior:
   * - Click object = single select (or Shift+click to toggle in multi-selection)
   * - Click empty space = deselect all (or start drag selection)
   * - Double-click text = edit text
   */
  async onMouseDown(e, state, helpers) {
    const { pos, canvasId } = helpers
    const { 
      findObjectAt, 
      canEditObject,
      selectedObjectId,
      setSelectedObjectId,
      setIsEditingText,
      setTextEditData,
      setTextSelectedId,
      // Multi-selection from useMultiSelection hook
      multiSelection
    } = state

    // Check if Shift key is held for multi-selection
    const isShiftHeld = e.evt?.shiftKey || false

    // Check if user clicked on an object
    const clickedObject = findObjectAt(pos)

    // Detect double-click on text objects
    const now = Date.now()
    const isDoubleClick = 
      clickedObject && 
      clickedObject.id === this.lastClickedObjectId && 
      (now - this.lastClickTime) < this.DOUBLE_CLICK_THRESHOLD

    if (isDoubleClick && clickedObject.type === 'text' && canEditObject(clickedObject.id)) {
      console.log('🖱️ Double-click detected on text object:', clickedObject.id)
      
      // Lock the text for editing (it should already be locked from first click)
      try {
        await lockObject(clickedObject.id)
        console.log('✅ Text locked for editing')
      } catch (error) {
        console.error('Failed to lock text:', error)
        return
      }

      // Trigger text editing mode (use single selection for editing)
      multiSelection.selectSingle(clickedObject.id)
      setSelectedObjectId(clickedObject.id)
      setTextSelectedId(clickedObject.id)
      setIsEditingText(true)
      setTextEditData({
        object: clickedObject,
        originalText: clickedObject.text || ''
      })
      
      // Reset double-click tracking
      this.lastClickTime = 0
      this.lastClickedObjectId = null
      return
    }

    // Track click for double-click detection
    this.lastClickTime = now
    this.lastClickedObjectId = clickedObject?.id || null

    // CASE 1: Clicking empty space
    if (!clickedObject) {
      if (!isShiftHeld) {
        // Store IDs to unlock before clearing selection
        const idsToUnlock = multiSelection.selectedIdsArray.slice()
        
        // IMMEDIATELY clear selection visually and start new drag
        multiSelection.clearSelection()
        setSelectedObjectId(null)
        multiSelection.startDragSelection(pos)
        console.log('Select tool: Started drag selection')
        
        // Unlock previously selected objects in parallel (non-blocking)
        // This happens in the background after visual feedback is given
        if (idsToUnlock.length > 0) {
          Promise.all(idsToUnlock.map(objectId => 
            unlockObject(objectId).catch(error => {
              console.error('Failed to unlock object:', objectId, error)
            })
          )).then(() => {
            console.log(`Select tool: Unlocked ${idsToUnlock.length} previous selections`)
          })
        }
      }
      return
    }

    // CASE 2: Shift+click on object (toggle in multi-selection)
    if (isShiftHeld) {
      // Check if we can select this object
      if (!canEditObject(clickedObject.id)) {
        console.log('Cannot select - object is locked by another user')
        return
      }

      // Toggle in multi-selection
      const wasSelected = multiSelection.isSelected(clickedObject.id)
      
      if (wasSelected) {
        // Remove from selection and unlock
        try {
          await unlockObject(clickedObject.id)
          multiSelection.toggleSelection(clickedObject.id)
          console.log('Select tool: Removed from multi-selection', clickedObject.id)
        } catch (error) {
          console.error('Failed to unlock object:', error)
        }
      } else {
        // Add to selection and lock
        try {
          await lockObject(clickedObject.id)
          multiSelection.toggleSelection(clickedObject.id)
          console.log('Select tool: Added to multi-selection', clickedObject.id)
        } catch (error) {
          console.error('Failed to lock object:', error)
        }
      }

      // Update single selection ID for backward compatibility
      if (multiSelection.hasSingleSelection) {
        setSelectedObjectId(multiSelection.singleSelectedId)
      } else if (multiSelection.hasMultiSelection) {
        setSelectedObjectId(multiSelection.selectedIdsArray[0]) // First selected for compatibility
      } else {
        setSelectedObjectId(null)
      }
      return
    }

    // CASE 3: Regular click on object (single selection)
    
    // If clicking already-selected object in single selection, keep it selected
    if (multiSelection.hasSingleSelection && clickedObject.id === multiSelection.singleSelectedId) {
      console.log('Select tool: Object already selected')
      return
    }

    // Check if we can select this object
    if (!canEditObject(clickedObject.id)) {
      console.log('Cannot select - object is locked by another user')
      return
    }

    // Store IDs to unlock before changing selection
    const idsToUnlock = multiSelection.selectedIdsArray.slice()

    // IMMEDIATELY update visual selection for instant feedback
    multiSelection.selectSingle(clickedObject.id)
    setSelectedObjectId(clickedObject.id)
    console.log('Select tool: Selected object', clickedObject.id)

    // Unlock previously selected objects and lock new object in parallel (non-blocking)
    // This happens in the background after visual feedback is given
    Promise.all([
      // Unlock old selections
      ...idsToUnlock.map(objectId => 
        unlockObject(objectId).catch(error => {
          console.error('Failed to unlock previous selection:', objectId, error)
        })
      ),
      // Lock new selection
      lockObject(clickedObject.id).catch(error => {
        console.error('Failed to lock object:', clickedObject.id, error)
        // If locking fails, revert visual selection
        multiSelection.clearSelection()
        setSelectedObjectId(null)
      })
    ]).then(() => {
      console.log('Select tool: Object locking complete')
    })
  }

  /**
   * Handle mouse move - update drag selection rectangle if active
   */
  onMouseMove(e, state, helpers) {
    const { pos } = helpers
    const { multiSelection } = state

    // Update drag selection rectangle if dragging
    if (multiSelection.isDragSelecting) {
      multiSelection.updateDragSelection(pos)
    }
  }

  /**
   * Handle mouse up - complete drag selection if active
   */
  async onMouseUp(e, state, helpers) {
    const { multiSelection, canvasObjects, canEditObject, setSelectedObjectId } = state

    // Complete drag selection if active
    if (multiSelection.isDragSelecting) {
      const rect = multiSelection.selectionRectangle
      
      // Allow smaller selections (2px minimum prevents accidental clicks)
      if (rect && rect.width > 2 && rect.height > 2) {
        // Find all objects completely within selection rectangle
        const objectsInRect = canvasObjects.filter(obj => {
          // Only select objects we can edit (not locked by others)
          if (!canEditObject(obj.id)) return false
          
          // Check if object is completely within rectangle
          return multiSelection.isObjectInSelectionRect(obj, rect)
        })

        // Extract IDs immediately
        const objectIds = objectsInRect.map(obj => obj.id)
        
        // IMMEDIATELY hide the selection box for instant visual feedback
        multiSelection.endDragSelection(objectIds)
        
        // Update single selection ID for backward compatibility
        if (objectIds.length === 1) {
          setSelectedObjectId(objectIds[0])
        } else if (objectIds.length > 1) {
          setSelectedObjectId(objectIds[0]) // First selected for compatibility
        } else {
          setSelectedObjectId(null)
        }

        console.log(`Select tool: Drag selection complete - ${objectIds.length} objects selected`)

        // Lock all selected objects in parallel (non-blocking)
        // This happens in the background after visual feedback is already given
        Promise.all(objectIds.map(id => 
          lockObject(id).catch(error => {
            console.error('Failed to lock object in drag selection:', id, error)
          })
        )).then(() => {
          console.log(`Select tool: All ${objectIds.length} objects locked successfully`)
        })
      } else {
        // Rectangle too small (< 2px), cancel selection
        multiSelection.cancelDragSelection()
        console.log('Select tool: Drag selection cancelled (too small, < 2px)')
      }
    }
  }

  /**
   * Get cursor style for this tool
   */
  getCursor() {
    return 'default' // Standard arrow pointer
  }
}

export default SelectTool

