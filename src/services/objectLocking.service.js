import { 
  doc, 
  updateDoc, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { db, auth } from './firebase.js'
import { FIREBASE_COLLECTIONS } from '../constants/canvas.constants.js'

/**
 * Object Locking Service
 * 
 * Handles object locking/unlocking for collaborative editing.
 * Extracted from canvas.service.js to improve modularity.
 */

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
 * PERFORMANCE OPTIMIZED: Lock multiple objects in a single batched transaction
 * Reduces database operations from N writes to 1 transaction for multi-selection
 * @param {string[]} objectIds - Array of document IDs to lock
 * @returns {Promise<void>}
 */
export const batchLockObjects = async (objectIds) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to lock objects')
    }

    if (!objectIds || objectIds.length === 0) {
      return
    }

    // For single object, use existing function for compatibility
    if (objectIds.length === 1) {
      return await lockObject(objectIds[0])
    }

    // Use Firestore batch for multiple objects
    const batch = writeBatch(db)
    const timestamp = serverTimestamp()
    const userId = auth.currentUser.uid

    objectIds.forEach(objectId => {
      const docRef = doc(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS, objectId)
      batch.update(docRef, {
        lockedBy: userId,
        lockedAt: timestamp,
        lastModifiedAt: timestamp,
        lastModifiedBy: userId
      })
    })

    await batch.commit()
    console.log(`🔒 Batch locked ${objectIds.length} objects in single transaction`)
  } catch (error) {
    console.error('Error batch locking objects:', objectIds, error)
    throw error
  }
}

/**
 * PERFORMANCE OPTIMIZED: Unlock multiple objects in a single batched transaction
 * Reduces database operations from N writes to 1 transaction for multi-selection
 * @param {string[]} objectIds - Array of document IDs to unlock
 * @returns {Promise<void>}
 */
export const batchUnlockObjects = async (objectIds) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to unlock objects')
    }

    if (!objectIds || objectIds.length === 0) {
      return
    }

    // For single object, use existing function for compatibility
    if (objectIds.length === 1) {
      return await unlockObject(objectIds[0])
    }

    // Use Firestore batch for multiple objects
    const batch = writeBatch(db)
    const timestamp = serverTimestamp()
    const userId = auth.currentUser.uid

    objectIds.forEach(objectId => {
      const docRef = doc(db, FIREBASE_COLLECTIONS.CANVAS_OBJECTS, objectId)
      batch.update(docRef, {
        lockedBy: null,
        lockedAt: null,
        lastModifiedAt: timestamp,
        lastModifiedBy: userId
      })
    })

    await batch.commit()
    console.log(`🔓 Batch unlocked ${objectIds.length} objects in single transaction`)
  } catch (error) {
    console.error('Error batch unlocking objects:', objectIds, error)
    throw error
  }
}

/**
 * Check if current user can edit an object (based on lock status)
 * @param {Object} object - Object to check
 * @returns {boolean} - True if user can edit the object
 */
export const canEditObject = (object) => {
  if (!object || !auth.currentUser) {
    return false
  }
  
  // If object is not locked, anyone can edit
  if (!object.lockedBy) {
    return true
  }
  
  // If current user locked it, they can edit
  if (object.lockedBy === auth.currentUser.uid) {
    return true
  }
  
  // Check if lock is stale (older than 30 seconds)
  const lockAge = Date.now() - (object.lockedAt?.toDate?.()?.getTime() || 0)
  const isLockStale = lockAge > 30000 // 30 seconds
  
  return isLockStale
}

/**
 * Check if current user owns/controls an object
 * @param {Object} object - Object to check
 * @returns {boolean} - True if user owns the object
 */
export const doesUserOwnObject = (object) => {
  if (!object || !object.lockedBy || !auth.currentUser) {
    return false
  }
  
  return object.lockedBy === auth.currentUser.uid
}

/**
 * Get lock status information for an object
 * @param {Object} object - Object to get lock info for
 * @returns {Object} - Lock status information
 */
export const getObjectLockInfo = (object) => {
  if (!object) {
    return {
      isLocked: false,
      isOwnedByCurrentUser: false,
      isStale: false,
      lockedBy: null,
      lockedAt: null,
      lockAge: 0
    }
  }

  const isLocked = !!object.lockedBy
  const isOwnedByCurrentUser = object.lockedBy === auth.currentUser?.uid
  const lockAge = object.lockedAt ? Date.now() - object.lockedAt.toDate().getTime() : 0
  const isStale = lockAge > 30000 // 30 seconds

  return {
    isLocked,
    isOwnedByCurrentUser,
    isStale,
    lockedBy: object.lockedBy,
    lockedAt: object.lockedAt,
    lockAge
  }
}
