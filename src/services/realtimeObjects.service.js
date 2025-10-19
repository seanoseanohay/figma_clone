import { ref, set, update, remove, onValue, onDisconnect } from 'firebase/database'
import { auth, rtdb } from './firebase.js'
import { OBJECT_UPDATE_THROTTLE } from '../constants/canvas.constants.js'

/**
 * Realtime Objects Service
 * 
 * Handles real-time object movement and active object tracking using Firebase RTDB.
 * Extracted from canvas.service.js to improve modularity.
 */

// Throttling mechanism for RTDB active object position updates during drag
// 100ms throttle = ~10 updates/sec for smooth movement without excessive cost
// Increase this value (e.g., 150ms) if experiencing lag - smooth motion requires only ~8 FPS
const ACTIVE_OBJECT_THROTTLE = 100
const activeObjectPendingUpdates = new Map()
const activeObjectTimeouts = new Map()

// Track cleanup handlers for disconnection
const activeObjectDisconnectHandlers = new Map()

/**
 * Update active object position in RTDB for real-time movement during drag
 * Throttled to prevent excessive Firebase calls while maintaining smooth updates
 * @param {string} canvasId - Canvas ID
 * @param {string} objectId - Object ID being dragged
 * @param {Object} position - Position data {x, y, width?, height?, radius?, etc.}
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
    
    // Subscribed to active objects (canvas: ${canvasId})
    
    return unsubscribe
  } catch (error) {
    console.error('Error subscribing to active objects:', error)
    return () => {} // Return no-op function
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
const pendingUpdates = new Map()
const updateTimeouts = new Map()

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
    
    // Import updateObjectPosition to avoid circular dependencies
    import('./canvasObjects.service.js').then(async ({ updateObjectPosition }) => {
      return updateObjectPosition(objectId, update.position, update.finalUpdate)
    }).catch(error => {
      console.error('Error importing updateObjectPosition:', error)
    })
    return Promise.resolve()
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
        // Import updateObjectPosition to avoid circular dependencies
        const { updateObjectPosition } = await import('./canvasObjects.service.js')
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

    // Import updateObject to avoid circular dependencies
    const { updateObject } = await import('./canvasObjects.service.js')
    
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

    await updateObject(objectId, updateData)
  } catch (error) {
    console.error('Error updating object position:', error)
    throw error
  }
}
