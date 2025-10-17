import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Stage, Layer, Rect, Circle, Star } from 'react-konva';
import { auth } from '../../services/firebase.js';
import { TOOLS } from './Toolbar.jsx';
import UserCursor from './UserCursor.jsx';
import EmptyState from './EmptyState.jsx';
import ConnectionBanner from './ConnectionBanner.jsx';
import { useCursorTracking } from '../../hooks/useCursorTracking.js';
import { usePresence } from '../../hooks/usePresence.js';
import { useCanvasObjects } from '../../hooks/useCanvasObjects.js';
import { useCanvas } from '../../hooks/useCanvas.js';
import { useConnectionStatus } from '../../hooks/useConnectionStatus.js';
import { getToolHandler } from '../../tools/index.js';
import { 
  createObject, 
  updateObjectPosition,
  updateObject,
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
import { CANVAS_TOP_OFFSET } from '../../constants/layout.constants.js';

const Canvas = ({ selectedTool, onToolChange, onSelectionChange, onObjectUpdate, onCursorUpdate, onZoomUpdate, selectedColor = '#808080', onColorChange, onZIndexChange, zIndexHandlerRef, onUserColorChange }) => {
  // Get canvas ID from context
  const { canvasId } = useCanvas();
  
  // All hooks must be called before any conditional returns
  const stageRef = useRef(null);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  
  // Pan tool state (simple)
  const [isPanning, setIsPanning] = useState(false);
  const [isTemporaryPan, setIsTemporaryPan] = useState(false); // For spacebar pan
  const [toolBeforePan, setToolBeforePan] = useState(null); // Track tool before spacebar pan
  
  // Selection state - persists across all tools
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  
  // Multiplayer presence hooks
  const { updateCursor } = useCursorTracking();
  const { usersWithCursors } = usePresence();
  
  // Connection status monitoring
  const { 
    isConnected, 
    isOnline, 
    isFirebaseConnected, 
    queuedCount, 
    executeOrQueue 
  } = useConnectionStatus();
  
  // Canvas objects hook for real-time sync - now canvas-specific
  const { objects: canvasObjects, isLoading: objectsLoading, error: objectsError} = useCanvasObjects(canvasId);
  
  // Rectangle creation state (Rectangle tool only)
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRect, setCurrentRect] = useState(null);
  
  // Circle creation state (Circle tool only)
  const [currentCircle, setCurrentCircle] = useState(null);
  const [drawStart, setDrawStart] = useState(null);
  
  // Star creation state (Star tool only)
  const [currentStar, setCurrentStar] = useState(null);
  
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

  // Handle z-index changes
  const handleZIndexChange = useCallback(async (action) => {
    if (!selectedObjectId) return;

    const selectedObj = canvasObjects.find(obj => obj.id === selectedObjectId);
    if (!selectedObj) return;

    // Get all objects of the same type sorted by z-index
    const allObjects = [...canvasObjects].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    const currentIndex = allObjects.findIndex(obj => obj.id === selectedObjectId);
    
    let newZIndex = selectedObj.zIndex || 0;

    switch (action) {
      case 'front':
        // Set to max z-index + 1
        const maxZ = Math.max(...allObjects.map(obj => obj.zIndex || 0));
        newZIndex = maxZ + 1;
        break;
      case 'back':
        // Set to min z-index - 1
        const minZ = Math.min(...allObjects.map(obj => obj.zIndex || 0));
        newZIndex = minZ - 1;
        break;
      case 'forward':
        // Swap with next object
        if (currentIndex < allObjects.length - 1) {
          const nextObj = allObjects[currentIndex + 1];
          newZIndex = (nextObj.zIndex || 0) + 1;
        }
        break;
      case 'backward':
        // Swap with previous object
        if (currentIndex > 0) {
          const prevObj = allObjects[currentIndex - 1];
          newZIndex = (prevObj.zIndex || 0) - 1;
        }
        break;
    }

    try {
      await updateObject(selectedObjectId, { zIndex: newZIndex });
      console.log('Z-index updated:', selectedObjectId, newZIndex);
    } catch (error) {
      console.error('Failed to update z-index:', error);
    }
  }, [selectedObjectId, canvasObjects]);

  // Expose handleZIndexChange to parent via ref
  useEffect(() => {
    if (zIndexHandlerRef) {
      zIndexHandlerRef.current = handleZIndexChange;
    }
  }, [handleZIndexChange, zIndexHandlerRef]);

  // Filter rectangles from canvas objects and merge with local updates
  // Memoized to prevent unnecessary re-renders during drag operations
  // Now sorted by z-index
  const rectangles = useMemo(() => {
    return canvasObjects
      .filter(obj => obj.type === 'rectangle')
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
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

  // Filter circles from canvas objects, sorted by z-index
  const circles = useMemo(() => {
    return canvasObjects
      .filter(obj => obj.type === 'circle')
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      .map(circle => {
        // If WE are controlling this object, show our local updates
        if (localRectUpdates[circle.id] && circle.lockedBy === auth.currentUser?.uid) {
          return {
            ...circle,
            ...localRectUpdates[circle.id]
          };
        }
        
        // If another user is dragging this object, show real-time RTDB position
        if (activeObjects[circle.id] && circle.lockedBy !== auth.currentUser?.uid) {
          return {
            ...circle,
            x: activeObjects[circle.id].x,
            y: activeObjects[circle.id].y,
            radius: activeObjects[circle.id].radius !== undefined ? activeObjects[circle.id].radius : circle.radius,
            isLockedByOther: true,
            lockedByName: circle.lastModifiedBy,
            isBeingDragged: true
          };
        }
        
        // If locked by another user, mark as locked
        if (circle.lockedBy && circle.lockedBy !== auth.currentUser?.uid) {
          return {
            ...circle,
            isLockedByOther: true,
            lockedByName: circle.lastModifiedBy
          };
        }
        
        // No one is controlling it, show Firestore data
        return circle;
      });
  }, [canvasObjects, localRectUpdates, activeObjects]);

  // Filter stars from canvas objects, sorted by z-index
  const stars = useMemo(() => {
    return canvasObjects
      .filter(obj => obj.type === 'star')
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      .map(star => {
        // If WE are controlling this object, show our local updates
        if (localRectUpdates[star.id] && star.lockedBy === auth.currentUser?.uid) {
          return {
            ...star,
            ...localRectUpdates[star.id]
          };
        }
        
        // If another user is dragging this object, show real-time RTDB position
        if (activeObjects[star.id] && star.lockedBy !== auth.currentUser?.uid) {
          return {
            ...star,
            x: activeObjects[star.id].x,
            y: activeObjects[star.id].y,
            isLockedByOther: true,
            lockedByName: star.lastModifiedBy,
            isBeingDragged: true
          };
        }
        
        // If locked by another user, mark as locked
        if (star.lockedBy && star.lockedBy !== auth.currentUser?.uid) {
          return {
            ...star,
            isLockedByOther: true,
            lockedByName: star.lastModifiedBy
          };
        }
        
        // No one is controlling it, show Firestore data
        return star;
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
  // Returns null if click is above the clipping boundary (in header/toolbar area)
  const getMousePos = useCallback((e) => {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    
    // Check if click is in the clipped area (above toolbar)
    // This is a backup check - the overlay should block most clicks
    if (e.evt && e.evt.clientY < CANVAS_TOP_OFFSET) {
      console.log('Click rejected: above clipping boundary');
      return null;
    }
    
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
  
  // Helper function to check if point is inside circle
  const isPointInCircle = useCallback((point, circle) => {
    const dx = point.x - circle.x;
    const dy = point.y - circle.y;
    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared <= circle.radius * circle.radius;
  }, []);
  
  // Find circle at position
  const findCircleAt = useCallback((pos) => {
    // Check from top to bottom (last drawn = topmost)
    for (let i = circles.length - 1; i >= 0; i--) {
      if (isPointInCircle(pos, circles[i])) {
        return circles[i];
      }
    }
    return null;
  }, [circles, isPointInCircle]);
  
  // Helper function to check if point is inside star (using bounding circle approximation)
  const isPointInStar = useCallback((point, star) => {
    // Use outer radius as bounding circle for simplicity
    const dx = point.x - star.x;
    const dy = point.y - star.y;
    const distanceSquared = dx * dx + dy * dy;
    const outerRadius = star.outerRadius || 40;
    return distanceSquared <= outerRadius * outerRadius;
  }, []);
  
  // Find star at position
  const findStarAt = useCallback((pos) => {
    // Check from top to bottom (last drawn = topmost)
    for (let i = stars.length - 1; i >= 0; i--) {
      if (isPointInStar(pos, stars[i])) {
        return stars[i];
      }
    }
    return null;
  }, [stars, isPointInStar]);
  
  // Shape-agnostic object finder - checks all shape types
  const findObjectAt = useCallback((pos) => {
    // Check in reverse z-index order (top to bottom)
    // Stars first (typically on top in our z-index sorting)
    const star = findStarAt(pos);
    if (star) return star;
    
    // Then circles
    const circle = findCircleAt(pos);
    if (circle) return circle;
    
    // Then rectangles
    const rect = findRectAt(pos);
    if (rect) return rect;
    
    return null;
  }, [findStarAt, findCircleAt, findRectAt]);
  
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
  
  const clampCircleToCanvas = useCallback((circle) => {
    // Clamp center position so entire circle stays in bounds
    const clampedX = Math.max(circle.radius, Math.min(circle.x, CANVAS_WIDTH - circle.radius));
    const clampedY = Math.max(circle.radius, Math.min(circle.y, CANVAS_HEIGHT - circle.radius));
    
    return {
      ...circle,
      x: clampedX,
      y: clampedY
    };
  }, []);

  const clampStarToCanvas = useCallback((star) => {
    // Clamp center position so entire star stays in bounds
    const clampedX = Math.max(star.outerRadius, Math.min(star.x, CANVAS_WIDTH - star.outerRadius));
    const clampedY = Math.max(star.outerRadius, Math.min(star.y, CANVAS_HEIGHT - star.outerRadius));
    
    return {
      ...star,
      x: clampedX,
      y: clampedY
    };
  }, []);

  // Crossover detection - handles coordinate flipping when resizing past opposite corners
  // Takes the CURRENT transformed rect and flips its coordinates if needed
  const handleCrossoverDetection = useCallback((currentRect, currentHandle, originalRect) => {
    // Calculate the opposite corner coordinates of the ORIGINAL rectangle (anchor point)
    const leftX = originalRect.x;
    const rightX = originalRect.x + originalRect.width;
    const topY = originalRect.y;  
    const bottomY = originalRect.y + originalRect.height;
    
    // Check current rect's corners against original's corners to detect crossover
    const currentLeft = currentRect.x;
    const currentRight = currentRect.x + currentRect.width;
    const currentTop = currentRect.y;
    const currentBottom = currentRect.y + currentRect.height;
    
    let newHandle = currentHandle;
    let hasFlipped = false;
    
    // Check for crossovers based on current handle
    switch (currentHandle) {
      case 'nw':
        // NW handle: check if current rect's NW corner crossed past original's SE corner
        if (currentLeft > rightX && currentTop > bottomY) {
          newHandle = 'se';
          hasFlipped = true;
        } else if (currentLeft > rightX) {
          newHandle = 'ne';
          hasFlipped = true;
        } else if (currentTop > bottomY) {
          newHandle = 'sw';
          hasFlipped = true;
        }
        break;
        
      case 'ne':
        // NE handle: check if current rect's NE corner crossed past original's SW corner
        if (currentRight < leftX && currentTop > bottomY) {
          newHandle = 'sw';
          hasFlipped = true;
        } else if (currentRight < leftX) {
          newHandle = 'nw';
          hasFlipped = true;
        } else if (currentTop > bottomY) {
          newHandle = 'se';
          hasFlipped = true;
        }
        break;
        
      case 'sw':
        // SW handle: check if current rect's SW corner crossed past original's NE corner
        if (currentLeft > rightX && currentBottom < topY) {
          newHandle = 'ne';
          hasFlipped = true;
        } else if (currentLeft > rightX) {
          newHandle = 'se';
          hasFlipped = true;
        } else if (currentBottom < topY) {
          newHandle = 'nw';
          hasFlipped = true;
        }
        break;
        
      case 'se':
        // SE handle: check if current rect's SE corner crossed past original's NW corner
        if (currentRight < leftX && currentBottom < topY) {
          newHandle = 'nw';
          hasFlipped = true;
        } else if (currentRight < leftX) {
          newHandle = 'sw';
          hasFlipped = true;
        } else if (currentBottom < topY) {
          newHandle = 'ne';
          hasFlipped = true;
        }
        break;
    }
    
    // If flipped, keep the current rect's dimensions but maintain continuity
    // The key fix: DON'T recalculate from original - use the transformed rect
    if (hasFlipped) {
      return { rect: currentRect, handle: newHandle, flipped: true };
    }
    
    return { rect: null, handle: currentHandle, flipped: false };
  }, []);
  
  // Find closest corner to click position (works for rectangles and circles)
  const getClosestCorner = useCallback((pos, obj) => {
    // For circles, use bounding box
    let bounds
    if (obj.type === 'circle') {
      bounds = {
        x: obj.x - obj.radius,
        y: obj.y - obj.radius,
        width: obj.radius * 2,
        height: obj.radius * 2
      }
    } else {
      bounds = {
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height
      }
    }
    
    // Only detect corners if click is inside the bounds
    if (pos.x < bounds.x || pos.x > bounds.x + bounds.width || 
        pos.y < bounds.y || pos.y > bounds.y + bounds.height) {
      return null;
    }
    
    const corners = [
      { name: 'nw', x: bounds.x, y: bounds.y },
      { name: 'ne', x: bounds.x + bounds.width, y: bounds.y },
      { name: 'sw', x: bounds.x, y: bounds.y + bounds.height },
      { name: 'se', x: bounds.x + bounds.width, y: bounds.y + bounds.height }
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
    
    console.log('🎯 Closest corner detected:', closestCorner, 'for', obj.type);
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
  
  // Notify zoom level on initial mount and when scale changes
  useEffect(() => {
    if (onZoomUpdate) {
      onZoomUpdate(stageScale);
    }
  }, [stageScale, onZoomUpdate]);

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
    
    // Update zoom level for toolbar
    if (onZoomUpdate) {
      onZoomUpdate(newScale);
    }
  }, [onZoomUpdate]);

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

  // Notify parent of selection changes and object updates
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedObjectId);
    }
    
    // Update selected object data for toolbar
    if (onObjectUpdate) {
      if (selectedObjectId) {
        const selectedObj = canvasObjects.find(obj => obj.id === selectedObjectId);
        onObjectUpdate(selectedObj || null);
      } else {
        onObjectUpdate(null);
      }
    }
  }, [selectedObjectId, canvasObjects, onSelectionChange, onObjectUpdate]);

  // Expose handler for updating selected object's color when user explicitly changes it
  useEffect(() => {
    if (onUserColorChange) {
      const handler = async (newColor) => {
        if (selectedObjectId) {
          const selectedObj = canvasObjects.find(obj => obj.id === selectedObjectId);
          // Only update if the color is different and we own the object
          if (selectedObj && selectedObj.fill !== newColor && doWeOwnObject(selectedObjectId)) {
            try {
              await updateObject(selectedObjectId, { fill: newColor });
              console.log('Object color updated:', selectedObjectId, newColor);
            } catch (error) {
              console.error('Failed to update object color:', error);
            }
          }
        }
      };
      onUserColorChange.current = handler;
    }
  }, [selectedObjectId, canvasObjects, doWeOwnObject, onUserColorChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Spacebar - temporary pan (hold down)
      if (e.code === 'Space' && !isTemporaryPan) {
        e.preventDefault();
        setIsTemporaryPan(true);
        setToolBeforePan(selectedTool);
        onToolChange(TOOLS.PAN);
        return;
      }

      // Arrow keys - pan viewport
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const panDistance = 50;
        setStagePos(prev => {
          const newPos = { ...prev };
          if (e.key === 'ArrowUp') newPos.y += panDistance;
          if (e.key === 'ArrowDown') newPos.y -= panDistance;
          if (e.key === 'ArrowLeft') newPos.x += panDistance;
          if (e.key === 'ArrowRight') newPos.x -= panDistance;
          
          // Update stage position
          if (stageRef.current) {
            const stage = stageRef.current;
            stage.position(newPos);
          }
          
          return newPos;
        });
        return;
      }

      // Escape - deselect
      if (e.key === 'Escape' && selectedObjectId) {
        e.preventDefault();
        unlockObject(selectedObjectId).catch(err => {
          console.error('Failed to unlock on escape:', err);
        });
        setSelectedObjectId(null);
        return;
      }

      // Tool shortcuts (only if not already pressed)
      if (!e.repeat) {
        switch (e.key.toLowerCase()) {
          case 'v':
            e.preventDefault();
            onToolChange(TOOLS.SELECT);
            break;
          case 'm':
            e.preventDefault();
            if (selectedObjectId) onToolChange(TOOLS.MOVE);
            break;
          case 'r':
            e.preventDefault();
            if (selectedObjectId) onToolChange(TOOLS.RESIZE);
            break;
          default:
            break;
        }
      }
    };

    const handleKeyUp = (e) => {
      // Spacebar release - return to previous tool
      if (e.code === 'Space' && isTemporaryPan && toolBeforePan) {
        e.preventDefault();
        setIsTemporaryPan(false);
        onToolChange(toolBeforePan);
        setToolBeforePan(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedTool, selectedObjectId, isTemporaryPan, toolBeforePan, onToolChange]);

  // Clear/manage state when switching tools
  useEffect(() => {
    // Deselect when switching to shape tools
    if (selectedTool === TOOLS.RECTANGLE || selectedTool === TOOLS.CIRCLE || selectedTool === TOOLS.STAR) {
      if (selectedObjectId) {
        // Unlock the selected object before deselecting
        unlockObject(selectedObjectId).catch(err => {
          console.error('Failed to unlock on tool switch:', err);
        });
        setSelectedObjectId(null);
      }
      setMoveSelectedId(null);
      setResizeSelectedId(null);
      setLocalRectUpdates({});
    }
    
    // Pan tool doesn't deselect
    if (selectedTool === TOOLS.PAN && !isTemporaryPan) {
      // Pan tool preserves selection
    }
    
    // Clear drawing state when switching away from tools
    if (selectedTool !== TOOLS.RECTANGLE) {
      setCurrentRect(null);
      setIsDrawing(false);
    }
    if (selectedTool !== TOOLS.CIRCLE) {
      setCurrentCircle(null);
      setDrawStart(null);
      setIsDrawing(false);
    }
    if (selectedTool !== TOOLS.STAR) {
      setCurrentStar(null);
      setDrawStart(null);
      setIsDrawing(false);
    }
  }, [selectedTool, selectedObjectId, isTemporaryPan]);

  // Helper function to build state object for tools
  const buildToolState = useCallback(() => ({
    // Getters
    selectedObjectId,
    moveSelectedId,
    resizeSelectedId,
    isPanning,
    isMoving,
    isResizing,
    isDrawing,
    currentRect,
    currentCircle,
    currentStar,
    drawStart,
    mouseDownPos,
    isDragThresholdExceeded,
    moveStartPos,
    moveOriginalPos,
    resizeHandle,
    resizeStartData,
    canvasObjects,
    rectangles,
    circles,
    stars,
    localRectUpdates,
    selectedColor,
    
    // Setters
    setSelectedObjectId,
    setMoveSelectedId,
    setResizeSelectedId,
    setIsPanning,
    setIsMoving,
    setIsResizing,
    setIsDrawing,
    setCurrentRect,
    setCurrentCircle,
    setCurrentStar,
    setDrawStart,
    setMouseDownPos,
    setIsDragThresholdExceeded,
    setMoveStartPos,
    setMoveOriginalPos,
    setResizeHandle,
    setResizeStartData,
    setLocalRectUpdates,
    setStagePos,
    
    // Helpers
    findRectAt,
    findCircleAt,
    findStarAt,
    findObjectAt,
    isPointInCircle,
    isPointInStar,
    canEditObject,
    doWeOwnObject,
    clampRectToCanvas,
    clampCircleToCanvas,
    clampStarToCanvas,
    getClosestCorner,
    handleCrossoverDetection,
    isOnline,
    
    // Other props
    onToolChange,
    TOOLS
  }), [
    selectedObjectId, moveSelectedId, resizeSelectedId, isPanning, isMoving, isResizing, isDrawing,
    currentRect, currentCircle, currentStar, drawStart, mouseDownPos, isDragThresholdExceeded, moveStartPos, moveOriginalPos,
    resizeHandle, resizeStartData, canvasObjects, rectangles, circles, stars, localRectUpdates, selectedColor,
    findRectAt, findCircleAt, findStarAt, findObjectAt, isPointInCircle, isPointInStar, canEditObject, doWeOwnObject, 
    clampRectToCanvas, clampCircleToCanvas, clampStarToCanvas, getClosestCorner,
    handleCrossoverDetection, isOnline, onToolChange
  ])

  // MOUSE DOWN HANDLER - Tool-specific logic
  const handleMouseDown = useCallback(async (e) => {
    const pos = getMousePos(e);
    
    // Reject if click is above clipping boundary
    if (!pos) {
      return;
    }
    
    console.log('Mouse down detected, tool:', selectedTool);
    
    // Prevent editing operations when offline (allow pan tool to work)
    if (!isConnected && selectedTool !== TOOLS.PAN) {
      console.log('❌ Operation blocked - offline');
      return;
    }
    
    // Get tool handler and execute
    const toolHandler = getToolHandler(selectedTool);
    if (toolHandler) {
      const state = buildToolState();
      const helpers = { pos, canvasId };
      await toolHandler.onMouseDown(e, state, helpers);
      return;
    }
    
    // All tools now handled by tool handlers - no fallback needed
  }, [selectedTool, getMousePos, findRectAt, canEditObject, getClosestCorner, moveSelectedId, resizeSelectedId, isConnected, buildToolState, canvasId]);

  // MOUSE MOVE HANDLER - Tool-specific logic
  const handleMouseMove = useCallback((e) => {
    const pos = getMousePos(e);
    
    // Reject if mouse is above clipping boundary
    if (!pos) {
      return;
    }
    
    // Update cursor position for toolbar display (real-time)
    if (onCursorUpdate && pos.x >= 0 && pos.x <= CANVAS_WIDTH && pos.y >= 0 && pos.y <= CANVAS_HEIGHT) {
      onCursorUpdate(pos);
    }
    
    // Update cursor position for multiplayer (only when not actively manipulating)
    if (pos.x >= 0 && pos.x <= CANVAS_WIDTH && pos.y >= 0 && pos.y <= CANVAS_HEIGHT &&
        !isMoving && !isResizing && !isDrawing && !isPanning) {
      updateCursor(pos);
    }
    
    // Get tool handler and execute
    const toolHandler = getToolHandler(selectedTool);
    if (toolHandler) {
      const state = buildToolState();
      const helpers = { pos, canvasId };
      toolHandler.onMouseMove(e, state, helpers);
      return;
    }
    
    // All tools now handled by tool handlers - no fallback needed
  }, [selectedTool, isPanning, moveSelectedId, mouseDownPos, isDragThresholdExceeded, isMoving, moveStartPos, isResizing, resizeStartData, resizeHandle, resizeSelectedId, isDrawing, currentRect, getMousePos, clampRectToCanvas, handleCrossoverDetection, updateCursor, doWeOwnObject, canvasObjects, buildToolState, canvasId, onCursorUpdate]);

  // MOUSE UP HANDLER - Tool-specific logic
  const handleMouseUp = useCallback(async (e) => {
    console.log('Mouse up with tool:', selectedTool);
    
    // Get tool handler and execute
    const toolHandler = getToolHandler(selectedTool);
    if (toolHandler) {
      const pos = getMousePos(e);
      const state = buildToolState();
      const helpers = { pos, canvasId };
      await toolHandler.onMouseUp(e, state, helpers);
      return;
    }
    
    // All tools now handled by tool handlers - no fallback needed
  }, [selectedTool, isPanning, isMoving, moveSelectedId, localRectUpdates, doWeOwnObject, isResizing, resizeSelectedId, isDrawing, currentRect, onToolChange, clampRectToCanvas, buildToolState, canvasId, getMousePos]);

  // Set cursor based on selected tool
  useEffect(() => {
    if (stageRef.current) {
      const container = stageRef.current.container();
      switch (selectedTool) {
        case TOOLS.PAN:
          container.style.cursor = isPanning ? 'grabbing' : 'grab';
          break;
        case TOOLS.SELECT:
          container.style.cursor = 'default';
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
        case TOOLS.CIRCLE:
          container.style.cursor = 'crosshair';
          break;
        case TOOLS.STAR:
          container.style.cursor = 'crosshair';
          break;
        default:
          container.style.cursor = 'default';
      }
    }
  }, [selectedTool, isPanning]);

  // Calculate stage dimensions to cover the viewport below the clipping boundary
  const [stageDimensions, setStageDimensions] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight - CANVAS_TOP_OFFSET
  });
  
  useEffect(() => {
    const updateDimensions = () => {
      setStageDimensions({ 
        width: window.innerWidth, 
        height: window.innerHeight - CANVAS_TOP_OFFSET
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
    <div className="canvas-container bg-gray-200 overflow-hidden" style={{ position: 'relative' }}>
      {/* Connection Status Banner */}
      <ConnectionBanner 
        isConnected={isConnected}
        isOnline={isOnline}
        isFirebaseConnected={isFirebaseConnected}
        queuedCount={queuedCount}
      />
      
      {/* Canvas clipping container */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        clipPath: `inset(${CANVAS_TOP_OFFSET}px 0px 0px 0px)`
      }}>
        <Stage
          ref={stageRef}
          width={stageDimensions.width}
          height={stageDimensions.height + CANVAS_TOP_OFFSET} // Extend upward to allow objects to exist above
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
          
          {/* Visual boundary line at y=0 - indicates where clipping starts */}
          <Rect
            x={0}
            y={0}
            width={CANVAS_WIDTH}
            height={2}
            fill="#3b82f6"
            opacity={0.3}
            listening={false}
          />
          
          {/* Render created rectangles */}
          {rectangles.map((rect) => {
            const isSelected = selectedObjectId === rect.id;
              
            return (
              <Rect
                key={rect.id}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                offsetX={0}
                offsetY={0}
                rotation={rect.rotation || 0}
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

          {/* Render all circles */}
          {circles.map((circle) => {
            const isSelected = selectedObjectId === circle.id;
            return (
              <Circle
                key={circle.id}
                x={circle.x}
                y={circle.y}
                radius={circle.radius}
                rotation={circle.rotation || 0}
                fill={circle.fill}
                stroke={
                  circle.isLockedByOther 
                    ? "#f59e0b" // Orange border for locked objects
                    : isSelected 
                      ? "#2563eb" // Blue border for selected
                      : "#333333" // Default border
                }
                strokeWidth={
                  circle.isLockedByOther || isSelected 
                    ? 2 
                    : 1
                }
                opacity={circle.isLockedByOther ? 0.7 : 1.0}
                listening={false} // Disable events - handle via Stage only
              />
            );
          })}

          {/* Render resize handles for selected circle (RESIZE tool only) */}
          {selectedTool === TOOLS.RESIZE && resizeSelectedId && circles.find(c => c.id === resizeSelectedId) && (() => {
            const selectedCircle = circles.find(c => c.id === resizeSelectedId);
            
            // Don't show handles if object is locked by another user
            if (selectedCircle.isLockedByOther) {
              return null;
            }
            
            // Position handles on circle's bounding box corners
            const handlePadding = 5;
            const bounds = {
              x: selectedCircle.x - selectedCircle.radius,
              y: selectedCircle.y - selectedCircle.radius,
              width: selectedCircle.radius * 2,
              height: selectedCircle.radius * 2
            };
            
            const handles = [
              { name: 'nw', x: bounds.x + handlePadding, y: bounds.y + handlePadding },
              { name: 'ne', x: bounds.x + bounds.width - HANDLE_SIZE - handlePadding, y: bounds.y + handlePadding },
              { name: 'sw', x: bounds.x + handlePadding, y: bounds.y + bounds.height - HANDLE_SIZE - handlePadding },
              { name: 'se', x: bounds.x + bounds.width - HANDLE_SIZE - handlePadding, y: bounds.y + bounds.height - HANDLE_SIZE - handlePadding }
            ];
            
            return handles.map(handle => (
              <Rect
                key={`circle-handle-${handle.name}`}
                x={handle.x}
                y={handle.y}
                width={HANDLE_SIZE}
                height={HANDLE_SIZE}
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth={1}
                listening={false}
              />
            ));
          })()}

          {/* Render current circle being drawn */}
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

          {/* Render all stars */}
          {stars.map((star) => {
            const isSelected = selectedObjectId === star.id;
            return (
              <Star
                key={star.id}
                x={star.x}
                y={star.y}
                numPoints={star.numPoints || 5}
                innerRadius={star.innerRadius || 20}
                outerRadius={star.outerRadius || 40}
                rotation={star.rotation || 0}
                fill={star.fill}
                stroke={
                  star.isLockedByOther 
                    ? "#f59e0b" // Orange border for locked objects
                    : isSelected 
                      ? "#2563eb" // Blue border for selected
                      : "#333333" // Default border
                }
                strokeWidth={
                  star.isLockedByOther || isSelected 
                    ? 2 
                    : 1
                }
                opacity={star.isLockedByOther ? 0.7 : 1.0}
                listening={false} // Disable events - handle via Stage only
              />
            );
          })}

          {/* Render current star being drawn */}
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
    </div>
  );
};

export default Canvas;