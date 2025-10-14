import { rtdb, auth } from './firebase.js'
import { ref, set, update, remove, onDisconnect, onValue } from 'firebase/database'
import { REALTIME_PATHS } from '../constants/canvas.constants.js'

/**
 * Updates the current user's cursor position in the global canvas
 * @param {Object} position - Cursor position {x, y}
 */
export const updateCursorPosition = async (position) => {
  try {
    if (!auth.currentUser) {
      console.warn('No authenticated user for cursor update')
      return
    }

    const userRef = ref(rtdb, `${REALTIME_PATHS.GLOBAL_PRESENCE}/${auth.currentUser.uid}`)
    
    await update(userRef, {
      cursorPosition: position,
      lastSeen: Date.now()
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
 * Sets the current user as online in the global canvas
 */
export const setUserOnline = async () => {
  try {
    if (!auth.currentUser) {
      console.warn('No authenticated user to set online')
      return
    }

    const { uid, displayName, email } = auth.currentUser
    const userRef = ref(rtdb, `${REALTIME_PATHS.GLOBAL_PRESENCE}/${uid}`)
    
    const userData = {
      uid,
      displayName: displayName || 'Anonymous User',
      email: email || '',
      isOnline: true,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      cursorPosition: null
    }

    await set(userRef, userData)

    // Set up automatic cleanup on disconnect
    await onDisconnect(userRef).remove()

    console.log('User set online:', displayName)
  } catch (error) {
    if (error.code === 'PERMISSION_DENIED') {
      console.warn('Realtime Database not initialized. Please create the database in Firebase Console.')
      return
    }
    console.error('Error setting user online:', error)
  }
}

/**
 * Sets the current user as offline (removes from presence)
 */
export const setUserOffline = async () => {
  try {
    if (!auth.currentUser) {
      console.warn('No authenticated user to set offline')
      return
    }

    const userRef = ref(rtdb, `${REALTIME_PATHS.GLOBAL_PRESENCE}/${auth.currentUser.uid}`)
    await remove(userRef)

    console.log('User set offline')
  } catch (error) {
    console.error('Error setting user offline:', error)
  }
}

/**
 * Subscribes to global presence updates (other users only)
 * @param {Function} callback - Called with array of other users' presence data
 * @returns {Function} Unsubscribe function
 */
export const subscribeToGlobalPresence = (callback) => {
  try {
    const presenceRef = ref(rtdb, REALTIME_PATHS.GLOBAL_PRESENCE)
    
    const handlePresenceUpdate = (snapshot) => {
      const presenceData = snapshot.val() || {}
      const currentUserId = auth.currentUser?.uid
      
      // Filter out current user and convert to array
      const otherUsers = Object.values(presenceData).filter(
        user => user.uid !== currentUserId
      )
      
      callback(otherUsers)
    }

    const unsubscribe = onValue(presenceRef, handlePresenceUpdate, (error) => {
      if (error.code === 'PERMISSION_DENIED') {
        console.warn('Realtime Database not initialized. Please create the database in Firebase Console.')
        callback([]) // Return empty array for graceful degradation
        return
      }
      console.error('Error subscribing to presence:', error)
      callback([])
    })
    
    // Return unsubscribe function
    return unsubscribe
  } catch (error) {
    console.error('Error subscribing to presence:', error)
    return () => {} // Return no-op function
  }
}

/**
 * Get current online users count (for display purposes)
 * @param {Array} users - Array of user presence data
 * @returns {number} Count of online users
 */
export const getOnlineUserCount = (users) => {
  return users.filter(user => user.isOnline).length
}

/**
 * Check if a user was recently active (within last 30 seconds)
 * @param {Object} user - User presence data
 * @returns {boolean} True if user is recently active
 */
export const isUserRecentlyActive = (user) => {
  const thirtySecondsAgo = Date.now() - (30 * 1000)
  return user.lastSeen > thirtySecondsAgo
}
