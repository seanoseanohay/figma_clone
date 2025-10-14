import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Enhanced throttling hook with Firebase cost management
 * Provides multiple throttling strategies to minimize Firebase usage
 */
export const useAdvancedThrottling = (options = {}) => {
  const {
    throttleMs = 50,           // Base throttle time
    maxCallsPerSecond = 30,    // Maximum calls per second (increased from 20)
    adaptiveThrottling = true, // Increase throttling under high load
    batchUpdates = true,       // Batch multiple updates
    minMovement = 2            // Minimum pixels moved before update
  } = options

  const lastCallTime = useRef(0)
  const callCount = useRef(0)
  const throttleTimer = useRef(null)
  const lastPosition = useRef(null)
  const pendingUpdate = useRef(null)
  
  // Reset call counter every second
  useEffect(() => {
    const resetInterval = setInterval(() => {
      callCount.current = 0
    }, 1000)
    
    return () => clearInterval(resetInterval)
  }, [])

  // Calculate dynamic throttle time based on load
  const getDynamicThrottleMs = useCallback(() => {
    if (!adaptiveThrottling) return throttleMs
    
    // Increase throttling if we're approaching rate limits
    const callsPerSecond = callCount.current
    if (callsPerSecond > maxCallsPerSecond * 0.8) {
      return throttleMs * 2 // Double throttling when at 80% of limit
    } else if (callsPerSecond > maxCallsPerSecond * 0.6) {
      return throttleMs * 1.5 // 1.5x throttling when at 60% of limit
    }
    
    return throttleMs
  }, [throttleMs, maxCallsPerSecond, adaptiveThrottling])

  // Check if position has moved enough to warrant an update
  const hasSignificantMovement = useCallback((newPosition) => {
    if (!lastPosition.current) return true
    
    const deltaX = Math.abs(newPosition.x - lastPosition.current.x)
    const deltaY = Math.abs(newPosition.y - lastPosition.current.y)
    
    return deltaX >= minMovement || deltaY >= minMovement
  }, [minMovement])

  // Main throttled function
  const throttledCall = useCallback((position, updateFunction) => {
    const now = Date.now()
    const dynamicThrottleMs = getDynamicThrottleMs()
    
    // Check rate limits (warn but don't block critical operations)
    if (callCount.current >= maxCallsPerSecond) {
      console.warn('Firebase rate limit reached, using longer throttle')
      // Instead of blocking, use longer throttle time
      const now = Date.now()
      if (now - lastCallTime.current < throttleMs * 2) {
        return // Only skip if very recent
      }
    }
    
    // Check if movement is significant enough
    if (!hasSignificantMovement(position)) {
      return
    }
    
    // Store pending update for batching
    pendingUpdate.current = { position, updateFunction, timestamp: now }
    
    // If enough time has passed since last call, execute immediately
    if (now - lastCallTime.current >= dynamicThrottleMs) {
      executeUpdate()
      return
    }
    
    // Otherwise, schedule for later execution
    if (throttleTimer.current) {
      clearTimeout(throttleTimer.current)
    }
    
    throttleTimer.current = setTimeout(() => {
      executeUpdate()
    }, dynamicThrottleMs - (now - lastCallTime.current))
  }, [getDynamicThrottleMs, maxCallsPerSecond, hasSignificantMovement])

  // Execute the actual update
  const executeUpdate = useCallback(() => {
    if (!pendingUpdate.current) return
    
    const { position, updateFunction } = pendingUpdate.current
    
    try {
      updateFunction(position)
      lastCallTime.current = Date.now()
      lastPosition.current = position
      callCount.current += 1
      pendingUpdate.current = null
    } catch (error) {
      console.error('Error in throttled update:', error)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (throttleTimer.current) {
        clearTimeout(throttleTimer.current)
      }
    }
  }, [])

  // Get current throttling stats for monitoring
  const getStats = useCallback(() => {
    return {
      callsThisSecond: callCount.current,
      maxCallsPerSecond,
      currentThrottleMs: getDynamicThrottleMs(),
      lastCallTime: lastCallTime.current,
      isThrottling: !!throttleTimer.current
    }
  }, [maxCallsPerSecond, getDynamicThrottleMs])

  return {
    throttledCall,
    getStats
  }
}

export default useAdvancedThrottling
