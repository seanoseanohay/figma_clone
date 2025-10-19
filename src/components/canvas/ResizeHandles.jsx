import { Rect } from 'react-konva';

/**
 * ResizeHandles Component
 * 
 * Renders resize handles for selected objects when in RESIZE tool mode.
 * Extracted from Canvas.jsx to reduce complexity and improve maintainability.
 */

const ResizeHandles = ({ 
  selectedTool, 
  resizeSelectedId, 
  rectangles, 
  circles, 
  stars, 
  texts,
  TOOLS,
  HANDLE_SIZE = 20 
}) => {
  if (selectedTool !== TOOLS.RESIZE || !resizeSelectedId) {
    return null;
  }

  return (
    <>
      {/* Rectangle handles */}
      <RectangleHandles 
        rectangles={rectangles}
        resizeSelectedId={resizeSelectedId}
        HANDLE_SIZE={HANDLE_SIZE}
      />
      
      {/* Circle handles */}
      <CircleHandles 
        circles={circles}
        resizeSelectedId={resizeSelectedId}
        HANDLE_SIZE={HANDLE_SIZE}
      />
      
      {/* Star handles */}
      <StarHandles 
        stars={stars}
        resizeSelectedId={resizeSelectedId}
        HANDLE_SIZE={HANDLE_SIZE}
      />
      
      {/* Text handles */}
      <TextHandles 
        texts={texts}
        resizeSelectedId={resizeSelectedId}
        HANDLE_SIZE={HANDLE_SIZE}
      />
    </>
  );
};

const RectangleHandles = ({ rectangles, resizeSelectedId, HANDLE_SIZE }) => {
  const selectedRect = rectangles.find(r => r.id === resizeSelectedId);
  
  if (!selectedRect || selectedRect.isLockedByOther) {
    return null;
  }
  
  // Don't show custom handles if object has rotation (Transformer handles that)
  if (selectedRect.rotation && selectedRect.rotation !== 0) {
    return null;
  }
  
  return <BaseHandles object={selectedRect} HANDLE_SIZE={HANDLE_SIZE} prefix="handle" />;
};

const CircleHandles = ({ circles, resizeSelectedId, HANDLE_SIZE }) => {
  const selectedCircle = circles.find(c => c.id === resizeSelectedId);
  
  if (!selectedCircle || selectedCircle.isLockedByOther) {
    return null;
  }
  
  // Don't show custom handles if object has rotation (Transformer handles that)
  if (selectedCircle.rotation && selectedCircle.rotation !== 0) {
    return null;
  }
  
  // Position handles on circle's bounding box corners
  const bounds = {
    x: selectedCircle.x - selectedCircle.radius,
    y: selectedCircle.y - selectedCircle.radius,
    width: selectedCircle.radius * 2,
    height: selectedCircle.radius * 2
  };
  
  return <BaseHandles object={bounds} HANDLE_SIZE={HANDLE_SIZE} prefix="circle-handle" />;
};

const StarHandles = ({ stars, resizeSelectedId, HANDLE_SIZE }) => {
  const selectedStar = stars.find(s => s.id === resizeSelectedId);
  
  if (!selectedStar || selectedStar.isLockedByOther) {
    return null;
  }
  
  // Don't show custom handles if object has rotation (Transformer handles that)
  if (selectedStar.rotation && selectedStar.rotation !== 0) {
    return null;
  }
  
  // Position handles on star's bounding box corners (based on outerRadius)
  const bounds = {
    x: selectedStar.x - selectedStar.outerRadius,
    y: selectedStar.y - selectedStar.outerRadius,
    width: selectedStar.outerRadius * 2,
    height: selectedStar.outerRadius * 2
  };
  
  return <BaseHandles object={bounds} HANDLE_SIZE={HANDLE_SIZE} prefix="star-handle" />;
};

const TextHandles = ({ texts, resizeSelectedId, HANDLE_SIZE }) => {
  const selectedText = texts.find(t => t.id === resizeSelectedId);
  
  if (!selectedText || selectedText.isLockedByOther) {
    return null;
  }
  
  // Don't show custom handles if object has rotation (Transformer handles that)
  if (selectedText.rotation && selectedText.rotation !== 0) {
    return null;
  }
  
  // Calculate text height based on font size and line count
  const fontSize = selectedText.fontSize || 24;
  const charWidth = fontSize * 0.6; // Rough estimate
  const charsPerLine = Math.floor((selectedText.width || 200) / charWidth);
  const lineCount = Math.max(1, Math.ceil((selectedText.text?.length || 4) / charsPerLine));
  const lineHeight = fontSize * 1.2;
  const textHeight = lineCount * lineHeight;
  
  const bounds = {
    x: selectedText.x,
    y: selectedText.y,
    width: selectedText.width || 200,
    height: textHeight
  };
  
  return <BaseHandles object={bounds} HANDLE_SIZE={HANDLE_SIZE} prefix="text-handle" />;
};

/**
 * Base component for rendering corner handles
 */
const BaseHandles = ({ object, HANDLE_SIZE, prefix }) => {
  const handlePadding = 5; // Distance from object edge
  
  const handles = [
    { name: 'nw', x: object.x + handlePadding, y: object.y + handlePadding },
    { name: 'ne', x: object.x + object.width - HANDLE_SIZE - handlePadding, y: object.y + handlePadding },
    { name: 'sw', x: object.x + handlePadding, y: object.y + object.height - HANDLE_SIZE - handlePadding },
    { name: 'se', x: object.x + object.width - HANDLE_SIZE - handlePadding, y: object.y + object.height - HANDLE_SIZE - handlePadding }
  ];
  
  return (
    <>
      {handles.map(handle => (
        <Rect
          key={`${prefix}-${handle.name}`}
          x={handle.x}
          y={handle.y}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          fill="#2563eb"
          stroke="#ffffff"
          strokeWidth={1}
          listening={false} // Disable built-in events - we handle clicks manually
        />
      ))}
    </>
  );
};

export default ResizeHandles;
