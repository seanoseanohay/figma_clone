import { useState, useRef, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { TOOLS } from './Toolbar.jsx';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  INITIAL_X, 
  INITIAL_Y, 
  INITIAL_ZOOM,
  CANVAS_BACKGROUND,
  BOUNDARY_BACKGROUND
} from '../../constants/canvas.constants.js';

const Canvas = ({ selectedTool, onToolChange }) => {
  const stageRef = useRef(null);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  
  // Rectangle creation state
  const [rectangles, setRectangles] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRect, setCurrentRect] = useState(null);
  
  // Rectangle selection and movement state
  const [selectedRectId, setSelectedRectId] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [dragStartPos, setDragStartPos] = useState(null);
  
  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null); // 'nw', 'ne', 'sw', 'se'
  const [resizeStartData, setResizeStartData] = useState(null);
  
  // Resize handle size - Made 2.5x bigger for better usability
  const HANDLE_SIZE = 20;
  
  // Helper function to get mouse position relative to canvas
  const getMousePos = useCallback((e) => {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    return transform.point(pointer);
  }, []);
  
  // Helper function to check if point is inside rectangle
  const isPointInRect = useCallback((point, rect) => {
    return point.x >= rect.x && 
           point.x <= rect.x + rect.width && 
           point.y >= rect.y && 
           point.y <= rect.y + rect.height;
  }, []);
  
  // Find rectangle at position
  const findRectAt = useCallback((pos) => {
    // Check from top to bottom (last drawn = topmost)
    for (let i = rectangles.length - 1; i >= 0; i--) {
      if (isPointInRect(pos, rectangles[i])) {
        return rectangles[i];
      }
    }
    return null;
  }, [rectangles, isPointInRect]);
  
  // Boundary enforcement functions
  const clampRectToCanvas = useCallback((rect) => {
    return {
      ...rect,
      x: Math.max(0, Math.min(rect.x, CANVAS_WIDTH - rect.width)),
      y: Math.max(0, Math.min(rect.y, CANVAS_HEIGHT - rect.height)),
      width: Math.min(rect.width, CANVAS_WIDTH - Math.max(0, rect.x)),
      height: Math.min(rect.height, CANVAS_HEIGHT - Math.max(0, rect.y))
    };
  }, []);
  
  // Check if point is in resize handle
  const getResizeHandle = useCallback((pos, rect) => {
    const handles = [
      { name: 'nw', x: rect.x - HANDLE_SIZE/2, y: rect.y - HANDLE_SIZE/2 },
      { name: 'ne', x: rect.x + rect.width - HANDLE_SIZE/2, y: rect.y - HANDLE_SIZE/2 },
      { name: 'sw', x: rect.x - HANDLE_SIZE/2, y: rect.y + rect.height - HANDLE_SIZE/2 },
      { name: 'se', x: rect.x + rect.width - HANDLE_SIZE/2, y: rect.y + rect.height - HANDLE_SIZE/2 }
    ];
    
    for (const handle of handles) {
      if (pos.x >= handle.x && pos.x <= handle.x + HANDLE_SIZE &&
          pos.y >= handle.y && pos.y <= handle.y + HANDLE_SIZE) {
        return handle.name;
      }
    }
    return null;
  }, [HANDLE_SIZE]);
  
  // Calculate initial view to center the canvas and fit it in viewport
  const initializeView = useCallback(() => {
    if (stageRef.current) {
      const stage = stageRef.current;
      const container = stage.container();
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      
      // Calculate zoom to fit the entire canvas with some padding
      const scaleX = (containerWidth * 0.8) / CANVAS_WIDTH;
      const scaleY = (containerHeight * 0.8) / CANVAS_HEIGHT;
      const scale = Math.min(scaleX, scaleY, INITIAL_ZOOM);
      
      // Center the canvas in the viewport
      const x = (containerWidth - CANVAS_WIDTH * scale) / 2;
      const y = (containerHeight - CANVAS_HEIGHT * scale) / 2;
      
      setStageScale(scale);
      setStagePos({ x, y });
      
      stage.scale({ x: scale, y: scale });
      stage.position({ x, y });
    }
  }, []);

  // Initialize view on component mount
  useEffect(() => {
    initializeView();
    
    // Re-initialize on window resize
    const handleResize = () => {
      setTimeout(initializeView, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initializeView]);

  // Handle zoom functionality
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    const mousePointTo = {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY(),
    };

    // Zoom sensitivity
    const scaleBy = 1.02;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const oldScale = stage.scaleX();
    const newScale = Math.max(0.1, Math.min(oldScale * Math.pow(scaleBy, direction), 5));

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    stage.position(newPos);
    setStageScale(newScale);
    setStagePos(newPos);
  }, []);

  // Handle mouse down - start panning, rectangle creation, selection, or resize
  const handleMouseDown = useCallback((e) => {
    const pos = getMousePos(e);
    
    if (selectedTool === TOOLS.HAND) {
      setIsDragging(true);
      e.target.getStage().container().style.cursor = 'grabbing';
    } else if (selectedTool === TOOLS.ARROW) {
      // Check if clicking on a selected rectangle's resize handle first
      const selectedRect = rectangles.find(r => r.id === selectedRectId);
      if (selectedRect) {
        const handle = getResizeHandle(pos, selectedRect);
        if (handle) {
          // Start resizing
          setIsResizing(true);
          setResizeHandle(handle);
          setResizeStartData({
            rect: { ...selectedRect },
            startPos: pos
          });
          return;
        }
      }
      
      // Arrow tool - select rectangle or deselect if clicking empty area
      const clickedRect = findRectAt(pos);
      if (clickedRect) {
        setSelectedRectId(clickedRect.id);
        setIsMoving(true);
        setDragStartPos(pos);
      } else {
        setSelectedRectId(null);
      }
    } else if (selectedTool === TOOLS.RECTANGLE) {
      // Start rectangle creation
      if (pos.x >= 0 && pos.x <= CANVAS_WIDTH && pos.y >= 0 && pos.y <= CANVAS_HEIGHT) {
        setIsDrawing(true);
        const newRect = {
          id: Date.now(),
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          fill: '#808080'
        };
        setCurrentRect(newRect);
      }
    }
  }, [selectedTool, getMousePos, findRectAt, rectangles, selectedRectId, getResizeHandle]);

  // Handle mouse move - pan, rectangle resize, rectangle movement, or rectangle creation
  const handleMouseMove = useCallback((e) => {
    const pos = getMousePos(e);
    
    if (selectedTool === TOOLS.HAND && isDragging) {
      const stage = e.target.getStage();
      const newPos = {
        x: stage.x() + e.evt.movementX,
        y: stage.y() + e.evt.movementY,
      };
      
      stage.position(newPos);
      setStagePos(newPos);
    } else if (selectedTool === TOOLS.ARROW && isResizing && resizeStartData && resizeHandle) {
      // Handle resizing
      const { rect: startRect, startPos } = resizeStartData;
      const deltaX = pos.x - startPos.x;
      const deltaY = pos.y - startPos.y;
      
      let newRect = { ...startRect };
      
      switch (resizeHandle) {
        case 'nw':
          newRect.x = startRect.x + deltaX;
          newRect.y = startRect.y + deltaY;
          newRect.width = startRect.width - deltaX;
          newRect.height = startRect.height - deltaY;
          break;
        case 'ne':
          newRect.y = startRect.y + deltaY;
          newRect.width = startRect.width + deltaX;
          newRect.height = startRect.height - deltaY;
          break;
        case 'sw':
          newRect.x = startRect.x + deltaX;
          newRect.width = startRect.width - deltaX;
          newRect.height = startRect.height + deltaY;
          break;
        case 'se':
          newRect.width = startRect.width + deltaX;
          newRect.height = startRect.height + deltaY;
          break;
      }
      
      // Enforce minimum size
      if (newRect.width < 2) newRect.width = 2;
      if (newRect.height < 1) newRect.height = 1;
      
      // Enforce boundary constraints
      newRect = clampRectToCanvas(newRect);
      
      setRectangles(prev => prev.map(rect => 
        rect.id === selectedRectId ? newRect : rect
      ));
      
    } else if (selectedTool === TOOLS.ARROW && isMoving && selectedRectId && dragStartPos) {
      // Move selected rectangle with boundary enforcement
      const deltaX = pos.x - dragStartPos.x;
      const deltaY = pos.y - dragStartPos.y;
      
      setRectangles(prev => prev.map(rect => {
        if (rect.id === selectedRectId) {
          const newRect = clampRectToCanvas({
            ...rect,
            x: rect.x + deltaX,
            y: rect.y + deltaY
          });
          return newRect;
        }
        return rect;
      }));
      
      setDragStartPos(pos);
    } else if (selectedTool === TOOLS.RECTANGLE && isDrawing && currentRect) {
      // Update rectangle size during drawing
      const width = pos.x - currentRect.x;
      const height = pos.y - currentRect.y;
      
      setCurrentRect({
        ...currentRect,
        width: width,
        height: height
      });
    }
  }, [selectedTool, isDragging, isMoving, isResizing, selectedRectId, dragStartPos, isDrawing, currentRect, getMousePos, resizeStartData, resizeHandle, clampRectToCanvas]);

  // Handle mouse up - stop panning, finish rectangle creation, stop moving, or stop resizing
  const handleMouseUp = useCallback((e) => {
    if (selectedTool === TOOLS.HAND) {
      setIsDragging(false);
      e.target.getStage().container().style.cursor = 'grab';
    } else if (selectedTool === TOOLS.ARROW && isMoving) {
      // Stop moving rectangle
      setIsMoving(false);
      setDragStartPos(null);
    } else if (selectedTool === TOOLS.ARROW && isResizing) {
      // Stop resizing rectangle
      setIsResizing(false);
      setResizeHandle(null);
      setResizeStartData(null);
    } else if (selectedTool === TOOLS.RECTANGLE && isDrawing && currentRect) {
      // Finish rectangle creation
      const minWidth = 2;
      const minHeight = 1;
      
      if (Math.abs(currentRect.width) >= minWidth && Math.abs(currentRect.height) >= minHeight) {
        // Normalize negative dimensions and enforce boundaries
        let finalRect = {
          ...currentRect,
          x: currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x,
          y: currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y,
          width: Math.abs(currentRect.width),
          height: Math.abs(currentRect.height)
        };
        
        finalRect = clampRectToCanvas(finalRect);
        setRectangles(prev => [...prev, finalRect]);
      }
      
      // Reset drawing state and switch back to arrow tool
      setIsDrawing(false);
      setCurrentRect(null);
      onToolChange(TOOLS.ARROW);
    }
  }, [selectedTool, isDrawing, isMoving, isResizing, currentRect, onToolChange, clampRectToCanvas]);

  // Set cursor based on selected tool
  useEffect(() => {
    if (stageRef.current) {
      const container = stageRef.current.container();
      switch (selectedTool) {
        case TOOLS.HAND:
          container.style.cursor = isDragging ? 'grabbing' : 'grab';
          break;
        case TOOLS.ARROW:
          container.style.cursor = 'default';
          break;
        case TOOLS.RECTANGLE:
          container.style.cursor = 'crosshair';
          break;
        default:
          container.style.cursor = 'default';
      }
    }
  }, [selectedTool, isDragging]);

  // Calculate stage dimensions to cover the entire viewport
  const [stageDimensions, setStageDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  useEffect(() => {
    const updateDimensions = () => {
      setStageDimensions({ 
        width: window.innerWidth, 
        height: window.innerHeight - 120 // Account for header and toolbar height
      });
    };
    
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calculate boundary background dimensions (extends beyond canvas bounds)
  const boundarySize = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 3; // Large enough to cover any zoom level
  const boundaryOffset = -boundarySize / 2 + Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 2;

  return (
    <div className="canvas-container bg-gray-200 overflow-hidden">
      <Stage
        ref={stageRef}
        width={stageDimensions.width}
        height={stageDimensions.height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        draggable={false} // We handle dragging manually for tool-specific behavior
      >
        <Layer>
          {/* Boundary background (extends beyond canvas) */}
          <Rect
            x={boundaryOffset}
            y={boundaryOffset}
            width={boundarySize}
            height={boundarySize}
            fill={BOUNDARY_BACKGROUND}
            listening={false}
          />
          
          {/* Main canvas area */}
          <Rect
            x={0}
            y={0}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            fill={CANVAS_BACKGROUND}
            stroke="#cccccc"
            strokeWidth={1}
            listening={selectedTool !== TOOLS.HAND} // Only listen for events when not using Hand Tool
          />
          
          {/* Render created rectangles */}
          {rectangles.map((rect) => (
            <Rect
              key={rect.id}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              fill={rect.fill}
              stroke={selectedRectId === rect.id ? "#2563eb" : "#333333"}
              strokeWidth={selectedRectId === rect.id ? 2 : 1}
            />
          ))}
          
          {/* Render resize handles for selected rectangle */}
          {selectedRectId && rectangles.find(r => r.id === selectedRectId) && (() => {
            const selectedRect = rectangles.find(r => r.id === selectedRectId);
            const handles = [
              { name: 'nw', x: selectedRect.x - HANDLE_SIZE/2, y: selectedRect.y - HANDLE_SIZE/2 },
              { name: 'ne', x: selectedRect.x + selectedRect.width - HANDLE_SIZE/2, y: selectedRect.y - HANDLE_SIZE/2 },
              { name: 'sw', x: selectedRect.x - HANDLE_SIZE/2, y: selectedRect.y + selectedRect.height - HANDLE_SIZE/2 },
              { name: 'se', x: selectedRect.x + selectedRect.width - HANDLE_SIZE/2, y: selectedRect.y + selectedRect.height - HANDLE_SIZE/2 }
            ];
            
            return handles.map(handle => (
              <Rect
                key={`handle-${handle.name}`}
                x={handle.x}
                y={handle.y}
                width={HANDLE_SIZE}
                height={HANDLE_SIZE}
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth={1}
              />
            ));
          })()}
          
          {/* Render current rectangle being drawn */}
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
        </Layer>
      </Stage>
    </div>
  );
};

export default Canvas;
