import { Rect, Circle, Star, Text, Line, Arc } from 'react-konva';
import { getUserCursorColor } from '../../services/presence.service.js';

/**
 * CanvasShapes Component
 * 
 * Renders all shapes on the canvas with proper z-index sorting and selection highlighting.
 * Extracted from Canvas.jsx to reduce complexity and improve maintainability.
 */

const CanvasShapes = ({ 
  shapes, 
  selectedObjectId, 
  multiSelection, 
  selectedShapeRef,
  selectedTool,
  TOOLS 
}) => {
  const renderShape = (shape) => {
    const isSelected = selectedObjectId === shape.id || multiSelection.selectedObjectIds.has(shape.id);
    const shouldAttachRef = isSelected && selectedTool === TOOLS.RESIZE && shape.rotation;
    
    // Get owner's color if locked by another user
    const ownerColor = shape.isLockedByOther && shape.lockedBy 
      ? getUserCursorColor(shape.lockedBy) 
      : null;
    
    const commonProps = {
      fill: shape.fill,
      stroke: shape.isLockedByOther 
        ? ownerColor // Use owner's color for locked objects
        : isSelected 
          ? (multiSelection.selectedObjectIds.size > 1 ? "#8B5CF6" : "#2563eb") // Purple for multi-select, blue for single
          : "#333333", // Default border
      strokeWidth: shape.isLockedByOther || isSelected ? 3 : 1, // Thicker border for locked/selected
      opacity: shape.isLockedByOther ? 0.8 : 1.0, // Slightly less dim for better visibility
      rotation: shape.rotation || 0,
      listening: false, // Disable events - handle via Stage only
      draggable: false,
      ...(shouldAttachRef ? { ref: selectedShapeRef } : {})
    };
    
    // Render based on shape type
    switch (shape.shapeType) {
      case 'rectangle':
        return <CanvasRectangle key={shape.id} shape={shape} commonProps={commonProps} />;
        
      case 'circle':
        return <CanvasCircle key={shape.id} shape={shape} commonProps={commonProps} />;
        
      case 'star':
        return <CanvasStar key={shape.id} shape={shape} commonProps={commonProps} />;
        
      case 'text':
        return <CanvasText key={shape.id} shape={shape} commonProps={commonProps} multiSelection={multiSelection} />;
        
      default:
        return null;
    }
  };

  return (
    <>
      {shapes.map(renderShape)}
    </>
  );
};

/**
 * Individual shape components for better organization
 */
const CanvasRectangle = ({ shape, commonProps }) => {
  // For rotation to work around center, set offset to center and adjust position
  const centerX = shape.x + shape.width / 2;
  const centerY = shape.y + shape.height / 2;
  
  return (
    <Rect
      {...commonProps}
      x={centerX}
      y={centerY}
      width={shape.width}
      height={shape.height}
      offsetX={shape.width / 2}
      offsetY={shape.height / 2}
    />
  );
};

const CanvasCircle = ({ shape, commonProps }) => (
  <Circle
    {...commonProps}
    x={shape.x}
    y={shape.y}
    radius={shape.radius}
  />
);

const CanvasStar = ({ shape, commonProps }) => (
  <Star
    {...commonProps}
    x={shape.x}
    y={shape.y}
    numPoints={shape.numPoints || 5}
    innerRadius={shape.innerRadius || 20}
    outerRadius={shape.outerRadius || 40}
  />
);

const CanvasText = ({ shape, commonProps, multiSelection }) => {
  const ownerColor = shape.isLockedByOther && shape.lockedBy 
    ? getUserCursorColor(shape.lockedBy) 
    : null;
    
  const isSelected = multiSelection.selectedObjectIds.has(shape.id);

  return (
    <Text
      {...commonProps}
      x={shape.x}
      y={shape.y}
      text={shape.text || 'Text'}
      fontSize={shape.fontSize || 24}
      fontFamily={shape.fontFamily || 'Arial'}
      fontStyle={`${shape.bold ? 'bold ' : ''}${shape.italic ? 'italic ' : 'normal'}`}
      textDecoration={shape.underline ? 'underline' : ''}
      fill={shape.fill}
      width={shape.width || 200}
      align={shape.align || 'left'}
      stroke={shape.isLockedByOther 
        ? ownerColor // Use owner's color for locked text
        : isSelected 
          ? (multiSelection.selectedObjectIds.size > 1 ? "#8B5CF6" : "#2563eb") // Purple for multi-select, blue for single
          : "transparent"} // No border for unselected text
      strokeWidth={shape.isLockedByOther || isSelected ? 1.5 : 0}
    />
  );
};

export default CanvasShapes;
