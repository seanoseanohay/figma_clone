/**
 * StarTool - Handles star shape creation
 * Creates stars by dragging from center point
 */

import { createObject } from '../services/canvas.service.js';
import { ACTION_TYPES } from '../hooks/useHistory.js';

export class StarTool {
  /**
   * Handle mouse down - start creating star
   */
  onMouseDown(e, state, helpers) {
    const { pos, canvasId } = helpers;
    const { 
      isDrawing,
      setIsDrawing, 
      setDrawStart 
    } = state;

    console.log('Star tool mouse down');

    // Prevent multiple simultaneous draws
    if (isDrawing) {
      console.log('Already drawing - ignoring click');
      return;
    }

    // Start drawing star from this point (will be center)
    setIsDrawing(true);
    setDrawStart(pos);
    console.log('Started drawing star at:', pos);
  }

  /**
   * Handle mouse move - update star radius preview
   */
  onMouseMove(e, state, helpers) {
    const { pos } = helpers;
    const {
      isDrawing,
      drawStart,
      setCurrentStar,
      clampStarToCanvas
    } = state;

    if (!isDrawing || !drawStart) return;

    // Calculate outer radius from center to current position
    const dx = pos.x - drawStart.x;
    const dy = pos.y - drawStart.y;
    const outerRadius = Math.sqrt(dx * dx + dy * dy);

    // Create star with default 5 points
    const star = {
      x: drawStart.x,
      y: drawStart.y,
      numPoints: 5,
      innerRadius: Math.max(outerRadius * 0.4, 1), // Inner radius is 40% of outer
      outerRadius: Math.max(outerRadius, 1) // Minimum radius of 1px
    };

    // Clamp star to canvas boundaries
    const clampedStar = clampStarToCanvas ? clampStarToCanvas(star) : star;

    // Update current star preview
    setCurrentStar(clampedStar);
  }

  /**
   * Handle mouse up - finalize star creation
   */
  async onMouseUp(e, state, helpers) {
    const { canvasId, recordAction } = helpers;
    const {
      isDrawing,
      drawStart,
      currentStar,
      isOnline,
      selectedColor,
      setIsDrawing,
      setDrawStart,
      setCurrentStar,
      clampStarToCanvas
    } = state;

    if (!isDrawing || !drawStart || !currentStar) return;

    const outerRadius = currentStar.outerRadius;

    // Only create if radius is at least 5 pixels
    if (outerRadius < 5) {
      console.log('Star too small, canceling');
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentStar(null);
      return;
    }

    // Check if online
    if (!isOnline) {
      console.log('Cannot create star - offline');
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentStar(null);
      return;
    }

    try {
      // Final clamp to ensure star stays in bounds
      const finalStar = clampStarToCanvas ? clampStarToCanvas(currentStar) : currentStar;
      
      console.log('Creating star:', finalStar);

      // Create star object with selected color
      const starId = await createObject('star', {
        x: finalStar.x,
        y: finalStar.y
      }, canvasId, {
        numPoints: finalStar.numPoints,
        innerRadius: finalStar.innerRadius,
        outerRadius: finalStar.outerRadius,
        fill: selectedColor || '#808080'
      });

      // Record creation action for undo/redo
      if (recordAction && starId) {
        const createdStar = {
          id: starId,
          type: 'star',
          x: finalStar.x,
          y: finalStar.y,
          numPoints: finalStar.numPoints,
          innerRadius: finalStar.innerRadius,
          outerRadius: finalStar.outerRadius,
          fill: selectedColor || '#808080'
        };
        
        recordAction(
          ACTION_TYPES.CREATE_OBJECT,
          starId,
          null, // No before state for creation
          createdStar,
          { objectType: 'Star' }
        );
      }

      console.log('Star created successfully with color:', selectedColor);
    } catch (error) {
      console.error('Failed to create star:', error);
    } finally {
      // Reset drawing state
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentStar(null);
    }
  }

  /**
   * Get cursor style for this tool
   */
  getCursor() {
    return 'crosshair';
  }
}

export default StarTool;

