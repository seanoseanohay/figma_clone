import { 
  updateActiveObjectPosition,
  updateObjectPosition,
  updateObject,
  clearActiveObject
} from '../services/canvas.service.js'
import { ACTION_TYPES } from '../hooks/useHistory.js'

/**
 * MoveTool - Handles object movement/dragging with auto-selection
 * 
 * Interaction Model:
 * - Auto-selects objects when clicked (if none selected or different object clicked)
 * - Supports multi-selection movement when multiple objects are selected
 * - Maintains selection after movement for consecutive operations
 * - Single-click selects, drag moves immediately
 */
export class MoveTool {
  constructor() {
    // No drag threshold - immediate movement like Figma
  }

  /**
   * Handle mouse down - start moving object (auto-selects if needed)
   */
  async onMouseDown(e, state, helpers) {
    const { pos, canvasId } = helpers
    const { 
      selectedObjectId,
      findObjectAt,
      canEditObject,
      setSelectedObjectId,
      setMouseDownPos, 
      setMoveOriginalPos,
      canvasObjects,
      setIsMoving
    } = state

    // CRITICAL FIX: Always clear previous movement state to prevent offset issues
    console.log('🧹 Clearing previous movement state to prevent offset bugs')
    setMouseDownPos(null)
    setMoveOriginalPos(null)
    setIsMoving(false)

    // Auto-select logic: handle object selection
    const clickedObject = findObjectAt(pos)
    
    if (!selectedObjectId) {
      // No object currently selected - try to auto-select clicked object
      if (clickedObject && canEditObject(clickedObject.id)) {
        console.log('👆 Move tool: Auto-selecting object', clickedObject.id)
        
        // Auto-select the clicked object
        setSelectedObjectId(clickedObject.id)
        
        // Import lock functionality from canvas service
        const { lockObject } = await import('../services/canvas.service.js')
        
        // Lock the object for editing
        try {
          await lockObject(clickedObject.id)
          console.log('✅ Object auto-selected and locked for moving')
        } catch (error) {
          console.error('Failed to lock auto-selected object:', error)
          return
        }
        
        // CRITICAL FIX: Set up movement immediately with the clicked object
        // Don't wait for state to update since React state updates are async
        const objectStartPosition = { x: clickedObject.x, y: clickedObject.y }
        console.log('🔧 MoveTool: Using auto-selected object position:', objectStartPosition, 'for object', clickedObject.id)
        
        // Setup for immediate movement (no threshold)
        setMouseDownPos(pos)
        setMoveOriginalPos(objectStartPosition)
        
        console.log('✅ Move tool: Ready to move auto-selected object')
        return
      } else {
        console.log('Move tool: No object clicked or cannot edit clicked object')
        return
      }
    } else if (clickedObject && clickedObject.id !== selectedObjectId && canEditObject(clickedObject.id)) {
      // Different object clicked - switch selection
      console.log('👆 Move tool: Switching to different object', clickedObject.id)
      
      // CRITICAL FIX: Clear all movement state from previous object before switching
      const { 
        setIsMoving, 
        setMouseDownPos, 
        setMoveOriginalPos,
        setLocalRectUpdates 
      } = state
      
      console.log('🧹 Clearing movement state from previous object')
      setIsMoving(false)
      setMouseDownPos(null)
      setMoveOriginalPos(null)
      
      // Clear local updates for the previous object
      setLocalRectUpdates(prev => {
        const updated = { ...prev }
        delete updated[selectedObjectId]
        return updated
      })
      
      // Unlock previous selection
      const { unlockObject, lockObject } = await import('../services/canvas.service.js')
      
      try {
        await unlockObject(selectedObjectId)
        console.log('✅ Previous object unlocked and state cleared')
      } catch (error) {
        console.error('Failed to unlock previous object:', error)
      }
      
      // Select and lock the new object
      setSelectedObjectId(clickedObject.id)
      
      try {
        await lockObject(clickedObject.id)
        console.log('✅ New object selected and locked for moving')
        
        // CRITICAL FIX: Set up movement immediately with the switched object
        // Don't wait for state to update since React state updates are async
        const objectStartPosition = { x: clickedObject.x, y: clickedObject.y }
        console.log('🔧 MoveTool: Using switched object position:', objectStartPosition, 'for object', clickedObject.id)
        
        // Setup for immediate movement (no threshold)
        setMouseDownPos(pos)
        setMoveOriginalPos(objectStartPosition)
        
        console.log('✅ Move tool: Ready to move switched object')
        return
      } catch (error) {
        console.error('Failed to lock new object:', error)
        return
      }
    } else if (!clickedObject) {
      // Clicked on empty space - deselect current object
      console.log('👆 Move tool: Clicked empty space, deselecting')
      
      // Clear all movement state before deselecting
      const { 
        setIsMoving, 
        setMouseDownPos, 
        setMoveOriginalPos,
        setLocalRectUpdates 
      } = state
      
      console.log('🧹 Clearing movement state before deselecting')
      setIsMoving(false)
      setMouseDownPos(null)
      setMoveOriginalPos(null)
      
      // Clear local updates for the current object
      setLocalRectUpdates(prev => {
        const updated = { ...prev }
        delete updated[selectedObjectId]
        return updated
      })
      
      const { unlockObject } = await import('../services/canvas.service.js')
      
      try {
        await unlockObject(selectedObjectId)
        console.log('✅ Object deselected, unlocked, and state cleared')
      } catch (error) {
        console.error('Failed to unlock on deselect:', error)
      }
      
      setSelectedObjectId(null)
      return
    } else if (clickedObject && clickedObject.id === selectedObjectId) {
      // Clicked on already selected object - continue with movement
      console.log('👆 Move tool: Clicked on selected object, ready to move')
    }

    // Find the currently selected object (may have been updated by auto-selection logic above)
    const currentSelectedId = state.selectedObjectId || selectedObjectId
    
    // Handle the case where no object is currently selected
    if (!currentSelectedId) {
      console.log('👆 Move tool: No object currently selected - ready for auto-selection on next click')
      return
    }
    
    // Try to find the selected object in the canvas objects
    let baseObject = canvasObjects.find(o => o.id === currentSelectedId)
    
    if (!baseObject) {
      console.warn('🔄 Move tool: Selected object not found in canvas objects')
      console.log('Available object IDs:', canvasObjects.map(o => o.id))
      console.log('Looking for object ID:', currentSelectedId)
      
      // Check if canvas objects are still loading from Firestore
      if (canvasObjects.length === 0) {
        console.log('📦 Canvas objects appear to be loading - deferring movement setup')
        
        // Store the mouse position for when objects load, but don't setup movement yet
        setMouseDownPos(pos)
        
        // Try to find the object after a brief delay to allow Firestore to load
        setTimeout(() => {
          const retryObject = canvasObjects.find(o => o.id === currentSelectedId)
          if (retryObject) {
            console.log('✅ Found object after retry:', retryObject.id)
            setMoveOriginalPos({ x: retryObject.x, y: retryObject.y })
          } else {
            console.error('❌ Object still not found after retry - clearing stale state')
            // Clear the stored mouse position to prevent stale state
            setMouseDownPos(null)
            setMoveOriginalPos(null)
          }
        }, 100)
        
        return
      } else {
        // Object not found in loaded objects - might be a timing issue with state updates
        console.warn('⚠️ Selected object not found - this might be a state synchronization issue')
        console.log('Deferring movement setup to allow state to synchronize')
        
        // Don't aggressively clear selection here - let Canvas.jsx handle stale selection cleanup
        // Just defer the movement setup
        return
      }
    }

    // Use the base Firestore position as the starting point for new movements
    // This ensures we always start from the correct saved position
    const objectStartPosition = { x: baseObject.x, y: baseObject.y }

    console.log('🔧 MoveTool: Using fresh object position:', objectStartPosition, 'for object', currentSelectedId)

    // Setup for immediate movement (no threshold)
    setMouseDownPos(pos)
    setMoveOriginalPos(objectStartPosition)

    console.log('Move tool: Ready to move selected object')
  }

  /**
   * Handle mouse move - drag the pre-selected object immediately (no threshold)
   */
  onMouseMove(e, state, helpers) {
    const { pos, canvasId } = helpers
    const {
      selectedObjectId,
      mouseDownPos,
      moveOriginalPos,
      canvasObjects,
      doWeOwnObject,
      clampRectToCanvas,
      setIsMoving,
      setLocalRectUpdates
    } = state

    if (!selectedObjectId || !mouseDownPos || !moveOriginalPos) return

    // Start moving immediately on any mouse movement
    setIsMoving(true)

    // Calculate delta from where we started (mouseDownPos)
    const deltaX = pos.x - mouseDownPos.x
    const deltaY = pos.y - mouseDownPos.y

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
      } else if (originalObject.type === 'star') {
        clampedObject = state.clampStarToCanvas(newObject)
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
        } else if (originalObject.type === 'star') {
          rtdbData.innerRadius = clampedObject.innerRadius
          rtdbData.outerRadius = clampedObject.outerRadius
        }
        
        updateActiveObjectPosition(canvasId, selectedObjectId, rtdbData)
      }
    }
  }

  /**
   * Handle mouse up - finalize position (object stays selected and locked)
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
      setMouseDownPos,
      setMoveOriginalPos,
      setLocalRectUpdates
    } = state

    if (isMoving && selectedObjectId && localRectUpdates[selectedObjectId] && doWeOwnObject(selectedObjectId)) {
      const finalRect = localRectUpdates[selectedObjectId]
      
      // Get object type for undo/redo metadata
      const fullObject = canvasObjects.find(o => o.id === selectedObjectId)
      const objectType = fullObject ? fullObject.type : 'Object'
      
      try {
        console.log('Move: Final position sync (keeping object locked)')

        // Clear active object from RTDB (remove real-time tracking)
        await clearActiveObject(canvasId, selectedObjectId)

        // Final Firestore update with undo/redo support
        await updateObject(
          selectedObjectId, 
          {
            x: finalRect.x,
            y: finalRect.y
          },
          recordAction, // Pass recordAction callback
          {
            actionType: ACTION_TYPES.MOVE_OBJECT,
            before: { x: moveOriginalPos?.x || 0, y: moveOriginalPos?.y || 0 },
            objectType: objectType.charAt(0).toUpperCase() + objectType.slice(1)
          }
        )

        console.log('Move: Object position synced with undo/redo support, staying selected')
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

    // Reset movement states ONLY if we're still working with the same object
    // This prevents race conditions when rapidly switching between objects
    const currentSelectedId = state.selectedObjectId || selectedObjectId
    
    // Always clear movement states after mouseUp - they're specific to the drag operation
    setIsMoving(false)
    setMouseDownPos(null)
    
    // Always clear local updates for the moved object to prevent visual artifacts
    setLocalRectUpdates(prev => {
      const updated = { ...prev }
      delete updated[selectedObjectId]
      return updated
    })

    // Only clear moveOriginalPos if we're still working with the same object
    // This prevents interference when rapidly switching objects
    if (currentSelectedId === selectedObjectId) {
      setMoveOriginalPos(null)
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





