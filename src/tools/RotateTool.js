import { 
  lockObject, 
  unlockObject,
  updateObject,
  updateActiveObjectPosition 
} from '../services/canvas.service.js';

/**
 * RotateTool - Handles object rotation via visual rotation handle
 * 
 * Interaction Model:
 * - Shows a circular rotation handle above the selected object
 * - User drags the handle to rotate the object around its center
 * - Shift key snaps rotation to 15° increments
 * - Works with all shape types (rectangles, circles, stars)
 */
export class RotateTool {
  constructor() {
    this.ROTATION_HANDLE_OFFSET = 30 // Distance above object
    this.ROTATION_HANDLE_RADIUS = 12 // Radius of rotation handle circle
    this.SNAP_ANGLE = 15 // Snap increment when Shift is pressed (degrees)
  }

  /**
   * Handle mouse down - Check if clicking on rotation handle, lock object
   */
  async onMouseDown(e, state, helpers) {
    const { pos, canvasId } = helpers;
    const {
      selectedObjectId,
      canvasObjects,
      canEditObject,
      setSelectedObjectId,
      setRotateSelectedId,
      setIsRotating,
      setRotateStartData
    } = state;

    // Check if clicking on rotation handle of currently selected object
    if (selectedObjectId) {
      const selectedObj = canvasObjects.find(o => o.id === selectedObjectId);
      
      if (selectedObj && !selectedObj.isLockedByOther) {
        const handlePos = this.getRotationHandlePosition(selectedObj);
        const distance = Math.sqrt(
          Math.pow(pos.x - handlePos.x, 2) + 
          Math.pow(pos.y - handlePos.y, 2)
        );
        
        if (distance <= this.ROTATION_HANDLE_RADIUS) {
          console.log('🔄 Rotation handle clicked, starting rotation');
          
          // Lock the object
          try {
            await lockObject(selectedObj.id);
            console.log('✅ Object locked for rotation');
          } catch (error) {
            console.error('Failed to lock object:', error);
            return;
          }
          
          setIsRotating(true);
          setRotateSelectedId(selectedObj.id);
          setRotateStartData({
            object: selectedObj,
            startPos: pos,
            startAngle: this.calculateAngle(selectedObj, pos),
            initialRotation: selectedObj.rotation || 0
          });
          
          return;
        }
      }
    }

    // If not clicking on rotation handle, check if clicking on an object
    const clickedObject = state.findObjectAt(pos);
    
    if (clickedObject && canEditObject(clickedObject.id)) {
      console.log('🔄 Object selected for rotation:', clickedObject.id);
      
      // Unlock previous selection
      if (selectedObjectId && selectedObjectId !== clickedObject.id) {
        await unlockObject(selectedObjectId).catch(err => {
          console.error('Failed to unlock previous object:', err);
        });
      }
      
      // Lock the new object
      try {
        await lockObject(clickedObject.id);
        console.log('✅ Object locked for rotation');
      } catch (error) {
        console.error('Failed to lock object:', error);
        return;
      }
      
      setSelectedObjectId(clickedObject.id);
      setRotateSelectedId(clickedObject.id);
    } else if (!clickedObject) {
      // Clicked on empty space - deselect
      if (selectedObjectId) {
        await unlockObject(selectedObjectId).catch(err => {
          console.error('Failed to unlock on deselect:', err);
        });
        setSelectedObjectId(null);
        setRotateSelectedId(null);
      }
    }
  }

  /**
   * Handle mouse move - rotate object
   */
  onMouseMove(e, state, helpers) {
    const { pos, canvasId } = helpers;
    const {
      isRotating,
      rotateStartData,
      rotateSelectedId,
      doWeOwnObject,
      setLocalRectUpdates
    } = state;

    if (!isRotating || !rotateStartData) return;

    const { object: startObject, initialRotation } = rotateStartData;
    
    // Calculate current angle
    const currentAngle = this.calculateAngle(startObject, pos);
    const startAngle = rotateStartData.startAngle;
    
    // Calculate rotation delta in degrees
    let deltaAngle = currentAngle - startAngle;
    
    // Normalize to -180 to 180 range
    while (deltaAngle > 180) deltaAngle -= 360;
    while (deltaAngle < -180) deltaAngle += 360;
    
    // Calculate new rotation
    let newRotation = initialRotation + deltaAngle;
    
    // Snap to 15° increments if Shift key is pressed
    if (e.evt.shiftKey) {
      newRotation = Math.round(newRotation / this.SNAP_ANGLE) * this.SNAP_ANGLE;
    }
    
    // Normalize to 0-360 range for consistency
    while (newRotation < 0) newRotation += 360;
    while (newRotation >= 360) newRotation -= 360;
    
    // Update local state for immediate visual feedback
    const updatedObject = {
      ...startObject,
      rotation: newRotation
    };
    
    setLocalRectUpdates(prev => ({
      ...prev,
      [rotateSelectedId]: updatedObject
    }));
    
    // Send real-time updates via RTDB if we own this object
    if (doWeOwnObject(rotateSelectedId)) {
      updateActiveObjectPosition(canvasId, rotateSelectedId, {
        x: startObject.x,
        y: startObject.y,
        rotation: newRotation
      });
    }
  }

  /**
   * Handle mouse up - finalize rotation
   */
  async onMouseUp(e, state, helpers) {
    const { canvasId } = helpers;
    const {
      isRotating,
      rotateSelectedId,
      rotateStartData,
      localRectUpdates,
      setIsRotating,
      setRotateStartData,
      setLocalRectUpdates
    } = state;

    if (isRotating && rotateSelectedId && rotateStartData) {
      console.log('🔄 Finalizing rotation');
      
      // Get the final local state
      const finalState = localRectUpdates[rotateSelectedId];
      
      if (finalState && finalState.rotation !== undefined) {
        try {
          // Save final rotation to Firestore
          await updateObject(rotateSelectedId, {
            rotation: finalState.rotation
          });
          
          console.log('✅ Rotation saved:', finalState.rotation);
          
          // Clear from RTDB
          await updateActiveObjectPosition(canvasId, rotateSelectedId, null);
        } catch (error) {
          console.error('Failed to save rotation:', error);
        }
      }
      
      // Unlock the object
      await unlockObject(rotateSelectedId).catch(err => {
        console.error('Failed to unlock after rotation:', err);
      });
      
      // Clear rotation state
      setIsRotating(false);
      setRotateStartData(null);
      
      // Clear local updates for this object
      setLocalRectUpdates(prev => {
        const updated = { ...prev };
        delete updated[rotateSelectedId];
        return updated;
      });
    }
  }

  /**
   * Calculate the position of the rotation handle for a given object
   */
  getRotationHandlePosition(object) {
    const rotation = object.rotation || 0;
    const rotationRad = (rotation * Math.PI) / 180;
    
    // Position handle above the object's center
    return {
      x: object.x - this.ROTATION_HANDLE_OFFSET * Math.sin(rotationRad),
      y: object.y - this.ROTATION_HANDLE_OFFSET * Math.cos(rotationRad)
    };
  }

  /**
   * Calculate angle in degrees from object center to mouse position
   */
  calculateAngle(object, mousePos) {
    const dx = mousePos.x - object.x;
    const dy = mousePos.y - object.y;
    
    // atan2 returns angle in radians, convert to degrees
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Adjust so 0° is pointing up (subtract 90°)
    angle += 90;
    
    // Normalize to 0-360 range
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    
    return angle;
  }

  /**
   * Check if a point is near the rotation handle
   */
  isPointOnRotationHandle(point, object) {
    const handlePos = this.getRotationHandlePosition(object);
    const distance = Math.sqrt(
      Math.pow(point.x - handlePos.x, 2) + 
      Math.pow(point.y - handlePos.y, 2)
    );
    
    return distance <= this.ROTATION_HANDLE_RADIUS;
  }
}


