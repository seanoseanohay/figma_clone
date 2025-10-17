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
  setDoc,
  arrayUnion
} from 'firebase/firestore'
import { ref, set, update, remove, onValue, onDisconnect } from 'firebase/database'
import { db, auth, rtdb } from './firebase.js'
import { FIREBASE_COLLECTIONS, OBJECT_UPDATE_THROTTLE } from '../constants/canvas.constants.js'
import { canUserAccessProject } from './project.service.js'

// Throttling mechanism for Firestore position updates during drag operations
const pendingUpdates = new Map()
const updateTimeouts = new Map()

// Throttling mechanism for RTDB active object position updates during drag
// 100ms throttle = ~10 updates/sec for smooth movement without excessive cost
// Increase this value (e.g., 150ms) if experiencing lag - smooth motion requires only ~8 FPS
const ACTIVE_OBJECT_THROTTLE = 100
const activeObjectPendingUpdates = new Map()
const activeObjectTimeouts = new Map()

// Track cleanup handlers for disconnection
const activeObjectDisconnectHandlers = new Map()

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
 * Creates a new canvas with auto-generated matching project
 * @param {string} name - Canvas name
 * @param {string} userId - User ID creating the canvas
 * @returns {Object} - Result object with success status and canvas data
 */
export const createCanvas = async (name, userId) => {
  try {
    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return { success: false, error: 'Canvas name is required' };
    }
    
    if (!userId || typeof userId !== 'string') {
      return { success: false, error: 'User ID is required' };
    }

    const sanitizedName = name.trim().substring(0, 100);

    // First create the canvas document to get its ID
    const canvasData = {
      projectId: '', // Will be set to canvasId
      name: sanitizedName,
      ownerId: userId,
      createdBy: userId,
      collaborators: [], // Initialize empty collaborators array
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const canvasesCollection = collection(db, 'canvases');
    const canvasRef = await addDoc(canvasesCollection, canvasData);
    const canvasId = canvasRef.id;

    // Create auto-generated project with projectId = canvasId
    const projectData = {
      name: sanitizedName,
      ownerId: userId,
      collaborators: [],
      autoGenerated: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const projectRef = doc(db, 'projects', canvasId);
    await updateDoc(canvasRef, { projectId: canvasId });
    
    // Create the project document with the same ID
    await setDoc(projectRef, projectData);
    
    return { 
      success: true, 
      canvasId: canvasId, 
      canvas: { id: canvasId, ...canvasData, projectId: canvasId }
    };
  } catch (error) {
    console.error('Error creating canvas:', error);
    return { success: false, error: 'Failed to create canvas' };
  }
};

/**
 * Gets all canvases for a user (owned and collaborated)
 * @param {string} userId - User ID requesting the canvases
 * @returns {Object} - Result object with success status and canvases array
 */
export const getCanvasesForUser = async (userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Query for canvases where user is the owner
    const ownedCanvasesQuery = query(
      collection(db, 'canvases'),
      where('ownerId', '==', userId)
    );

    // Query for canvases where user is in collaborators array
    const collaboratedCanvasesQuery = query(
      collection(db, 'canvases'),
      where('collaborators', 'array-contains', userId)
    );

    const [ownedSnapshot, collaboratedSnapshot] = await Promise.all([
      getDocs(ownedCanvasesQuery),
      getDocs(collaboratedCanvasesQuery)
    ]);

    // Merge and deduplicate
    const canvasMap = new Map();
    
    ownedSnapshot.forEach((doc) => {
      canvasMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    
    collaboratedSnapshot.forEach((doc) => {
      if (!canvasMap.has(doc.id)) {
        canvasMap.set(doc.id, { id: doc.id, ...doc.data() });
      }
    });

    // Convert to array and sort alphabetically
    const canvases = Array.from(canvasMap.values()).sort((a, b) => 
      (a.name || '').localeCompare(b.name || '')
    );

    return { success: true, canvases };
  } catch (error) {
    console.error('Error getting canvases for user:', error);
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
 * Add a collaborator to a canvas by email
 * @param {string} canvasId - Canvas ID
 * @param {string} inviteeEmail - Email of user to invite
 * @param {string} inviterUserId - User ID of person sending invite
 * @returns {Object} - Result with success, pending, and message fields
 */
export const addCollaboratorToCanvas = async (canvasId, inviteeEmail, inviterUserId) => {
  try {
    if (!canvasId || !inviteeEmail || !inviterUserId) {
      return { success: false, pending: false, message: 'Canvas ID, email, and inviter ID are required' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteeEmail)) {
      return { success: false, pending: false, message: 'Invalid email format' };
    }

    // Get canvas to verify inviter has access
    const canvasRef = doc(db, 'canvases', canvasId);
    const canvasSnap = await getDoc(canvasRef);

    if (!canvasSnap.exists()) {
      return { success: false, pending: false, message: 'Canvas not found' };
    }

    const canvas = canvasSnap.data();

    // Verify inviter is owner or collaborator
    if (canvas.ownerId !== inviterUserId && 
        !(canvas.collaborators || []).includes(inviterUserId)) {
      return { success: false, pending: false, message: 'You do not have permission to invite to this canvas' };
    }

    // Get inviter info for pending invites
    const inviterRef = doc(db, 'users', inviterUserId);
    const inviterSnap = await getDoc(inviterRef);
    const inviterEmail = inviterSnap.exists() ? inviterSnap.data().email : 'unknown';

    // Check if user is inviting themselves
    if (inviteeEmail.toLowerCase() === inviterEmail.toLowerCase()) {
      return { success: false, pending: false, message: 'You cannot invite yourself' };
    }

    // Look up user by email in users collection
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', inviteeEmail.toLowerCase())
    );

    const usersSnapshot = await getDocs(usersQuery);

    if (!usersSnapshot.empty) {
      // User exists - add to collaborators immediately
      const inviteeDoc = usersSnapshot.docs[0];
      const inviteeUserId = inviteeDoc.id;

      // Check if already a collaborator or owner
      if (canvas.ownerId === inviteeUserId) {
        return { success: false, pending: false, message: 'User is already the canvas owner' };
      }

      if ((canvas.collaborators || []).includes(inviteeUserId)) {
        return { success: false, pending: false, message: 'User is already a collaborator' };
      }

      // Add to canvas collaborators
      await updateDoc(canvasRef, {
        collaborators: arrayUnion(inviteeUserId),
        updatedAt: serverTimestamp()
      });

      // Add to project collaborators (projectId = canvasId)
      const projectRef = doc(db, 'projects', canvasId);
      await updateDoc(projectRef, {
        collaborators: arrayUnion(inviteeUserId),
        updatedAt: serverTimestamp()
      });

      console.log('Collaborator added successfully:', inviteeEmail);
      return { success: true, pending: false, message: 'Collaborator added successfully' };
    } else {
      // User doesn't exist - create pending invite
      const inviteData = {
        canvasId,
        canvasName: canvas.name,
        inviteeEmail: inviteeEmail.toLowerCase(),
        invitedBy: inviterUserId,
        invitedByEmail: inviterEmail,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      await addDoc(collection(db, 'pendingInvites'), inviteData);

      console.log('Pending invite created for:', inviteeEmail);
      // TODO: Send email notification to inviteeEmail
      console.log('TODO: Send email to', inviteeEmail, 'about canvas invitation');
      
      return { success: true, pending: true, message: 'Invitation sent. User will be added when they sign up.' };
    }
  } catch (error) {
    console.error('Error adding collaborator:', error);
    
    // Provide more specific error messages
    if (error.code === 'permission-denied' || error.message?.includes('permission')) {
      return { success: false, pending: false, message: 'Permission denied. Please check Firestore security rules.' };
    } else if (error.code === 'not-found') {
      return { success: false, pending: false, message: 'Canvas not found.' };
    } else {
      return { success: false, pending: false, message: 'Failed to add collaborator. Please try again.' };
    }
  }
};

/**
 * Deletes a canvas, its matching project, and all its objects
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
    const canvasRef = doc(db, 'canvases', canvasId);
    const canvasSnap = await getDoc(canvasRef);

    if (!canvasSnap.exists()) {
      return { success: false, error: 'Canvas not found' };
    }

    const canvas = canvasSnap.data();

    // Only canvas owner can delete canvas
    if (canvas.ownerId !== userId) {
      return { success: false, error: 'Only canvas owner can delete canvas' };
    }

    // Delete all objects in the canvas first
    const objectsQuery = query(
      collection(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS),
      where('canvasId', '==', canvasId)
    );
    
    const objectsSnapshot = await getDocs(objectsQuery);
    const deletePromises = [];
    
    objectsSnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    // Delete the matching project document (projectId = canvasId)
    const projectRef = doc(db, 'projects', canvasId);
    deletePromises.push(deleteDoc(projectRef));

    // Delete the canvas
    deletePromises.push(deleteDoc(canvasRef));

    await Promise.all(deletePromises);

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

// =======================
// REALTIME OBJECT MOVEMENT (RTDB)
// =======================

/**
 * Update active object position in RTDB for real-time movement during drag
 * Throttled to 75ms for smooth updates without excessive Firebase calls
 * @param {string} canvasId - Canvas ID
 * @param {string} objectId - Object ID being dragged
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Width (optional, for resize operations)
 * @param {number} height - Height (optional, for resize operations)
 * @returns {Promise<void>}
 */
export const updateActiveObjectPosition = (canvasId, objectId, position) => {
  try {
    if (!auth.currentUser || !canvasId || !objectId) {
      return Promise.resolve()
    }

    const updateKey = `${canvasId}_${objectId}`
    
    // Store the latest update for this object
    activeObjectPendingUpdates.set(updateKey, {
      canvasId,
      objectId,
      position,
      userId: auth.currentUser.uid
    })

    // If there's already a pending update, just update the data
    if (activeObjectTimeouts.has(updateKey)) {
      return Promise.resolve()
    }

    // Set up throttled update
    const timeoutId = setTimeout(async () => {
      const updateData = activeObjectPendingUpdates.get(updateKey)
      if (updateData) {
        activeObjectPendingUpdates.delete(updateKey)
        activeObjectTimeouts.delete(updateKey)
        
        try {
          const activeObjectRef = ref(
            rtdb, 
            `/canvases/${updateData.canvasId}/activeObjects/${updateData.objectId}`
          )
          
          await set(activeObjectRef, {
            ...updateData.position,
            isBeingDragged: true,
            draggedBy: updateData.userId,
            lastUpdate: Date.now()
          })

          // Set up automatic cleanup on disconnect if not already set
          if (!activeObjectDisconnectHandlers.has(updateKey)) {
            const disconnectHandler = onDisconnect(activeObjectRef)
            await disconnectHandler.remove()
            activeObjectDisconnectHandlers.set(updateKey, disconnectHandler)
          }
        } catch (error) {
          // Silently handle RTDB errors (graceful degradation)
          if (error.code !== 'PERMISSION_DENIED') {
            console.error('Error updating active object position:', error)
          }
        }
      }
    }, ACTIVE_OBJECT_THROTTLE)

    activeObjectTimeouts.set(updateKey, timeoutId)
    return Promise.resolve()
  } catch (error) {
    console.error('Error setting up active object update:', error)
    return Promise.resolve()
  }
}

/**
 * Clear active object from RTDB when drag ends
 * @param {string} canvasId - Canvas ID
 * @param {string} objectId - Object ID that finished dragging
 * @returns {Promise<void>}
 */
export const clearActiveObject = async (canvasId, objectId) => {
  try {
    if (!canvasId || !objectId) {
      return
    }

    const updateKey = `${canvasId}_${objectId}`
    
    // Clear any pending throttled updates
    if (activeObjectTimeouts.has(updateKey)) {
      clearTimeout(activeObjectTimeouts.get(updateKey))
      activeObjectTimeouts.delete(updateKey)
    }
    activeObjectPendingUpdates.delete(updateKey)
    
    // Clear disconnect handler
    activeObjectDisconnectHandlers.delete(updateKey)

    // Remove from RTDB
    const activeObjectRef = ref(rtdb, `/canvases/${canvasId}/activeObjects/${objectId}`)
    await remove(activeObjectRef)
    
    console.log(`Active object cleared: ${objectId}`)
  } catch (error) {
    // Silently handle RTDB errors
    if (error.code !== 'PERMISSION_DENIED') {
      console.error('Error clearing active object:', error)
    }
  }
}

/**
 * Subscribe to active objects in a canvas for real-time movement updates
 * @param {string} canvasId - Canvas ID
 * @param {Function} callback - Called with object of active objects {objectId: {x, y, ...}}
 * @returns {Function} Unsubscribe function
 */
export const subscribeToActiveObjects = (canvasId, callback) => {
  try {
    if (!canvasId) {
      console.warn('Cannot subscribe to active objects: missing canvasId')
      callback({})
      return () => {}
    }

    const activeObjectsRef = ref(rtdb, `/canvases/${canvasId}/activeObjects`)
    
    const handleActiveObjectsUpdate = (snapshot) => {
      const activeObjectsData = snapshot.val() || {}
      
      // Filter out objects being dragged by current user (we use local updates for those)
      const filteredData = {}
      for (const [objectId, data] of Object.entries(activeObjectsData)) {
        if (data.draggedBy !== auth.currentUser?.uid) {
          filteredData[objectId] = data
        }
      }
      
      callback(filteredData)
    }

    // Also clean up stale entries (older than 5 seconds) on each update
    const handleActiveObjectsUpdateWithCleanup = async (snapshot) => {
      const now = Date.now()
      const activeObjectsData = snapshot.val() || {}
      
      // Find and remove stale entries
      const staleEntries = []
      for (const [objectId, data] of Object.entries(activeObjectsData)) {
        if (data.lastUpdate && now - data.lastUpdate > 5000) {
          staleEntries.push(objectId)
        }
      }
      
      // Remove stale entries
      if (staleEntries.length > 0) {
        console.log(`Cleaning up ${staleEntries.length} stale active objects`)
        for (const objectId of staleEntries) {
          try {
            const staleRef = ref(rtdb, `/canvases/${canvasId}/activeObjects/${objectId}`)
            await remove(staleRef)
          } catch (error) {
            console.error('Error removing stale active object:', error)
          }
        }
      }
      
      // Send filtered data to callback
      handleActiveObjectsUpdate(snapshot)
    }

    const unsubscribe = onValue(activeObjectsRef, handleActiveObjectsUpdateWithCleanup, (error) => {
      if (error.code !== 'PERMISSION_DENIED') {
        console.error('Error subscribing to active objects:', error)
      }
      callback({}) // Return empty object for graceful degradation
    })
    
    console.log(`Subscribed to active objects (canvas: ${canvasId})`)
    
    return unsubscribe
  } catch (error) {
    console.error('Error subscribing to active objects:', error)
    return () => {} // Return no-op function
  }
}
