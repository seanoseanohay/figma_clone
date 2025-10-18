import { auth } from '../services/firebase.js'
import { 
  updateActiveObjectPosition,
  updateObjectPosition,
  clearActiveObject
} from '../services/canvas.service.js'
import { ACTION_TYPES } from '../hooks/useHistory.js'

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
   * Find closest corner to click position (works for rectangles, circles, and stars)
   * Now properly handles rotated objects by transforming corner positions
   */
  getClosestCorner(pos, obj) {
    // Calculate bounding box based on shape type
    let bounds
    if (obj.type === 'circle') {
      bounds = {
        x: obj.x - obj.radius,
        y: obj.y - obj.radius,
        width: obj.radius * 2,
        height: obj.radius * 2
      }
    } else if (obj.type === 'star') {
      // Stars use outerRadius for bounding box
      bounds = {
        x: obj.x - obj.outerRadius,
        y: obj.y - obj.outerRadius,
        width: obj.outerRadius * 2,
        height: obj.outerRadius * 2
      }
    } else {
      // Rectangles and other shapes with width/height
      bounds = {
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height
      }
    }
    
    // Define base corners (unrotated)
    const baseCorners = [
      { name: 'nw', x: bounds.x, y: bounds.y },
      { name: 'ne', x: bounds.x + bounds.width, y: bounds.y },
      { name: 'sw', x: bounds.x, y: bounds.y + bounds.height },
      { name: 'se', x: bounds.x + bounds.width, y: bounds.y + bounds.height }
    ]
    
    // Transform corners based on object rotation (if any)
    const rotation = obj.rotation || 0
    const corners = baseCorners.map(corner => {
      if (rotation === 0) {
        return corner // No transformation needed
      }
      
      // Transform corner position based on rotation around object center
      const centerX = bounds.x + bounds.width / 2
      const centerY = bounds.y + bounds.height / 2
      
      // Translate to origin
      const translatedX = corner.x - centerX
      const translatedY = corner.y - centerY
      
      // Rotate
      const rotationRad = (rotation * Math.PI) / 180
      const rotatedX = translatedX * Math.cos(rotationRad) - translatedY * Math.sin(rotationRad)
      const rotatedY = translatedX * Math.sin(rotationRad) + translatedY * Math.cos(rotationRad)
      
      // Translate back
      return {
        name: corner.name,
        x: rotatedX + centerX,
        y: rotatedY + centerY
      }
    })
    
    // Check if click is within reasonable distance of the object
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    const maxDistance = Math.max(bounds.width, bounds.height) * 0.75 // Allow some margin
    const distanceFromCenter = Math.sqrt(
      Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2)
    )
    
    if (distanceFromCenter > maxDistance) {
      return null
    }
    
    let closestCorner = null
    let minDistance = Infinity
    
    corners.forEach(corner => {
      const distance = Math.sqrt(
        Math.pow(pos.x - corner.x, 2) + Math.pow(pos.y - corner.y, 2)
      )
      
      if (distance < minDistance) {
        minDistance = distance
        closestCorner = corner.name
      }
    })
    
    console.log('🎯 Closest corner detected:', closestCorner, 'for', obj.type, 'rotation:', rotation + '°')
    return closestCorner
  }

  /**
   * Crossover detection - handles coordinate flipping when resizing past opposite corners
   * Takes the CURRENT transformed rect and flips its coordinates if needed
   */
  handleCrossoverDetection(currentRect, currentHandle, originalRect) {
    // Calculate the opposite corner coordinates of the ORIGINAL rectangle (anchor point)
    const leftX = originalRect.x
    const rightX = originalRect.x + originalRect.width
    const topY = originalRect.y  
    const bottomY = originalRect.y + originalRect.height
    
    // Check current rect's corners against original's corners to detect crossover
    const currentLeft = currentRect.x
    const currentRight = currentRect.x + currentRect.width
    const currentTop = currentRect.y
    const currentBottom = currentRect.y + currentRect.height
    
    let newHandle = currentHandle
    let hasFlipped = false
    
    // Check for crossovers based on current handle
    switch (currentHandle) {
      case 'nw':
        // NW handle: check if current rect's NW corner crossed past original's SE corner
        if (currentLeft > rightX && currentTop > bottomY) {
          newHandle = 'se'
          hasFlipped = true
        } else if (currentLeft > rightX) {
          newHandle = 'ne'
          hasFlipped = true
        } else if (currentTop > bottomY) {
          newHandle = 'sw'
          hasFlipped = true
        }
        break
        
      case 'ne':
        // NE handle: check if current rect's NE corner crossed past original's SW corner
        if (currentRight < leftX && currentTop > bottomY) {
          newHandle = 'sw'
          hasFlipped = true
        } else if (currentRight < leftX) {
          newHandle = 'nw'
          hasFlipped = true
        } else if (currentTop > bottomY) {
          newHandle = 'se'
          hasFlipped = true
        }
        break
        
      case 'sw':
        // SW handle: check if current rect's SW corner crossed past original's NE corner
        if (currentLeft > rightX && currentBottom < topY) {
          newHandle = 'ne'
          hasFlipped = true
        } else if (currentLeft > rightX) {
          newHandle = 'se'
          hasFlipped = true
        } else if (currentBottom < topY) {
          newHandle = 'nw'
          hasFlipped = true
        }
        break
        
      case 'se':
        // SE handle: check if current rect's SE corner crossed past original's NW corner
        if (currentRight < leftX && currentBottom < topY) {
          newHandle = 'nw'
          hasFlipped = true
        } else if (currentRight < leftX) {
          newHandle = 'sw'
          hasFlipped = true
        } else if (currentBottom < topY) {
          newHandle = 'ne'
          hasFlipped = true
        }
        break
    }
    
    // If flipped, keep the current rect's dimensions but maintain continuity
    // The key fix: DON'T recalculate from original - use the transformed rect
    if (hasFlipped) {
      return { rect: currentRect, handle: newHandle, flipped: true }
    }
    
    return { rect: null, handle: currentHandle, flipped: false }
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
      localRectUpdates,
      isResizing,
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

    // Find the selected object - with fallback to local updates for post-rotation state
    let selectedObject = canvasObjects.find(o => o.id === selectedObjectId)
    
    // CRITICAL FIX: If object not found in canvasObjects (stale after rotation),
    // try to use local updates as fallback
    if (!selectedObject && localRectUpdates[selectedObjectId]) {
      console.log('🔧 Using local updates for object not yet synced from Firestore')
      selectedObject = localRectUpdates[selectedObjectId]
    }
    
    if (!selectedObject) {
      console.log('Resize tool: Selected object not found in canvasObjects or localUpdates')
      console.log('Available objects:', canvasObjects.map(o => o.id))
      console.log('Local updates:', Object.keys(localRectUpdates))
      return
    }
    
    // If we have both Firestore data and local updates, merge them
    // (local updates take precedence for immediate post-rotation state) 
    if (localRectUpdates[selectedObjectId]) {
      selectedObject = {
        ...selectedObject,
        ...localRectUpdates[selectedObjectId]
      }
      console.log('🔧 Merged object with local updates for resize:', {
        id: selectedObject.id,
        rotation: selectedObject.rotation
      })
    }

    console.log('=== RESIZE TOOL OBJECT DEBUG ===')
    console.log('Selected object ID:', selectedObjectId)
    console.log('Object type:', selectedObject.type)
    console.log('Object locked by:', selectedObject.lockedBy)
    console.log('Current user:', auth.currentUser?.uid)
    
    // STAR-SPECIFIC DEBUG
    if (selectedObject.type === 'star') {
      console.log('Star properties:', {
        x: selectedObject.x,
        y: selectedObject.y,
        innerRadius: selectedObject.innerRadius,
        outerRadius: selectedObject.outerRadius,
        rotation: selectedObject.rotation,
        numPoints: selectedObject.numPoints
      });
    }
    
    console.log('=== END RESIZE DEBUG ===')

    // Check if we clicked on a resize handle
    const handle = this.getClosestCorner(pos, selectedObject)
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
    } else if (startObject.type === 'text') {
      // Text resize: Only change width (height auto-grows based on wrapped content)
      // Calculate new width based on which handle is being dragged
      let newWidth = startObject.width || 200
      let newX = startObject.x
      
      switch (currentHandle) {
        case 'nw':
        case 'sw':
          // Left side handles - move left edge
          newX = startObject.x + deltaX
          newWidth = (startObject.width || 200) - deltaX
          break
        case 'ne':
        case 'se':
          // Right side handles - move right edge
          newWidth = (startObject.width || 200) + deltaX
          break
      }
      
      // Enforce minimum width
      if (newWidth < 50) {
        newWidth = 50
        newX = startObject.x // Don't move if at minimum
      }
      
      // Enforce canvas boundaries
      if (newX < 0) {
        newWidth += newX
        newX = 0
      }
      if (newX + newWidth > 5000) {
        newWidth = 5000 - newX
      }
      
      newObject = {
        ...startObject,
        x: newX,
        width: newWidth
        // Height is NOT updated - it's calculated dynamically based on wrapped content
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
          width: newObject.width
        })
      }
      
      return // Text doesn't need crossover detection
    } else if (startObject.type === 'rectangle') {
      // Rectangle resize: apply corner-specific transformations
      newObject = this.calculateRectangleResize(startObject, currentHandle, deltaX, deltaY)

      // Check for crossover and handle coordinate flipping
      const crossoverResult = this.handleCrossoverDetection(newObject, currentHandle, startObject)
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
      } else if (newObject.type === 'text') {
        rtdbData.width = newObject.width
        // Height is not sent - it's calculated dynamically
      }
      
      updateActiveObjectPosition(canvasId, resizeSelectedId, rtdbData)
    }
  }

  /**
   * Handle mouse up - finalize resize (object stays selected and locked)
   */
  async onMouseUp(e, state, helpers) {
    const { canvasId, recordAction } = helpers
    const {
      isResizing,
      resizeSelectedId,
      resizeStartData,
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
        } else if (finalObject.type === 'text') {
          updateData.width = finalObject.width
          // Height is not stored - it's calculated dynamically based on wrapped content
        }

        // Final Firestore update WITHOUT unlock (false = keep locked for continued editing)
        await updateObjectPosition(resizeSelectedId, updateData, false) // false = keep locked since object is still selected

        // Record resize action for undo/redo
        if (recordAction && resizeStartData) {
          const beforeState = { ...resizeStartData.object }
          const afterState = { ...finalObject }
          
          recordAction(
            ACTION_TYPES.RESIZE_OBJECT,
            resizeSelectedId,
            beforeState,
            afterState,
            { objectType: finalObject.type || 'Object' }
          )
        }

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





