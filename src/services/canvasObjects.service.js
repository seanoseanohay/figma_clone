import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  where,
  getDocs,
  getDoc,
  writeBatch
} from 'firebase/firestore'
import { db, auth } from './firebase.js'
import { FIREBASE_COLLECTIONS } from '../constants/canvas.constants.js'

/**
 * Canvas Objects Service
 * 
 * Handles CRUD operations for canvas objects (shapes, text, etc.)
 * Extracted from canvas.service.js to improve modularity.
 */

/**
 * Create a new canvas object
 * @param {string} type - Object type ('rectangle', 'circle', 'text')
 * @param {Object} position - Position and dimensions {x, y, width, height}
 * @param {string} canvasId - Canvas ID to associate the object with
 * @param {Object} properties - Additional properties (fill, stroke, etc.)
 * @param {Function} recordAction - Optional callback to record action for undo/redo
 * @returns {Promise<string>} Document ID of created object
 */
export const createObject = async (type, position, canvasId, properties = {}, recordAction = null) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to create objects')
    }

    if (!canvasId) {
      throw new Error('Canvas ID is required to create objects')
    }

    // Validate position is within canvas bounds
    if (position.x < 0 || position.y < 0 || 
        position.x + (position.width || 0) > 5000 || 
        position.y + (position.height || 0) > 5000) {
      throw new Error('Object position is outside canvas bounds')
    }

    const objectData = {
      type,
      canvasId,
      ...position,
      ...properties,
      createdBy: auth.currentUser.uid,
      createdByName: auth.currentUser.displayName || auth.currentUser.email,
      createdAt: serverTimestamp(),
      lastModifiedAt: serverTimestamp(),
      lastModifiedBy: auth.currentUser.uid
    }

    // Sanitize data to remove undefined fields before writing to Firestore
    const cleanData = Object.fromEntries(
      Object.entries(objectData).filter(([_, v]) => v !== undefined)
    )

    const docRef = await addDoc(collection(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS), cleanData)
    console.log('Canvas object created:', docRef.id)
    
    // Record action for undo/redo if callback provided
    if (recordAction && typeof recordAction === 'function') {
      try {
        recordAction(
          'CREATE_OBJECT', 
          docRef.id, 
          null, // before: object didn't exist
          cleanData, // after: complete object data
          { objectType: type.charAt(0).toUpperCase() + type.slice(1) }
        );
      } catch (error) {
        console.warn('Failed to record CREATE_OBJECT action:', error);
      }
    }
    
    return docRef.id
  } catch (error) {
    console.error('Error creating canvas object:', error)
    throw error
  }
}

/**
 * Update an existing canvas object
 * @param {string} objectId - Document ID of the object
 * @param {Object} updates - Fields to update
 * @param {Function} recordAction - Optional callback to record action for undo/redo
 * @param {Object} actionMetadata - Metadata for action recording (actionType, before, objectType)
 * @returns {Promise<void>}
 */
export const updateObject = async (objectId, updates, recordAction = null, actionMetadata = {}) => {
  try {
    if (objectId === null || objectId === undefined) {
      throw new Error('updateObject called with null or undefined objectId')
    }
    
    if (typeof objectId !== 'string' || objectId.trim().length === 0) {
      throw new Error(`updateObject called with invalid objectId: ${JSON.stringify(objectId)}`)
    }
    
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to update objects')
    }

    console.log('Updating object:', objectId, 'with updates:', updates)
    
    const docRef = doc(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS, objectId.trim())
    
    const updateData = {
      ...updates,
      lastModifiedAt: serverTimestamp(),
      lastModifiedBy: auth.currentUser.uid
    }

    await updateDoc(docRef, updateData)
    console.log('Canvas object updated successfully:', objectId)
    
    // Record action for undo/redo if callback provided
    if (recordAction && typeof recordAction === 'function' && actionMetadata.actionType) {
      try {
        recordAction(
          actionMetadata.actionType, 
          objectId, 
          actionMetadata.before || {}, // before state
          updates, // after state (the updates)
          { objectType: actionMetadata.objectType || 'Object' }
        );
      } catch (error) {
        console.warn(`Failed to record ${actionMetadata.actionType} action:`, error);
      }
    }
  } catch (error) {
    console.error('Error updating canvas object:', error)
    throw error
  }
}

/**
 * Delete a canvas object
 * @param {string} objectId - Document ID of the object
 * @param {Function} recordAction - Optional callback to record action for undo/redo
 * @returns {Promise<void>}
 */
export const deleteObject = async (objectId, recordAction = null) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to delete objects')
    }

    const docRef = doc(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS, objectId)
    
    // Get object data before deletion for undo functionality
    let objectData = null;
    if (recordAction && typeof recordAction === 'function') {
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          objectData = { id: objectId, ...docSnap.data() };
        }
      } catch (error) {
        console.warn('Failed to get object data for undo recording:', error);
      }
    }
    
    await deleteDoc(docRef)
    console.log('Canvas object deleted:', objectId)
    
    // Record action for undo/redo if callback provided and we have object data
    if (recordAction && typeof recordAction === 'function' && objectData) {
      try {
        recordAction(
          'DELETE_OBJECT',
          objectId,
          objectData, // before: complete object data (for restore)
          null, // after: object deleted
          { objectType: objectData.type ? objectData.type.charAt(0).toUpperCase() + objectData.type.slice(1) : 'Object' }
        );
      } catch (error) {
        console.warn('Failed to record DELETE_OBJECT action:', error);
      }
    }
  } catch (error) {
    console.error('Error deleting canvas object:', error)
    throw error
  }
}

/**
 * Get objects for a specific canvas
 * @param {string} canvasId - Canvas ID to get objects for
 * @returns {Promise<Array>} Array of canvas objects for the specified canvas
 */
export const getCanvasObjects = async (canvasId) => {
  try {
    if (!canvasId) {
      console.error('Canvas ID is required');
      return [];
    }

    const objectsQuery = query(
      collection(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS),
      where('canvasId', '==', canvasId)
    );

    const snapshot = await getDocs(objectsQuery);
    const objects = [];
    snapshot.forEach((doc) => {
      objects.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`Fetched ${objects.length} objects for canvas:`, canvasId);
    return objects;
  } catch (error) {
    console.error('Error fetching canvas objects for canvas:', canvasId, error);
    return [];
  }
}

/**
 * Subscribe to canvas objects changes for a specific canvas
 * @param {string} canvasId - Canvas ID to filter objects by
 * @param {Function} callback - Called with array of canvas objects when data changes
 * @returns {Function} Unsubscribe function
 */
export const subscribeToCanvasObjects = (canvasId, callback) => {
  try {
    if (!canvasId) {
      console.error('Canvas ID is required for subscription');
      return () => {};
    }

    // TODO: Add orderBy('createdAt', 'asc') after creating Firestore composite index for canvasObjects (canvasId ASC, createdAt ASC)
    const objectsQuery = query(
      collection(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS),
      where('canvasId', '==', canvasId)
    );

    const unsubscribe = onSnapshot(objectsQuery, (snapshot) => {
      const objects = [];
      snapshot.forEach((doc) => {
        objects.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('Canvas objects updated for canvas:', canvasId, objects.length);
      callback(objects);
    }, (error) => {
      console.error('Error subscribing to canvas objects:', error);
      callback([]); // Return empty array on error
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up canvas objects subscription:', error);
    return () => {}; // Return no-op function
  }
}

/**
 * Get all canvas objects (one-time fetch)
 * @returns {Promise<Array>} Array of canvas objects
 */
export const getAllObjects = async () => {
  try {
    const objectsQuery = query(
      collection(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS),
      orderBy('createdAt', 'asc')
    )

    const snapshot = await getDocs(objectsQuery)
    const objects = []
    snapshot.forEach((doc) => {
      objects.push({
        id: doc.id,
        ...doc.data()
      })
    })

    return objects
  } catch (error) {
    console.error('Error fetching canvas objects:', error)
    return []
  }
}

/**
 * Clear all canvas objects (for testing/demo purposes)
 * @returns {Promise<void>}
 */
export const clearAllObjects = async () => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to clear objects')
    }

    const objectsQuery = query(collection(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS))
    const snapshot = await getDocs(objectsQuery)
    
    const deletePromises = []
    snapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref))
    })
    
    await Promise.all(deletePromises)
    console.log('All canvas objects cleared')
  } catch (error) {
    console.error('Error clearing canvas objects:', error)
    throw error
  }
}
