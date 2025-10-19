/**
 * Handle Detection Utilities
 * 
 * Extracted from ResizeTool.js to centralize handle detection logic
 * for different shape types and improve code organization.
 */

const HANDLE_SIZE = 20;
const HANDLE_PADDING = 5;
// More forgiving detection area - especially important at low zoom levels  
const HANDLE_DETECTION_SIZE = 80; // Much larger detection area for better UX at low zoom

/**
 * Detect which resize handle is closest to a click position
 * @param {Object} pos - Click position {x, y}
 * @param {Object} obj - Object with position and dimensions
 * @returns {string|null} - Handle name ('nw', 'ne', 'sw', 'se') or null
 */
export const detectResizeHandle = (pos, obj) => {
  if (!pos || !obj) {
    return null;
  }

  switch (obj.type) {
    case 'rectangle':
      return detectRectangleHandle(pos, obj);
    case 'circle':
      return detectCircleHandle(pos, obj);
    case 'star':
      return detectStarHandle(pos, obj);
    case 'text':
      return detectTextHandle(pos, obj);
    default:
      return null;
  }
};

/**
 * Detect resize handle for rectangles
 * @param {Object} pos - Click position
 * @param {Object} rect - Rectangle object
 * @returns {string|null} - Handle name or null
 */
export const detectRectangleHandle = (pos, rect) => {
  if (!rect || typeof rect.x !== 'number' || typeof rect.y !== 'number' ||
      typeof rect.width !== 'number' || typeof rect.height !== 'number') {
    return null;
  }

  // Don't show handles for rotated rectangles (handled by Transformer)
  if (rect.rotation && rect.rotation !== 0) {
    return null;
  }

  const handles = [
    { name: 'nw', x: rect.x - HANDLE_SIZE/2, y: rect.y - HANDLE_SIZE/2 },
    { name: 'ne', x: rect.x + rect.width - HANDLE_SIZE/2, y: rect.y - HANDLE_SIZE/2 },
    { name: 'sw', x: rect.x - HANDLE_SIZE/2, y: rect.y + rect.height - HANDLE_SIZE/2 },
    { name: 'se', x: rect.x + rect.width - HANDLE_SIZE/2, y: rect.y + rect.height - HANDLE_SIZE/2 }
  ];

  return findClosestHandle(pos, handles);
};

/**
 * Detect resize handle for circles (uses bounding box)
 * @param {Object} pos - Click position
 * @param {Object} circle - Circle object
 * @returns {string|null} - Handle name or null
 */
export const detectCircleHandle = (pos, circle) => {
  if (!circle || typeof circle.x !== 'number' || typeof circle.y !== 'number' ||
      typeof circle.radius !== 'number') {
    return null;
  }

  // Don't show handles for rotated circles (handled by Transformer)
  if (circle.rotation && circle.rotation !== 0) {
    return null;
  }

  // Position handles on circle's bounding box corners
  const bounds = {
    x: circle.x - circle.radius,
    y: circle.y - circle.radius,
    width: circle.radius * 2,
    height: circle.radius * 2
  };

  const handles = [
    { name: 'nw', x: bounds.x - HANDLE_SIZE/2, y: bounds.y - HANDLE_SIZE/2 },
    { name: 'ne', x: bounds.x + bounds.width - HANDLE_SIZE/2, y: bounds.y - HANDLE_SIZE/2 },
    { name: 'sw', x: bounds.x - HANDLE_SIZE/2, y: bounds.y + bounds.height - HANDLE_SIZE/2 },
    { name: 'se', x: bounds.x + bounds.width - HANDLE_SIZE/2, y: bounds.y + bounds.height - HANDLE_SIZE/2 }
  ];

  return findClosestHandle(pos, handles);
};

/**
 * Detect resize handle for stars (uses bounding box based on outerRadius)
 * @param {Object} pos - Click position
 * @param {Object} star - Star object
 * @returns {string|null} - Handle name or null
 */
export const detectStarHandle = (pos, star) => {
  if (!star || typeof star.x !== 'number' || typeof star.y !== 'number' ||
      typeof star.outerRadius !== 'number') {
    return null;
  }

  // Don't show handles for rotated stars (handled by Transformer)
  if (star.rotation && star.rotation !== 0) {
    return null;
  }

  // Position handles on star's bounding box corners (based on outerRadius)
  const bounds = {
    x: star.x - star.outerRadius,
    y: star.y - star.outerRadius,
    width: star.outerRadius * 2,
    height: star.outerRadius * 2
  };

  const handles = [
    { name: 'nw', x: bounds.x - HANDLE_SIZE/2, y: bounds.y - HANDLE_SIZE/2 },
    { name: 'ne', x: bounds.x + bounds.width - HANDLE_SIZE/2, y: bounds.y - HANDLE_SIZE/2 },
    { name: 'sw', x: bounds.x - HANDLE_SIZE/2, y: bounds.y + bounds.height - HANDLE_SIZE/2 },
    { name: 'se', x: bounds.x + bounds.width - HANDLE_SIZE/2, y: bounds.y + bounds.height - HANDLE_SIZE/2 }
  ];

  return findClosestHandle(pos, handles);
};

/**
 * Detect resize handle for text objects
 * @param {Object} pos - Click position
 * @param {Object} text - Text object
 * @returns {string|null} - Handle name or null
 */
export const detectTextHandle = (pos, text) => {
  if (!text || typeof text.x !== 'number' || typeof text.y !== 'number') {
    return null;
  }

  // Don't show handles for rotated text (handled by Transformer)
  if (text.rotation && text.rotation !== 0) {
    return null;
  }

  // Calculate text height based on font size and line count
  const fontSize = text.fontSize || 24;
  const charWidth = fontSize * 0.6; // Rough estimate
  const charsPerLine = Math.floor((text.width || 200) / charWidth);
  const lineCount = Math.max(1, Math.ceil((text.text?.length || 4) / charsPerLine));
  const lineHeight = fontSize * 1.2;
  const textHeight = lineCount * lineHeight;

  const bounds = {
    x: text.x,
    y: text.y,
    width: text.width || 200,
    height: textHeight
  };

  const handles = [
    { name: 'nw', x: bounds.x - HANDLE_SIZE/2, y: bounds.y - HANDLE_SIZE/2 },
    { name: 'ne', x: bounds.x + bounds.width - HANDLE_SIZE/2, y: bounds.y - HANDLE_SIZE/2 },
    { name: 'sw', x: bounds.x - HANDLE_SIZE/2, y: bounds.y + bounds.height - HANDLE_SIZE/2 },
    { name: 'se', x: bounds.x + bounds.width - HANDLE_SIZE/2, y: bounds.y + bounds.height - HANDLE_SIZE/2 }
  ];

  return findClosestHandle(pos, handles);
};

/**
 * Find the closest handle to a click position
 * @param {Object} pos - Click position
 * @param {Array} handles - Array of handle objects with {name, x, y}
 * @returns {string|null} - Closest handle name or null
 */
const findClosestHandle = (pos, handles) => {
  let closestHandle = null;
  let minDistance = Infinity;

  for (const handle of handles) {
    // Calculate center of handle for detection
    const centerX = handle.x + HANDLE_SIZE / 2;
    const centerY = handle.y + HANDLE_SIZE / 2;
    
    // Use larger detection area for better usability
    const detectionRadius = HANDLE_DETECTION_SIZE / 2;
    
    // Check if click is within detection radius
    const distance = Math.sqrt(
      Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2)
    );
    
    if (distance <= detectionRadius && distance < minDistance) {
      minDistance = distance;
      closestHandle = handle.name;
    }
  }

  return closestHandle;
};

/**
 * Enhanced handle detection with debug information
 * @param {Object} pos - Click position
 * @param {Object} obj - Object to detect handles for
 * @returns {Object} - { handle: string|null, debug: Object }
 */
export const detectResizeHandleWithDebug = (pos, obj) => {
  const handle = detectResizeHandle(pos, obj);
  
  const debug = {
    clickPosition: pos,
    objectType: obj?.type,
    objectId: obj?.id,
    objectPosition: { x: obj?.x, y: obj?.y },
    objectDimensions: getObjectDimensions(obj),
    rotation: obj?.rotation || 0,
    handleFound: handle,
    timestamp: Date.now()
  };

  return { handle, debug };
};

/**
 * Get dimensions for different object types
 * @param {Object} obj - Object to get dimensions for
 * @returns {Object} - Dimensions object
 */
const getObjectDimensions = (obj) => {
  if (!obj) return null;

  switch (obj.type) {
    case 'rectangle':
      return { width: obj.width, height: obj.height };
    case 'circle':
      return { radius: obj.radius };
    case 'star':
      return { innerRadius: obj.innerRadius, outerRadius: obj.outerRadius };
    case 'text':
      return { width: obj.width, text: obj.text };
    default:
      return null;
  }
};

/**
 * Check if a position is within any resize handle for an object
 * @param {Object} pos - Position to check
 * @param {Object} obj - Object to check handles for
 * @returns {boolean} - True if position is within any handle
 */
export const isPositionInAnyHandle = (pos, obj) => {
  return detectResizeHandle(pos, obj) !== null;
};