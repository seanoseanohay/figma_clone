/**
 * Resize Validation Utilities
 * 
 * Extracted from ResizeTool.js to centralize validation logic
 * and improve code organization.
 */

/**
 * Validate that an object is suitable for resize operations
 * @param {Object} object - Object to validate
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateObjectForResize = (object) => {
  if (!object) {
    return { valid: false, error: 'Object is null or undefined' };
  }

  if (!object.id || typeof object.id !== 'string') {
    return { valid: false, error: 'Object missing valid ID' };
  }

  if (!object.type || typeof object.type !== 'string') {
    return { valid: false, error: 'Object missing valid type' };
  }

  // Validate position properties
  if (typeof object.x !== 'number' || !isFinite(object.x)) {
    return { valid: false, error: 'Object has invalid x position' };
  }

  if (typeof object.y !== 'number' || !isFinite(object.y)) {
    return { valid: false, error: 'Object has invalid y position' };
  }

  // Type-specific validations
  switch (object.type) {
    case 'rectangle':
      if (typeof object.width !== 'number' || !isFinite(object.width) || object.width <= 0) {
        return { valid: false, error: 'Rectangle has invalid width' };
      }
      if (typeof object.height !== 'number' || !isFinite(object.height) || object.height <= 0) {
        return { valid: false, error: 'Rectangle has invalid height' };
      }
      break;

    case 'circle':
      if (typeof object.radius !== 'number' || !isFinite(object.radius) || object.radius <= 0) {
        return { valid: false, error: 'Circle has invalid radius' };
      }
      break;

    case 'star':
      if (typeof object.innerRadius !== 'number' || !isFinite(object.innerRadius) || object.innerRadius <= 0) {
        return { valid: false, error: 'Star has invalid innerRadius' };
      }
      if (typeof object.outerRadius !== 'number' || !isFinite(object.outerRadius) || object.outerRadius <= 0) {
        return { valid: false, error: 'Star has invalid outerRadius' };
      }
      if (object.innerRadius >= object.outerRadius) {
        return { valid: false, error: 'Star innerRadius must be less than outerRadius' };
      }
      break;

    case 'text':
      if (object.width !== undefined && (typeof object.width !== 'number' || !isFinite(object.width) || object.width <= 0)) {
        return { valid: false, error: 'Text has invalid width' };
      }
      break;

    default:
      return { valid: false, error: `Unsupported object type for resize: ${object.type}` };
  }

  return { valid: true };
};

/**
 * Validate resize state before starting a resize operation
 * @param {Object} resizeState - Resize state object
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateResizeState = (resizeState) => {
  if (!resizeState) {
    return { valid: false, error: 'Resize state is null or undefined' };
  }

  const { object, startPos, handle } = resizeState;

  if (!object) {
    return { valid: false, error: 'Resize state missing object' };
  }

  if (!startPos || typeof startPos.x !== 'number' || typeof startPos.y !== 'number') {
    return { valid: false, error: 'Resize state has invalid startPos' };
  }

  if (!handle || typeof handle !== 'string') {
    return { valid: false, error: 'Resize state missing or invalid handle' };
  }

  const validHandles = ['nw', 'ne', 'sw', 'se'];
  if (!validHandles.includes(handle)) {
    return { valid: false, error: `Invalid resize handle: ${handle}` };
  }

  // Validate the object within the resize state
  const objectValidation = validateObjectForResize(object);
  if (!objectValidation.valid) {
    return { valid: false, error: `Resize state object invalid: ${objectValidation.error}` };
  }

  return { valid: true };
};

/**
 * Validate object update data before applying
 * @param {Object} update - Update data to validate
 * @param {string} objectType - Type of object being updated
 * @returns {Object} - { valid: boolean, error?: string, sanitizedUpdate?: Object }
 */
export const validateObjectUpdate = (update, objectType) => {
  if (!update || typeof update !== 'object') {
    return { valid: false, error: 'Update data is null or not an object' };
  }

  const sanitized = {};

  // Validate common properties
  if (update.x !== undefined) {
    if (typeof update.x !== 'number' || !isFinite(update.x)) {
      return { valid: false, error: 'Invalid x coordinate' };
    }
    sanitized.x = update.x;
  }

  if (update.y !== undefined) {
    if (typeof update.y !== 'number' || !isFinite(update.y)) {
      return { valid: false, error: 'Invalid y coordinate' };
    }
    sanitized.y = update.y;
  }

  if (update.rotation !== undefined) {
    if (typeof update.rotation !== 'number' || !isFinite(update.rotation)) {
      return { valid: false, error: 'Invalid rotation value' };
    }
    sanitized.rotation = update.rotation;
  }

  // Type-specific validations
  switch (objectType) {
    case 'rectangle':
      if (update.width !== undefined) {
        if (typeof update.width !== 'number' || !isFinite(update.width) || update.width <= 0) {
          return { valid: false, error: 'Invalid width for rectangle' };
        }
        sanitized.width = update.width;
      }
      if (update.height !== undefined) {
        if (typeof update.height !== 'number' || !isFinite(update.height) || update.height <= 0) {
          return { valid: false, error: 'Invalid height for rectangle' };
        }
        sanitized.height = update.height;
      }
      break;

    case 'circle':
      if (update.radius !== undefined) {
        if (typeof update.radius !== 'number' || !isFinite(update.radius) || update.radius <= 0) {
          return { valid: false, error: 'Invalid radius for circle' };
        }
        sanitized.radius = update.radius;
      }
      break;

    case 'star':
      if (update.innerRadius !== undefined) {
        if (typeof update.innerRadius !== 'number' || !isFinite(update.innerRadius) || update.innerRadius <= 0) {
          return { valid: false, error: 'Invalid innerRadius for star' };
        }
        sanitized.innerRadius = update.innerRadius;
      }
      if (update.outerRadius !== undefined) {
        if (typeof update.outerRadius !== 'number' || !isFinite(update.outerRadius) || update.outerRadius <= 0) {
          return { valid: false, error: 'Invalid outerRadius for star' };
        }
        sanitized.outerRadius = update.outerRadius;
      }
      if (update.numPoints !== undefined) {
        if (typeof update.numPoints !== 'number' || !isFinite(update.numPoints) || update.numPoints < 3) {
          return { valid: false, error: 'Invalid numPoints for star' };
        }
        sanitized.numPoints = update.numPoints;
      }
      break;

    case 'text':
      if (update.width !== undefined) {
        if (typeof update.width !== 'number' || !isFinite(update.width) || update.width <= 0) {
          return { valid: false, error: 'Invalid width for text' };
        }
        sanitized.width = update.width;
      }
      break;

    default:
      return { valid: false, error: `Unsupported object type: ${objectType}` };
  }

  return { valid: true, sanitizedUpdate: sanitized };
};

/**
 * Sanitize object update to remove invalid values
 * @param {Object} update - Update object to sanitize
 * @returns {Object|null} - Sanitized update or null if completely invalid
 */
export const sanitizeObjectUpdate = (update) => {
  if (!update || typeof update !== 'object') {
    return null;
  }

  const sanitized = {};
  let hasValidProperties = false;

  // Check numeric properties
  const numericProps = ['x', 'y', 'width', 'height', 'radius', 'innerRadius', 'outerRadius', 'rotation', 'numPoints'];

  for (const prop of numericProps) {
    if (update.hasOwnProperty(prop)) {
      const value = update[prop];
      if (typeof value === 'number' && isFinite(value)) {
        // Additional validation for size properties
        if (['width', 'height', 'radius', 'innerRadius', 'outerRadius'].includes(prop)) {
          if (value > 0) {
            sanitized[prop] = value;
            hasValidProperties = true;
          }
        } else {
          sanitized[prop] = value;
          hasValidProperties = true;
        }
      } else {
        console.warn(`Invalid ${prop} value in update:`, value);
      }
    }
  }

  // Copy non-numeric properties as-is (like id, type, fill, etc.)
  const nonNumericProps = ['id', 'type', 'fill', 'stroke', 'strokeWidth'];
  for (const prop of nonNumericProps) {
    if (update.hasOwnProperty(prop)) {
      sanitized[prop] = update[prop];
      hasValidProperties = true;
    }
  }

  return hasValidProperties ? sanitized : null;
};

/**
 * Check if an update contains any invalid numeric values
 * @param {Object} update - Update object to check
 * @returns {Array} - Array of invalid property names
 */
export const findInvalidValues = (update) => {
  if (!update || typeof update !== 'object') {
    return ['entire_object'];
  }

  const invalidProps = [];
  const numericProps = ['x', 'y', 'width', 'height', 'radius', 'innerRadius', 'outerRadius', 'rotation'];

  for (const prop of numericProps) {
    if (update.hasOwnProperty(prop)) {
      const value = update[prop];
      if (typeof value === 'number' && !isFinite(value)) {
        invalidProps.push(prop);
      }
    }
  }

  return invalidProps;
};