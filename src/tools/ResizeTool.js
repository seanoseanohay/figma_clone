import { auth } from '../services/firebase.js'
import { 
  updateActiveObjectPosition,
  updateObjectPosition,
  clearActiveObject
} from '../services/canvas.service.js'

/**
 * ResizeTool - Handles object resizing via corner handles for PRE-SELECTED objects
 * 
 * NOTE: This tool NO LONGER handles selection. Use SelectTool to select objects first.
 * ResizeTool only resizes objects that are already selected.
 */
export class ResizeTool {
  constructor() {
    this.minSize = 2
  }

  /**
   * Calculate new circle dimensions based on resize handle
   * Circles maintain circular shape by adjusting radius based on distance from center
   */
  calculateCircleResize(circle, handle, currentPos, startPos) {
    // Calculate distance from center to current mouse position
    const dx = currentPos.x - circle.x
    const dy = currentPos.y - circle.y
    const newRadius = Math.sqrt(dx * dx + dy * dy)
    
    return {
      ...circle,
      radius: Math.max(newRadius, this.minSize / 2) // Minimum radius
    }
  }

  /**
   * Calculate new star dimensions based on resize handle
   * Stars maintain shape by adjusting both inner and outer radius based on distance from center
   * Maintains the proportional relationship between inner and outer radius (40%)
   */
  calculateStarResize(star, handle, currentPos, startPos) {
    // Calculate distance from center to current mouse position
    const dx = currentPos.x - star.x
    const dy = currentPos.y - star.y
    const newOuterRadius = Math.sqrt(dx * dx + dy * dy)
    
    // Maintain the 40% ratio for inner radius
    const newInnerRadius = newOuterRadius * 0.4
    
    return {
      ...star,
      outerRadius: Math.max(newOuterRadius, this.minSize / 2), // Minimum radius
      innerRadius: Math.max(newInnerRadius, this.minSize / 4) // Minimum inner radius
    }
  }

  /**
   * Calculate new rectangle dimensions based on resize handle
   */
  calculateRectangleResize(rect, handle, deltaX, deltaY) {
    const newRect = { ...rect }
    
    switch (handle) {
      case 'nw':
        newRect.x = rect.x + deltaX
        newRect.y = rect.y + deltaY
        newRect.width = rect.width - deltaX
        newRect.height = rect.height - deltaY
        break
      case 'ne':
        newRect.y = rect.y + deltaY
        newRect.width = rect.width + deltaX
        newRect.height = rect.height - deltaY
        break
      case 'sw':
        newRect.x = rect.x + deltaX
        newRect.width = rect.width - deltaX
        newRect.height = rect.height + deltaY
        break
      case 'se':
        newRect.width = rect.width + deltaX
        newRect.height = rect.height + deltaY
        break
    }
    
    return newRect
  }

  /**
   * Handle mouse down - start resizing pre-selected object via corner handles
   */
  async onMouseDown(e, state, helpers) {
    const { pos, canvasId } = helpers
    const {
      selectedObjectId,
      canvasObjects,
      isResizing,
      getClosestCorner,
      setResizeSelectedId,
      setIsResizing,
      setResizeHandle,
      setResizeStartData
    } = state

    console.log('Resize tool mouse down')

    // Resize tool requires a pre-selected object
    if (!selectedObjectId) {
      console.log('Resize tool: No object selected. Use Select tool first.')
      return
    }

    // Find the selected object
    const selectedObject = canvasObjects.find(o => o.id === selectedObjectId)
    if (!selectedObject) {
      console.log('Resize tool: Selected object not found')
      return
    }

    console.log('=== OBJECT DATA DEBUG ===')
    console.log('Selected object ID:', selectedObjectId)
    console.log('Object type:', selectedObject.type)
    console.log('Object locked by:', selectedObject.lockedBy)
    console.log('Current user:', auth.currentUser?.uid)
    console.log('=== END OBJECT DEBUG ===')

    // Check if we clicked on a resize handle
    const handle = getClosestCorner(pos, selectedObject)
    console.log('Checking closest corner on selected object:', handle)
    
    if (handle) {
      console.log('Starting resize on corner:', handle, 'for selected', selectedObject.type)

      // CRITICAL: Only start new resize if we're not already resizing
      if (!isResizing) {
        setIsResizing(true)
        setResizeHandle(handle)
        setResizeSelectedId(selectedObjectId) // Track which object is being resized
        setResizeStartData({
          object: { ...selectedObject },
          startPos: pos
        })

        console.log('Resize tool: Ready to resize selected object')
      } else {
        console.log('Already resizing - ignoring click to prevent jumping')
      }
    } else {
      console.log('Resize tool: Click was not on a resize handle')
    }
  }

  /**
   * Handle mouse move - resize object
   */
  onMouseMove(e, state, helpers) {
    const { pos, canvasId } = helpers
    const {
      isResizing,
      resizeStartData,
      resizeHandle,
      resizeSelectedId,
      doWeOwnObject,
      clampRectToCanvas,
      handleCrossoverDetection,
      setResizeHandle,
      setResizeStartData,
      setLocalRectUpdates
    } = state

    if (!isResizing || !resizeStartData || !resizeHandle) return

    const { object: startObject, startPos } = resizeStartData
    const deltaX = pos.x - startPos.x
    const deltaY = pos.y - startPos.y
    
    let newObject
    let currentHandle = resizeHandle

    // Calculate new dimensions based on object type
    if (startObject.type === 'circle') {
      // Circle resize: adjust radius based on distance from center
      newObject = this.calculateCircleResize(startObject, currentHandle, pos, startPos)
      
      // Clamp circle to canvas
      newObject = state.clampCircleToCanvas(newObject)
      
      // Update local state for immediate visual feedback
      setLocalRectUpdates(prev => ({
        ...prev,
        [resizeSelectedId]: newObject
      }))
      
      // Send updates if we own this object
      if (doWeOwnObject(resizeSelectedId) && !resizeSelectedId.match(/^[12]$/)) {
        updateActiveObjectPosition(canvasId, resizeSelectedId, {
          x: newObject.x,
          y: newObject.y,
          radius: newObject.radius
        })
      }
      
      return // Circles don't need crossover detection
    } else if (startObject.type === 'star') {
      // Star resize: adjust both inner and outer radius based on distance from center
      newObject = this.calculateStarResize(startObject, currentHandle, pos, startPos)
      
      // Clamp star to canvas (use circle clamping since stars are radial)
      if (state.clampStarToCanvas) {
        newObject = state.clampStarToCanvas(newObject)
      }
      
      // Update local state for immediate visual feedback
      setLocalRectUpdates(prev => ({
        ...prev,
        [resizeSelectedId]: newObject
      }))
      
      // Send updates if we own this object
      if (doWeOwnObject(resizeSelectedId) && !resizeSelectedId.match(/^[12]$/)) {
        updateActiveObjectPosition(canvasId, resizeSelectedId, {
          x: newObject.x,
          y: newObject.y,
          innerRadius: newObject.innerRadius,
          outerRadius: newObject.outerRadius
        })
      }
      
      return // Stars don't need crossover detection
    } else if (startObject.type === 'rectangle') {
      // Rectangle resize: apply corner-specific transformations
      newObject = this.calculateRectangleResize(startObject, currentHandle, deltaX, deltaY)

      // Check for crossover and handle coordinate flipping
      const crossoverResult = handleCrossoverDetection(newObject, currentHandle, startObject)
      if (crossoverResult.flipped && crossoverResult.handle !== currentHandle) {
        console.log(`🔄 Crossover detected: ${currentHandle} → ${crossoverResult.handle}`)
        
        // Enforce minimum size BEFORE resetting reference point
        if (newObject.width < this.minSize) newObject.width = this.minSize
        if (newObject.height < this.minSize) newObject.height = this.minSize
        
        // Enforce boundary constraints
        newObject = clampRectToCanvas(newObject)
        
        // Reset the resize reference point when handle flips
        setResizeHandle(crossoverResult.handle)
        setResizeStartData({
          object: { ...newObject },  // Current transformed object becomes new baseline
          startPos: pos              // Current mouse position becomes new reference
        })
        
        // Apply the current state immediately
        setLocalRectUpdates(prev => ({
          ...prev,
          [resizeSelectedId]: newObject
        }))
        
        // Send updates if we own this object
        if (doWeOwnObject(resizeSelectedId) && !resizeSelectedId.match(/^[12]$/)) {
          updateActiveObjectPosition(canvasId, resizeSelectedId, {
            x: newObject.x,
            y: newObject.y,
            width: newObject.width,
            height: newObject.height
          })
        }
        
        return // Next mousemove will calculate deltas from this new baseline
      }

      // Enforce minimum size FIRST to prevent disappearing rectangles
      if (newObject.width < this.minSize) newObject.width = this.minSize
      if (newObject.height < this.minSize) newObject.height = this.minSize

      // Enforce boundary constraints
      newObject = clampRectToCanvas(newObject)
    } else {
      // Unknown shape type - no resize
      return
    }

    // Apply local visual update for immediate feedback
    setLocalRectUpdates(prev => ({
      ...prev,
      [resizeSelectedId]: newObject
    }))

    // Send updates if we own this object (skip for test data)
    if (doWeOwnObject(resizeSelectedId) && !resizeSelectedId.match(/^[12]$/)) {
      // ONLY update RTDB during drag for real-time broadcasting (throttled to 75ms)
      // Firestore writes happen ONLY on drag end to avoid excessive database load
      const rtdbData = {
        x: newObject.x,
        y: newObject.y
      }
      
      // Add shape-specific properties
      if (newObject.type === 'rectangle') {
        rtdbData.width = newObject.width
        rtdbData.height = newObject.height
      } else if (newObject.type === 'circle') {
        rtdbData.radius = newObject.radius
      }
      
      updateActiveObjectPosition(canvasId, resizeSelectedId, rtdbData)
    }
  }

  /**
   * Handle mouse up - finalize resize (object stays selected and locked)
   */
  async onMouseUp(e, state, helpers) {
    const { canvasId } = helpers
    const {
      isResizing,
      resizeSelectedId,
      localRectUpdates,
      doWeOwnObject,
      setIsResizing,
      setResizeHandle,
      setResizeStartData,
      setLocalRectUpdates
    } = state

    if (isResizing && resizeSelectedId && localRectUpdates[resizeSelectedId] && doWeOwnObject(resizeSelectedId)) {
      const finalObject = localRectUpdates[resizeSelectedId]
      try {
        console.log('Resize: Final resize sync (keeping object locked)')

        // Clear active object from RTDB (remove real-time tracking)
        await clearActiveObject(canvasId, resizeSelectedId)

        // Build update data based on shape type
        const updateData = {
          x: finalObject.x,
          y: finalObject.y
        }
        
        if (finalObject.type === 'rectangle') {
          updateData.width = finalObject.width
          updateData.height = finalObject.height
        } else if (finalObject.type === 'circle') {
          updateData.radius = finalObject.radius
        } else if (finalObject.type === 'star') {
          updateData.innerRadius = finalObject.innerRadius
          updateData.outerRadius = finalObject.outerRadius
        }

        // Final Firestore update WITHOUT unlock (false = keep locked for continued editing)
        await updateObjectPosition(resizeSelectedId, updateData, false) // false = keep locked since object is still selected

        console.log('Resize: Object resize synced, staying selected')
      } catch (error) {
        console.error('Failed to sync object resize:', error)
        try {
          await clearActiveObject(canvasId, resizeSelectedId)
        } catch (clearError) {
          console.error('Failed to clear active object:', clearError)
        }
      }
    }

    // Reset resize states but keep object selected for consecutive resizes
    setIsResizing(false)
    setResizeHandle(null)
    setResizeStartData(null)

    // Don't clear resizeSelectedId - object stays selected

    // Clear local updates after sync
    if (resizeSelectedId) {
      setLocalRectUpdates(prev => {
        const updated = { ...prev }
        delete updated[resizeSelectedId]
        return updated
      })
    }
  }

  /**
   * Get cursor style for this tool
   */
  getCursor() {
    return 'nw-resize'
  }
}

export default ResizeTool





