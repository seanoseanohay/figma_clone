import { 
  updateActiveObjectPosition,
  updateObjectPosition,
  updateObject,
  clearActiveObject
} from '../services/canvas.service.js'
import { ACTION_TYPES } from '../hooks/useHistory.js'

/**
 * MoveTool - Handles object movement/dragging with auto-selection and multi-selection support
 * 
 * Interaction Model:
 * - Auto-selects objects when clicked (if none selected or different object clicked)
 * - Supports multi-selection movement when multiple objects are selected
 * - Maintains selection after movement for consecutive operations
 * - Single-click selects, drag moves immediately
 * - Multi-selection: moves all selected objects as a group maintaining relative positions
 */
export class MoveTool {
  constructor() {
    // No drag threshold - immediate movement like Figma
    this.multiMoveOriginalPositions = new Map() // Store original positions for multi-selection
  }

  /**
   * Handle mouse down - start moving object (auto-selects if needed)
   * Supports both single and multi-selection movement
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
      setIsMoving,
      multiSelection
    } = state

    // CRITICAL FIX: Always clear previous movement state to prevent offset issues
    console.log('🧹 Clearing previous movement state to prevent offset bugs')
    setMouseDownPos(null)
    setMoveOriginalPos(null)
    setIsMoving(false)
    this.multiMoveOriginalPositions.clear() // Clear multi-selection positions

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

    // Check if we have multi-selection active
    const hasMultiSelection = multiSelection && multiSelection.selectionInfo.isMulti
    const hasSingleSelection = multiSelection && multiSelection.selectionInfo.isSingle
    const hasAnySelection = hasMultiSelection || hasSingleSelection
    
    console.log('🎯 Move tool: Selection state check:', {
      hasMultiSelection,
      hasSingleSelection,
      selectedCount: multiSelection?.selectionInfo?.count || 0,
      legacySelectedId: selectedObjectId,
      multiSelectionIds: multiSelection ? Array.from(multiSelection.selectionInfo.all) : [],
      canEditMap: multiSelection ? Array.from(multiSelection.selectionInfo.all).map(id => ({
        id,
        canEdit: canEditObject(id),
        doWeOwn: state.doWeOwnObject(id)
      })) : []
    })

    if (hasMultiSelection) {
      // Multi-selection movement: set up movement for all selected objects
      console.log('👥 Move tool: Setting up multi-selection movement for', multiSelection.selectionInfo.count, 'objects')
      
      const selectedIds = Array.from(multiSelection.selectionInfo.all)
      const objectsToMove = []
      
      // Collect all selected objects that exist in canvas
      for (const objectId of selectedIds) {
        const obj = canvasObjects.find(o => o.id === objectId)
        console.log(`📋 Setting up object ${objectId}:`, {
          found: !!obj,
          position: obj ? { x: obj.x, y: obj.y } : null,
          canEdit: canEditObject(objectId),
          doWeOwn: state.doWeOwnObject(objectId)
        })
        
        if (obj) {
          objectsToMove.push(obj)
          // Store original position for each object
          this.multiMoveOriginalPositions.set(objectId, { x: obj.x, y: obj.y })
        } else {
          console.warn('⚠️ Selected object not found in canvas:', objectId)
        }
      }
      
      if (objectsToMove.length === 0) {
        console.warn('❌ No valid objects found for multi-selection movement')
        return
      }
      
      console.log('✅ Multi-selection setup complete:', objectsToMove.length, 'objects ready to move')
      
      // Setup for immediate movement
      setMouseDownPos(pos)
      setMoveOriginalPos(null) // Not used for multi-selection
      
      return
    } else if (hasSingleSelection) {
      // Single selection movement: use the primary selected object
      const primaryId = multiSelection.selectionInfo.primaryId
      const baseObject = canvasObjects.find(o => o.id === primaryId)
      
      if (!baseObject) {
        console.warn('⚠️ Primary selected object not found:', primaryId)
        return
      }
      
      console.log('👤 Move tool: Setting up single selection movement for object:', primaryId)
      
      // Use the base Firestore position as the starting point
      const objectStartPosition = { x: baseObject.x, y: baseObject.y }
      
      // Setup for immediate movement (legacy single-object mode)
      setMouseDownPos(pos)
      setMoveOriginalPos(objectStartPosition)
      setSelectedObjectId(primaryId) // Ensure legacy state is in sync
      
      console.log('✅ Single selection setup complete, ready to move object')
      return
    } else {
      // No selection - this shouldn't happen with MoveTool, but handle gracefully
      console.log('❌ Move tool: No objects selected - cannot move')
      return
    }
  }

  /**
   * Handle mouse move - drag selected objects immediately (supports multi-selection)
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
      setLocalRectUpdates,
      multiSelection
    } = state

    if (!mouseDownPos) return

    // Start moving immediately on any mouse movement
    setIsMoving(true)

    // Calculate delta from where we started (mouseDownPos)
    const deltaX = pos.x - mouseDownPos.x
    const deltaY = pos.y - mouseDownPos.y

    // Check if we have multi-selection active
    const hasMultiSelection = multiSelection && multiSelection.selectionInfo.isMulti

    if (hasMultiSelection && this.multiMoveOriginalPositions.size > 0) {
      // Multi-selection movement: move all selected objects as a group
      console.log('👥 Moving', this.multiMoveOriginalPositions.size, 'objects as group')
      
      const selectedIds = Array.from(multiSelection.selectionInfo.all)
      const localUpdates = {}
      
      // Move each selected object maintaining relative positions
      for (const objectId of selectedIds) {
        const originalPos = this.multiMoveOriginalPositions.get(objectId)
        const originalObject = canvasObjects.find(o => o.id === objectId)
        
        console.log(`🔍 Processing object ${objectId}:`, {
          hasOriginalPos: !!originalPos,
          hasOriginalObject: !!originalObject,
          doWeOwnIt: doWeOwnObject(objectId),
          originalPos,
          objectType: originalObject?.type,
          objectLockedBy: originalObject?.lockedBy,
          currentUserId: state.canvasObjects.find(o => o.id === objectId)?.lockedBy,
          authUserId: 'will_show_in_canvas'
        })
        
        // TEMPORARY DEBUG: Skip ownership check to test if locking is the issue
        if (originalPos && originalObject) {
          console.log(`✅ Moving object ${objectId} (ownership check bypassed for debug)`)
          // TODO: Re-enable ownership check: && doWeOwnObject(objectId)
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
          } else {
            clampedObject = newObject // Default: no clamping
          }

          // Store local update for immediate visual feedback
          localUpdates[objectId] = clampedObject

          // Send real-time updates to RTDB for multiplayer sync
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
          
          updateActiveObjectPosition(canvasId, objectId, rtdbData)
        }
      }
      
      // Apply all local updates at once for smooth rendering
      if (Object.keys(localUpdates).length > 0) {
        setLocalRectUpdates(prev => ({
          ...prev,
          ...localUpdates
        }))
      }
      
    } else if (selectedObjectId && moveOriginalPos) {
      // Single selection movement (legacy mode)
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
          // ONLY update RTDB during drag for real-time broadcasting
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
  }

  /**
   * Handle mouse up - finalize position (supports multi-selection)
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
      setLocalRectUpdates,
      multiSelection
    } = state

    if (!isMoving) {
      // Just a click without drag - objects stay selected
      console.log('Move: Click only - objects stay selected')
      this.multiMoveOriginalPositions.clear()
      return
    }

    // Check if we have multi-selection active
    const hasMultiSelection = multiSelection && multiSelection.selectionInfo.isMulti

    if (hasMultiSelection && this.multiMoveOriginalPositions.size > 0) {
      // Multi-selection finalizing: save all moved objects to Firestore
      console.log('👥 Finalizing multi-selection movement for', this.multiMoveOriginalPositions.size, 'objects')
      
      const selectedIds = Array.from(multiSelection.selectionInfo.all)
      const clearActivePromises = []
      const updatePromises = []
      
      for (const objectId of selectedIds) {
        const originalPos = this.multiMoveOriginalPositions.get(objectId)
        const finalObject = localRectUpdates[objectId]
        
        // TEMPORARY DEBUG: Skip ownership check for finalization too
        if (originalPos && finalObject) {
          console.log(`💾 Finalizing object ${objectId} (ownership check bypassed for debug)`)
          // TODO: Re-enable ownership check: && doWeOwnObject(objectId)
          const fullObject = canvasObjects.find(o => o.id === objectId)
          const objectType = fullObject ? fullObject.type : 'Object'
          
          // Clear active object from RTDB
          clearActivePromises.push(clearActiveObject(canvasId, objectId))
          
          // Update Firestore with undo/redo support
          updatePromises.push(
            updateObject(
              objectId,
              {
                x: finalObject.x,
                y: finalObject.y
              },
              recordAction,
              {
                actionType: ACTION_TYPES.MOVE_OBJECT,
                before: { x: originalPos.x, y: originalPos.y },
                objectType: objectType.charAt(0).toUpperCase() + objectType.slice(1)
              }
            )
          )
        }
      }
      
      try {
        // Execute all operations in parallel for better performance
        await Promise.all([...clearActivePromises, ...updatePromises])
        console.log('✅ Multi-selection movement finalized - all objects synced to Firestore')
        
        // Clear local updates for all moved objects
        setLocalRectUpdates(prev => {
          const updated = { ...prev }
          for (const objectId of selectedIds) {
            delete updated[objectId]
          }
          return updated
        })
        
      } catch (error) {
        console.error('Failed to sync multi-selection movement:', error)
        
        // Attempt cleanup even if updates failed
        try {
          await Promise.all(clearActivePromises)
        } catch (clearError) {
          console.error('Failed to clear active objects:', clearError)
        }
      }
      
    } else if (selectedObjectId && localRectUpdates[selectedObjectId] && doWeOwnObject(selectedObjectId)) {
      // Single selection finalizing (legacy mode)
      const finalRect = localRectUpdates[selectedObjectId]
      
      // Get object type for undo/redo metadata
      const fullObject = canvasObjects.find(o => o.id === selectedObjectId)
      const objectType = fullObject ? fullObject.type : 'Object'
      
      try {
        console.log('👤 Move: Final position sync for single object (keeping object locked)')

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

        console.log('✅ Single object position synced with undo/redo support, staying selected')
        
        // Clear local updates for the moved object
        setLocalRectUpdates(prev => {
          const updated = { ...prev }
          delete updated[selectedObjectId]
          return updated
        })
        
      } catch (error) {
        console.error('Failed to sync object position:', error)
        try {
          await clearActiveObject(canvasId, selectedObjectId)
        } catch (clearError) {
          console.error('Failed to clear active object:', clearError)
        }
      }
    }

    // Always clear movement states after mouseUp
    setIsMoving(false)
    setMouseDownPos(null)
    setMoveOriginalPos(null)
    this.multiMoveOriginalPositions.clear()
    
    console.log('🧹 Movement states cleared, objects remain selected and locked')
  }

  /**
   * Get cursor style for this tool
   */
  getCursor() {
    return 'default'
  }
}

export default MoveTool





