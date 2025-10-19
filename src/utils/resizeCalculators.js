/**
 * Resize Calculation Utilities
 * 
 * Extracted from ResizeTool.js to centralize resize calculations
 * and make them reusable across different components.
 */

/**
 * Calculate new rectangle dimensions based on resize handle
 * @param {Object} rect - Original rectangle
 * @param {string} handle - Resize handle ('nw', 'ne', 'sw', 'se')
 * @param {number} deltaX - X movement delta
 * @param {number} deltaY - Y movement delta
 * @returns {Object} - New rectangle dimensions
 */
export const calculateRectangleResize = (rect, handle, deltaX, deltaY) => {
  const newRect = { ...rect };
  
  switch (handle) {
    case 'nw':
      newRect.x = rect.x + deltaX;
      newRect.y = rect.y + deltaY;
      newRect.width = rect.width - deltaX;
      newRect.height = rect.height - deltaY;
      break;
    case 'ne':
      newRect.y = rect.y + deltaY;
      newRect.width = rect.width + deltaX;
      newRect.height = rect.height - deltaY;
      break;
    case 'sw':
      newRect.x = rect.x + deltaX;
      newRect.width = rect.width - deltaX;
      newRect.height = rect.height + deltaY;
      break;
    case 'se':
      newRect.width = rect.width + deltaX;
      newRect.height = rect.height + deltaY;
      break;
  }
  
  return newRect;
};

/**
 * Calculate new circle dimensions based on resize handle
 * @param {Object} circle - Original circle
 * @param {string} handle - Resize handle (not used for circles)
 * @param {Object} currentPos - Current mouse position
 * @param {Object} startPos - Start mouse position
 * @param {number} minSize - Minimum radius size
 * @returns {Object} - New circle dimensions
 */
export const calculateCircleResize = (circle, handle, currentPos, startPos, minSize = 2) => {
  // Calculate distance from center to current mouse position
  const dx = currentPos.x - circle.x;
  const dy = currentPos.y - circle.y;
  const newRadius = Math.sqrt(dx * dx + dy * dy);
  
  return {
    ...circle,
    radius: Math.max(newRadius, minSize / 2) // Minimum radius
  };
};

/**
 * Calculate new star dimensions based on resize handle
 * @param {Object} star - Original star
 * @param {string} handle - Resize handle (not used for stars)
 * @param {Object} currentPos - Current mouse position
 * @param {Object} startPos - Start mouse position
 * @param {number} minSize - Minimum size
 * @returns {Object} - New star dimensions
 */
export const calculateStarResize = (star, handle, currentPos, startPos, minSize = 2) => {
  // Enhanced validation to prevent NaN values
  if (!star || typeof star.x !== 'number' || typeof star.y !== 'number') {
    console.error('❌ STAR RESIZE ERROR: Invalid star object:', star);
    return star; // Return original to prevent crashes
  }
  
  if (!currentPos || typeof currentPos.x !== 'number' || typeof currentPos.y !== 'number') {
    console.error('❌ STAR RESIZE ERROR: Invalid currentPos:', currentPos);
    return star;
  }
  
  // Calculate distance from center to current mouse position
  const dx = currentPos.x - star.x;
  const dy = currentPos.y - star.y;
  const newOuterRadius = Math.sqrt(dx * dx + dy * dy);
  
  // Critical validation: Ensure we don't get NaN
  if (!isFinite(newOuterRadius) || newOuterRadius < 0) {
    console.error('❌ STAR RESIZE ERROR: Invalid radius calculation:', { dx, dy, newOuterRadius });
    return star;
  }
  
  // Maintain the 40% ratio for inner radius
  const newInnerRadius = newOuterRadius * 0.4;
  
  // Safety: Ensure all values are finite numbers
  const safeOuterRadius = Math.max(newOuterRadius, minSize / 2); // Minimum radius
  const safeInnerRadius = Math.max(newInnerRadius, minSize / 4); // Minimum inner radius
  
  if (!isFinite(safeOuterRadius) || !isFinite(safeInnerRadius)) {
    console.error('❌ STAR RESIZE ERROR: Non-finite radius values:', { safeOuterRadius, safeInnerRadius });
    return star;
  }
  
  const result = {
    ...star,
    outerRadius: safeOuterRadius,
    innerRadius: safeInnerRadius
  };
  
  // Final validation: Ensure result is safe
  if (!isFinite(result.x) || !isFinite(result.y) || !isFinite(result.outerRadius) || !isFinite(result.innerRadius)) {
    console.error('❌ STAR RESIZE ERROR: Final result contains invalid values:', result);
    return star; // Return original as fallback
  }
  
  return result;
};

/**
 * Calculate new text dimensions based on resize handle
 * @param {Object} text - Original text object
 * @param {string} handle - Resize handle
 * @param {number} deltaX - X movement delta
 * @param {number} deltaY - Y movement delta (not used for text)
 * @returns {Object} - New text dimensions
 */
export const calculateTextResize = (text, handle, deltaX, deltaY) => {
  // Text resize: Only change width (height auto-grows based on wrapped content)
  let newWidth = text.width || 200;
  let newX = text.x;
  
  switch (handle) {
    case 'nw':
    case 'sw':
      // Left side handles - move left edge
      newX = text.x + deltaX;
      newWidth = (text.width || 200) - deltaX;
      break;
    case 'ne':
    case 'se':
      // Right side handles - move right edge
      newWidth = (text.width || 200) + deltaX;
      break;
  }
  
  // Enforce minimum width
  if (newWidth < 50) {
    newWidth = 50;
    newX = text.x; // Don't move if at minimum
  }
  
  // Enforce canvas boundaries (assuming 5000px width)
  if (newX < 0) {
    newWidth += newX;
    newX = 0;
  }
  if (newX + newWidth > 5000) {
    newWidth = 5000 - newX;
  }
  
  return {
    ...text,
    x: newX,
    width: newWidth
    // Height is NOT updated - it's calculated dynamically based on wrapped content
  };
};

/**
 * Detect crossover during rectangle resize (when dragging past opposite corners)
 * @param {Object} currentRect - Current transformed rectangle
 * @param {string} currentHandle - Current resize handle
 * @param {Object} originalRect - Original rectangle before resize
 * @returns {Object} - { rect: Object, handle: string, flipped: boolean }
 */
export const detectResizeCrossover = (currentRect, currentHandle, originalRect) => {
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
  if (hasFlipped) {
    return { rect: currentRect, handle: newHandle, flipped: true };
  }
  
  return { rect: null, handle: currentHandle, flipped: false };
};

/**
 * Enforce minimum size constraints on a shape
 * @param {Object} shape - Shape object
 * @param {number} minSize - Minimum size
 * @returns {Object} - Shape with enforced minimum size
 */
export const enforceMinimumSize = (shape, minSize = 2) => {
  const result = { ...shape };
  
  switch (shape.type) {
    case 'rectangle':
      if (result.width < minSize) result.width = minSize;
      if (result.height < minSize) result.height = minSize;
      break;
      
    case 'circle':
      if (result.radius < minSize / 2) result.radius = minSize / 2;
      break;
      
    case 'star':
      if (result.outerRadius < minSize / 2) result.outerRadius = minSize / 2;
      if (result.innerRadius < minSize / 4) result.innerRadius = minSize / 4;
      break;
      
    case 'text':
      if (result.width < 50) result.width = 50;
      break;
  }
  
  return result;
};