/**
 * Shape State Manager Utilities
 * 
 * Extracted from ResizeTool.js to centralize shape state management
 * and reduce code duplication across different tools.
 */

/**
 * Validate that an object has the required properties for manipulation
 * @param {Object} obj - The object to validate
 * @param {Array} requiredProps - Array of required property names
 * @returns {boolean} - True if object has all required properties
 */
export const validateObjectProperties = (obj, requiredProps = ['id', 'type', 'x', 'y']) => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  return requiredProps.every(prop => {
    const value = obj[prop];
    return value !== undefined && value !== null && (typeof value !== 'number' || isFinite(value));
  });
};

/**
 * Sanitize object data to ensure no invalid values
 * @param {Object} obj - The object to sanitize
 * @returns {Object} - Sanitized object or null if invalid
 */
export const sanitizeObjectData = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return null;
  }

  const sanitized = { ...obj };
  
  // Check for NaN/Infinity in numeric properties
  const numericProps = ['x', 'y', 'width', 'height', 'radius', 'innerRadius', 'outerRadius', 'rotation'];
  
  for (const prop of numericProps) {
    if (sanitized.hasOwnProperty(prop) && typeof sanitized[prop] === 'number') {
      if (!isFinite(sanitized[prop])) {
        console.error(`Invalid ${prop} value in object:`, sanitized[prop]);
        return null; // Return null for objects with invalid numeric values
      }
    }
  }

  return sanitized;
};

/**
 * Merge object state with local updates, prioritizing valid local updates
 * @param {Object} baseObject - Base object from Firestore
 * @param {Object} localUpdates - Local updates to merge
 * @returns {Object} - Merged object or base object if local updates are invalid
 */
export const mergeObjectState = (baseObject, localUpdates) => {
  if (!baseObject) {
    return null;
  }

  if (!localUpdates || typeof localUpdates !== 'object') {
    return baseObject;
  }

  // Validate local updates before merging
  const sanitizedUpdates = sanitizeObjectData(localUpdates);
  if (!sanitizedUpdates) {
    console.warn('Local updates contain invalid values, using base object');
    return baseObject;
  }

  return {
    ...baseObject,
    ...sanitizedUpdates
  };
};

/**
 * Find object in canvas objects with fallback to local updates
 * @param {string} objectId - Object ID to find
 * @param {Array} canvasObjects - Array of canvas objects from Firestore
 * @param {Object} localUpdates - Local updates object
 * @returns {Object|null} - Found object or null
 */
export const findObjectWithFallback = (objectId, canvasObjects, localUpdates = {}) => {
  if (!objectId) {
    return null;
  }

  // First try to find in canvas objects
  const baseObject = canvasObjects.find(obj => obj.id === objectId);
  
  if (baseObject) {
    // Merge with local updates if available
    const localUpdate = localUpdates[objectId];
    if (localUpdate) {
      return mergeObjectState(baseObject, localUpdate);
    }
    return baseObject;
  }

  // Fallback: check if we have local updates for this object
  const localUpdate = localUpdates[objectId];
  if (localUpdate && localUpdate.id === objectId) {
    const sanitized = sanitizeObjectData(localUpdate);
    if (sanitized) {
      console.log('Using local updates as fallback for object:', objectId);
      return sanitized;
    }
  }

  return null;
};

/**
 * Validate that a shape is ready for manipulation operations
 * @param {Object} shape - The shape object to validate
 * @param {string} operation - The operation being performed ('resize', 'rotate', 'move')
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateShapeForOperation = (shape, operation) => {
  if (!shape) {
    return { valid: false, error: 'Shape not found' };
  }

  if (!validateObjectProperties(shape)) {
    return { valid: false, error: 'Shape has invalid properties' };
  }

  // Operation-specific validations
  switch (operation) {
    case 'resize':
      if (shape.type === 'rectangle') {
        if (!validateObjectProperties(shape, ['width', 'height'])) {
          return { valid: false, error: 'Rectangle missing width or height' };
        }
      } else if (shape.type === 'circle') {
        if (!validateObjectProperties(shape, ['radius'])) {
          return { valid: false, error: 'Circle missing radius' };
        }
      } else if (shape.type === 'star') {
        if (!validateObjectProperties(shape, ['innerRadius', 'outerRadius'])) {
          return { valid: false, error: 'Star missing radius properties' };
        }
      }
      break;
      
    case 'rotate':
      // All shapes can be rotated, just need basic properties
      break;
      
    case 'move':
      // All shapes can be moved, just need position
      break;
      
    default:
      return { valid: false, error: `Unknown operation: ${operation}` };
  }

  return { valid: true };
};

/**
 * Create a safe object update with validation
 * @param {Object} originalObject - Original object state
 * @param {Object} updates - Updates to apply
 * @returns {Object|null} - Updated object or null if invalid
 */
export const createSafeObjectUpdate = (originalObject, updates) => {
  if (!originalObject || !updates) {
    return null;
  }

  // Merge updates with original
  const merged = {
    ...originalObject,
    ...updates
  };

  // Sanitize the result
  return sanitizeObjectData(merged);
};

/**
 * Batch validate multiple objects for an operation
 * @param {Array} objects - Array of objects to validate
 * @param {string} operation - Operation to validate for
 * @returns {Object} - { validObjects: Array, invalidObjects: Array }
 */
export const batchValidateObjects = (objects, operation) => {
  const validObjects = [];
  const invalidObjects = [];

  for (const obj of objects) {
    const validation = validateShapeForOperation(obj, operation);
    if (validation.valid) {
      validObjects.push(obj);
    } else {
      invalidObjects.push({ 
        object: obj, 
        error: validation.error 
      });
    }
  }

  return { validObjects, invalidObjects };
};

/**
 * Emergency recovery for corrupted object state
 * @param {string} objectId - Object ID
 * @param {Array} canvasObjects - Canvas objects array
 * @param {Function} retryCallback - Function to retry after recovery
 * @returns {Promise<Object|null>} - Recovered object or null
 */
export const emergencyObjectRecovery = async (objectId, canvasObjects, retryCallback) => {
  console.log('🚨 Attempting emergency recovery for object:', objectId);
  
  // Wait for potential Firestore sync
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Retry finding the object
  const recoveredObject = canvasObjects.find(obj => obj.id === objectId);
  
  if (recoveredObject) {
    console.log('✅ Emergency recovery successful!');
    
    // Validate the recovered object
    const sanitized = sanitizeObjectData(recoveredObject);
    if (sanitized) {
      if (retryCallback) {
        return retryCallback(sanitized);
      }
      return sanitized;
    }
  }
  
  console.error('❌ Emergency recovery failed');
  return null;
};