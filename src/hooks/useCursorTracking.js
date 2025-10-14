import { useCallback, useEffect, useRef } from 'react'
import { updateCursorPosition, setUserOnline, setUserOffline } from '../services/presence.service.js'
import { CURSOR_UPDATE_THROTTLE } from '../constants/canvas.constants.js'
import { useAdvancedThrottling } from './useAdvancedThrottling.js'

/**
 * Hook for tracking and broadcasting cursor position with advanced throttling
 * Only broadcasts position - tool selection stays local to each user
 * Includes Firebase cost management and adaptive throttling
 */
export const useCursorTracking = () => {
  const isOnlineRef = useRef(false)

  // Enhanced throttling with Firebase cost management
  const { throttledCall, getStats } = useAdvancedThrottling({
    throttleMs: CURSOR_UPDATE_THROTTLE,
    maxCallsPerSecond: 25,        // Increased limit for better UX
    adaptiveThrottling: true,     // Increase throttling under high load
    minMovement: 5,               // Increased to 5px to reduce calls
    batchUpdates: true
  })

  // Optimized cursor update function
  const updateCursor = useCallback((position) => {
    // Only update if user is online and position is valid
    if (!isOnlineRef.current || !position || typeof position.x !== 'number' || typeof position.y !== 'number') {
      return
    }

    // Use advanced throttling to manage Firebase calls
    throttledCall(position, updateCursorPosition)
  }, [throttledCall])

  // Set user online when hook mounts
  useEffect(() => {
    const initializePresence = async () => {
      try {
        await setUserOnline()
        isOnlineRef.current = true
        console.log('Cursor tracking initialized - user set online')
      } catch (error) {
        console.error('Failed to set user online:', error)
        isOnlineRef.current = false
      }
    }

    initializePresence()

    // Cleanup on unmount - set user offline
    return () => {
      setUserOffline()
      isOnlineRef.current = false
      console.log('Cursor tracking cleaned up - user set offline')
    }
  }, [])

  // Provide debug information about throttling state
  const getThrottleInfo = useCallback(() => {
    const stats = getStats()
    return {
      ...stats,
      isOnline: isOnlineRef.current,
      // Additional cost management info
      costOptimized: true,
      throttlingStrategy: 'adaptive'
    }
  }, [getStats])

  return {
    updateCursor,
    getThrottleInfo
  }
}

export default useCursorTracking
