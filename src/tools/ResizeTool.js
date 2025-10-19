import { auth } from '../services/firebase.js'
import { 
  updateActiveObjectPosition,
  updateObjectPosition,
  clearActiveObject
} from '../services/canvas.service.js'
import { ACTION_TYPES } from '../hooks/useHistory.js'

/**
 * ResizeTool - Handles object resizing via corner handles with auto-selection
 * 
 * Interaction Model:
 * - Auto-selects objects when clicked (if none selected or different object clicked)
 * - Shows resize handles for selected objects
 * - Single-object constraint: only works on one object at a time
 * - Maintains selection after resize for consecutive operations
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
    // CRITICAL VALIDATION: Ensure object has valid properties
    if (!obj || typeof obj.x !== 'number' || typeof obj.y !== 'number') {
      console.error('❌ HANDLE DETECTION ERROR: Invalid object position:', obj)
      return null
    }
    
    // Calculate bounding box based on shape type
    let bounds
    if (obj.type === 'circle') {
      if (typeof obj.radius !== 'number' || !isFinite(obj.radius) || obj.radius <= 0) {
        console.error('❌ HANDLE DETECTION ERROR: Invalid circle radius:', obj.radius)
        return null
      }
      bounds = {
        x: obj.x - obj.radius,
        y: obj.y - obj.radius,
        width: obj.radius * 2,
        height: obj.radius * 2
      }
    } else if (obj.type === 'star') {
      // CRITICAL FIX: Validate star properties 
      if (typeof obj.outerRadius !== 'number' || !isFinite(obj.outerRadius) || obj.outerRadius <= 0) {
        console.error('❌ HANDLE DETECTION ERROR: Invalid star outerRadius:', {
          outerRadius: obj.outerRadius,
          innerRadius: obj.innerRadius,
          allProps: Object.keys(obj)
        })
        return null
      }
      bounds = {
        x: obj.x - obj.outerRadius,
        y: obj.y - obj.outerRadius,
        width: obj.outerRadius * 2,
        height: obj.outerRadius * 2
      }
    } else {
      // Rectangles and other shapes with width/height
      if (typeof obj.width !== 'number' || typeof obj.height !== 'number' || 
          !isFinite(obj.width) || !isFinite(obj.height) || 
          obj.width <= 0 || obj.height <= 0) {
        console.error('❌ HANDLE DETECTION ERROR: Invalid rectangle dimensions:', {
          width: obj.width,
          height: obj.height,
          type: obj.type
        })
        return null
      }
      bounds = {
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height
      }
    }
    
    // VALIDATION: Ensure bounds are valid
    if (!isFinite(bounds.x) || !isFinite(bounds.y) || !isFinite(bounds.width) || !isFinite(bounds.height)) {
      console.error('❌ HANDLE DETECTION ERROR: Invalid calculated bounds:', bounds)
      return null
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
    // ENHANCED VALIDATION: Prevent NaN values in star calculations
    if (!star || typeof star.x !== 'number' || typeof star.y !== 'number') {
      console.error('❌ STAR RESIZE ERROR: Invalid star object:', star)
      return star // Return original to prevent crashes
    }
    
    if (!currentPos || typeof currentPos.x !== 'number' || typeof currentPos.y !== 'number') {
      console.error('❌ STAR RESIZE ERROR: Invalid currentPos:', currentPos)
      return star
    }
    
    // Calculate distance from center to current mouse position
    const dx = currentPos.x - star.x
    const dy = currentPos.y - star.y
    const newOuterRadius = Math.sqrt(dx * dx + dy * dy)
    
    // CRITICAL VALIDATION: Ensure we don't get NaN
    if (!isFinite(newOuterRadius) || newOuterRadius < 0) {
      console.error('❌ STAR RESIZE ERROR: Invalid radius calculation:', { dx, dy, newOuterRadius })
      return star
    }
    
    // Maintain the 40% ratio for inner radius
    const newInnerRadius = newOuterRadius * 0.4
    
    // SAFETY: Ensure all values are finite numbers
    const safeOuterRadius = Math.max(newOuterRadius, this.minSize / 2) // Minimum radius
    const safeInnerRadius = Math.max(newInnerRadius, this.minSize / 4) // Minimum inner radius
    
    if (!isFinite(safeOuterRadius) || !isFinite(safeInnerRadius)) {
      console.error('❌ STAR RESIZE ERROR: Non-finite radius values:', { safeOuterRadius, safeInnerRadius })
      return star
    }
    
    const result = {
      ...star,
      outerRadius: safeOuterRadius,
      innerRadius: safeInnerRadius
    }
    
    // FINAL VALIDATION: Ensure result is safe
    if (!isFinite(result.x) || !isFinite(result.y) || !isFinite(result.outerRadius) || !isFinite(result.innerRadius)) {
      console.error('❌ STAR RESIZE ERROR: Final result contains invalid values:', result)
      return star // Return original as fallback
    }
    
    return result
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
   * Handle mouse down - start resizing object (auto-selects if needed)
   */
  async onMouseDown(e, state, helpers) {
    const { pos, canvasId } = helpers
    const {
      selectedObjectId,
      canvasObjects,
      localRectUpdates,
      isResizing,
      canEditObject,
      setSelectedObjectId,
      setResizeSelectedId,
      setIsResizing,
      setResizeHandle,
      setResizeStartData
    } = state

    console.log('Resize tool mouse down')

    // Auto-select logic: handle object selection (if findObjectAt is available)
    let clickedObject = null
    if (typeof state.findObjectAt === 'function') {
      clickedObject = state.findObjectAt(pos)
    }
    
    if (!selectedObjectId) {
      // No object currently selected - try to auto-select clicked object
      if (clickedObject && canEditObject(clickedObject.id)) {
        console.log('🔧 Resize tool: Auto-selecting object', clickedObject.id)
        
        // Auto-select the clicked object
        setSelectedObjectId(clickedObject.id)
        
        // Import lock functionality from canvas service
        const { lockObject } = await import('../services/canvas.service.js')
        
        // Lock the object for editing
        try {
          await lockObject(clickedObject.id)
          console.log('✅ Object auto-selected and locked for resizing')
        } catch (error) {
          console.error('Failed to lock auto-selected object:', error)
          return
        }
        
        // Continue with resize handle detection using the newly selected object
        // Fall through to the resize handle detection below
      } else {
        console.log('Resize tool: No object clicked or cannot edit clicked object')
        return
      }
    } else if (clickedObject && clickedObject.id !== selectedObjectId && canEditObject(clickedObject.id)) {
      // Different object clicked - switch selection
      console.log('🔧 Resize tool: Switching to different object', clickedObject.id)
      
      // CRITICAL FIX: Clear all resize state from previous object before switching
      const {
        setIsResizing,
        setResizeHandle,
        setResizeStartData,
        setResizeSelectedId,
        setLocalRectUpdates
      } = state
      
      console.log('🧹 Clearing resize state from previous object')
      setIsResizing(false)
      setResizeHandle(null)
      setResizeStartData(null)
      setResizeSelectedId(null)
      
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
        console.log('✅ New object selected and locked for resizing')
      } catch (error) {
        console.error('Failed to lock new object:', error)
        return
      }
      
      // Continue with resize handle detection using the newly selected object
      // Fall through to the resize handle detection below
    } else if (!clickedObject) {
      // Clicked on empty space - deselect current object
      console.log('🔧 Resize tool: Clicked empty space, deselecting')
      
      // Clear all resize state before deselecting
      const {
        setIsResizing,
        setResizeHandle,
        setResizeStartData,
        setResizeSelectedId,
        setLocalRectUpdates
      } = state
      
      console.log('🧹 Clearing resize state before deselecting')
      setIsResizing(false)
      setResizeHandle(null)
      setResizeStartData(null)
      setResizeSelectedId(null)
      
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
    }

    // ENHANCED FIX: Find the currently selected object with robust fallback for post-rotation state
    const currentSelectedId = state.selectedObjectId || selectedObjectId
    let selectedObject = canvasObjects.find(o => o.id === currentSelectedId)
    
    console.log('🔍 Resize tool object lookup:', {
      currentSelectedId,
      foundInCanvasObjects: !!selectedObject,
      hasLocalUpdates: !!localRectUpdates[currentSelectedId],
      canvasObjectsCount: canvasObjects.length,
      localUpdatesCount: Object.keys(localRectUpdates).length
    });
    
    // CRITICAL FIX: Enhanced fallback for post-rotation state
    if (!selectedObject && localRectUpdates[currentSelectedId]) {
      console.log('🔧 FALLBACK: Using local updates for object not yet synced from Firestore')
      selectedObject = { 
        ...localRectUpdates[currentSelectedId],
        // Ensure we have an ID
        id: currentSelectedId
      }
    }
    
    if (!selectedObject) {
      console.error('❌ RESIZE TOOL CRITICAL ERROR: Selected object not found!')
      console.log('Debug info:', {
        selectedObjectId: currentSelectedId,
        availableObjects: canvasObjects.map(o => ({ id: o.id, type: o.type })),
        localUpdates: Object.keys(localRectUpdates),
        timestamp: Date.now()
      })
      
      // EMERGENCY RECOVERY: Try to wait for Firestore sync
      console.log('🚨 Attempting emergency recovery...')
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Retry finding the object
      selectedObject = canvasObjects.find(o => o.id === currentSelectedId)
      if (selectedObject) {
        console.log('✅ Emergency recovery successful!')
      } else {
        console.error('❌ Emergency recovery failed - resize will not work')
        return
      }
    }
    
    // ENHANCED MERGE: If we have both Firestore data and local updates, merge intelligently
    // (local updates take precedence for immediate post-rotation state) 
    if (localRectUpdates[currentSelectedId]) {
      const localUpdates = localRectUpdates[currentSelectedId]
      
      // CRITICAL VALIDATION: Check for NaN values in local updates before merging
      const hasInvalidLocalValues = Object.entries(localUpdates).some(([key, value]) => 
        typeof value === 'number' && !isFinite(value)
      )
      
      if (hasInvalidLocalValues) {
        console.error('🚨 CORRUPTED LOCAL UPDATES - NOT MERGING:', {
          localUpdates,
          invalidKeys: Object.entries(localUpdates)
            .filter(([key, value]) => typeof value === 'number' && !isFinite(value))
            .map(([key]) => key)
        })
        // Use only Firestore data, don't merge corrupted local updates
      } else {
        selectedObject = {
          ...selectedObject,
          ...localUpdates
        }
        console.log('🔄 ENHANCED MERGE: Combined Firestore + local state:', {
          id: selectedObject.id,
          type: selectedObject.type,
          rotation: selectedObject.rotation,
          fromLocal: Object.keys(localUpdates),
          timestamp: Date.now()
        })
      }
    }
    
    // FINAL VALIDATION: Ensure selectedObject doesn't have NaN values
    const hasInvalidObjectValues = ['x', 'y', 'width', 'height', 'radius', 'innerRadius', 'outerRadius']
      .filter(prop => selectedObject.hasOwnProperty(prop))
      .some(prop => typeof selectedObject[prop] === 'number' && !isFinite(selectedObject[prop]))
    
    if (hasInvalidObjectValues) {
      console.error('🚨 SELECTED OBJECT HAS NaN VALUES - ABORTING RESIZE:', selectedObject)
      return
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

    // ENHANCED VALIDATION: Check if we clicked on a resize handle
    const handle = this.getClosestCorner(pos, selectedObject)
    
    console.log('🎯 RESIZE HANDLE DETECTION:', {
      clickPos: pos,
      handle,
      objectType: selectedObject.type,
      objectId: selectedObject.id,
      rotation: selectedObject.rotation || 0,
      hasValidGeometry: !!(selectedObject.x !== undefined && selectedObject.y !== undefined)
    })
    
    if (handle) {
      console.log('✅ RESIZE HANDLE FOUND:', handle, 'for', selectedObject.type, selectedObject.id)

      // CRITICAL: Only start new resize if we're not already resizing
      if (!isResizing) {
        console.log('🚀 INITIALIZING RESIZE OPERATION...')
        
        // ENHANCED VALIDATION: Ensure we have all required state
        const resizeData = {
          object: { ...selectedObject },
          startPos: pos,
          handle,
          timestamp: Date.now()
        }
        
        console.log('🔧 Resize initialization data:', {
          objectId: selectedObject.id,
          handle,
          startPos: pos,
          hasValidObject: !!(selectedObject.id && selectedObject.type),
          objectProperties: Object.keys(selectedObject)
        })
        
        // Set resize state
        setIsResizing(true)
        setResizeHandle(handle)
        setResizeSelectedId(currentSelectedId) // Track which object is being resized
        setResizeStartData(resizeData)

        console.log('✅ RESIZE TOOL: Ready to resize', selectedObject.type, selectedObject.id)
        console.log('🎯 Resize state set:', {
          isResizing: true,
          handle,
          selectedId: currentSelectedId,
          timestamp: Date.now()
        })
      } else {
        console.warn('⚠️ Already resizing - ignoring click to prevent state corruption')
      }
    } else {
      console.log('❌ RESIZE HANDLE NOT FOUND: Click was not on a resize handle')
      
      // Enhanced debug info based on object type
      const debugInfo = {
        clickPos: pos,
        objectType: selectedObject.type,
        objectId: selectedObject.id,
        basePosition: { x: selectedObject.x, y: selectedObject.y },
        rotation: selectedObject.rotation || 0
      }
      
      if (selectedObject.type === 'rectangle') {
        debugInfo.dimensions = { width: selectedObject.width, height: selectedObject.height }
      } else if (selectedObject.type === 'circle') {
        debugInfo.dimensions = { radius: selectedObject.radius }
      } else if (selectedObject.type === 'star') {
        debugInfo.dimensions = { 
          innerRadius: selectedObject.innerRadius, 
          outerRadius: selectedObject.outerRadius,
          numPoints: selectedObject.numPoints
        }
      } else if (selectedObject.type === 'text') {
        debugInfo.dimensions = { width: selectedObject.width, text: selectedObject.text }
      }
      
      // Check for invalid values
      const hasInvalidProps = Object.entries(debugInfo.dimensions || {}).some(([key, value]) => 
        typeof value === 'number' && (!isFinite(value) || value <= 0)
      )
      
      if (hasInvalidProps) {
        console.error('🚨 OBJECT HAS INVALID PROPERTIES:', debugInfo)
      } else {
        console.log('Handle detection debug:', debugInfo)
      }
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

    // ENHANCED VALIDATION: Ensure we have all required state for resize operation
    if (!isResizing) {
      // console.log('Not resizing, ignoring mouse move')
      return
    }
    
    if (!resizeStartData) {
      console.error('❌ RESIZE ERROR: Missing resizeStartData during mouse move')
      return
    }
    
    if (!resizeHandle) {
      console.error('❌ RESIZE ERROR: Missing resizeHandle during mouse move')
      return
    }
    
    if (!resizeSelectedId) {
      console.error('❌ RESIZE ERROR: Missing resizeSelectedId during mouse move')
      return
    }

    const { object: startObject, startPos } = resizeStartData
    
    // Validate startObject
    if (!startObject || !startObject.id) {
      console.error('❌ RESIZE ERROR: Invalid startObject in resizeStartData:', startObject)
      return
    }
    
    const deltaX = pos.x - startPos.x
    const deltaY = pos.y - startPos.y
    
    let newObject
    let currentHandle = resizeHandle
    
    // Debug logging for first move to verify state
    if (!this._debuggedThisResize) {
      console.log('🎯 RESIZE MOUSE MOVE - First move validation:', {
        isResizing,
        hasStartData: !!resizeStartData,
        hasHandle: !!resizeHandle,
        selectedId: resizeSelectedId,
        startObjectType: startObject?.type,
        startObjectId: startObject?.id,
        handle: currentHandle,
        delta: { deltaX, deltaY }
      })
      this._debuggedThisResize = true
    }

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
      
      // Update local state for immediate visual feedback - WITH VALIDATION
      // SAFETY CHECK: Ensure newObject has valid values before updating local state
      const isValidStarObject = isFinite(newObject.x) && isFinite(newObject.y) && 
                               isFinite(newObject.innerRadius) && isFinite(newObject.outerRadius)
      
      if (!isValidStarObject) {
        console.error('❌ STAR LOCAL UPDATE ERROR: Invalid star object values:', newObject)
        return // Don't update local state with invalid values
      }
      
      setLocalRectUpdates(prev => ({
        ...prev,
        [resizeSelectedId]: newObject
      }))
      
      // Send updates if we own this object - WITH VALIDATION
      if (doWeOwnObject(resizeSelectedId) && !resizeSelectedId.match(/^[12]$/)) {
        // CRITICAL FIX: Validate all values before sending to RTDB
        const rtdbUpdate = {
          x: newObject.x,
          y: newObject.y,
          innerRadius: newObject.innerRadius,
          outerRadius: newObject.outerRadius
        }
        
        // Ensure no NaN values are sent
        const hasInvalidValues = Object.entries(rtdbUpdate).some(([key, value]) => !isFinite(value))
        
        if (hasInvalidValues) {
          console.error('❌ STAR RTDB ERROR: Prevented sending NaN values:', rtdbUpdate)
        } else {
          updateActiveObjectPosition(canvasId, resizeSelectedId, rtdbUpdate)
        }
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
      } else if (newObject.type === 'star') {
        // CRITICAL FIX: Add missing star properties to prevent NaN values
        rtdbData.innerRadius = newObject.innerRadius
        rtdbData.outerRadius = newObject.outerRadius
        rtdbData.numPoints = newObject.numPoints
      } else if (newObject.type === 'text') {
        rtdbData.width = newObject.width
        // Height is not sent - it's calculated dynamically
      }
      
      // ENHANCED VALIDATION: Ensure no NaN values are sent to RTDB/Konva
      const hasInvalidValues = Object.entries(rtdbData).some(([key, value]) => 
        typeof value === 'number' && !isFinite(value)
      )
      
      if (hasInvalidValues) {
        console.error('❌ RTDB ERROR: Prevented sending NaN/Infinity values:', rtdbData)
        console.error('Object type:', newObject.type)
        console.error('Original object:', startObject)
        console.error('New object:', newObject)
      } else {
        updateActiveObjectPosition(canvasId, resizeSelectedId, rtdbData)
      }
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
    
    // CLEANUP: Reset debug flag for next resize operation
    this._debuggedThisResize = false

    // Don't clear resizeSelectedId - object stays selected

    // Clear local updates after sync
    if (resizeSelectedId) {
      setLocalRectUpdates(prev => {
        const updated = { ...prev }
        delete updated[resizeSelectedId]
        return updated
      })
    }
    
    console.log('✅ RESIZE OPERATION COMPLETE - Tool ready for next operation')
  }

  /**
   * Get cursor style for this tool
   */
  getCursor() {
    return 'nw-resize'
  }
}

export default ResizeTool





