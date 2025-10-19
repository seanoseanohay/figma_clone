/**
 * DeleteTool - Click-to-delete tool for removing objects
 * User selects this tool, then clicks any object to delete it
 */

import { deleteObject } from '../services/canvas.service.js';
import { ACTION_TYPES } from '../hooks/useHistory.js';

export class DeleteTool {
  constructor() {
    this.hoverObjectId = null;
  }

  /**
   * Handle mouse down - prepare to delete clicked object
   */
  onMouseDown(e, state, helpers) {
    const { stage } = helpers;
    const { canvasObjects, canEditObject } = state;

    // Get the object under the cursor
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Find the topmost object at this position
    const clickedObject = this.getObjectAtPosition(pos, canvasObjects, stage);

    if (clickedObject) {
      // Store for deletion on mouseup (prevents accidental deletes during drags)
      this.pendingDeleteId = clickedObject.id;

      // Check if we can edit this object
      if (!canEditObject(clickedObject.id)) {
        console.log('Cannot delete object owned by another user');
        this.pendingDeleteId = null;
        return;
      }
    }
  }

  /**
   * Handle mouse move - show hover feedback
   */
  onMouseMove(e, state, helpers) {
    const { stage } = helpers;
    const { canvasObjects, setHoveredObjectId } = state;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Find object under cursor for hover effect
    const hoveredObject = this.getObjectAtPosition(pos, canvasObjects, stage);
    
    if (hoveredObject) {
      this.hoverObjectId = hoveredObject.id;
      if (setHoveredObjectId) {
        setHoveredObjectId(hoveredObject.id);
      }
    } else {
      this.hoverObjectId = null;
      if (setHoveredObjectId) {
        setHoveredObjectId(null);
      }
    }
  }

  /**
   * Handle mouse up - delete the object if still hovering over it
   */
  async onMouseUp(e, state, helpers) {
    const { canvasId, recordAction } = helpers;
    const { canvasObjects, canEditObject, isOnline } = state;

    if (!this.pendingDeleteId) return;

    const objectToDelete = canvasObjects.find(obj => obj.id === this.pendingDeleteId);
    
    if (!objectToDelete) {
      this.pendingDeleteId = null;
      return;
    }

    // Double-check permissions
    if (!canEditObject(this.pendingDeleteId)) {
      console.log('Cannot delete object - owned by another user');
      this.pendingDeleteId = null;
      return;
    }

    // Check if online
    if (!isOnline) {
      console.log('Cannot delete object - offline');
      this.pendingDeleteId = null;
      return;
    }

    try {
      console.log('Deleting object with Delete tool:', this.pendingDeleteId);

      // Record deletion for undo/redo
      if (recordAction) {
        recordAction(
          ACTION_TYPES.DELETE_OBJECT,
          this.pendingDeleteId,
          objectToDelete, // Before state (full object)
          null, // After state (deleted)
          { objectType: objectToDelete.type }
        );
      }

      // Delete from Firestore
      await deleteObject(canvasId, this.pendingDeleteId);
      
      console.log('Object deleted successfully');
    } catch (error) {
      console.error('Failed to delete object:', error);
    } finally {
      this.pendingDeleteId = null;
    }
  }

  /**
   * Find the topmost object at a given position
   */
  getObjectAtPosition(pos, canvasObjects, stage) {
    if (!canvasObjects || canvasObjects.length === 0) return null;

    // Get all shapes from the stage
    const shapes = stage.find('Rect, Circle, Star, Text').filter(shape => {
      // Exclude temporary drawing shapes
      return shape.id() && !shape.id().includes('temp');
    });

    // Sort by zIndex (highest first) to get topmost object
    const sortedShapes = shapes.sort((a, b) => {
      const aData = canvasObjects.find(obj => obj.id === a.id());
      const bData = canvasObjects.find(obj => obj.id === b.id());
      const aZ = aData?.zIndex || 0;
      const bZ = bData?.zIndex || 0;
      return bZ - aZ;
    });

    // Find the first shape that contains the point
    for (const shape of sortedShapes) {
      const shapePos = shape.getAbsolutePosition();
      const isInside = shape.intersects({
        x: pos.x - shapePos.x,
        y: pos.y - shapePos.y,
        width: 1,
        height: 1
      });

      if (isInside) {
        const objectData = canvasObjects.find(obj => obj.id === shape.id());
        if (objectData) {
          return objectData;
        }
      }
    }

    return null;
  }

  /**
   * Get cursor style for this tool
   */
  getCursor() {
    return this.hoverObjectId ? 'pointer' : 'not-allowed';
  }
}

export default DeleteTool;

