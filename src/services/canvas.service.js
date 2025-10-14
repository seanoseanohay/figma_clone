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
  getDocs
} from 'firebase/firestore'
import { db, auth } from './firebase.js'
import { FIREBASE_COLLECTIONS, OBJECT_UPDATE_THROTTLE } from '../constants/canvas.constants.js'

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
 * @param {Object} properties - Additional properties (fill, stroke, etc.)
 * @returns {Promise<string>} Document ID of created object
 */
export const createObject = async (type, position, properties = {}) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to create objects')
    }

    // Validate position is within canvas bounds
    if (position.x < 0 || position.y < 0 || 
        position.x + (position.width || 0) > 5000 || 
        position.y + (position.height || 0) > 5000) {
      throw new Error('Object position is outside canvas bounds')
    }

    const objectData = {
      type,
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
 * Subscribe to canvas objects changes
 * @param {Function} callback - Called with array of canvas objects when data changes
 * @returns {Function} Unsubscribe function
 */
export const subscribeToObjects = (callback) => {
  try {
    const objectsQuery = query(
      collection(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS),
      orderBy('createdAt', 'asc')
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
