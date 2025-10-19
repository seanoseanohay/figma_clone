import { lockObject, unlockObject } from '../services/canvas.service.js'

/**
 * SelectTool - Enhanced object selection tool with multi-selection support
 * 
 * Supports both single and multi-object selection for collaborative editing:
 * - Single click: Select object (deselects others)
 * - Shift+click: Add/remove object from selection
 * - Drag empty space: Create selection rectangle
 * - Double-click text: Edit mode
 * - Click empty space or Escape: Clear selection
 * 
 * Multi-selection features:
 * - Drag selection uses "contains" rule (objects fully within rectangle)
 * - Respects ownership (cannot select locked objects)
 * - Visual feedback with purple borders for multi-select
 * - Batch operations (delete, move group)
 */
export class SelectTool {
  constructor() {
    this.name = 'select'
    this.lastClickTime = 0
    this.lastClickedObjectId = null
    this.DOUBLE_CLICK_THRESHOLD = 300 // milliseconds
    
    // Multi-selection state
    this.isDragging = false
    this.dragStartPos = null
    this.isShiftPressed = false
  }

  /**
   * Handle mouse down - enhanced for multi-selection support
   * 
   * Behaviors:
   * - Single click object: Select object (clear others unless Shift held)
   * - Shift+click object: Toggle object in selection
   * - Double-click text: Enter edit mode
   * - Drag empty space: Start selection rectangle
   * - Click empty space: Clear all selection
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
      multiSelection, // New multi-selection hook
      canvasObjects
    } = state

    // Store shift state and drag start position
    this.isShiftPressed = e.evt?.shiftKey || false
    this.dragStartPos = { ...pos }

    // Check if user clicked on an object
    const clickedObject = findObjectAt(pos)

    // Detect double-click on text objects
    const now = Date.now()
    const isDoubleClick = 
      clickedObject && 
      clickedObject.id === this.lastClickedObjectId && 
      (now - this.lastClickTime) < this.DOUBLE_CLICK_THRESHOLD

    if (isDoubleClick && clickedObject?.type === 'text' && canEditObject(clickedObject.id)) {
      console.log('🖱️ Double-click detected on text object:', clickedObject.id)
      
      // Ensure object is selected for text editing
      if (!multiSelection.selectionInfo.has(clickedObject.id)) {
        await multiSelection.selectSingle(clickedObject.id)
      }

      // Trigger text editing mode
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

    // Case 1: Clicked empty space
    if (!clickedObject) {
      // Start drag selection if not holding shift
      if (!this.isShiftPressed) {
        await multiSelection.clearSelection()
        setSelectedObjectId(null)
        
        // Prepare for potential drag selection
        this.isDragging = false // Will be set to true in onMouseMove
        multiSelection.startDragSelection(pos)
      }
      return
    }

    // Case 2: Clicked on object
    const objectId = clickedObject.id
    const isSelected = multiSelection.selectionInfo.has(objectId)
    const canSelect = multiSelection.canSelectObject(objectId)

    if (!canSelect) {
      console.log('Cannot select - object is locked by another user:', objectId)
      return
    }

    // Case 2a: Shift+click - toggle selection
    if (this.isShiftPressed) {
      await multiSelection.toggleSelection(objectId)
      
      // Update legacy single selection state for compatibility
      const selection = multiSelection.selectionInfo
      setSelectedObjectId(selection.isSingle ? selection.primaryId : null)
      return
    }

    // Case 2b: Click already selected object - keep selected (for move preparation)
    if (isSelected && multiSelection.selectionInfo.isSingle) {
      console.log('Select tool: Object already selected, maintaining selection')
      return
    }

    // Case 2c: Single click - replace selection
    await multiSelection.selectSingle(objectId)
    setSelectedObjectId(objectId)
    console.log('Select tool: Selected object', objectId)
  }

  /**
   * Handle mouse move - drag selection support
   * Fixed to work correctly in all drag directions
   */
  onMouseMove(e, state, helpers) {
    const { pos } = helpers
    const { multiSelection, canvasObjects } = state

    // Check if we should start or continue drag selection
    if (multiSelection.isSelecting && this.dragStartPos) {
      // Mark as actively dragging if we've moved enough
      if (!this.isDragging) {
        const distance = Math.sqrt(
          Math.pow(pos.x - this.dragStartPos.x, 2) + 
          Math.pow(pos.y - this.dragStartPos.y, 2)
        )
        if (distance > 3) { // 3px threshold to avoid accidental drags
          this.isDragging = true
        }
      }

      if (this.isDragging) {
        // Find objects within selection rectangle
        const objectsInRect = this.getObjectsInSelectionRect(
          this.dragStartPos, 
          pos, 
          canvasObjects
        )
        
        // Update drag selection with current mouse position and objects
        multiSelection.updateDragSelection(pos, objectsInRect)
      }
    }
  }

  /**
   * Handle mouse up - complete drag selection
   */
  async onMouseUp(e, state, helpers) {
    const { multiSelection } = state

    // Complete drag selection if we were dragging
    if (this.isDragging && multiSelection.isSelecting) {
      await multiSelection.completeDragSelection(this.isShiftPressed)
      
      // Update legacy selection state for compatibility
      const selection = multiSelection.selectionInfo
      const { setSelectedObjectId } = state
      setSelectedObjectId(selection.isSingle ? selection.primaryId : null)
    }

    // Clean up drag state
    this.isDragging = false
    this.dragStartPos = null
    this.isShiftPressed = false
  }

  /**
   * Get objects that are completely contained within selection rectangle
   * Uses "contains" rule - objects must be fully inside the rectangle
   * Optimized for performance with early culling and efficient bounds checking
   */
  getObjectsInSelectionRect(startPos, currentPos, canvasObjects) {
    // Calculate selection rectangle bounds - ensure proper ordering
    const left = Math.min(startPos.x, currentPos.x)
    const right = Math.max(startPos.x, currentPos.x)
    const top = Math.min(startPos.y, currentPos.y)
    const bottom = Math.max(startPos.y, currentPos.y)

    // Early exit for tiny selection areas (likely accidental)
    const selectionWidth = right - left
    const selectionHeight = bottom - top
    if (selectionWidth < 5 || selectionHeight < 5) {
      return []
    }

    const selectedObjects = []
    
    // Optimized loop with early culling
    for (let i = 0; i < canvasObjects.length; i++) {
      const obj = canvasObjects[i]
      
      // Quick position-based culling before expensive bounds calculation
      if (this.isObjectPotentiallyInBounds(obj, left, right, top, bottom)) {
        const objBounds = this.getObjectBounds(obj)
        
        // Check if object is completely contained within selection rectangle
        if (objBounds.left >= left &&
            objBounds.right <= right &&
            objBounds.top >= top &&
            objBounds.bottom <= bottom) {
          selectedObjects.push(obj)
        }
      }
    }

    return selectedObjects
  }

  /**
   * Quick check if object might intersect with selection bounds
   * Uses object position and rough size estimates for fast culling
   */
  isObjectPotentiallyInBounds(obj, selLeft, selRight, selTop, selBottom) {
    const objX = obj.x || 0
    const objY = obj.y || 0
    
    // Get rough object size for quick bounds check
    let maxSize
    switch (obj.type) {
      case 'rectangle':
        maxSize = Math.max(obj.width || 0, obj.height || 0)
        break
      case 'circle':
        maxSize = (obj.radius || 0) * 2
        break
      case 'star':
        maxSize = (obj.outerRadius || obj.radius || 50) * 2
        break
      case 'text':
        maxSize = Math.max((obj.fontSize || 24) * ((obj.text || '').length * 0.6), obj.fontSize || 24)
        break
      default:
        maxSize = Math.max(obj.width || 50, obj.height || 50)
    }
    
    // Quick AABB check with padding for safety
    const padding = maxSize / 2
    return !(objX + padding < selLeft || 
             objX - padding > selRight || 
             objY + padding < selTop || 
             objY - padding > selBottom)
  }

  /**
   * Get bounding box for any object type
   * Optimized for performance with cached calculations
   */
  getObjectBounds(obj) {
    // Use cached bounds if available and object hasn't changed
    if (obj._cachedBounds && obj._boundsVersion === obj.lastModified) {
      return obj._cachedBounds
    }

    let left, right, top, bottom

    switch (obj.type) {
      case 'rectangle':
        left = obj.x
        right = obj.x + obj.width
        top = obj.y
        bottom = obj.y + obj.height
        break
      
      case 'circle':
        left = obj.x - obj.radius
        right = obj.x + obj.radius
        top = obj.y - obj.radius
        bottom = obj.y + obj.radius
        break
      
      case 'star':
        const outerRadius = obj.outerRadius || obj.radius || 50
        left = obj.x - outerRadius
        right = obj.x + outerRadius
        top = obj.y - outerRadius
        bottom = obj.y + outerRadius
        break
      
      case 'text':
        // Optimized text bounds estimation
        const fontSize = obj.fontSize || 24
        const textLength = obj.text ? obj.text.length : 0
        const textWidth = textLength * fontSize * 0.6 // Rough estimate
        const textHeight = fontSize * 1.2 // Line height
        left = obj.x
        right = obj.x + textWidth
        top = obj.y
        bottom = obj.y + textHeight
        break
      
      default:
        // Fallback for unknown object types
        left = obj.x || 0
        right = (obj.x || 0) + (obj.width || 50)
        top = obj.y || 0
        bottom = (obj.y || 0) + (obj.height || 50)
    }

    const bounds = { left, right, top, bottom }
    
    // Cache the bounds for future use (optional optimization)
    obj._cachedBounds = bounds
    obj._boundsVersion = obj.lastModified || Date.now()
    
    return bounds
  }

  /**
   * Get cursor style for this tool
   */
  getCursor() {
    return 'default' // Standard arrow pointer
  }
}

export default SelectTool

