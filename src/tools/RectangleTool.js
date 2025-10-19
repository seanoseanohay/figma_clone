import { createObject } from '../services/canvas.service.js'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants/canvas.constants.js'
import { ACTION_TYPES } from '../hooks/useHistory.js'

/**
 * RectangleTool - Handles rectangle creation by dragging
 */
export class RectangleTool {
  constructor() {
    this.minWidth = 2
    this.minHeight = 1
  }

  /**
   * Handle mouse down - start drawing rectangle
   */
  onMouseDown(e, state, helpers) {
    const { pos } = helpers
    const { setIsDrawing, setCurrentRect, selectedColor } = state

    // Start rectangle creation
    if (pos.x >= 0 && pos.x <= CANVAS_WIDTH && pos.y >= 0 && pos.y <= CANVAS_HEIGHT) {
      setIsDrawing(true)
      const newRect = {
        id: Date.now(),
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        fill: selectedColor || '#808080'
      }
      setCurrentRect(newRect)
    }
  }

  /**
   * Handle mouse move - update rectangle dimensions as user drags
   */
  onMouseMove(e, state, helpers) {
    const { pos } = helpers
    const { isDrawing, currentRect, setCurrentRect } = state

    if (isDrawing && currentRect) {
      const width = pos.x - currentRect.x
      const height = pos.y - currentRect.y

      setCurrentRect({
        ...currentRect,
        width: width,
        height: height
      })
    }
  }

  /**
   * Handle mouse up - finalize and save rectangle
   */
  async onMouseUp(e, state, helpers) {
    const { canvasId, recordAction } = helpers
    const { 
      isDrawing, 
      currentRect, 
      clampRectToCanvas,
      selectedColor,
      setIsDrawing, 
      setCurrentRect
    } = state

    if (isDrawing && currentRect) {
      if (Math.abs(currentRect.width) >= this.minWidth && Math.abs(currentRect.height) >= this.minHeight) {
        // Normalize negative dimensions and enforce boundaries
        const finalRect = {
          x: currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x,
          y: currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y,
          width: Math.abs(currentRect.width),
          height: Math.abs(currentRect.height)
        }

        // Clamp to canvas bounds
        const clampedRect = clampRectToCanvas(finalRect)

        try {
          // Save rectangle to Firestore with undo/redo support
          const createArgs = [
            'rectangle', 
            clampedRect, 
            canvasId, 
            {
              fill: selectedColor || '#808080',
              stroke: '#333333',
              strokeWidth: 1
            }
          ]
          
          // Only pass recordAction if it exists
          if (recordAction) {
            createArgs.push(recordAction)
          }
          
          await createObject(...createArgs)
          console.log('Rectangle created and saved to Firestore with color:', selectedColor)
        } catch (error) {
          console.error('Failed to save rectangle:', error)
        }
      }

      // Reset drawing state (stay on rectangle tool)
      setIsDrawing(false)
      setCurrentRect(null)
    }
  }

  /**
   * Get cursor style for this tool
   */
  getCursor() {
    return 'crosshair'
  }
}

export default RectangleTool





