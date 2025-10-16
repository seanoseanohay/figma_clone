import { rtdb, auth } from './firebase.js'
import { ref, set, update, remove, onDisconnect, onValue } from 'firebase/database'

/**
 * CANVAS-SCOPED PRESENCE SERVICE
 * 
 * Manages user presence within specific canvases.
 * Users only see others who are on the same project+canvas combination.
 * 
 * Path structure: /projects/{projectId}/canvases/{canvasId}/presence/{userId}
 * 
 * This replaces the old MVP global canvas system where all users saw each other.
 */

/**
 * Get the canvas-scoped presence path
 * @param {string} projectId - Project ID
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - Optional user ID to get specific user path
 * @returns {string} Database path
 */
const getPresencePath = (projectId, canvasId, userId = null) => {
  if (!projectId || !canvasId) {
    throw new Error('projectId and canvasId are required for canvas-scoped presence')
  }
  
  const basePath = `/projects/${projectId}/canvases/${canvasId}/presence`
  return userId ? `${basePath}/${userId}` : basePath
}

/**
 * Get consistent cursor color for a user
 * Uses deterministic hash of userId to assign color
 * @param {string} userId - User ID
 * @returns {string} Hex color code
 */
const getUserCursorColor = (userId) => {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
    '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6b7280'
  ]
  
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff
  }
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Updates the current user's cursor position in a specific canvas
 * @param {string} projectId - Project ID
 * @param {string} canvasId - Canvas ID
 * @param {number} x - Cursor X position
 * @param {number} y - Cursor Y position
 */
export const updateCursorPosition = async (projectId, canvasId, x, y) => {
  try {
    if (!auth.currentUser) {
      console.warn('No authenticated user for cursor update')
      return
    }

    if (!projectId || !canvasId) {
      console.warn('Cannot update cursor: missing projectId or canvasId')
      return
    }

    const userRef = ref(rtdb, getPresencePath(projectId, canvasId, auth.currentUser.uid))
    
    await update(userRef, {
      cursorX: x,
      cursorY: y,
      lastActive: Date.now()
    })
  } catch (error) {
    if (error.code === 'PERMISSION_DENIED') {
      console.warn('Database permission denied. Check if database rules are deployed correctly.')
      console.warn('Run: firebase deploy --only database')
      return
    } else if (error.message?.includes('not initialized')) {
      console.warn('Realtime Database not initialized. Please create the database in Firebase Console.')
      return
    }
    console.error('Error updating cursor position:', error)
  }
}

/**
 * Sets the current user as online in a specific canvas
 * @param {string} projectId - Project ID
 * @param {string} canvasId - Canvas ID
 * @param {object} userData - Optional additional user data
 */
export const setUserOnline = async (projectId, canvasId, userData = {}) => {
  try {
    if (!auth.currentUser) {
      console.warn('No authenticated user to set online')
      return
    }

    if (!projectId || !canvasId) {
      console.warn('Cannot set user online: missing projectId or canvasId')
      return
    }

    const { uid, displayName, email } = auth.currentUser
    const userRef = ref(rtdb, getPresencePath(projectId, canvasId, uid))
    
    const presenceData = {
      userId: uid,
      displayName: displayName || 'Anonymous User',
      email: email || '',
      cursorColor: getUserCursorColor(uid),
      cursorX: null,
      cursorY: null,
      lastActive: Date.now(),
      connectedAt: Date.now(),
      ...userData
    }

    await set(userRef, presenceData)

    // Set up automatic cleanup on disconnect
    await onDisconnect(userRef).remove()

    console.log(`User set online in canvas: ${displayName} (project: ${projectId}, canvas: ${canvasId})`)
  } catch (error) {
    if (error.code === 'PERMISSION_DENIED') {
      console.warn('Realtime Database not initialized. Please create the database in Firebase Console.')
      return
    }
    console.error('Error setting user online:', error)
  }
}

/**
 * Sets the current user as offline (removes from canvas presence)
 * @param {string} projectId - Project ID
 * @param {string} canvasId - Canvas ID
 */
export const setUserOffline = async (projectId, canvasId) => {
  try {
    if (!auth.currentUser) {
      console.warn('No authenticated user to set offline')
      return
    }

    if (!projectId || !canvasId) {
      console.warn('Cannot set user offline: missing projectId or canvasId')
      return
    }

    const userRef = ref(rtdb, getPresencePath(projectId, canvasId, auth.currentUser.uid))
    await remove(userRef)

    console.log(`User set offline from canvas (project: ${projectId}, canvas: ${canvasId})`)
  } catch (error) {
    console.error('Error setting user offline:', error)
  }
}

/**
 * Subscribes to canvas-scoped presence updates (other users only)
 * @param {string} projectId - Project ID
 * @param {string} canvasId - Canvas ID
 * @param {Function} callback - Called with array of other users' presence data
 * @returns {Function} Unsubscribe function
 */
export const subscribeToCanvasPresence = (projectId, canvasId, callback) => {
  try {
    if (!projectId || !canvasId) {
      console.warn('Cannot subscribe to presence: missing projectId or canvasId')
      callback([])
      return () => {}
    }

    const presenceRef = ref(rtdb, getPresencePath(projectId, canvasId))
    
    const handlePresenceUpdate = (snapshot) => {
      const presenceData = snapshot.val() || {}
      const currentUserId = auth.currentUser?.uid
      
      // Filter out current user and convert to array
      const otherUsers = Object.values(presenceData).filter(
        user => user.userId !== currentUserId
      )
      
      callback(otherUsers)
    }

    const unsubscribe = onValue(presenceRef, handlePresenceUpdate, (error) => {
      if (error.code === 'PERMISSION_DENIED') {
        console.warn('Realtime Database permission denied. Check security rules.')
        callback([]) // Return empty array for graceful degradation
        return
      }
      console.error('Error subscribing to canvas presence:', error)
      callback([])
    })
    
    console.log(`Subscribed to canvas presence (project: ${projectId}, canvas: ${canvasId})`)
    
    // Return unsubscribe function
    return unsubscribe
  } catch (error) {
    console.error('Error subscribing to canvas presence:', error)
    return () => {} // Return no-op function
  }
}

/**
 * Get current online users count (for display purposes)
 * @param {Array} users - Array of user presence data
 * @returns {number} Count of online users
 */
export const getOnlineUserCount = (users) => {
  return users.length // All users in canvas-scoped presence are considered online
}

/**
 * Check if a user was recently active (within last 30 seconds)
 * @param {Object} user - User presence data
 * @returns {boolean} True if user is recently active
 */
export const isUserRecentlyActive = (user) => {
  const thirtySecondsAgo = Date.now() - (30 * 1000)
  return user.lastActive > thirtySecondsAgo
}
