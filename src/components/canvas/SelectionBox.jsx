import React from 'react';
import { Rect } from 'react-konva';

/**
 * SelectionBox - Visual drag selection rectangle
 * 
 * Renders the blue dashed selection rectangle when user drags on empty canvas.
 * Shows real-time preview of selection area with 15% opacity fill.
 * 
 * Visual Design:
 * - Border: 2px dashed #3B82F6 (blue)
 * - Fill: rgba(59, 130, 246, 0.15) (15% opacity blue)
 * - Subtle animation on border (optional)
 * 
 * Usage:
 * ```jsx
 * {selectionRectangle && (
 *   <SelectionBox rectangle={selectionRectangle} />
 * )}
 * ```
 */
const SelectionBox = ({ rectangle }) => {
  if (!rectangle) return null;

  const { x, y, width, height } = rectangle;

  // Render even tiny rectangles for instant visual feedback
  // (minimum 1px to ensure visibility)
  if (width < 1 || height < 1) return null;

  return (
    <>
      {/* Fill - semi-transparent blue */}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="rgba(59, 130, 246, 0.15)"
        listening={false}
      />
      
      {/* Border - dashed blue */}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        stroke="#3B82F6"
        strokeWidth={2}
        dash={[10, 5]}
        listening={false}
      />
    </>
  );
};

export default SelectionBox;

