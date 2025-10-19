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
    // Store original positions to prevent accumulation during drag
    this.selectedShapes = selectedShapes.map(shape => ({
      id: shape.id,
      startX: shape.x,
      startY: shape.y,
      type: shape.type,
      originalShape: { ...shape } // Full shape data for boundary calculations
    }));
    
    this.startPoint = { x: startPoint.x, y: startPoint.y };
    this.onUpdate = onUpdate;
    this.canvasId = options.canvasId;
    this.canEditObject = options.canEditObject || (() => true);
    this.clampRectToCanvas = options.clampRectToCanvas || ((obj) => obj);
    this.clampCircleToCanvas = options.clampCircleToCanvas || ((obj) => obj);
    this.clampStarToCanvas = options.clampStarToCanvas || ((obj) => obj);
    
    // Track local updates for immediate visual feedback
    this.localUpdates = {};
    
    console.log('🎯 MoveInteraction created for', this.selectedShapes.length, 'objects');
    console.log('📍 Start point:', this.startPoint);
    console.log('📋 Objects to move:', this.selectedShapes.map(s => `${s.type}:${s.id}`));
  }

  /**
   * Update positions during mouse move
   * @param {Object} currentPoint - Current mouse position { x, y }
   * @returns {Object} localUpdates - Updated object positions for immediate rendering
   */
  move(currentPoint) {
    // Calculate delta from start point
    const dx = currentPoint.x - this.startPoint.x;
    const dy = currentPoint.y - this.startPoint.y;
    
    console.log('📐 Move delta:', { dx, dy });
    
    // Clear previous local updates
    this.localUpdates = {};
    
    // Apply delta to all selected shapes
    this.selectedShapes.forEach(shapeInfo => {
      // Calculate new position from original position (prevents accumulation)
      const newX = shapeInfo.startX + dx;
      const newY = shapeInfo.startY + dy;
      
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
      
      // Store for local rendering
      this.localUpdates[shapeInfo.id] = clampedShape;
      
      // Send real-time updates to RTDB for multiplayer sync (if we can edit this object)
      if (this.canvasId && this.canEditObject(shapeInfo.id)) {
        const rtdbData = {
          x: clampedShape.x,
          y: clampedShape.y
        };
        
        // Add shape-specific properties for complete sync
        if (shapeInfo.type === 'rectangle') {
          rtdbData.width = clampedShape.width;
          rtdbData.height = clampedShape.height;
        } else if (shapeInfo.type === 'circle') {
          rtdbData.radius = clampedShape.radius;
        } else if (shapeInfo.type === 'star') {
          rtdbData.innerRadius = clampedShape.innerRadius;
          rtdbData.outerRadius = clampedShape.outerRadius;
          rtdbData.numPoints = clampedShape.numPoints;
        }
        
        // Broadcast to other users via RTDB
        updateActiveObjectPosition(this.canvasId, shapeInfo.id, rtdbData);
      }
    });
    
    // Trigger canvas re-render with updated positions
    if (this.onUpdate) {
      this.onUpdate(this.localUpdates);
    }
    
    return this.localUpdates;
  }

  /**
   * Finalize the move operation
   * @param {Function} recordAction - History recording function for undo/redo
   * @returns {Promise} Promise that resolves when all operations complete
   */
  async end(recordAction) {
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
}

export default MoveInteraction;
