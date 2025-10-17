import { useState, useCallback, useEffect, useRef } from 'react'
import { auth } from '../services/firebase'
import { lockObject, unlockObject } from '../services/canvas.service'

/**
 * useObjectOwnership Hook
 * Manages object ownership with 10-second auto-release timers
 * 
 * Features:
 * - Event-driven timer system for automatic ownership release
 * - First-click-wins timestamp logic for conflict resolution
 * - Ownership extension on edit actions (reset timer)
 * - Automatic release on connection loss
 * - Visual ownership indicators with user colors
 */
export const useObjectOwnership = (canvasId) => {
  // Track ownership timers: { objectId: timeoutId }
  const timersRef = useRef({})
  
  // Track ownership timestamps: { objectId: timestamp }
  const timestampsRef = useRef({})
  
  // Track currently owned objects for cleanup
  const [ownedObjects, setOwnedObjects] = useState(new Set())

  /**
   * Claim ownership of an object
   * @param {string} objectId - ID of object to claim
   * @returns {Promise<boolean>} - Success status
   */
  const claimOwnership = useCallback(async (objectId) => {
    if (!auth.currentUser) {
      console.error('Cannot claim ownership - not authenticated')
      return false
    }

    try {
      // Lock object in Firestore
      await lockObject(objectId)
      
      // Record timestamp
      timestampsRef.current[objectId] = Date.now()
      
      // Add to owned objects
      setOwnedObjects(prev => new Set([...prev, objectId]))
      
      // Start 10-second auto-release timer
      startOwnershipTimer(objectId)
      
      console.log(`✅ Claimed ownership: ${objectId}`)
      return true
    } catch (error) {
      console.error(`Failed to claim ownership: ${objectId}`, error)
      return false
    }
  }, [])

  /**
   * Release ownership of an object
   * @param {string} objectId - ID of object to release
   * @returns {Promise<boolean>} - Success status
   */
  const releaseOwnership = useCallback(async (objectId) => {
    try {
      // Cancel timer if exists
      if (timersRef.current[objectId]) {
        clearTimeout(timersRef.current[objectId])
        delete timersRef.current[objectId]
      }
      
      // Clear timestamp
      delete timestampsRef.current[objectId]
      
      // Remove from owned objects
      setOwnedObjects(prev => {
        const updated = new Set(prev)
        updated.delete(objectId)
        return updated
      })
      
      // Unlock object in Firestore
      await unlockObject(objectId)
      
      console.log(`✅ Released ownership: ${objectId}`)
      return true
    } catch (error) {
      console.error(`Failed to release ownership: ${objectId}`, error)
      return false
    }
  }, [])

  /**
   * Extend ownership by resetting the 10-second timer
   * Called on edit actions to keep object locked during active use
   * @param {string} objectId - ID of object to extend
   */
  const extendOwnership = useCallback((objectId) => {
    if (!ownedObjects.has(objectId)) {
      console.warn(`Cannot extend - not owned: ${objectId}`)
      return
    }

    // Cancel existing timer
    if (timersRef.current[objectId]) {
      clearTimeout(timersRef.current[objectId])
    }

    // Start new 10-second timer
    startOwnershipTimer(objectId)
    
    console.log(`🔄 Extended ownership: ${objectId}`)
  }, [ownedObjects])

  /**
   * Start 10-second auto-release timer for an object
   * @param {string} objectId - ID of object
   */
  const startOwnershipTimer = useCallback((objectId) => {
    // Cancel existing timer if any
    if (timersRef.current[objectId]) {
      clearTimeout(timersRef.current[objectId])
    }

    // Start new 10-second timer
    const timerId = setTimeout(async () => {
      console.log(`⏰ Auto-releasing ownership after 10s: ${objectId}`)
      await releaseOwnership(objectId)
    }, 10000) // 10 seconds

    timersRef.current[objectId] = timerId
  }, [releaseOwnership])

  /**
   * Check if an object is owned by current user
   * @param {string} objectId - ID of object to check
   * @returns {boolean} - True if owned by current user
   */
  const isOwnedByMe = useCallback((objectId) => {
    return ownedObjects.has(objectId)
  }, [ownedObjects])

  /**
   * Check if an object is owned by a specific user
   * @param {string} objectId - ID of object to check
   * @param {string} userId - ID of user to check
   * @returns {boolean} - True if owned by specified user
   */
  const isOwnedBy = useCallback((objectId, userId) => {
    // This would need to be enhanced to track other users' ownership
    // For now, just check if we own it
    if (userId === auth.currentUser?.uid) {
      return ownedObjects.has(objectId)
    }
    return false
  }, [ownedObjects])

  /**
   * Get color for ownership indicator
   * @param {string} userId - ID of user who owns the object
   * @returns {string} - CSS color string
   */
  const getOwnershipColor = useCallback((userId) => {
    // Generate consistent color from user ID
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    const hue = hash % 360
    return `hsl(${hue}, 70%, 50%)`
  }, [])

  /**
   * Release all owned objects (for cleanup/disconnect)
   */
  const releaseAllOwnership = useCallback(async () => {
    const objectsToRelease = Array.from(ownedObjects)
    
    for (const objectId of objectsToRelease) {
      await releaseOwnership(objectId)
    }
    
    console.log(`✅ Released all ownership (${objectsToRelease.length} objects)`)
  }, [ownedObjects, releaseOwnership])

  // Cleanup: Release all ownership when component unmounts or connection lost
  useEffect(() => {
    return () => {
      // Cancel all timers
      Object.values(timersRef.current).forEach(timerId => {
        clearTimeout(timerId)
      })
      
      // Release all owned objects (fire-and-forget, don't block unmount)
      releaseAllOwnership()
    }
  }, [releaseAllOwnership])

  // Return hook API
  return {
    claimOwnership,
    releaseOwnership,
    extendOwnership,
    isOwnedByMe,
    isOwnedBy,
    getOwnershipColor,
    releaseAllOwnership,
    ownedObjects: Array.from(ownedObjects)
  }
}

export default useObjectOwnership





