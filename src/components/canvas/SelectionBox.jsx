import React from 'react';
import { Rect } from 'react-konva';

/**
 * SelectionBox - Visual drag selection rectangle component
 * 
 * Renders the dashed blue selection rectangle during drag selection operations.
 * Shows real-time preview of what objects will be selected based on the "contains" rule.
 * 
 * Visual Design:
 * - Border: 2px dashed #3B82F6 (blue)
 * - Fill: rgba(59, 130, 246, 0.15) (15% opacity blue)
 * - Animation: Subtle border animation/pulsing
 * - Scale-aware: Adjusts thickness based on zoom level
 */
const SelectionBox = ({ 
  selectionRect, 
  isVisible = true, 
  stageScale = 1,
  opacity = 0.8 
}) => {
  // Don't render if not visible or no selection rectangle
  if (!isVisible || !selectionRect) {
    return null;
  }

  const { x, y, width, height } = selectionRect;

  // Validate dimensions
  if (width <= 0 || height <= 0) {
    return null;
  }

  // Scale-aware styling - maintain consistent visual thickness at all zoom levels
  const strokeWidth = Math.max(1, 2 / stageScale); // Minimum 1px, scale down with zoom
  const dashLength = Math.max(4, 8 / stageScale); // Maintain readable dash pattern

  return (
    <>
      {/* Selection rectangle fill (semi-transparent blue) */}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="rgba(59, 130, 246, 0.15)" // 15% blue opacity
        stroke="transparent"
        opacity={opacity}
        listening={false} // Don't intercept mouse events
        perfectDrawEnabled={false} // Performance optimization
      />
      
      {/* Selection rectangle border (dashed blue) */}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        stroke="#3B82F6" // Solid blue
        strokeWidth={strokeWidth}
        dash={[dashLength, dashLength / 2]} // Dashed pattern: 8px dash, 4px gap
        opacity={opacity}
        listening={false} // Don't intercept mouse events
        perfectDrawEnabled={false} // Performance optimization
      />
    </>
  );
};

export default SelectionBox;
