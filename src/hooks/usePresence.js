import { useState, useEffect, useCallback } from 'react'
import { subscribeToGlobalPresence, getOnlineUserCount, isUserRecentlyActive } from '../services/presence.service.js'

/**
 * Hook for subscribing to other users' presence data
 * Returns array of connected users with their cursor positions
 */
export const usePresence = () => {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Subscribe to presence updates
  useEffect(() => {
    let unsubscribe

    try {
      unsubscribe = subscribeToGlobalPresence((presenceData) => {
        // Sort users by join time (most recent first)
        const sortedUsers = presenceData.sort((a, b) => 
          (b.joinedAt || 0) - (a.joinedAt || 0)
        )
        
        setUsers(sortedUsers)
        setIsLoading(false)
        setError(null)
      })

      console.log('Subscribed to global presence')
    } catch (err) {
      console.error('Failed to subscribe to presence:', err)
      setError(err.message)
      setIsLoading(false)
    }

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe()
        console.log('Unsubscribed from global presence')
      }
    }
  }, [])

  // Calculate online users count
  const onlineCount = users.length > 0 ? getOnlineUserCount(users) : 0

  // Utility function to find a user by ID
  const getUserById = useCallback((userId) => {
    return users.find(user => user.uid === userId) || null
  }, [users])

  // Utility function to check if a user is recently active
  const isUserActive = useCallback((user) => {
    return isUserRecentlyActive(user)
  }, [])

  // Get users with cursor positions (for rendering)
  const usersWithCursors = users.filter(user => 
    user.cursorPosition && 
    user.isOnline && 
    isUserRecentlyActive(user)
  )

  // Get summary information
  const getSummary = useCallback(() => {
    return {
      totalUsers: users.length,
      onlineUsers: onlineCount,
      activeUsers: users.filter(isUserRecentlyActive).length,
      usersWithCursors: usersWithCursors.length
    }
  }, [users, onlineCount, usersWithCursors.length])

  return {
    users,
    usersWithCursors,
    onlineCount,
    isLoading,
    error,
    getUserById,
    isUserActive,
    getSummary
  }
}

export default usePresence
