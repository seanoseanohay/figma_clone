import { Rect, Circle, Star, Line, Arc } from 'react-konva';

/**
 * CanvasOverlays Component
 * 
 * Renders overlays like rotation handles, drawing previews, and current shapes being drawn.
 * Extracted from Canvas.jsx to reduce complexity and improve maintainability.
 */

const CanvasOverlays = ({
  selectedTool,
  rotateSelectedId,
  rectangles,
  circles,
  stars,
  texts,
  currentRect,
  currentCircle,
  currentStar,
  TOOLS
}) => {
  return (
    <>
      {/* Rotation handle for selected object (ROTATE tool only) */}
      <RotationHandle
        selectedTool={selectedTool}
        rotateSelectedId={rotateSelectedId}
        rectangles={rectangles}
        circles={circles}
        stars={stars}
        texts={texts}
        TOOLS={TOOLS}
      />

      {/* Current shapes being drawn */}
      <DrawingPreviews
        currentRect={currentRect}
        currentCircle={currentCircle}
        currentStar={currentStar}
      />
    </>
  );
};

const RotationHandle = ({
  selectedTool,
  rotateSelectedId,
  rectangles,
  circles,
  stars,
  texts,
  TOOLS
}) => {
  if (selectedTool !== TOOLS.ROTATE || !rotateSelectedId) {
    return null;
  }

  const selectedObj = [...rectangles, ...circles, ...stars, ...texts].find(obj => obj.id === rotateSelectedId);
  
  if (!selectedObj || selectedObj.isLockedByOther) {
    return null;
  }
  
  // Calculate rotation handle position (30px above object center, adjusted for rotation)
  const ROTATION_HANDLE_OFFSET = 30;
  const ROTATION_HANDLE_RADIUS = 12;
  const rotation = selectedObj.rotation || 0;
  const rotationRad = (rotation * Math.PI) / 180;
  
  const handleX = selectedObj.x - ROTATION_HANDLE_OFFSET * Math.sin(rotationRad);
  const handleY = selectedObj.y - ROTATION_HANDLE_OFFSET * Math.cos(rotationRad);
  
  return (
    <>
      {/* Line connecting object center to rotation handle */}
      <Line
        key={`rotation-line-${selectedObj.id}`}
        points={[selectedObj.x, selectedObj.y, handleX, handleY]}
        stroke="#2563eb"
        strokeWidth={2}
        dash={[5, 5]}
        listening={false}
      />
      
      {/* Rotation handle (circular) */}
      <Circle
        key={`rotation-handle-${selectedObj.id}`}
        x={handleX}
        y={handleY}
        radius={ROTATION_HANDLE_RADIUS}
        fill="#2563eb"
        stroke="#ffffff"
        strokeWidth={2}
        listening={false}
      />
      
      {/* Rotation icon inside handle */}
      <Arc
        key={`rotation-icon-${selectedObj.id}`}
        x={handleX}
        y={handleY}
        innerRadius={ROTATION_HANDLE_RADIUS - 6}
        outerRadius={ROTATION_HANDLE_RADIUS - 4}
        angle={270}
        rotation={rotation + 45}
        fill="#ffffff"
        listening={false}
      />
    </>
  );
};

const DrawingPreviews = ({ currentRect, currentCircle, currentStar }) => (
  <>
    {/* Current rectangle being drawn */}
    {currentRect && (
      <Rect
        x={currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x}
        y={currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y}
        width={Math.abs(currentRect.width)}
        height={Math.abs(currentRect.height)}
        fill={currentRect.fill}
        stroke="#333333"
        strokeWidth={1}
        opacity={0.7}
      />
    )}

    {/* Current circle being drawn */}
    {currentCircle && (
      <Circle
        x={currentCircle.x}
        y={currentCircle.y}
        radius={currentCircle.radius}
        fill="#808080"
        stroke="#333333"
        strokeWidth={1}
        opacity={0.7}
      />
    )}

    {/* Current star being drawn */}
    {currentStar && (
      <Star
        x={currentStar.x}
        y={currentStar.y}
        numPoints={currentStar.numPoints || 5}
        innerRadius={currentStar.innerRadius || 20}
        outerRadius={currentStar.outerRadius || 40}
        fill="#808080"
        stroke="#333333"
        strokeWidth={1}
        opacity={0.7}
      />
    )}
  </>
);

export default CanvasOverlays;
