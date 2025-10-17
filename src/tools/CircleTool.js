/**
 * CircleTool - Handles circle creation
 * Creates circles by dragging from center point
 */

import { createObject } from '../services/canvas.service.js';

export class CircleTool {
  /**
   * Handle mouse down - start creating circle
   */
  onMouseDown(e, state, helpers) {
    const { pos, canvasId } = helpers;
    const { 
      isDrawing,
      setIsDrawing, 
      setDrawStart 
    } = state;

    console.log('Circle tool mouse down');

    // Prevent multiple simultaneous draws
    if (isDrawing) {
      console.log('Already drawing - ignoring click');
      return;
    }

    // Start drawing circle from this point (will be center)
    setIsDrawing(true);
    setDrawStart(pos);
    console.log('Started drawing circle at:', pos);
  }

  /**
   * Handle mouse move - update circle radius preview
   */
  onMouseMove(e, state, helpers) {
    const { pos } = helpers;
    const {
      isDrawing,
      drawStart,
      setCurrentCircle,
      clampCircleToCanvas
    } = state;

    if (!isDrawing || !drawStart) return;

    // Calculate radius from center to current position
    const dx = pos.x - drawStart.x;
    const dy = pos.y - drawStart.y;
    const radius = Math.sqrt(dx * dx + dy * dy);

    // Create circle with minimum radius
    const circle = {
      x: drawStart.x,
      y: drawStart.y,
      radius: Math.max(radius, 1) // Minimum radius of 1px
    };

    // Clamp circle to canvas boundaries
    const clampedCircle = clampCircleToCanvas(circle);

    // Update current circle preview
    setCurrentCircle(clampedCircle);
  }

  /**
   * Handle mouse up - finalize circle creation
   */
  async onMouseUp(e, state, helpers) {
    const { canvasId } = helpers;
    const {
      isDrawing,
      drawStart,
      currentCircle,
      isOnline,
      setIsDrawing,
      setDrawStart,
      setCurrentCircle,
      clampCircleToCanvas
    } = state;

    if (!isDrawing || !drawStart || !currentCircle) return;

    const radius = currentCircle.radius;

    // Only create if radius is at least 1 pixel
    if (radius < 1) {
      console.log('Circle too small, canceling');
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentCircle(null);
      return;
    }

    // Check if online
    if (!isOnline) {
      console.log('Cannot create circle - offline');
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentCircle(null);
      return;
    }

    try {
      // Final clamp to ensure circle stays in bounds
      const finalCircle = clampCircleToCanvas(currentCircle);
      
      console.log('Creating circle:', finalCircle);

      // Create circle object
      // Store center point and radius
      await createObject('circle', {
        x: finalCircle.x,
        y: finalCircle.y
      }, canvasId, {
        radius: finalCircle.radius,
        fill: '#808080' // Default gray
      });

      console.log('Circle created successfully');
    } catch (error) {
      console.error('Failed to create circle:', error);
    } finally {
      // Reset drawing state
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentCircle(null);
    }
  }

  /**
   * Get cursor style for this tool
   */
  getCursor() {
    return 'crosshair';
  }
}

export default CircleTool;

