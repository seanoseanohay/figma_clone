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
  getDoc
} from 'firebase/firestore'
import { db, auth } from './firebase.js'
import { FIREBASE_COLLECTIONS, OBJECT_UPDATE_THROTTLE } from '../constants/canvas.constants.js'
import { canUserAccessProject } from './project.service.js'

// Throttling mechanism for position updates during drag operations
const pendingUpdates = new Map()
const updateTimeouts = new Map()

/**
 * Canvas Service
 * Handles all Firestore operations for canvas objects (rectangles, shapes, etc.)
 */

/**
 * Create a new canvas object
 * @param {string} type - Object type ('rectangle', 'circle', 'text')
 * @param {Object} position - Position and dimensions {x, y, width, height}
 * @param {string} canvasId - Canvas ID to associate the object with
 * @param {Object} properties - Additional properties (fill, stroke, etc.)
 * @returns {Promise<string>} Document ID of created object
 */
export const createObject = async (type, position, canvasId, properties = {}) => {
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

    const docRef = await addDoc(collection(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS), objectData)
    console.log('Canvas object created:', docRef.id)
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
 * @returns {Promise<void>}
 */
export const updateObject = async (objectId, updates) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to update objects')
    }

    const docRef = doc(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS, objectId)
    
    const updateData = {
      ...updates,
      lastModifiedAt: serverTimestamp(),
      lastModifiedBy: auth.currentUser.uid
    }

    await updateDoc(docRef, updateData)
    console.log('Canvas object updated:', objectId)
  } catch (error) {
    console.error('Error updating canvas object:', error)
    throw error
  }
}

/**
 * Lock an object for editing to prevent concurrent modifications
 * @param {string} objectId - Document ID of the object
 * @returns {Promise<void>}
 */
export const lockObject = async (objectId) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to lock objects')
    }

    const docRef = doc(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS, objectId)
    await updateDoc(docRef, {
      lockedBy: auth.currentUser.uid,
      lockedAt: serverTimestamp(),
      lastModifiedAt: serverTimestamp(),
      lastModifiedBy: auth.currentUser.uid
    })
  } catch (error) {
    console.error('Error locking object:', error)
    throw error
  }
}

/**
 * Unlock an object after editing is complete
 * @param {string} objectId - Document ID of the object
 * @returns {Promise<void>}
 */
export const unlockObject = async (objectId) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to unlock objects')
    }

    const docRef = doc(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS, objectId)
    await updateDoc(docRef, {
      lockedBy: null,
      lockedAt: null,
      lastModifiedAt: serverTimestamp(),
      lastModifiedBy: auth.currentUser.uid
    })
  } catch (error) {
    console.error('Error unlocking object:', error)
    throw error
  }
}

/**
 * Update object position (optimized for frequent updates during drag)
 * @param {string} objectId - Document ID of the object
 * @param {Object} position - New position {x, y} and optionally {width, height}
 * @param {boolean} finalUpdate - Whether this is the final update (unlocks object)
 * @returns {Promise<void>}
 */
export const updateObjectPosition = async (objectId, position, finalUpdate = false) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to update objects')
    }

    // Validate position is within canvas bounds
    if (position.x < 0 || position.y < 0 || 
        position.x + (position.width || 0) > 5000 || 
        position.y + (position.height || 0) > 5000) {
      console.warn('Position update outside canvas bounds, clamping...')
      // Clamp to bounds
      if (position.x < 0) position.x = 0
      if (position.y < 0) position.y = 0
      if (position.x > 5000) position.x = 5000 - (position.width || 0)
      if (position.y > 5000) position.y = 5000 - (position.height || 0)
    }

    const updateData = {
      ...position,
      lastModifiedAt: serverTimestamp(),
      lastModifiedBy: auth.currentUser.uid
    }

    // If this is the final update, unlock the object
    if (finalUpdate) {
      updateData.lockedBy = null
      updateData.lockedAt = null
    }

    const docRef = doc(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS, objectId)
    await updateDoc(docRef, updateData)
  } catch (error) {
    console.error('Error updating object position:', error)
    throw error
  }
}

/**
 * Throttled update for position during drag operations
 * Only sends updates to Firestore every OBJECT_UPDATE_THROTTLE milliseconds
 * @param {string} objectId - Document ID of the object
 * @param {Object} position - New position {x, y} and optionally {width, height}
 * @param {boolean} finalUpdate - Whether this is the final update (unlocks object)
 * @returns {Promise<void>}
 */
export const updateObjectPositionThrottled = (objectId, position, finalUpdate = false) => {
  // Store the latest update for this object
  pendingUpdates.set(objectId, { position, finalUpdate })

  // If this is a final update, send immediately
  if (finalUpdate) {
    // Clear any pending timeout for this object
    if (updateTimeouts.has(objectId)) {
      clearTimeout(updateTimeouts.get(objectId))
      updateTimeouts.delete(objectId)
    }
    
    // Send the update immediately and cleanup
    const update = pendingUpdates.get(objectId)
    pendingUpdates.delete(objectId)
    return updateObjectPosition(objectId, update.position, update.finalUpdate)
  }

  // If there's already a pending update, just update the data
  if (updateTimeouts.has(objectId)) {
    return Promise.resolve()
  }

  // Set up throttled update
  const timeoutId = setTimeout(async () => {
    const update = pendingUpdates.get(objectId)
    if (update) {
      pendingUpdates.delete(objectId)
      updateTimeouts.delete(objectId)
      
      try {
        await updateObjectPosition(objectId, update.position, update.finalUpdate)
      } catch (error) {
        console.error('Error in throttled position update:', error)
      }
    }
  }, OBJECT_UPDATE_THROTTLE)

  updateTimeouts.set(objectId, timeoutId)
  return Promise.resolve()
}

/**
 * Delete a canvas object
 * @param {string} objectId - Document ID of the object
 * @returns {Promise<void>}
 */
export const deleteObject = async (objectId) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to delete objects')
    }

    const docRef = doc(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS, objectId)
    await deleteDoc(docRef)
    console.log('Canvas object deleted:', objectId)
  } catch (error) {
    console.error('Error deleting canvas object:', error)
    throw error
  }
}

/**
 * Subscribe to canvas objects changes for a specific canvas
 * @param {string} canvasId - Canvas ID to filter objects by
 * @param {Function} callback - Called with array of canvas objects when data changes
 * @returns {Function} Unsubscribe function
 */
export const subscribeToObjects = (canvasId, callback) => {
  try {
    if (!canvasId) {
      console.error('Canvas ID is required for subscribeToObjects')
      callback([])
      return () => {} // Return empty unsubscribe function
    }

    // TODO: Add orderBy('createdAt', 'asc') after creating Firestore composite index for canvasObjects (canvasId ASC, createdAt ASC)
    const objectsQuery = query(
      collection(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS),
      where('canvasId', '==', canvasId)
    )

    const unsubscribe = onSnapshot(objectsQuery, (snapshot) => {
      const objects = []
      snapshot.forEach((doc) => {
        objects.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      console.log('Canvas objects updated:', objects.length)
      callback(objects)
    }, (error) => {
      console.error('Error subscribing to canvas objects:', error)
      callback([]) // Return empty array on error
    })

    return unsubscribe
  } catch (error) {
    console.error('Error setting up canvas objects subscription:', error)
    return () => {} // Return no-op function
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

// =======================
// PROJECT-CANVAS INTEGRATION
// =======================

/**
 * Creates a new canvas within a project
 * @param {string} projectId - Project ID
 * @param {string} name - Canvas name
 * @param {string} userId - User ID creating the canvas
 * @returns {Object} - Result object with success status and canvas data
 */
export const createCanvas = async (projectId, name, userId) => {
  try {
    // Validate input
    if (!projectId || typeof projectId !== 'string') {
      return { success: false, error: 'Project ID is required' };
    }
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return { success: false, error: 'Canvas name is required' };
    }
    
    if (!userId || typeof userId !== 'string') {
      return { success: false, error: 'User ID is required' };
    }

    // Check if user has access to the project
    const accessCheck = await canUserAccessProject(projectId, userId);
    if (!accessCheck.success || !accessCheck.canAccess) {
      return { success: false, error: 'User does not have access to this project' };
    }

    // Get project details to include project owner info
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      return { success: false, error: 'Project not found' };
    }

    const project = projectSnap.data();
    const sanitizedName = name.trim().substring(0, 100);

    const canvasData = {
      projectId,
      name: sanitizedName,
      ownerId: userId, // User who created the canvas
      createdBy: userId, // User who created the canvas  
      projectOwnerId: project.ownerId, // Owner of the parent project
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const canvasesCollection = collection(db, 'canvases');
    const docRef = await addDoc(canvasesCollection, canvasData);
    
    return { 
      success: true, 
      canvasId: docRef.id, 
      canvas: { id: docRef.id, ...canvasData }
    };
  } catch (error) {
    console.error('Error creating canvas:', error);
    return { success: false, error: 'Failed to create canvas' };
  }
};

/**
 * Gets all canvases for a project
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID requesting the canvases
 * @returns {Object} - Result object with success status and canvases array
 */
export const getCanvasesForProject = async (projectId, userId) => {
  try {
    if (!projectId || !userId) {
      return { success: false, error: 'Project ID and user ID are required' };
    }

    // Check if user has access to the project
    const accessCheck = await canUserAccessProject(projectId, userId);
    if (!accessCheck.success || !accessCheck.canAccess) {
      return { success: false, error: 'User does not have access to this project' };
    }

    // TODO: Add orderBy('updatedAt', 'desc') after creating Firestore composite index for canvases (projectId ASC, updatedAt DESC)
    const canvasesQuery = query(
      collection(db, 'canvases'),
      where('projectId', '==', projectId)
    );

    const snapshot = await getDocs(canvasesQuery);
    const canvases = [];
    
    snapshot.forEach((doc) => {
      canvases.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, canvases };
  } catch (error) {
    console.error('Error getting canvases for project:', error);
    return { success: false, error: 'Failed to fetch canvases' };
  }
};

/**
 * Gets a single canvas by ID
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID requesting the canvas
 * @returns {Object} - Result object with success status and canvas data
 */
export const getCanvas = async (canvasId, userId) => {
  try {
    if (!canvasId || !userId) {
      return { success: false, error: 'Canvas ID and user ID are required' };
    }

    const canvasRef = doc(db, 'canvases', canvasId);
    const canvasSnap = await getDoc(canvasRef);

    if (!canvasSnap.exists()) {
      return { success: false, error: 'Canvas not found' };
    }

    const canvas = { id: canvasSnap.id, ...canvasSnap.data() };

    // Check if user has access to the canvas's project
    const accessCheck = await canUserAccessProject(canvas.projectId, userId);
    if (!accessCheck.success || !accessCheck.canAccess) {
      return { success: false, error: 'User does not have access to this canvas' };
    }

    return { success: true, canvas };
  } catch (error) {
    console.error('Error getting canvas:', error);
    return { success: false, error: 'Failed to fetch canvas' };
  }
};

/**
 * Updates canvas details
 * @param {string} canvasId - Canvas ID
 * @param {Object} updates - Object containing fields to update
 * @param {string} userId - User ID making the request
 * @returns {Object} - Result object with success status
 */
export const updateCanvas = async (canvasId, updates, userId) => {
  try {
    if (!canvasId || !userId) {
      return { success: false, error: 'Canvas ID and user ID are required' };
    }

    // Get canvas to check project access
    const canvas = await getCanvas(canvasId, userId);
    if (!canvas.success) {
      return canvas;
    }

    // Check if user has access to modify (must have project access)
    const accessCheck = await canUserAccessProject(canvas.canvas.projectId, userId);
    if (!accessCheck.success || !accessCheck.canAccess) {
      return { success: false, error: 'User does not have permission to update this canvas' };
    }

    // Sanitize updates (only allow certain fields)
    const allowedFields = ['name'];
    const sanitizedUpdates = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'name' && value) {
          sanitizedUpdates.name = String(value).trim().substring(0, 100);
        }
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return { success: false, error: 'No valid fields to update' };
    }

    sanitizedUpdates.updatedAt = serverTimestamp();

    const canvasRef = doc(db, 'canvases', canvasId);
    await updateDoc(canvasRef, sanitizedUpdates);

    return { success: true };
  } catch (error) {
    console.error('Error updating canvas:', error);
    return { success: false, error: 'Failed to update canvas' };
  }
};

/**
 * Deletes a canvas and all its objects
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID making the request
 * @returns {Object} - Result object with success status
 */
export const deleteCanvas = async (canvasId, userId) => {
  try {
    if (!canvasId || !userId) {
      return { success: false, error: 'Canvas ID and user ID are required' };
    }

    // Get canvas to check ownership
    const canvas = await getCanvas(canvasId, userId);
    if (!canvas.success) {
      return canvas;
    }

    // Only canvas owner or project owner can delete canvas
    if (canvas.canvas.ownerId !== userId && canvas.canvas.projectOwnerId !== userId) {
      return { success: false, error: 'Only canvas owner or project owner can delete canvas' };
    }

    // Delete all objects in the canvas first
    const objectsQuery = query(
      collection(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS),
      where('canvasId', '==', canvasId)
    );
    
    const objectsSnapshot = await getDocs(objectsQuery);
    const deleteObjectPromises = [];
    
    objectsSnapshot.forEach((doc) => {
      deleteObjectPromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deleteObjectPromises);

    // Delete the canvas
    const canvasRef = doc(db, 'canvases', canvasId);
    await deleteDoc(canvasRef);

    return { success: true };
  } catch (error) {
    console.error('Error deleting canvas:', error);
    return { success: false, error: 'Failed to delete canvas' };
  }
};

/**
 * Subscribe to canvas objects for a specific canvas
 * @param {string} canvasId - Canvas ID
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
};
