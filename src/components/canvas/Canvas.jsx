import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Stage, Layer, Rect } from 'react-konva';
import { auth } from '../../services/firebase.js';
import { TOOLS } from './Toolbar.jsx';
import UserCursor from './UserCursor.jsx';
import EmptyState from './EmptyState.jsx';
import { useCursorTracking } from '../../hooks/useCursorTracking.js';
import { usePresence } from '../../hooks/usePresence.js';
import { useCanvasObjects } from '../../hooks/useCanvasObjects.js';
import { useCanvas } from '../../hooks/useCanvas.js';
import { 
  createObject, 
  updateObjectPosition, 
  lockObject, 
  unlockObject,
  updateActiveObjectPosition,
  clearActiveObject,
  subscribeToActiveObjects
} from '../../services/canvas.service.js';
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
  // Get canvas ID from context
  const { canvasId } = useCanvas();
  
  // All hooks must be called before any conditional returns
  const stageRef = useRef(null);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  
  // Pan tool state (simple)
  const [isPanning, setIsPanning] = useState(false);
  
  // Multiplayer presence hooks
  const { updateCursor } = useCursorTracking();
  const { usersWithCursors } = usePresence();
  
  // Canvas objects hook for real-time sync - now canvas-specific
  const { objects: canvasObjects, isLoading: objectsLoading, error: objectsError} = useCanvasObjects(canvasId);
  
  // Rectangle creation state (Rectangle tool only)
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRect, setCurrentRect] = useState(null);
  
  // Move tool state (clean separation)
  const [moveSelectedId, setMoveSelectedId] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [moveStartPos, setMoveStartPos] = useState(null);
  const [mouseDownPos, setMouseDownPos] = useState(null);
  const [isDragThresholdExceeded, setIsDragThresholdExceeded] = useState(false);
  const [moveOriginalPos, setMoveOriginalPos] = useState(null); // Store original position
  
  // Resize tool state (clean separation)
  const [resizeSelectedId, setResizeSelectedId] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [resizeStartData, setResizeStartData] = useState(null);
  
  // Local rectangle state during operations (for immediate visual feedback)
  const [localRectUpdates, setLocalRectUpdates] = useState({});
  
  // Active objects being dragged by other users (from RTDB for real-time movement)
  const [activeObjects, setActiveObjects] = useState({});
  
  // Constants
  const DRAG_THRESHOLD = 5;
  const HANDLE_SIZE = 20; // Reduced from 40 to test zoom/coordinate issues
  
  // Get the currently selected object ID based on active tool
  const getSelectedObjectId = () => {
    if (selectedTool === TOOLS.MOVE) return moveSelectedId;
    if (selectedTool === TOOLS.RESIZE) return resizeSelectedId;
    return null;
  };

  // Filter rectangles from canvas objects and merge with local updates
  // Memoized to prevent unnecessary re-renders during drag operations
  const rectangles = useMemo(() => {
    return canvasObjects
      .filter(obj => obj.type === 'rectangle')
      .map(rect => {
        // If WE are controlling this object, show our local updates for immediate feedback
        if (localRectUpdates[rect.id] && rect.lockedBy === auth.currentUser?.uid) {
          return {
            ...rect,
            ...localRectUpdates[rect.id]
          };
        }
        
        // If another user is dragging this object, show real-time RTDB position
        if (activeObjects[rect.id] && rect.lockedBy !== auth.currentUser?.uid) {
          return {
            ...rect,
            x: activeObjects[rect.id].x,
            y: activeObjects[rect.id].y,
            width: activeObjects[rect.id].width !== undefined ? activeObjects[rect.id].width : rect.width,
            height: activeObjects[rect.id].height !== undefined ? activeObjects[rect.id].height : rect.height,
            isLockedByOther: true,
            lockedByName: rect.lastModifiedBy,
            isBeingDragged: true
          };
        }
        
        // For everyone else (including other users watching our movements), 
        // show the latest Firestore data which gets updated in real-time
        if (rect.lockedBy && rect.lockedBy !== auth.currentUser?.uid) {
          return {
            ...rect,
            isLockedByOther: true,
            lockedByName: rect.lastModifiedBy
          };
        }
        
        // No one is controlling it, show Firestore data
        return rect;
      });
  }, [canvasObjects, localRectUpdates, activeObjects]);

  // Helper function to check if current user can edit an object
  const canEditObject = useCallback((objectId) => {
    const obj = canvasObjects.find(o => o.id === objectId);
    if (!obj) return false;
    
    // If object is not locked, anyone can edit
    if (!obj.lockedBy) return true;
    
    // If current user locked it, they can edit
    if (obj.lockedBy === auth.currentUser?.uid) return true;
    
    // Check if lock is stale (older than 30 seconds)
    const lockAge = Date.now() - (obj.lockedAt?.toDate?.()?.getTime() || 0);
    const isLockStale = lockAge > 30000; // 30 seconds
    
    return isLockStale;
  }, [canvasObjects]);

  // Helper to check if current user owns/controls an object
  const doWeOwnObject = useCallback((objectId) => {
    const obj = canvasObjects.find(o => o.id === objectId);
    if (!obj || !obj.lockedBy) return false;
    
    return obj.lockedBy === auth.currentUser?.uid;
  }, [canvasObjects]);
  
  // Helper function to get mouse position relative to canvas
  const getMousePos = useCallback((e) => {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    
    // Standard Konva coordinate transformation
    const result = {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY()
    };
    
    return result;
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

  // Simple crossover detection - handles coordinate flipping when resizing past opposite corners
  const handleCrossoverDetection = useCallback((mousePos, currentHandle, originalRect) => {
    const { x: mouseX, y: mouseY } = mousePos;
    
    // Calculate the opposite corner coordinates of the original rectangle
    const leftX = originalRect.x;
    const rightX = originalRect.x + originalRect.width;
    const topY = originalRect.y;  
    const bottomY = originalRect.y + originalRect.height;
    
    let newHandle = currentHandle;
    let hasFlipped = false;
    
    // Check for crossovers based on current handle
    switch (currentHandle) {
      case 'nw':
        // NW handle: check if crossed right edge (becomes NE) or bottom edge (becomes SW) or both (becomes SE)
        if (mouseX > rightX && mouseY > bottomY) {
          newHandle = 'se';
          hasFlipped = true;
        } else if (mouseX > rightX) {
          newHandle = 'ne';
          hasFlipped = true;
        } else if (mouseY > bottomY) {
          newHandle = 'sw';
          hasFlipped = true;
        }
        break;
        
      case 'ne':
        // NE handle: check if crossed left edge (becomes NW) or bottom edge (becomes SE) or both (becomes SW)
        if (mouseX < leftX && mouseY > bottomY) {
          newHandle = 'sw';
          hasFlipped = true;
        } else if (mouseX < leftX) {
          newHandle = 'nw';
          hasFlipped = true;
        } else if (mouseY > bottomY) {
          newHandle = 'se';
          hasFlipped = true;
        }
        break;
        
      case 'sw':
        // SW handle: check if crossed right edge (becomes SE) or top edge (becomes NW) or both (becomes NE)
        if (mouseX > rightX && mouseY < topY) {
          newHandle = 'ne';
          hasFlipped = true;
        } else if (mouseX > rightX) {
          newHandle = 'se';
          hasFlipped = true;
        } else if (mouseY < topY) {
          newHandle = 'nw';
          hasFlipped = true;
        }
        break;
        
      case 'se':
        // SE handle: check if crossed left edge (becomes SW) or top edge (becomes NE) or both (becomes NW)
        if (mouseX < leftX && mouseY < topY) {
          newHandle = 'nw';
          hasFlipped = true;
        } else if (mouseX < leftX) {
          newHandle = 'sw';
          hasFlipped = true;
        } else if (mouseY < topY) {
          newHandle = 'ne';
          hasFlipped = true;
        }
        break;
    }
    
    // If flipped, calculate new rectangle with proper coordinate swapping
    if (hasFlipped) {
      // Mouse becomes the new corner, find the opposite corner in original rectangle
      let oppositeX, oppositeY;
      
      switch (newHandle) {
        case 'nw':
          oppositeX = rightX;
          oppositeY = bottomY;
          break;
        case 'ne':
          oppositeX = leftX;
          oppositeY = bottomY;
          break;
        case 'sw':
          oppositeX = rightX;
          oppositeY = topY;
          break;
        case 'se':
          oppositeX = leftX;
          oppositeY = topY;
          break;
      }
      
      // Create rectangle from mouse position to opposite corner
      const newRect = {
        x: Math.min(mouseX, oppositeX),
        y: Math.min(mouseY, oppositeY),
        width: Math.abs(mouseX - oppositeX),
        height: Math.abs(mouseY - oppositeY),
        fill: originalRect.fill
      };
      
      return { rect: newRect, handle: newHandle, flipped: true };
    }
    
    return { rect: null, handle: currentHandle, flipped: false };
  }, []);
  
  // Find closest corner to click position (within rectangle bounds)
  const getClosestCorner = useCallback((pos, rect) => {
    // Only detect corners if click is inside the rectangle
    if (pos.x < rect.x || pos.x > rect.x + rect.width || 
        pos.y < rect.y || pos.y > rect.y + rect.height) {
      return null;
    }
    
    const corners = [
      { name: 'nw', x: rect.x, y: rect.y },
      { name: 'ne', x: rect.x + rect.width, y: rect.y },
      { name: 'sw', x: rect.x, y: rect.y + rect.height },
      { name: 'se', x: rect.x + rect.width, y: rect.y + rect.height }
    ];
    
    let closestCorner = null;
    let minDistance = Infinity;
    
    corners.forEach(corner => {
      const distance = Math.sqrt(
        Math.pow(pos.x - corner.x, 2) + Math.pow(pos.y - corner.y, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestCorner = corner.name;
      }
    });
    
    console.log('🎯 Closest corner detected:', closestCorner);
    return closestCorner;
  }, []);

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

  // Subscribe to active objects (real-time movement from RTDB)
  useEffect(() => {
    if (!canvasId) return;

    console.log('Setting up active objects subscription for canvas:', canvasId);
    const unsubscribe = subscribeToActiveObjects(canvasId, (activeObjectsData) => {
      setActiveObjects(activeObjectsData);
    });

    return () => {
      console.log('Cleaning up active objects subscription');
      unsubscribe();
    };
  }, [canvasId]);

  // Clear selection when switching tools
  useEffect(() => {
    if (selectedTool === TOOLS.PAN || selectedTool === TOOLS.RECTANGLE) {
      // Clear all selections when switching to pan or rectangle tools
      setMoveSelectedId(null);
      setResizeSelectedId(null);
      setLocalRectUpdates({});
    }
  }, [selectedTool]);

  // MOUSE DOWN HANDLER - Tool-specific logic
  const handleMouseDown = useCallback(async (e) => {
    const pos = getMousePos(e);
    
    console.log('Mouse down detected, tool:', selectedTool);
    
    switch (selectedTool) {
      case TOOLS.PAN:
        setIsPanning(true);
        e.target.getStage().container().style.cursor = 'grabbing';
        break;
        
      case TOOLS.MOVE:
        // Click empty space = deselect
        const clickedRect = findRectAt(pos);
        if (!clickedRect) {
          if (moveSelectedId) {
            try {
              await unlockObject(moveSelectedId);
              console.log('Move tool: Deselected and unlocked object');
            } catch (error) {
              console.error('Failed to unlock on deselect:', error);
            }
          }
          setMoveSelectedId(null);
          return;
        }
        
        // Check if we can edit this object
        if (!canEditObject(clickedRect.id)) {
          console.log('Cannot select - object is locked by another user');
          return;
        }
        
        // Select object for potential movement
        setMoveSelectedId(clickedRect.id);
        setMouseDownPos(pos);
        setIsDragThresholdExceeded(false);
        setMoveOriginalPos({ x: clickedRect.x, y: clickedRect.y }); // Store original position
        
        // Lock the object to prevent others from grabbing it
        try {
          await lockObject(clickedRect.id);
          console.log('Move tool: Object locked for potential movement');
        } catch (error) {
          console.error('Failed to lock object:', error);
        }
        break;
        
      case TOOLS.RESIZE:
        console.log('Resize tool mouse down');
        
        // FIRST: Check if we clicked on a resize handle of the currently selected rectangle
        // This must come BEFORE checking for empty space, because handles extend outside rectangle bounds
        if (resizeSelectedId) {
          const currentlySelected = rectangles.find(r => r.id === resizeSelectedId);
          if (currentlySelected) {
            console.log('=== RECTANGLE DATA DEBUG ===');
            console.log('Selected rectangle ID:', resizeSelectedId);
            console.log('Rectangle locked by:', currentlySelected.lockedBy);
            console.log('Current user:', auth.currentUser?.uid);
            console.log('=== END RECTANGLE DEBUG ===');
            
            const handle = getClosestCorner(pos, currentlySelected);
            console.log('Checking closest corner on currently selected rectangle:', handle);
            if (handle) {
              console.log('Starting resize on corner:', handle, 'for selected rectangle');
              
              // CRITICAL: Only start new resize if we're not already resizing
              if (!isResizing) {
                // Lock the object for consecutive resizes (skip for test data)
                if (!currentlySelected.id.match(/^[12]$/)) {
                  try {
                    await lockObject(resizeSelectedId);
                    console.log('Re-locked object for consecutive resize');
                  } catch (error) {
                    console.error('Failed to lock object for consecutive resize:', error);
                    return;
                  }
                }
                
                setIsResizing(true);
                setResizeHandle(handle);
                setResizeStartData({
                  rect: { ...currentlySelected },
                  startPos: pos
                });
                
                return; // Handle click found - start resizing immediately
              } else {
                console.log('Already resizing - ignoring click to prevent jumping');
                return;
              }
            }
          }
        }
        
        // SECOND: Check if we clicked on a rectangle (for selection)
        const resizeClickedRect = findRectAt(pos);
        console.log('Found rectangle:', resizeClickedRect ? resizeClickedRect.id : 'none');
        
        if (!resizeClickedRect) {
          // Click empty space = deselect
          if (resizeSelectedId) {
            try {
              await unlockObject(resizeSelectedId);
            } catch (error) {
              console.error('Failed to unlock on deselect:', error);
            }
          }
          setResizeSelectedId(null);
          return;
        }
        
        // Check if we can edit this object
        if (!canEditObject(resizeClickedRect.id)) {
          console.log('Cannot select - object is locked by another user');
          return;
        }
        
        // Select object for resizing and show handles
        console.log('Selecting rectangle for resize:', resizeClickedRect.id);
        setResizeSelectedId(resizeClickedRect.id);
        
        // Lock the object (skip for test data)
        if (!resizeClickedRect.id.match(/^[12]$/)) {
          try {
            await lockObject(resizeClickedRect.id);
          } catch (error) {
            console.error('Failed to lock object:', error);
          }
        }
        break;
        
      case TOOLS.RECTANGLE:
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
        break;
    }
  }, [selectedTool, getMousePos, findRectAt, canEditObject, getClosestCorner, moveSelectedId, resizeSelectedId]);

  // MOUSE MOVE HANDLER - Tool-specific logic
  const handleMouseMove = useCallback((e) => {
    const pos = getMousePos(e);
    
    // Update cursor position for multiplayer (only when not actively manipulating)
    if (pos.x >= 0 && pos.x <= CANVAS_WIDTH && pos.y >= 0 && pos.y <= CANVAS_HEIGHT &&
        !isMoving && !isResizing && !isDrawing && !isPanning) {
      updateCursor(pos);
    }
    
    switch (selectedTool) {
      case TOOLS.PAN:
        if (isPanning) {
          const stage = e.target.getStage();
          const newPos = {
            x: stage.x() + e.evt.movementX,
            y: stage.y() + e.evt.movementY,
          };
          stage.position(newPos);
          setStagePos(newPos);
        }
        break;
        
      case TOOLS.MOVE:
        if (moveSelectedId && mouseDownPos) {
          // Check if we should start dragging (threshold detection)
          if (!isDragThresholdExceeded) {
            const distance = Math.sqrt(
              Math.pow(pos.x - mouseDownPos.x, 2) + 
              Math.pow(pos.y - mouseDownPos.y, 2)
            );
            
            if (distance > DRAG_THRESHOLD) {
              console.log('Move: Drag threshold exceeded, starting movement');
              setIsDragThresholdExceeded(true);
              setIsMoving(true);
              setMoveStartPos(mouseDownPos);
            }
          }
          
          // If we're now moving, handle the movement
          if (isDragThresholdExceeded && isMoving && moveStartPos && moveOriginalPos) {
            // Calculate delta from where we started dragging
            const deltaX = pos.x - moveStartPos.x;
            const deltaY = pos.y - moveStartPos.y;
            
            // Find the actual rectangle to get its dimensions
            const originalRect = canvasObjects.find(r => r.id === moveSelectedId && r.type === 'rectangle');
            if (originalRect) {
              // Apply delta to original position (prevents accumulation)
              const newRect = {
                ...originalRect,
                x: moveOriginalPos.x + deltaX,
                y: moveOriginalPos.y + deltaY
              };
              
              // Apply boundary constraints
              const clampedRect = clampRectToCanvas(newRect);
              
              // Apply local visual update for immediate feedback
              setLocalRectUpdates(prev => ({
                ...prev,
                [moveSelectedId]: clampedRect
              }));
              
              // Send updates if we own this object
              if (doWeOwnObject(moveSelectedId)) {
                // ONLY update RTDB during drag for real-time broadcasting (throttled to 75ms)
                // Firestore writes happen ONLY on drag end to avoid excessive database load
                updateActiveObjectPosition(canvasId, moveSelectedId, {
                  x: clampedRect.x,
                  y: clampedRect.y,
                  width: clampedRect.width,
                  height: clampedRect.height
                });
              }
            }
          }
        }
        break;
        
      case TOOLS.RESIZE:
        if (isResizing && resizeStartData && resizeHandle) {
          const { rect: startRect, startPos } = resizeStartData;
          const deltaX = pos.x - startPos.x;
          const deltaY = pos.y - startPos.y;
          
          let newRect = { ...startRect };
          let currentHandle = resizeHandle;
          
          // Apply resize transformation based on current handle
          switch (currentHandle) {
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
          
          // Check for crossover and handle coordinate flipping
          const crossoverResult = handleCrossoverDetection(pos, currentHandle, startRect);
          if (crossoverResult.flipped) {
            newRect = crossoverResult.rect;
            
            // Update the resize handle if crossover occurred
            if (crossoverResult.handle !== currentHandle) {
              console.log(`🔄 Crossover detected: ${currentHandle} → ${crossoverResult.handle}`);
              setResizeHandle(crossoverResult.handle);
            }
          }
          
          // Enforce minimum size FIRST to prevent disappearing rectangles
          if (newRect.width < 2) newRect.width = 2;
          if (newRect.height < 2) newRect.height = 2;
          
          // Enforce boundary constraints
          newRect = clampRectToCanvas(newRect);
          
          // Apply local visual update for immediate feedback
          setLocalRectUpdates(prev => ({
            ...prev,
            [resizeSelectedId]: newRect
          }));
          
          // Send updates if we own this object (skip for test data)
          if (doWeOwnObject(resizeSelectedId) && !resizeSelectedId.match(/^[12]$/)) {
            // ONLY update RTDB during drag for real-time broadcasting (throttled to 75ms)
            // Firestore writes happen ONLY on drag end to avoid excessive database load
            updateActiveObjectPosition(canvasId, resizeSelectedId, {
              x: newRect.x,
              y: newRect.y,
              width: newRect.width,
              height: newRect.height
            });
          }
        }
        break;
        
      case TOOLS.RECTANGLE:
        if (isDrawing && currentRect) {
          const width = pos.x - currentRect.x;
          const height = pos.y - currentRect.y;
          
          setCurrentRect({
            ...currentRect,
            width: width,
            height: height
          });
        }
        break;
    }
  }, [selectedTool, isPanning, moveSelectedId, mouseDownPos, isDragThresholdExceeded, isMoving, moveStartPos, isResizing, resizeStartData, resizeHandle, resizeSelectedId, isDrawing, currentRect, getMousePos, clampRectToCanvas, handleCrossoverDetection, updateCursor, doWeOwnObject, canvasObjects]);

  // MOUSE UP HANDLER - Tool-specific logic
  const handleMouseUp = useCallback(async (e) => {
    console.log('Mouse up with tool:', selectedTool);
    
    switch (selectedTool) {
      case TOOLS.PAN:
        setIsPanning(false);
        e.target.getStage().container().style.cursor = 'grab';
        break;
        
      case TOOLS.MOVE:
        if (isMoving && moveSelectedId && localRectUpdates[moveSelectedId] && doWeOwnObject(moveSelectedId)) {
          const finalRect = localRectUpdates[moveSelectedId];
          try {
            console.log('Move: Final position sync and unlock');
            
            // Clear active object from RTDB (remove real-time tracking)
            await clearActiveObject(canvasId, moveSelectedId);
            
            // Final Firestore update with unlock
            await updateObjectPosition(moveSelectedId, {
              x: finalRect.x,
              y: finalRect.y
            }, true); // true = final update, unlocks object
            
            console.log('Move: Rectangle position synced and unlocked');
          } catch (error) {
            console.error('Failed to sync rectangle position:', error);
            try {
              await clearActiveObject(canvasId, moveSelectedId);
              await unlockObject(moveSelectedId);
            } catch (unlockError) {
              console.error('Failed to unlock object:', unlockError);
            }
          }
        } else if (moveSelectedId && !isMoving) {
          // Just a click without drag - keep object locked since it's selected
          // Don't unlock here since user might want to start moving it
          console.log('Move: Click only - keeping object selected and locked');
        }
        
        // Reset movement states
        setIsMoving(false);
        setMoveStartPos(null);
        setMouseDownPos(null);
        setIsDragThresholdExceeded(false);
        setMoveOriginalPos(null);
        
        // Clear local updates after sync
        if (moveSelectedId) {
          setLocalRectUpdates(prev => {
            const updated = { ...prev };
            delete updated[moveSelectedId];
            return updated;
          });
        }
        break;
        
      case TOOLS.RESIZE:
        if (isResizing && resizeSelectedId && localRectUpdates[resizeSelectedId] && doWeOwnObject(resizeSelectedId)) {
          const finalRect = localRectUpdates[resizeSelectedId];
          try {
            console.log('Resize: Final resize sync and unlock');
            
            // Clear active object from RTDB (remove real-time tracking)
            await clearActiveObject(canvasId, resizeSelectedId);
            
            // Final Firestore update with unlock
            await updateObjectPosition(resizeSelectedId, {
              x: finalRect.x,
              y: finalRect.y,
              width: finalRect.width,
              height: finalRect.height
            }, true); // true = final update, unlocks object
            
            console.log('Resize: Rectangle resize synced and unlocked');
          } catch (error) {
            console.error('Failed to sync rectangle resize:', error);
            try {
              await clearActiveObject(canvasId, resizeSelectedId);
              await unlockObject(resizeSelectedId);
            } catch (unlockError) {
              console.error('Failed to unlock object:', unlockError);
            }
          }
        }
        
        // Reset resize states but keep object selected for consecutive resizes
        setIsResizing(false);
        setResizeHandle(null);
        setResizeStartData(null);
        
        // Don't clear resizeSelectedId - keep object selected for consecutive resizes
        // Only clear when user clicks elsewhere or switches tools
        
        // Clear local updates after sync
        if (resizeSelectedId) {
          setLocalRectUpdates(prev => {
            const updated = { ...prev };
            delete updated[resizeSelectedId];
            return updated;
          });
        }
        break;
        
      case TOOLS.RECTANGLE:
        if (isDrawing && currentRect) {
          const minWidth = 2;
          const minHeight = 1;
          
          if (Math.abs(currentRect.width) >= minWidth && Math.abs(currentRect.height) >= minHeight) {
            // Normalize negative dimensions and enforce boundaries
            const finalRect = {
              x: currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x,
              y: currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y,
              width: Math.abs(currentRect.width),
              height: Math.abs(currentRect.height)
            };
            
            // Clamp to canvas bounds
            const clampedRect = clampRectToCanvas(finalRect);
            
            try {
              // Save rectangle to Firestore
              await createObject('rectangle', clampedRect, canvasId, {
                fill: '#808080',
                stroke: '#333333',
                strokeWidth: 1
              });
              console.log('Rectangle created and saved to Firestore');
            } catch (error) {
              console.error('Failed to save rectangle:', error);
            }
          }
          
          // Reset drawing state and switch back to move tool
          setIsDrawing(false);
          setCurrentRect(null);
          onToolChange(TOOLS.MOVE);
        }
        break;
    }
  }, [selectedTool, isPanning, isMoving, moveSelectedId, localRectUpdates, doWeOwnObject, isResizing, resizeSelectedId, isDrawing, currentRect, onToolChange, clampRectToCanvas]);

  // Set cursor based on selected tool
  useEffect(() => {
    if (stageRef.current) {
      const container = stageRef.current.container();
      switch (selectedTool) {
        case TOOLS.PAN:
          container.style.cursor = isPanning ? 'grabbing' : 'grab';
          break;
        case TOOLS.MOVE:
          container.style.cursor = 'default';
          break;
        case TOOLS.RESIZE:
          container.style.cursor = 'nw-resize';
          break;
        case TOOLS.RECTANGLE:
          container.style.cursor = 'crosshair';
          break;
        default:
          container.style.cursor = 'default';
      }
    }
  }, [selectedTool, isPanning]);

  // Calculate stage dimensions to cover the entire viewport
  const [stageDimensions, setStageDimensions] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });
  
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
  const boundarySize = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 3;
  const boundaryOffset = -boundarySize / 2 + Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 2;

  // Show empty state if no canvas selected (after all hooks have been called)
  if (!canvasId) {
    return <EmptyState />;
  }

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
        onMouseLeave={handleMouseUp} // Ensure cleanup if mouse leaves canvas
        draggable={false}
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
            listening={selectedTool !== TOOLS.PAN && !(selectedTool === TOOLS.RESIZE && resizeSelectedId)}
          />
          
          {/* Render created rectangles */}
          {rectangles.map((rect) => {
            const isSelected = 
              (selectedTool === TOOLS.MOVE && moveSelectedId === rect.id) ||
              (selectedTool === TOOLS.RESIZE && resizeSelectedId === rect.id);
              
            return (
              <Rect
                key={rect.id}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                fill={rect.fill}
                stroke={
                  rect.isLockedByOther 
                    ? "#f59e0b" // Orange border for locked objects
                    : isSelected 
                      ? "#2563eb" // Blue border for selected
                      : "#333333" // Default border
                }
                strokeWidth={
                  rect.isLockedByOther || isSelected 
                    ? 2 
                    : 1
                }
                opacity={rect.isLockedByOther ? 0.7 : 1.0}
                listening={false} // Disable events - handle via Stage only
              />
            );
          })}
          
          {/* Render resize handles for selected rectangle (RESIZE tool only) */}
          {selectedTool === TOOLS.RESIZE && resizeSelectedId && rectangles.find(r => r.id === resizeSelectedId) && (() => {
            const selectedRect = rectangles.find(r => r.id === resizeSelectedId);
            
            // Don't show handles if object is locked by another user
            if (selectedRect.isLockedByOther) {
              return null;
            }
            
            // Position handles INSIDE the rectangle bounds  
            const handlePadding = 5; // Distance from rectangle edge
            const handles = [
              { name: 'nw', x: selectedRect.x + handlePadding, y: selectedRect.y + handlePadding },
              { name: 'ne', x: selectedRect.x + selectedRect.width - HANDLE_SIZE - handlePadding, y: selectedRect.y + handlePadding },
              { name: 'sw', x: selectedRect.x + handlePadding, y: selectedRect.y + selectedRect.height - HANDLE_SIZE - handlePadding },
              { name: 'se', x: selectedRect.x + selectedRect.width - HANDLE_SIZE - handlePadding, y: selectedRect.y + selectedRect.height - HANDLE_SIZE - handlePadding }
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
                listening={false} // Disable built-in events - we handle clicks manually
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

          {/* Render other users' cursors */}
          {usersWithCursors.map((user) => (
            <UserCursor 
              key={user.uid}
              user={user}
              stageScale={stageScale}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default Canvas;