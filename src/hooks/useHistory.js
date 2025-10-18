import { useState, useCallback } from 'react';
import { auth } from '../services/firebase.js';
import { updateObject, deleteObject as deleteCanvasObject, createObject } from '../services/canvas.service.js';
import { canUserEditObject } from '../hooks/useObjectOwnership.js';

/**
 * Action Types for Undo/Redo System
 */
export const ACTION_TYPES = {
  CREATE_OBJECT: 'CREATE_OBJECT',       // New shape/text created
  DELETE_OBJECT: 'DELETE_OBJECT',       // Object removed (A4)
  MOVE_OBJECT: 'MOVE_OBJECT',           // Position changed
  RESIZE_OBJECT: 'RESIZE_OBJECT',       // Dimensions changed
  ROTATE_OBJECT: 'ROTATE_OBJECT',       // Rotation angle changed
  UPDATE_PROPERTIES: 'UPDATE_PROPERTIES' // Color, z-index, text content, etc.
};

/**
 * Generate unique command ID
 */
const generateCommandId = () => {
  return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate human-readable description for action
 */
const generateDescription = (type, objectType = 'Object', metadata = {}) => {
  const capitalizedType = objectType.charAt(0).toUpperCase() + objectType.slice(1);
  
  switch (type) {
    case ACTION_TYPES.CREATE_OBJECT:
      return `Create ${capitalizedType}`;
    case ACTION_TYPES.DELETE_OBJECT:
      return `Delete ${capitalizedType}`;
    case ACTION_TYPES.MOVE_OBJECT:
      return `Move ${capitalizedType}`;
    case ACTION_TYPES.RESIZE_OBJECT:
      return `Resize ${capitalizedType}`;
    case ACTION_TYPES.ROTATE_OBJECT:
      return `Rotate ${capitalizedType}`;
    case ACTION_TYPES.UPDATE_PROPERTIES:
      // Generate more specific descriptions based on what properties changed
      if (metadata.before && metadata.after) {
        const beforeKeys = Object.keys(metadata.before);
        const afterKeys = Object.keys(metadata.after || {});
        const changedProps = [...new Set([...beforeKeys, ...afterKeys])];
        
        if (changedProps.includes('fill')) {
          return `Change ${capitalizedType} Color`;
        } else if (changedProps.includes('zIndex')) {
          return `Change ${capitalizedType} Layer`;
        } else if (changedProps.includes('text') || changedProps.some(prop => 
          ['bold', 'italic', 'underline', 'fontSize', 'fontFamily'].includes(prop))) {
          return `Edit ${capitalizedType}`;
        }
      }
      return `Update ${capitalizedType} Properties`;
    default:
      return `${type} ${capitalizedType}`;
  }
};

/**
 * useHistory Hook - Undo/Redo System with 5-Action Limit per User
 * 
 * Features:
 * - Per-user independent undo/redo stacks (max 5 actions each)
 * - Command pattern with before/after state snapshots
 * - Ownership checks prevent conflicts in multi-user scenarios
 * - Supports all object operations: create, delete, move, resize, rotate, properties
 * 
 * @param {string} canvasId - Canvas ID for operations
 * @param {Function} onError - Error handler for conflict scenarios
 * @returns {Object} History API
 */
export const useHistory = (canvasId, onError) => {
  const [undoStack, setUndoStack] = useState([]); // Max 5 items, newest at index 0
  const [redoStack, setRedoStack] = useState([]); // Max 5 items, newest at index 0

  const MAX_STACK_SIZE = 5;

  /**
   * Record a new action in the undo stack
   * Clears redo stack and trims undo stack to 5 items
   * 
   * @param {string} type - Action type from ACTION_TYPES
   * @param {string} objectId - Object ID that was affected
   * @param {Object} before - State before action (for undo)
   * @param {Object} after - State after action (for redo)
   * @param {Object} metadata - Additional metadata (objectType, etc.)
   */
  const recordAction = useCallback((type, objectId, before, after, metadata = {}) => {
    if (!auth.currentUser) {
      console.warn('Cannot record action: no authenticated user');
      return;
    }

    const command = {
      id: generateCommandId(),
      type,
      userId: auth.currentUser.uid,
      timestamp: Date.now(),
      objectId,
      before,
      after,
      canvasId,
      description: generateDescription(type, metadata.objectType || 'Object', { before, after, ...metadata }),
      metadata
    };

    console.log('Recording action:', command);

    setUndoStack(prevStack => {
      const newStack = [command, ...prevStack];
      return newStack.slice(0, MAX_STACK_SIZE); // Trim to 5 items
    });

    // Clear redo stack when new action is performed
    setRedoStack([]);
  }, [canvasId]);

  /**
   * Check if user can perform undo/redo on an object
   * @param {Object} command - Command to check
   * @param {Object} currentObjects - Current object state map
   * @returns {Object} { canExecute: boolean, error?: string }
   */
  const checkExecutionPermissions = useCallback(async (command, currentObjects) => {
    const { objectId, type } = command;

    // For CREATE_OBJECT undo (delete), object should exist
    // For DELETE_OBJECT undo (restore), object should not exist
    const objectExists = currentObjects && currentObjects[objectId];

    if (type === ACTION_TYPES.CREATE_OBJECT && !objectExists) {
      return { canExecute: false, error: 'Cannot undo: object no longer exists' };
    }

    if (type === ACTION_TYPES.DELETE_OBJECT && objectExists) {
      return { canExecute: false, error: 'Cannot undo: object was recreated' };
    }

    // For other operations, object must exist
    if (type !== ACTION_TYPES.CREATE_OBJECT && type !== ACTION_TYPES.DELETE_OBJECT && !objectExists) {
      return { canExecute: false, error: 'Cannot undo: object no longer exists' };
    }

    // Check ownership/locking for existing objects
    if (objectExists) {
      const canEdit = await canUserEditObject(objectId);
      if (!canEdit) {
        // Try to get the owner name from object data
        const ownerName = objectExists.lastModifiedByName || objectExists.createdByName || 'another user';
        return { canExecute: false, error: `Cannot undo: object is being edited by ${ownerName}` };
      }
    }

    return { canExecute: true };
  }, []);

  /**
   * Execute an undo operation
   * @param {Object} command - Command to undo
   * @returns {Promise<boolean>} Success status
   */
  const executeUndo = useCallback(async (command) => {
    const { type, objectId, before, after } = command;

    try {
      switch (type) {
        case ACTION_TYPES.CREATE_OBJECT:
          // Undo create = delete object
          await deleteCanvasObject(objectId);
          break;

        case ACTION_TYPES.DELETE_OBJECT:
          // Undo delete = restore object with all properties (shape-aware)
          const restoreData = { ...before, id: objectId };
          
          // Build position data based on shape type
          const restorePosition = { x: before.x, y: before.y };
          
          // Only add width/height for shapes that use them
          if (before.type === 'rectangle' || before.type === 'text') {
            restorePosition.width = before.width;
            restorePosition.height = before.height;
          }
          // Circles and stars handle their dimensions in the properties object
          
          await createObject(before.type, restorePosition, canvasId, {
            ...restoreData,
            // Override ID to restore exact same object
            forceId: objectId
          });
          break;

        case ACTION_TYPES.MOVE_OBJECT:
          // Undo move = restore previous position
          await updateObject(objectId, { x: before.x, y: before.y });
          break;

        case ACTION_TYPES.RESIZE_OBJECT:
          // Undo resize = restore previous dimensions (shape-aware)
          // BUG NOTE: Negative dimensions from resize operations may cause state corruption
          // See docs/stage_8_final_bugs_and_beyond.md - Bug #1
          const undoResizeData = {
            // Always include position if it exists  
            ...(before.x !== undefined && { x: before.x }),
            ...(before.y !== undefined && { y: before.y })
          };
          
          // Add shape-specific dimension properties
          if (before.type === 'circle') {
            undoResizeData.radius = before.radius;
          } else if (before.type === 'star') {
            undoResizeData.innerRadius = before.innerRadius;
            undoResizeData.outerRadius = before.outerRadius;
          } else if (before.type === 'text') {
            undoResizeData.width = before.width;
            // Don't restore height for text - it's calculated dynamically
          } else {
            // Rectangle and other shapes with width/height
            undoResizeData.width = before.width;
            undoResizeData.height = before.height;
          }
          
          await updateObject(objectId, undoResizeData);
          break;

        case ACTION_TYPES.ROTATE_OBJECT:
          // Undo rotate = restore previous angle
          await updateObject(objectId, { rotation: before.rotation });
          break;

        case ACTION_TYPES.UPDATE_PROPERTIES:
          // Undo properties = restore previous properties
          await updateObject(objectId, before);
          break;

        default:
          throw new Error(`Unknown action type: ${type}`);
      }

      return true;
    } catch (error) {
      console.error('Error executing undo:', error);
      onError?.(`Failed to undo: ${error.message}`);
      return false;
    }
  }, [canvasId, onError]);

  /**
   * Execute a redo operation
   * @param {Object} command - Command to redo
   * @returns {Promise<boolean>} Success status
   */
  const executeRedo = useCallback(async (command) => {
    const { type, objectId, before, after } = command;

    try {
      switch (type) {
        case ACTION_TYPES.CREATE_OBJECT:
          // Redo create = recreate object with same ID and properties (shape-aware)
          const recreateData = { ...after, id: objectId };
          
          // Build position data based on shape type
          const recreatePosition = { x: after.x, y: after.y };
          
          // Only add width/height for shapes that use them
          if (after.type === 'rectangle' || after.type === 'text') {
            recreatePosition.width = after.width;
            recreatePosition.height = after.height;
          }
          // Circles and stars handle their dimensions in the properties object
          
          await createObject(after.type, recreatePosition, canvasId, {
            ...recreateData,
            // Override ID to recreate exact same object
            forceId: objectId
          });
          break;

        case ACTION_TYPES.DELETE_OBJECT:
          // Redo delete = delete object again
          await deleteCanvasObject(objectId);
          break;

        case ACTION_TYPES.MOVE_OBJECT:
          // Redo move = apply new position
          await updateObject(objectId, { x: after.x, y: after.y });
          break;

        case ACTION_TYPES.RESIZE_OBJECT:
          // Redo resize = apply new dimensions (shape-aware)
          // BUG NOTE: Negative dimensions from resize operations may cause state corruption
          // See docs/stage_8_final_bugs_and_beyond.md - Bug #1
          const redoResizeData = {
            // Always include position if it exists
            ...(after.x !== undefined && { x: after.x }),
            ...(after.y !== undefined && { y: after.y })
          };
          
          // Add shape-specific dimension properties
          if (after.type === 'circle') {
            redoResizeData.radius = after.radius;
          } else if (after.type === 'star') {
            redoResizeData.innerRadius = after.innerRadius;
            redoResizeData.outerRadius = after.outerRadius;
          } else if (after.type === 'text') {
            redoResizeData.width = after.width;
            // Don't restore height for text - it's calculated dynamically
          } else {
            // Rectangle and other shapes with width/height
            redoResizeData.width = after.width;
            redoResizeData.height = after.height;
          }
          
          await updateObject(objectId, redoResizeData);
          break;

        case ACTION_TYPES.ROTATE_OBJECT:
          // Redo rotate = apply new angle
          await updateObject(objectId, { rotation: after.rotation });
          break;

        case ACTION_TYPES.UPDATE_PROPERTIES:
          // Redo properties = apply new properties
          await updateObject(objectId, after);
          break;

        default:
          throw new Error(`Unknown action type: ${type}`);
      }

      return true;
    } catch (error) {
      console.error('Error executing redo:', error);
      onError?.(`Failed to redo: ${error.message}`);
      return false;
    }
  }, [canvasId, onError]);

  /**
   * Undo last action
   * @param {Object} currentObjects - Current object state for permission checks
   */
  const undo = useCallback(async (currentObjects = {}) => {
    if (undoStack.length === 0) {
      console.log('Nothing to undo');
      return;
    }

    const command = undoStack[0];
    console.log('Attempting to undo:', command);

    // Check permissions
    const { canExecute, error } = await checkExecutionPermissions(command, currentObjects);
    
    if (!canExecute) {
      console.warn('Undo blocked:', error);
      onError?.(error);
      return;
    }

    // Execute undo
    const success = await executeUndo(command);
    
    if (success) {
      // Move command from undo stack to redo stack
      setUndoStack(prevStack => prevStack.slice(1));
      setRedoStack(prevStack => {
        const newStack = [command, ...prevStack];
        return newStack.slice(0, MAX_STACK_SIZE);
      });
      
      console.log('Undo successful:', command.description);
    }
  }, [undoStack, executeUndo, checkExecutionPermissions, onError]);

  /**
   * Redo last undone action
   * @param {Object} currentObjects - Current object state for permission checks
   */
  const redo = useCallback(async (currentObjects = {}) => {
    if (redoStack.length === 0) {
      console.log('Nothing to redo');
      return;
    }

    const command = redoStack[0];
    console.log('Attempting to redo:', command);

    // Check permissions (reverse of undo logic)
    const { canExecute, error } = await checkExecutionPermissions(command, currentObjects);
    
    if (!canExecute) {
      console.warn('Redo blocked:', error);
      onError?.(error);
      return;
    }

    // Execute redo
    const success = await executeRedo(command);
    
    if (success) {
      // Move command from redo stack to undo stack
      setRedoStack(prevStack => prevStack.slice(1));
      setUndoStack(prevStack => {
        const newStack = [command, ...prevStack];
        return newStack.slice(0, MAX_STACK_SIZE);
      });
      
      console.log('Redo successful:', command.description);
    }
  }, [redoStack, executeRedo, checkExecutionPermissions, onError]);

  /**
   * Clear both undo and redo stacks
   */
  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
    console.log('History cleared');
  }, []);

  // Computed properties
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const undoDescription = canUndo ? `Undo: ${undoStack[0].description}` : null;
  const redoDescription = canRedo ? `Redo: ${redoStack[0].description}` : null;
  

  return {
    // Core API
    recordAction,
    undo,
    redo,
    clearHistory,
    
    // State
    canUndo,
    canRedo,
    undoDescription,
    redoDescription,
    
    // Debug info
    undoStack: undoStack.slice(), // Return copy for debugging
    redoStack: redoStack.slice(), // Return copy for debugging
    stackSize: undoStack.length + redoStack.length
  };
};

export default useHistory;
