import { useCallback, useEffect, useRef } from 'react'
import { updateCursorPosition, setUserOnline, setUserOffline } from '../services/presence.service.js'
import { CURSOR_UPDATE_THROTTLE } from '../constants/canvas.constants.js'
import { useAdvancedThrottling } from './useAdvancedThrottling.js'
import { useCanvas } from './useCanvas.js'

/**
 * Hook for tracking and broadcasting cursor position with canvas-scoped presence
 * Only broadcasts position - tool selection stays local to each user
 * Includes Firebase cost management and adaptive throttling
 * 
 * CANVAS-SCOPED: Cursor updates are only sent/visible within the current canvas
 */
export const useCursorTracking = () => {
  const { projectId, canvasId } = useCanvas()
  const isOnlineRef = useRef(false)
  const currentCanvasRef = useRef({ projectId: null, canvasId: null })

  // Enhanced throttling with Firebase cost management
  const { throttledCall, getStats } = useAdvancedThrottling({
    throttleMs: CURSOR_UPDATE_THROTTLE,
    maxCallsPerSecond: 25,        // Increased limit for better UX
    adaptiveThrottling: true,     // Increase throttling under high load
    minMovement: 5,               // Increased to 5px to reduce calls
    batchUpdates: true
  })

  // Optimized cursor update function - now canvas-scoped
  const updateCursor = useCallback((position) => {
    // Only update if user is online, position is valid, and we have a canvas
    if (!isOnlineRef.current || 
        !position || 
        typeof position.x !== 'number' || 
        typeof position.y !== 'number' ||
        !projectId || 
        !canvasId) {
      return
    }

    // Use advanced throttling to manage Firebase calls
    // Wrap updateCursorPosition with projectId/canvasId
    throttledCall(position, (pos) => {
      updateCursorPosition(projectId, canvasId, pos.x, pos.y)
    })
  }, [throttledCall, projectId, canvasId])

  // Set user online when canvas changes or hook mounts
  useEffect(() => {
    // Don't initialize if we don't have a canvas yet
    if (!projectId || !canvasId) {
      console.log('Cursor tracking waiting for canvas context...')
      return
    }

    // Check if we're switching canvases
    const previousProjectId = currentCanvasRef.current.projectId
    const previousCanvasId = currentCanvasRef.current.canvasId
    const isCanvasChange = previousProjectId && previousCanvasId && 
                          (previousProjectId !== projectId || previousCanvasId !== canvasId)

    const initializePresence = async () => {
      try {
        // If switching canvases, cleanup old presence first
        if (isCanvasChange) {
          console.log(`Switching canvas - cleaning up old presence (${previousProjectId}/${previousCanvasId})`)
          await setUserOffline(previousProjectId, previousCanvasId)
        }

        // Set online in new canvas
        await setUserOnline(projectId, canvasId)
        isOnlineRef.current = true
        currentCanvasRef.current = { projectId, canvasId }
        console.log(`Cursor tracking initialized for canvas: ${projectId}/${canvasId}`)
      } catch (error) {
        console.error('Failed to set user online:', error)
        isOnlineRef.current = false
      }
    }

    initializePresence()

    // Cleanup on unmount or canvas change - set user offline
    return () => {
      if (projectId && canvasId) {
        setUserOffline(projectId, canvasId)
        isOnlineRef.current = false
        console.log(`Cursor tracking cleaned up for canvas: ${projectId}/${canvasId}`)
      }
    }
  }, [projectId, canvasId]) // Re-run when canvas changes

  // Provide debug information about throttling state
  const getThrottleInfo = useCallback(() => {
    const stats = getStats()
    return {
      ...stats,
      isOnline: isOnlineRef.current,
      projectId: currentCanvasRef.current.projectId,
      canvasId: currentCanvasRef.current.canvasId,
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
