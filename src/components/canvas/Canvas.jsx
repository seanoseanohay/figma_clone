import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Stage, Layer, Rect, Circle, Star, Arc, Line, Transformer, Text } from 'react-konva';
import { auth } from '../../services/firebase.js';
import { TOOLS } from './Toolbar.jsx';
import UserCursor from './UserCursor.jsx';
import EmptyState from './EmptyState.jsx';
import ConnectionBanner from './ConnectionBanner.jsx';
import TextEditor from './TextEditor.jsx';
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

const Canvas = ({ selectedTool, onToolChange, onSelectionChange, onObjectUpdate, onCursorUpdate, onZoomUpdate, selectedColor = '#808080', onColorChange, onZIndexChange, zIndexHandlerRef, rotationHandlerRef, onUserColorChange }) => {
  // Get canvas ID from context
  const { canvasId } = useCanvas();
  
  // All hooks must be called before any conditional returns
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const selectedShapeRef = useRef(null);
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
  
  // Text tool state (Text tool only)
  const [isEditingText, setIsEditingText] = useState(false);
  const [textEditData, setTextEditData] = useState(null); // { newTextPosition, object, originalText }
  const [textSelectedId, setTextSelectedId] = useState(null);
  
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
  
  // Rotate tool state (clean separation)
  const [rotateSelectedId, setRotateSelectedId] = useState(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotateStartData, setRotateStartData] = useState(null);
  
  // Transformer state for rotation-aware resizing
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformStartData, setTransformStartData] = useState(null);
  
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
    if (selectedTool === TOOLS.ROTATE) return rotateSelectedId;
    if (selectedTool === TOOLS.TEXT) return textSelectedId;
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

  // Handle rotation changes from manual input
  const handleRotationChange = useCallback(async (newRotation) => {
    if (!selectedObjectId) return;

    const selectedObj = canvasObjects.find(obj => obj.id === selectedObjectId);
    if (!selectedObj) return;

    // Normalize rotation to 0-359 range
    const normalizedRotation = ((newRotation % 360) + 360) % 360;

    try {
      await updateObject(selectedObjectId, { rotation: normalizedRotation });
      console.log(`✅ Rotation updated to ${normalizedRotation}°`);
    } catch (error) {
      console.error('Failed to update rotation:', error);
    }
  }, [selectedObjectId, canvasObjects]);

  // Expose handleRotationChange to parent via ref
  useEffect(() => {
    if (rotationHandlerRef) {
      rotationHandlerRef.current = handleRotationChange;
    }
  }, [handleRotationChange, rotationHandlerRef]);

  // Attach transformer to selected shape when in resize mode and object has rotation
  useEffect(() => {
    // Small delay to ensure DOM is updated before attaching transformer
    const timeoutId = setTimeout(() => {
      if (transformerRef.current && selectedShapeRef.current && selectedTool === TOOLS.RESIZE && resizeSelectedId) {
        const selectedObj = canvasObjects.find(obj => obj.id === resizeSelectedId);
        
        // Only use transformer if object has rotation
        if (selectedObj && selectedObj.rotation && selectedObj.rotation !== 0) {
          console.log('Attaching Transformer to rotated object:', resizeSelectedId, 'rotation:', selectedObj.rotation);
          transformerRef.current.nodes([selectedShapeRef.current]);
          transformerRef.current.getLayer().batchDraw();
          transformerRef.current.forceUpdate();
        } else if (transformerRef.current.nodes().length > 0) {
          // Clear transformer if no rotation (use custom handles instead)
          console.log('Clearing Transformer (no rotation)');
          transformerRef.current.nodes([]);
          transformerRef.current.getLayer().batchDraw();
        }
      } else if (transformerRef.current && transformerRef.current.nodes().length > 0) {
        // Clear transformer when not in resize mode
        console.log('Clearing Transformer (not in resize mode)');
        transformerRef.current.nodes([]);
        transformerRef.current.getLayer().batchDraw();
      }
    }, 10); // Small delay to ensure refs are set
    
    return () => clearTimeout(timeoutId);
  }, [selectedTool, resizeSelectedId, canvasObjects]);

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

  // Filter text objects from canvas objects, sorted by z-index
  const texts = useMemo(() => {
    return canvasObjects
      .filter(obj => obj.type === 'text')
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      .map(text => {
        // If WE are controlling this object, show our local updates
        if (localRectUpdates[text.id] && text.lockedBy === auth.currentUser?.uid) {
          return {
            ...text,
            ...localRectUpdates[text.id]
          };
        }
        
        // If another user is dragging this object, show real-time RTDB position
        if (activeObjects[text.id] && text.lockedBy !== auth.currentUser?.uid) {
          return {
            ...text,
            x: activeObjects[text.id].x,
            y: activeObjects[text.id].y,
            isLockedByOther: true,
            lockedByName: text.lastModifiedBy,
            isBeingDragged: true
          };
        }
        
        // If locked by another user, mark as locked
        if (text.lockedBy && text.lockedBy !== auth.currentUser?.uid) {
          return {
            ...text,
            isLockedByOther: true,
            lockedByName: text.lastModifiedBy
          };
        }
        
        // No one is controlling it, show Firestore data
        return text;
      });
  }, [canvasObjects, localRectUpdates, activeObjects]);

  // Combine all shapes and sort by z-index for proper rendering order
  const allShapesSorted = useMemo(() => {
    // Combine all shape types with their type identifier
    const combined = [
      ...rectangles.map(shape => ({ ...shape, shapeType: 'rectangle' })),
      ...circles.map(shape => ({ ...shape, shapeType: 'circle' })),
      ...stars.map(shape => ({ ...shape, shapeType: 'star' })),
      ...texts.map(shape => ({ ...shape, shapeType: 'text' }))
    ];
    
    // Sort by z-index (ascending - lower z-index renders first/behind)
    return combined.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [rectangles, circles, stars, texts]);

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
  
  // Helper function to check if point is inside rectangle (accounts for rotation)
  const isPointInRect = useCallback((point, rect) => {
    const rotation = rect.rotation || 0;
    
    // If no rotation, use simple bounding box check
    if (rotation === 0) {
      return point.x >= rect.x && 
             point.x <= rect.x + rect.width && 
             point.y >= rect.y && 
             point.y <= rect.y + rect.height;
    }
    
    // For rotated rectangles, transform point to local coordinates
    // Rectangle rotates around its center
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    
    // Translate point to origin
    const translatedX = point.x - centerX;
    const translatedY = point.y - centerY;
    
    // Rotate point back by negative rotation angle
    const angleRad = (-rotation * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const localX = translatedX * cos - translatedY * sin;
    const localY = translatedX * sin + translatedY * cos;
    
    // Check if point is inside unrotated rectangle (centered at origin)
    const halfWidth = rect.width / 2;
    const halfHeight = rect.height / 2;
    return localX >= -halfWidth && localX <= halfWidth &&
           localY >= -halfHeight && localY <= halfHeight;
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
  
  // Helper function to check if point is inside star (accurate polygon detection)
  const isPointInStar = useCallback((point, star) => {
    // Calculate actual star vertices
    const numPoints = star.numPoints || 5;
    const innerRadius = star.innerRadius || 20;
    const outerRadius = star.outerRadius || 40;
    const rotation = star.rotation || 0;
    
    // Generate star points (alternating outer and inner vertices)
    const points = [];
    const angleStep = Math.PI / numPoints;
    const rotationRad = (rotation * Math.PI) / 180;
    
    for (let i = 0; i < numPoints * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = i * angleStep - Math.PI / 2 + rotationRad;
      points.push({
        x: star.x + radius * Math.cos(angle),
        y: star.y + radius * Math.sin(angle)
      });
    }
    
    // Point-in-polygon test using ray casting algorithm
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
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
  
  // Find text at position (simple bounding box check)
  const findTextAt = useCallback((pos) => {
    // Sort texts by z-index in reverse (check top objects first)
    const sortedTexts = [...texts].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    
    for (const text of sortedTexts) {
      // Use stored width if available, otherwise estimate generously
      // The width property is set when text is created/edited
      const textWidth = text.width || 200; // Default to 200px if not set
      const textHeight = (text.fontSize || 24) * 1.2;
      const rotation = text.rotation || 0;
      
      // If no rotation, use simple bounding box check
      if (rotation === 0) {
        if (pos.x >= text.x && 
            pos.x <= text.x + textWidth && 
            pos.y >= text.y && 
            pos.y <= text.y + textHeight) {
          return text;
        }
      } else {
        // For rotated text, transform point to local coordinates
        // IMPORTANT: Text rotates around its top-left corner (text.x, text.y) in Konva by default
        // NOT around its center! This is different from rectangles.
        
        // Translate point relative to text's rotation origin (top-left corner)
        const translatedX = pos.x - text.x;
        const translatedY = pos.y - text.y;
        
        // Rotate point back by negative rotation angle
        const angleRad = (-rotation * Math.PI) / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const localX = translatedX * cos - translatedY * sin;
        const localY = translatedX * sin + translatedY * cos;
        
        // Check if point is inside unrotated text box (with origin at top-left)
        if (localX >= 0 && localX <= textWidth &&
            localY >= 0 && localY <= textHeight) {
          return text;
        }
      }
    }
    return null;
  }, [texts]);
  
  // Shape-agnostic object finder - checks all shape types
  const findObjectAt = useCallback((pos) => {
    // Check in reverse z-index order (top to bottom)
    // Text first (check all types at highest z-index first)
    const text = findTextAt(pos);
    if (text) return text;
    
    // Stars
    const star = findStarAt(pos);
    if (star) return star;
    
    // Then circles
    const circle = findCircleAt(pos);
    if (circle) return circle;
    
    // Then rectangles
    const rect = findRectAt(pos);
    if (rect) return rect;
    
    return null;
  }, [findTextAt, findStarAt, findCircleAt, findRectAt]);
  
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
    // First, clamp radius to ensure it can fit within canvas bounds
    const maxRadius = Math.min(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    const clampedRadius = Math.min(circle.radius, maxRadius);
    
    // Then clamp center position so entire circle stays in bounds
    const clampedX = Math.max(clampedRadius, Math.min(circle.x, CANVAS_WIDTH - clampedRadius));
    const clampedY = Math.max(clampedRadius, Math.min(circle.y, CANVAS_HEIGHT - clampedRadius));
    
    return {
      ...circle,
      radius: clampedRadius,
      x: clampedX,
      y: clampedY
    };
  }, []);

  const clampStarToCanvas = useCallback((star) => {
    // Clamp star position so its outermost tips can touch the canvas edge
    // The star's center must stay at least outerRadius away from edges
    // so the tips reach exactly to the boundary (0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    const outerRadius = star.outerRadius || 40;
    
    const clampedX = Math.max(outerRadius, Math.min(star.x, CANVAS_WIDTH - outerRadius));
    const clampedY = Math.max(outerRadius, Math.min(star.y, CANVAS_HEIGHT - outerRadius));
    
    return {
      ...star,
      x: clampedX,
      y: clampedY
    };
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

      // Enter - edit text (if text is selected)
      if (e.key === 'Enter' && selectedObjectId) {
        const selectedObject = canvasObjects.find(obj => obj.id === selectedObjectId);
        if (selectedObject && selectedObject.type === 'text' && canEditObject(selectedObjectId)) {
          e.preventDefault();
          console.log('⌨️ Enter pressed: Editing text object', selectedObjectId);
          
          // Lock the text for editing (it should already be locked)
          lockObject(selectedObjectId).then(() => {
            console.log('✅ Text locked for editing');
            
            // Trigger text editing mode
            setTextSelectedId(selectedObjectId);
            setIsEditingText(true);
            setTextEditData({
              object: selectedObject,
              originalText: selectedObject.text || ''
            });
          }).catch(error => {
            console.error('Failed to lock text:', error);
          });
          return;
        }
      }

      // Delete/Backspace - delete selected object
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObjectId) {
        e.preventDefault();
        const selectedObject = canvasObjects.find(obj => obj.id === selectedObjectId);
        
        if (selectedObject && canEditObject(selectedObjectId)) {
          console.log('🗑️ Delete key pressed: Deleting object', selectedObjectId);
          
          try {
            // Import deleteObject dynamically to avoid circular imports
            import('../../services/canvas.service.js').then(({ deleteObject }) => {
              deleteObject(selectedObjectId).then(() => {
                console.log('✅ Object deleted successfully');
                // Clear selection since object no longer exists
                setSelectedObjectId(null);
                setMoveSelectedId(null);
                setResizeSelectedId(null);
                setRotateSelectedId(null);
                setTextSelectedId(null);
              }).catch(error => {
                console.error('❌ Failed to delete object:', error);
                // Show user-friendly error message (could add toast notification here)
              });
            });
          } catch (error) {
            console.error('❌ Failed to import deleteObject:', error);
          }
        } else if (selectedObject) {
          console.log('❌ Cannot delete: Object is locked or user lacks permissions');
          // Could show toast notification: "Cannot delete: object is being edited by another user"
        }
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
          case 't':
            e.preventDefault();
            if (selectedObjectId) onToolChange(TOOLS.ROTATE);
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
  }, [selectedTool, selectedObjectId, isTemporaryPan, toolBeforePan, onToolChange, canvasObjects, canEditObject, setTextSelectedId, setIsEditingText, setTextEditData]);

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
      setRotateSelectedId(null);
      setLocalRectUpdates({});
    }
    
    // Sync resize tool state with current selection
    if (selectedTool === TOOLS.RESIZE && selectedObjectId) {
      // When switching to Resize tool, sync resizeSelectedId with selectedObjectId
      setResizeSelectedId(selectedObjectId);
      console.log('Resize tool: Synced resizeSelectedId with selection:', selectedObjectId);
    }
    
    // Sync move tool state with current selection
    if (selectedTool === TOOLS.MOVE && selectedObjectId) {
      // When switching to Move tool, sync moveSelectedId with selectedObjectId
      setMoveSelectedId(selectedObjectId);
      console.log('Move tool: Synced moveSelectedId with selection:', selectedObjectId);
    }
    
    // Sync rotate tool state with current selection
    if (selectedTool === TOOLS.ROTATE && selectedObjectId) {
      // When switching to Rotate tool, sync rotateSelectedId with selectedObjectId
      setRotateSelectedId(selectedObjectId);
      console.log('Rotate tool: Synced rotateSelectedId with selection:', selectedObjectId);
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
    rotateSelectedId,
    textSelectedId,
    isPanning,
    isMoving,
    isResizing,
    isRotating,
    isDrawing,
    isEditingText,
    currentRect,
    currentCircle,
    currentStar,
    textEditData,
    drawStart,
    mouseDownPos,
    isDragThresholdExceeded,
    moveStartPos,
    moveOriginalPos,
    resizeHandle,
    resizeStartData,
    rotateStartData,
    canvasObjects,
    rectangles,
    circles,
    stars,
    texts,
    localRectUpdates,
    selectedColor,
    
    // Setters
    setSelectedObjectId,
    setMoveSelectedId,
    setResizeSelectedId,
    setRotateSelectedId,
    setTextSelectedId,
    setIsPanning,
    setIsMoving,
    setIsResizing,
    setIsRotating,
    setIsDrawing,
    setIsEditingText,
    setCurrentRect,
    setCurrentCircle,
    setCurrentStar,
    setTextEditData,
    setDrawStart,
    setMouseDownPos,
    setIsDragThresholdExceeded,
    setMoveStartPos,
    setMoveOriginalPos,
    setResizeHandle,
    setResizeStartData,
    setRotateStartData,
    setLocalRectUpdates,
    setStagePos,
    
    // Helpers
    findRectAt,
    findCircleAt,
    findStarAt,
    findTextAt,
    findObjectAt,
    isPointInCircle,
    isPointInStar,
    canEditObject,
    doWeOwnObject,
    clampRectToCanvas,
    clampCircleToCanvas,
    clampStarToCanvas,
    isOnline,
    
    // Other props
    onToolChange,
    TOOLS
  }), [
    selectedObjectId, moveSelectedId, resizeSelectedId, rotateSelectedId, textSelectedId, isPanning, isMoving, isResizing, isRotating, isDrawing, isEditingText,
    currentRect, currentCircle, currentStar, textEditData, drawStart, mouseDownPos, isDragThresholdExceeded, moveStartPos, moveOriginalPos,
    resizeHandle, resizeStartData, rotateStartData, canvasObjects, rectangles, circles, stars, texts, localRectUpdates, selectedColor,
    findRectAt, findCircleAt, findStarAt, findTextAt, findObjectAt, isPointInCircle, isPointInStar, canEditObject, doWeOwnObject, 
    clampRectToCanvas, clampCircleToCanvas, clampStarToCanvas, isOnline, onToolChange
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
  }, [selectedTool, getMousePos, isConnected, buildToolState, canvasId]);

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
        !isMoving && !isResizing && !isRotating && !isDrawing && !isPanning) {
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
  }, [selectedTool, isPanning, isMoving, isResizing, isRotating, isDrawing, getMousePos, updateCursor, buildToolState, canvasId, onCursorUpdate]);

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
  }, [selectedTool, buildToolState, canvasId, getMousePos]);

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
        case TOOLS.ROTATE:
          container.style.cursor = 'crosshair';
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
        case TOOLS.TEXT:
          container.style.cursor = 'text';
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
          
          {/* Render all shapes sorted by z-index */}
          {allShapesSorted.map((shape) => {
            const isSelected = selectedObjectId === shape.id;
            const shouldAttachRef = isSelected && selectedTool === TOOLS.RESIZE && shape.rotation;
            
            const commonProps = {
              fill: shape.fill,
              stroke: shape.isLockedByOther 
                ? "#f59e0b" // Orange border for locked objects
                : isSelected 
                  ? "#2563eb" // Blue border for selected
                  : "#333333", // Default border
              strokeWidth: shape.isLockedByOther || isSelected ? 2 : 1,
              opacity: shape.isLockedByOther ? 0.7 : 1.0,
              rotation: shape.rotation || 0,
              listening: false, // Disable events - handle via Stage only
              draggable: false,
              ...(shouldAttachRef ? { ref: selectedShapeRef } : {})
            };
            
            // Render based on shape type
            if (shape.shapeType === 'rectangle') {
              // For rotation to work around center, set offset to center and adjust position
              const centerX = shape.x + shape.width / 2;
              const centerY = shape.y + shape.height / 2;
              
              return (
                <Rect
                  key={shape.id}
                  {...commonProps}
                  x={centerX}
                  y={centerY}
                  width={shape.width}
                  height={shape.height}
                  offsetX={shape.width / 2}
                  offsetY={shape.height / 2}
                />
              );
            } else if (shape.shapeType === 'circle') {
              return (
                <Circle
                  key={shape.id}
                  {...commonProps}
                  x={shape.x}
                  y={shape.y}
                  radius={shape.radius}
                />
              );
            } else if (shape.shapeType === 'star') {
              return (
                <Star
                  key={shape.id}
                  {...commonProps}
                  x={shape.x}
                  y={shape.y}
                  numPoints={shape.numPoints || 5}
                  innerRadius={shape.innerRadius || 20}
                  outerRadius={shape.outerRadius || 40}
                />
              );
            } else if (shape.shapeType === 'text') {
              // Build font style string from formatting
              const fontStyle = `${shape.bold ? 'bold ' : ''}${shape.italic ? 'italic ' : ''}${shape.fontSize || 24}px ${shape.fontFamily || 'Arial'}`;
              
              return (
                <Text
                  key={shape.id}
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
                    ? "#f59e0b" // Orange border for locked objects
                    : isSelected 
                      ? "#2563eb" // Blue border for selected
                      : "transparent"} // No border for unselected text
                  strokeWidth={shape.isLockedByOther || isSelected ? 1 : 0}
                />
              );
            }
            return null;
          })}
          
          {/* Render resize handles for selected rectangle (RESIZE tool only, NON-ROTATED) */}
          {selectedTool === TOOLS.RESIZE && resizeSelectedId && rectangles.find(r => r.id === resizeSelectedId) && (() => {
            const selectedRect = rectangles.find(r => r.id === resizeSelectedId);
            
            // Don't show handles if object is locked by another user
            if (selectedRect.isLockedByOther) {
              return null;
            }
            
            // Don't show custom handles if object has rotation (Transformer handles that)
            if (selectedRect.rotation && selectedRect.rotation !== 0) {
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


          {/* Render resize handles for selected circle (RESIZE tool only, NON-ROTATED) */}
          {selectedTool === TOOLS.RESIZE && resizeSelectedId && circles.find(c => c.id === resizeSelectedId) && (() => {
            const selectedCircle = circles.find(c => c.id === resizeSelectedId);
            
            // Don't show handles if object is locked by another user
            if (selectedCircle.isLockedByOther) {
              return null;
            }
            
            // Don't show custom handles if object has rotation (Transformer handles that)
            if (selectedCircle.rotation && selectedCircle.rotation !== 0) {
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


          {/* Render resize handles for selected star (RESIZE tool only, NON-ROTATED) */}
          {selectedTool === TOOLS.RESIZE && resizeSelectedId && stars.find(s => s.id === resizeSelectedId) && (() => {
            const selectedStar = stars.find(s => s.id === resizeSelectedId);
            
            // Don't show handles if object is locked by another user
            if (selectedStar.isLockedByOther) {
              return null;
            }
            
            // Don't show custom handles if object has rotation (Transformer handles that)
            if (selectedStar.rotation && selectedStar.rotation !== 0) {
              return null;
            }
            
            // Position handles on star's bounding box corners (based on outerRadius)
            const handlePadding = 5;
            const bounds = {
              x: selectedStar.x - selectedStar.outerRadius,
              y: selectedStar.y - selectedStar.outerRadius,
              width: selectedStar.outerRadius * 2,
              height: selectedStar.outerRadius * 2
            };
            
            const handles = [
              { name: 'nw', x: bounds.x + handlePadding, y: bounds.y + handlePadding },
              { name: 'ne', x: bounds.x + bounds.width - HANDLE_SIZE - handlePadding, y: bounds.y + handlePadding },
              { name: 'sw', x: bounds.x + handlePadding, y: bounds.y + bounds.height - HANDLE_SIZE - handlePadding },
              { name: 'se', x: bounds.x + bounds.width - HANDLE_SIZE - handlePadding, y: bounds.y + bounds.height - HANDLE_SIZE - handlePadding }
            ];
            
            return handles.map(handle => (
              <Rect
                key={`star-handle-${handle.name}`}
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

          {/* Render resize handles for selected text (RESIZE tool only, NON-ROTATED) */}
          {selectedTool === TOOLS.RESIZE && resizeSelectedId && texts.find(t => t.id === resizeSelectedId) && (() => {
            const selectedText = texts.find(t => t.id === resizeSelectedId);
            
            // Don't show handles if object is locked by another user
            if (selectedText.isLockedByOther) {
              return null;
            }
            
            // Don't show custom handles if object has rotation (Transformer handles that)
            if (selectedText.rotation && selectedText.rotation !== 0) {
              return null;
            }
            
            // Calculate text height based on font size and line count
            // Estimate line count based on text length and width
            const fontSize = selectedText.fontSize || 24;
            const charWidth = fontSize * 0.6; // Rough estimate
            const charsPerLine = Math.floor((selectedText.width || 200) / charWidth);
            const lineCount = Math.max(1, Math.ceil((selectedText.text?.length || 4) / charsPerLine));
            const lineHeight = fontSize * 1.2;
            const textHeight = lineCount * lineHeight;
            
            // Position handles on text's bounding box corners
            const handlePadding = 5;
            const bounds = {
              x: selectedText.x,
              y: selectedText.y,
              width: selectedText.width || 200,
              height: textHeight
            };
            
            const handles = [
              { name: 'nw', x: bounds.x + handlePadding, y: bounds.y + handlePadding },
              { name: 'ne', x: bounds.x + bounds.width - HANDLE_SIZE - handlePadding, y: bounds.y + handlePadding },
              { name: 'sw', x: bounds.x + handlePadding, y: bounds.y + bounds.height - HANDLE_SIZE - handlePadding },
              { name: 'se', x: bounds.x + bounds.width - HANDLE_SIZE - handlePadding, y: bounds.y + bounds.height - HANDLE_SIZE - handlePadding }
            ];
            
            return handles.map(handle => (
              <Rect
                key={`text-handle-${handle.name}`}
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

          {/* Render rotation handle for selected object (ROTATE tool only) */}
          {selectedTool === TOOLS.ROTATE && rotateSelectedId && (() => {
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
          })()}

          {/* Konva Transformer for rotation-aware resizing */}
          {selectedTool === TOOLS.RESIZE && resizeSelectedId && (() => {
            const selectedObj = [...rectangles, ...circles, ...stars, ...texts].find(obj => obj.id === resizeSelectedId);
            
            // Only show Transformer if object has rotation
            if (!selectedObj || !selectedObj.rotation || selectedObj.rotation === 0 || selectedObj.isLockedByOther) {
              return null;
            }
            
            return (
              <Transformer
                ref={transformerRef}
                rotateEnabled={false}
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                boundBoxFunc={(oldBox, newBox) => {
                  // Enforce minimum size
                  if (newBox.width < 10 || newBox.height < 10) {
                    return oldBox;
                  }
                  
                  // Enforce canvas boundaries
                  if (newBox.x < 0 || newBox.y < 0 || 
                      newBox.x + newBox.width > CANVAS_WIDTH || 
                      newBox.y + newBox.height > CANVAS_HEIGHT) {
                    return oldBox;
                  }
                  
                  return newBox;
                }}
                onTransform={(e) => {
                  const node = e.target;
                  
                  // Get the transformation values
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();
                  
                  // Calculate new dimensions
                  if (selectedObj.type === 'rectangle') {
                    const newWidth = Math.max(10, node.width() * scaleX);
                    const newHeight = Math.max(10, node.height() * scaleY);
                    
                    // node.x() and node.y() are the CENTER position (due to our offset)
                    // Convert back to top-left corner position for storage
                    const centerX = node.x();
                    const centerY = node.y();
                    const topLeftX = centerX - newWidth / 2;
                    const topLeftY = centerY - newHeight / 2;
                    
                    // Update local state for immediate feedback
                    setLocalRectUpdates(prev => ({
                      ...prev,
                      [resizeSelectedId]: {
                        ...selectedObj,
                        x: topLeftX,
                        y: topLeftY,
                        width: newWidth,
                        height: newHeight,
                        rotation: node.rotation()
                      }
                    }));
                    
                    // Reset scale to prevent double scaling
                    node.scaleX(1);
                    node.scaleY(1);
                    node.width(newWidth);
                    node.height(newHeight);
                  } else if (selectedObj.type === 'circle') {
                    const newRadius = Math.max(5, selectedObj.radius * Math.max(scaleX, scaleY));
                    
                    // Update local state for immediate feedback
                    setLocalRectUpdates(prev => ({
                      ...prev,
                      [resizeSelectedId]: {
                        ...selectedObj,
                        x: node.x(),
                        y: node.y(),
                        radius: newRadius,
                        rotation: node.rotation()
                      }
                    }));
                    
                    // Reset scale
                    node.scaleX(1);
                    node.scaleY(1);
                  } else if (selectedObj.type === 'star') {
                    const avgScale = (scaleX + scaleY) / 2;
                    const newOuterRadius = Math.max(10, selectedObj.outerRadius * avgScale);
                    const newInnerRadius = Math.max(5, selectedObj.innerRadius * avgScale);
                    
                    // Update local state for immediate feedback
                    setLocalRectUpdates(prev => ({
                      ...prev,
                      [resizeSelectedId]: {
                        ...selectedObj,
                        x: node.x(),
                        y: node.y(),
                        outerRadius: newOuterRadius,
                        innerRadius: newInnerRadius,
                        rotation: node.rotation()
                      }
                    }));
                    
                    // Reset scale
                    node.scaleX(1);
                    node.scaleY(1);
                  } else if (selectedObj.type === 'text') {
                    // For text, we scale the fontSize instead of dimensions
                    const avgScale = (scaleX + scaleY) / 2;
                    const newFontSize = Math.max(8, (selectedObj.fontSize || 24) * avgScale);
                    
                    // Update local state for immediate feedback
                    setLocalRectUpdates(prev => ({
                      ...prev,
                      [resizeSelectedId]: {
                        ...selectedObj,
                        x: node.x(),
                        y: node.y(),
                        fontSize: newFontSize,
                        rotation: node.rotation()
                      }
                    }));
                    
                    // Reset scale
                    node.scaleX(1);
                    node.scaleY(1);
                  }
                  
                  // Send real-time updates
                  if (doWeOwnObject(resizeSelectedId) && canvasId) {
                    const updates = localRectUpdates[resizeSelectedId];
                    if (updates) {
                      updateActiveObjectPosition(canvasId, resizeSelectedId, updates);
                    }
                  }
                }}
                onTransformEnd={async (e) => {
                  console.log('Transform end - syncing to Firestore');
                  
                  const finalState = localRectUpdates[resizeSelectedId];
                  if (finalState && doWeOwnObject(resizeSelectedId)) {
                    try {
                      // Clear RTDB
                      await clearActiveObject(canvasId, resizeSelectedId);
                      
                      // Update Firestore with final values
                      const updateData = {
                        x: finalState.x,
                        y: finalState.y,
                        rotation: finalState.rotation
                      };
                      
                      if (finalState.type === 'rectangle') {
                        updateData.width = finalState.width;
                        updateData.height = finalState.height;
                      } else if (finalState.type === 'circle') {
                        updateData.radius = finalState.radius;
                      } else if (finalState.type === 'star') {
                        updateData.outerRadius = finalState.outerRadius;
                        updateData.innerRadius = finalState.innerRadius;
                      } else if (finalState.type === 'text') {
                        updateData.fontSize = finalState.fontSize;
                      }
                      
                      await updateObjectPosition(resizeSelectedId, updateData, false);
                      
                      // Clear local updates
                      setLocalRectUpdates(prev => {
                        const updated = { ...prev };
                        delete updated[resizeSelectedId];
                        return updated;
                      });
                    } catch (error) {
                      console.error('Failed to sync transform:', error);
                    }
                  }
                }}
              />
            );
          })()}

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
      
      {/* Text Editor Overlay */}
      {isEditingText && textEditData && (
        <TextEditor
          position={textEditData.newTextPosition || { x: textEditData.object?.x || 0, y: textEditData.object?.y || 0 }}
          initialText={textEditData.originalText || ''}
          initialFormatting={textEditData.object || {}}
          onSave={async (text, formatting) => {
            console.log('💾 Saving text:', text, formatting);
            
            try {
              if (textEditData.newTextPosition) {
                // Creating new text
                const textTool = getToolHandler(TOOLS.TEXT);
                const textId = await textTool.createTextObject(canvasId, textEditData.newTextPosition, text, formatting);
                console.log('✅ New text created:', textId);
                
                // Select the new text
                setTextSelectedId(textId);
                setSelectedObjectId(textId);
              } else if (textEditData.object) {
                // Editing existing text
                const updates = {
                  text,
                  ...formatting
                };
                
                await updateObject(textEditData.object.id, updates);
                console.log('✅ Text updated:', textEditData.object.id);
                
                // Unlock the text
                await unlockObject(textEditData.object.id);
                
                // Keep the text selected so user can immediately use other tools (resize, rotate, etc.)
                setTextSelectedId(textEditData.object.id);
                setSelectedObjectId(textEditData.object.id);
              }
              
              // Clear editing state
              setIsEditingText(false);
              setTextEditData(null);
            } catch (error) {
              console.error('❌ Failed to save text:', error);
              setIsEditingText(false);
              setTextEditData(null);
            }
          }}
          onCancel={async () => {
            console.log('❌ Text editing cancelled');
            
            // If we were editing an existing text, unlock it
            if (textEditData.object) {
              try {
                await unlockObject(textEditData.object.id);
              } catch (error) {
                console.error('Failed to unlock text:', error);
              }
            }
            
            // Clear editing state
            setIsEditingText(false);
            setTextEditData(null);
          }}
          stageScale={stageScale}
          stagePos={stagePos}
        />
      )}
    </div>
  );
};

export default Canvas;