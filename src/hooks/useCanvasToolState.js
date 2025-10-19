import { useState } from 'react';

/**
 * useCanvasToolState Hook
 * 
 * Manages all tool-specific state for the canvas component.
 * Extracted from Canvas.jsx to reduce complexity and improve maintainability.
 */
export const useCanvasToolState = () => {
  // Pan tool state (simple)
  const [isPanning, setIsPanning] = useState(false);
  const [isTemporaryPan, setIsTemporaryPan] = useState(false); // For spacebar pan
  const [toolBeforePan, setToolBeforePan] = useState(null); // Track tool before spacebar pan
  
  // Selection state - persists across all tools
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [hoveredObjectId, setHoveredObjectId] = useState(null); // For Delete tool hover feedback
  
  // Rectangle creation state (Rectangle tool only)
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRect, setCurrentRect] = useState(null);
  
  // Circle creation state (Circle tool only)
  const [currentCircle, setCurrentCircle] = useState(null);
  const [drawStart, setDrawStart] = useState(null);
  
  // Star creation state (Star tool only)
  const [currentStar, setCurrentStar] = useState(null);
  
  // Text tool state (Text tool only)
  const [isEditingText, setIsEditingText] = useState(false);
  const [textEditData, setTextEditData] = useState(null); // { newTextPosition, object, originalText }
  const [textSelectedId, setTextSelectedId] = useState(null);
  
  // Move tool state (clean separation)
  const [moveSelectedId, setMoveSelectedId] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [mouseDownPos, setMouseDownPos] = useState(null);
  const [moveOriginalPos, setMoveOriginalPos] = useState(null); // Store original position
  
  // Resize tool state (clean separation)
  const [resizeSelectedId, setResizeSelectedId] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [resizeStartData, setResizeStartData] = useState(null);
  
  // Rotate tool state (clean separation)
  const [rotateSelectedId, setRotateSelectedId] = useState(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotateStartData, setRotateStartData] = useState(null);
  
  // Transformer state for rotation-aware resizing
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformStartData, setTransformStartData] = useState(null);
  
  // Local rectangle state during operations (for immediate visual feedback)
  const [localRectUpdates, setLocalRectUpdates] = useState({});
  
  // Hover state for ownership tooltips
  const [hoveredLockedObject, setHoveredLockedObject] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  // Get the currently selected object ID based on active tool
  const getSelectedObjectId = (selectedTool, TOOLS) => {
    if (selectedTool === TOOLS.MOVE) return moveSelectedId;
    if (selectedTool === TOOLS.RESIZE) return resizeSelectedId;
    if (selectedTool === TOOLS.ROTATE) return rotateSelectedId;
    if (selectedTool === TOOLS.TEXT) return textSelectedId;
    return null;
  };

  // Clear all tool states (useful when switching tools)
  const clearAllToolStates = () => {
    setIsDrawing(false);
    setCurrentRect(null);
    setCurrentCircle(null);
    setCurrentStar(null);
    setDrawStart(null);
    setIsEditingText(false);
    setTextEditData(null);
    setTextSelectedId(null);
    setMoveSelectedId(null);
    setIsMoving(false);
    setMouseDownPos(null);
    setMoveOriginalPos(null);
    setResizeSelectedId(null);
    setIsResizing(false);
    setResizeHandle(null);
    setResizeStartData(null);
    setRotateSelectedId(null);
    setIsRotating(false);
    setRotateStartData(null);
    setIsTransforming(false);
    setTransformStartData(null);
    setLocalRectUpdates({});
    setHoveredLockedObject(null);
    setHoverPosition({ x: 0, y: 0 });
  };

  // Clear specific tool states
  const clearMoveToolState = () => {
    setMoveSelectedId(null);
    setIsMoving(false);
    setMouseDownPos(null);
    setMoveOriginalPos(null);
  };

  const clearResizeToolState = () => {
    setResizeSelectedId(null);
    setIsResizing(false);
    setResizeHandle(null);
    setResizeStartData(null);
  };

  const clearRotateToolState = () => {
    setRotateSelectedId(null);
    setIsRotating(false);
    setRotateStartData(null);
  };

  const clearDrawingStates = () => {
    setIsDrawing(false);
    setCurrentRect(null);
    setCurrentCircle(null);
    setCurrentStar(null);
    setDrawStart(null);
  };

  return {
    // Pan tool state
    isPanning,
    setIsPanning,
    isTemporaryPan,
    setIsTemporaryPan,
    toolBeforePan,
    setToolBeforePan,
    
    // Selection state
    selectedObjectId,
    setSelectedObjectId,
    hoveredObjectId,
    setHoveredObjectId,
    
    // Drawing states
    isDrawing,
    setIsDrawing,
    currentRect,
    setCurrentRect,
    currentCircle,
    setCurrentCircle,
    currentStar,
    setCurrentStar,
    drawStart,
    setDrawStart,
    
    // Text tool state
    isEditingText,
    setIsEditingText,
    textEditData,
    setTextEditData,
    textSelectedId,
    setTextSelectedId,
    
    // Move tool state
    moveSelectedId,
    setMoveSelectedId,
    isMoving,
    setIsMoving,
    mouseDownPos,
    setMouseDownPos,
    moveOriginalPos,
    setMoveOriginalPos,
    
    // Resize tool state
    resizeSelectedId,
    setResizeSelectedId,
    isResizing,
    setIsResizing,
    resizeHandle,
    setResizeHandle,
    resizeStartData,
    setResizeStartData,
    
    // Rotate tool state
    rotateSelectedId,
    setRotateSelectedId,
    isRotating,
    setIsRotating,
    rotateStartData,
    setRotateStartData,
    
    // Transformer state
    isTransforming,
    setIsTransforming,
    transformStartData,
    setTransformStartData,
    
    // Local updates and hover state
    localRectUpdates,
    setLocalRectUpdates,
    hoveredLockedObject,
    setHoveredLockedObject,
    hoverPosition,
    setHoverPosition,
    
    // Utility functions
    getSelectedObjectId,
    clearAllToolStates,
    clearMoveToolState,
    clearResizeToolState,
    clearRotateToolState,
    clearDrawingStates
  };
};
