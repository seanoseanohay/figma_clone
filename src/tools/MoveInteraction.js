import { updateActiveObjectPosition, clearActiveObject, updateObject } from '../services/canvas.service.js';
import { ACTION_TYPES } from '../hooks/useHistory.js';

/**
 * MoveInteraction - Central controller for both single and multi-object movement
 * 
 * This class provides a clean, deterministic API for moving objects on the canvas.
 * It supports both single object movement and multi-object group movement while
 * maintaining relative positions and providing proper undo/redo integration.
 * 
 * Key Features:
 * - Unified API for single and multi-object moves
 * - Position accumulation prevention using stored original positions
 * - Real-time multiplayer sync via RTDB
 * - Undo/redo integration with proper history recording
 * - Boundary constraint support for all shape types
 */
export class MoveInteraction {
  /**
   * Create a new move interaction
   * @param {Array} selectedShapes - Array of shape objects to move
   * @param {Object} startPoint - Initial mouse position { x, y }
   * @param {Function} onUpdate - Callback for triggering canvas re-render
   * @param {Object} options - Additional configuration
   * @param {string} options.canvasId - Canvas ID for RTDB updates
   * @param {Function} options.canEditObject - Function to check if object is editable
   * @param {Function} options.clampRectToCanvas - Boundary constraint function for rectangles
   * @param {Function} options.clampCircleToCanvas - Boundary constraint function for circles  
   * @param {Function} options.clampStarToCanvas - Boundary constraint function for stars
   */
  constructor(selectedShapes, startPoint, onUpdate, options = {}) {
    // CRITICAL VALIDATION: Ensure startPoint has valid coordinates
    if (!startPoint || typeof startPoint.x !== 'number' || typeof startPoint.y !== 'number' ||
        !isFinite(startPoint.x) || !isFinite(startPoint.y)) {
      console.error('🚨 MOVE INTERACTION ERROR: Invalid startPoint:', startPoint);
      throw new Error('MoveInteraction requires valid startPoint coordinates');
    }
    
    // Store original positions to prevent accumulation during drag
    this.selectedShapes = selectedShapes.map(shape => {
      // CRITICAL VALIDATION: Ensure shape has valid coordinates
      if (!shape || typeof shape.x !== 'number' || typeof shape.y !== 'number' ||
          !isFinite(shape.x) || !isFinite(shape.y)) {
        console.error('🚨 MOVE INTERACTION ERROR: Invalid shape coordinates:', {
          id: shape?.id,
          x: shape?.x,
          y: shape?.y,
          type: shape?.type
        });
        throw new Error(`MoveInteraction: Shape ${shape?.id} has invalid coordinates`);
      }
      
      return {
        id: shape.id,
        startX: shape.x,
        startY: shape.y,
        type: shape.type,
        // Deep clone to avoid stale object reference reuse across drags
        originalShape: this._deepClone(shape)
      };
    });
    
    this.startPoint = { x: startPoint.x, y: startPoint.y };
    this.onUpdate = onUpdate;
    this.canvasId = options.canvasId;
    this.canEditObject = options.canEditObject || (() => true);
    this.clampRectToCanvas = options.clampRectToCanvas || ((obj) => obj);
    this.clampCircleToCanvas = options.clampCircleToCanvas || ((obj) => obj);
    this.clampStarToCanvas = options.clampStarToCanvas || ((obj) => obj);
    
    // Track local updates for immediate visual feedback
    this.localUpdates = {};
    
    // Active flag to prevent RTDB updates after interaction ends
    this._active = true;
    
    // Performance optimization for large selections
    this.isLargeSelection = selectedShapes.length > 20;
    this.rtdbUpdateQueue = [];
    this.rtdbUpdateThrottle = this.isLargeSelection ? 100 : 16; // Throttle more aggressively for large selections
    this.lastRtdbUpdate = 0;
    
    console.log('🎯 MoveInteraction created for', this.selectedShapes.length, 'objects');
    console.log('📍 Start point:', this.startPoint);
    console.log('🚀 Performance mode:', this.isLargeSelection ? 'Large Selection (throttled)' : 'Normal');
    console.log('📋 Objects to move:', this.selectedShapes.map(s => `${s.type}:${s.id}`));
  }

  /**
   * Update positions during mouse move
   * @param {Object} currentPoint - Current mouse position { x, y }
   * @returns {Object} localUpdates - Updated object positions for immediate rendering
   */
  move(currentPoint) {
    // Stop processing if interaction is no longer active
    if (!this._active) return this.localUpdates;
    
    // CRITICAL VALIDATION: Ensure currentPoint has valid coordinates
    if (!currentPoint || typeof currentPoint.x !== 'number' || typeof currentPoint.y !== 'number' ||
        !isFinite(currentPoint.x) || !isFinite(currentPoint.y)) {
      console.error('🚨 MOVE INTERACTION ERROR: Invalid currentPoint:', currentPoint);
      return this.localUpdates; // Return existing updates instead of continuing
    }
    
    // Calculate delta from start point
    const dx = currentPoint.x - this.startPoint.x;
    const dy = currentPoint.y - this.startPoint.y;
    
    // CRITICAL VALIDATION: Ensure delta calculations are valid
    if (!isFinite(dx) || !isFinite(dy)) {
      console.error('🚨 MOVE INTERACTION ERROR: Invalid delta calculation:', {
        currentPoint,
        startPoint: this.startPoint,
        dx, dy
      });
      return this.localUpdates; // Return existing updates instead of continuing
    }
    
    console.log('📐 Move delta:', { dx, dy });
    
    // Clear previous local updates
    this.localUpdates = {};
    
    // Apply delta to all selected shapes
    this.selectedShapes.forEach(shapeInfo => {
      // Calculate new position from original position (prevents accumulation)
      const newX = shapeInfo.startX + dx;
      const newY = shapeInfo.startY + dy;
      
      // CRITICAL VALIDATION: Ensure new position is valid
      if (!isFinite(newX) || !isFinite(newY)) {
        console.error('🚨 MOVE INTERACTION ERROR: Invalid new position calculated:', {
          shapeId: shapeInfo.id,
          startX: shapeInfo.startX,
          startY: shapeInfo.startY,
          dx, dy,
          newX, newY
        });
        return; // Skip this shape
      }
      
      // Create updated object with new position
      const updatedShape = {
        ...shapeInfo.originalShape,
        x: newX,
        y: newY
      };
      
      // Apply boundary constraints based on shape type
      let clampedShape;
      switch (shapeInfo.type) {
        case 'rectangle':
          clampedShape = this.clampRectToCanvas(updatedShape);
          break;
        case 'circle':
          clampedShape = this.clampCircleToCanvas(updatedShape);
          break;
        case 'star':
          clampedShape = this.clampStarToCanvas(updatedShape);
          break;
        default:
          clampedShape = updatedShape; // No clamping for unknown types
      }
      
      // FINAL VALIDATION: Ensure clamped shape has valid coordinates
      if (!isFinite(clampedShape.x) || !isFinite(clampedShape.y)) {
        console.error('🚨 MOVE INTERACTION ERROR: Clamped shape has invalid coordinates:', {
          shapeId: shapeInfo.id,
          clampedShape: {
            x: clampedShape.x,
            y: clampedShape.y,
            type: clampedShape.type
          }
        });
        return; // Skip this shape entirely
      }
      
      // Store for local rendering
      this.localUpdates[shapeInfo.id] = clampedShape;
      
      // Send real-time updates to RTDB for multiplayer sync (throttled for performance)
      if (this._active && this.canvasId && this.canEditObject(shapeInfo.id)) {
        const rtdbData = {
          x: clampedShape.x,
          y: clampedShape.y
        };
        
        // Add shape-specific properties for complete sync (only if defined)
        if (shapeInfo.type === 'rectangle') {
          if (clampedShape.width !== undefined) rtdbData.width = clampedShape.width;
          if (clampedShape.height !== undefined) rtdbData.height = clampedShape.height;
        } else if (shapeInfo.type === 'circle') {
          if (clampedShape.radius !== undefined) rtdbData.radius = clampedShape.radius;
        } else if (shapeInfo.type === 'star') {
          if (clampedShape.innerRadius !== undefined) rtdbData.innerRadius = clampedShape.innerRadius;
          if (clampedShape.outerRadius !== undefined) rtdbData.outerRadius = clampedShape.outerRadius;
          if (clampedShape.numPoints !== undefined) rtdbData.numPoints = clampedShape.numPoints;
        }
        
        // Queue RTDB update for throttled sending
        this.rtdbUpdateQueue.push({ id: shapeInfo.id, data: rtdbData });
      }
    });
    
    // Process throttled RTDB updates for multiplayer sync
    this._processRtdbUpdates();
    
    // Trigger canvas re-render with updated positions
    if (this.onUpdate) {
      this.onUpdate(this.localUpdates);
    }
    
    return this.localUpdates;
  }

  /**
   * Process throttled RTDB updates for better performance with large selections
   * @private
   */
  _processRtdbUpdates() {
    if (this.rtdbUpdateQueue.length === 0) return;
    
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastRtdbUpdate;
    
    // Only send updates if enough time has passed (throttling)
    if (timeSinceLastUpdate >= this.rtdbUpdateThrottle) {
      // For large selections, sample a subset of objects to reduce network load
      let updatesToSend = this.rtdbUpdateQueue;
      
      if (this.isLargeSelection && this.rtdbUpdateQueue.length > 10) {
        // Sample every nth object to reduce RTDB calls for very large selections
        const sampleRate = Math.ceil(this.rtdbUpdateQueue.length / 10);
        updatesToSend = this.rtdbUpdateQueue.filter((_, index) => index % sampleRate === 0);
        console.log(`🎯 Large selection optimization: sending ${updatesToSend.length}/${this.rtdbUpdateQueue.length} RTDB updates`);
      }
      
      // Send the RTDB updates
      updatesToSend.forEach(({ id, data }) => {
        updateActiveObjectPosition(this.canvasId, id, data);
      });
      
      this.lastRtdbUpdate = now;
    }
    
    // Clear the queue
    this.rtdbUpdateQueue = [];
  }

  /**
   * Finalize the move operation
   * @param {Function} recordAction - History recording function for undo/redo
   * @returns {Promise} Promise that resolves when all operations complete
   */
  async end(recordAction) {
    // Immediately stop RTDB updates to prevent trailing movement
    this._active = false;
    
    console.log('🏁 Finalizing move interaction for', this.selectedShapes.length, 'objects');
    
    if (Object.keys(this.localUpdates).length === 0) {
      console.log('📝 No movement detected - skipping finalization');
      return;
    }
    
    // Prepare batch operations for performance
    const clearActivePromises = [];
    const updatePromises = [];
    
    // Process each moved object
    this.selectedShapes.forEach(shapeInfo => {
      const finalShape = this.localUpdates[shapeInfo.id];
      
      // Only process objects that were actually moved and we can edit
      if (finalShape && this.canEditObject(shapeInfo.id)) {
        // Clear from RTDB (stop real-time tracking)
        if (this.canvasId) {
          clearActivePromises.push(
            clearActiveObject(this.canvasId, shapeInfo.id)
          );
        }
        
        // Update Firestore with final position and undo/redo support
        updatePromises.push(
          updateObject(
            shapeInfo.id,
            {
              x: finalShape.x,
              y: finalShape.y
            },
            recordAction, // Undo/redo integration
            {
              actionType: ACTION_TYPES.MOVE_OBJECT,
              before: { x: shapeInfo.startX, y: shapeInfo.startY },
              objectType: shapeInfo.type.charAt(0).toUpperCase() + shapeInfo.type.slice(1)
            }
          )
        );
        
        console.log(`💾 Finalizing ${shapeInfo.type} ${shapeInfo.id}:`, {
          from: { x: shapeInfo.startX, y: shapeInfo.startY },
          to: { x: finalShape.x, y: finalShape.y }
        });
      }
    });
    
    try {
      // Execute all operations in parallel for better performance
      await Promise.all([...clearActivePromises, ...updatePromises]);
      console.log('✅ Move interaction completed - all objects synced to Firestore');
      
      // Add to history manager if available (for manual undo/redo tracking)
      if (window.historyManager && recordAction) {
        const historyEntry = {
          type: "move",
          from: this.selectedShapes.map(s => ({
            id: s.id, 
            x: s.startX, 
            y: s.startY
          })),
          to: this.selectedShapes.map(s => {
            const finalShape = this.localUpdates[s.id];
            return { 
              id: s.id, 
              x: finalShape?.x || s.startX, 
              y: finalShape?.y || s.startY 
            };
          })
        };
        window.historyManager.push(historyEntry);
      }
      
    } catch (error) {
      console.error('❌ Failed to finalize move interaction:', error);
      
      // Attempt cleanup even if updates failed
      try {
        await Promise.all(clearActivePromises);
        console.log('🧹 RTDB cleanup completed despite update failures');
      } catch (cleanupError) {
        console.error('Failed RTDB cleanup:', cleanupError);
      }
      
      throw error; // Re-throw for caller to handle
    }
  }

  /**
   * Cancel the move operation (restore original positions)
   */
  cancel() {
    // Immediately stop RTDB updates
    this._active = false;
    
    console.log('❌ Cancelling move interaction');
    
    // Clear any RTDB tracking
    if (this.canvasId) {
      this.selectedShapes.forEach(shapeInfo => {
        clearActiveObject(this.canvasId, shapeInfo.id).catch(err => {
          console.warn('Failed to clear active object during cancel:', err);
        });
      });
    }
    
    // Clear local updates (restore original positions in UI)
    this.localUpdates = {};
    
    if (this.onUpdate) {
      this.onUpdate(this.localUpdates);
    }
  }

  /**
   * Get the current local updates for external use
   * @returns {Object} Current local position updates
   */
  getLocalUpdates() {
    return { ...this.localUpdates };
  }

  /**
   * Get summary information about this move interaction
   * @returns {Object} Move interaction summary
   */
  getSummary() {
    return {
      objectCount: this.selectedShapes.length,
      startPoint: this.startPoint,
      objectTypes: this.selectedShapes.map(s => s.type),
      objectIds: this.selectedShapes.map(s => s.id),
      hasLocalUpdates: Object.keys(this.localUpdates).length > 0
    };
  }

  /**
   * Deep clone an object while preserving Date objects and other types
   * @param {*} obj - Object to clone
   * @returns {*} Deep cloned object
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this._deepClone(item));
    }
    
    if (typeof obj === 'object') {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this._deepClone(obj[key]);
        }
      }
      return cloned;
    }
    
    return obj;
  }
}

export default MoveInteraction;
