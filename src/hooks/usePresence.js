import { useState, useEffect, useCallback } from 'react'
import { subscribeToCanvasPresence, getOnlineUserCount, isUserRecentlyActive } from '../services/presence.service.js'
import { useCanvas } from './useCanvas.js'

/**
 * Hook for subscribing to canvas-scoped presence data
 * Returns array of connected users on the CURRENT canvas with their cursor positions
 * 
 * CANVAS-SCOPED: Only shows users who are on the same project+canvas
 */
export const usePresence = () => {
  const { projectId, canvasId } = useCanvas()
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Subscribe to canvas-scoped presence updates
  useEffect(() => {
    // Don't subscribe if we don't have a canvas yet
    if (!projectId || !canvasId) {
      console.log('Presence hook waiting for canvas context...')
      setUsers([])
      setIsLoading(true)
      return
    }

    let unsubscribe

    try {
      unsubscribe = subscribeToCanvasPresence(projectId, canvasId, (presenceData) => {
        // Sort users by connection time (most recent first)
        const sortedUsers = presenceData.sort((a, b) => 
          (b.connectedAt || 0) - (a.connectedAt || 0)
        )
        
        setUsers(sortedUsers)
        setIsLoading(false)
        setError(null)
      })

      console.log(`Subscribed to canvas presence: ${projectId}/${canvasId}`)
    } catch (err) {
      console.error('Failed to subscribe to canvas presence:', err)
      setError(err.message)
      setIsLoading(false)
    }

    // Cleanup subscription on unmount or canvas change
    return () => {
      if (unsubscribe) {
        unsubscribe()
        console.log(`Unsubscribed from canvas presence: ${projectId}/${canvasId}`)
      }
    }
  }, [projectId, canvasId]) // Re-subscribe when canvas changes

  // Calculate online users count
  const onlineCount = users.length > 0 ? getOnlineUserCount(users) : 0

  // Utility function to find a user by ID
  const getUserById = useCallback((userId) => {
    return users.find(user => user.userId === userId) || null
  }, [users])

  // Utility function to check if a user is recently active
  const isUserActive = useCallback((user) => {
    return isUserRecentlyActive(user)
  }, [])

  // Get users with cursor positions (for rendering)
  const usersWithCursors = users.filter(user => 
    user.cursorX !== null && 
    user.cursorY !== null && 
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
