import { useState, useEffect, useCallback } from 'react'
import { subscribeToObjects } from '../services/canvas.service.js'

/**
 * Hook for managing canvas objects with real-time Firestore sync
 * Returns canvas objects array and loading/error states
 * @param {string} canvasId - The canvas ID to subscribe to (optional for backward compatibility)
 */
export const useCanvasObjects = (canvasId = null) => {
  const [objects, setObjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Subscribe to Firestore changes
  useEffect(() => {
    // Don't subscribe if no canvasId provided
    if (!canvasId) {
      setObjects([])
      setIsLoading(false)
      setError(null) // Don't treat missing canvasId as an error during development
      return
    }

    let unsubscribe

    try {
      unsubscribe = subscribeToObjects(canvasId, (newObjects) => {
        // Convert Firestore timestamps to regular dates for easier handling
        const processedObjects = newObjects.map(obj => ({
          ...obj,
          createdAt: obj.createdAt?.toDate?.() || new Date(),
          lastModifiedAt: obj.lastModifiedAt?.toDate?.() || new Date()
        }))
        
        setObjects(processedObjects)
        setIsLoading(false)
        setError(null)
      })

      console.log('Subscribed to canvas objects')
    } catch (err) {
      console.error('Failed to subscribe to canvas objects:', err)
      setError(err.message)
      setIsLoading(false)
    }

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe()
        console.log('Unsubscribed from canvas objects')
      }
    }
  }, [canvasId]) // Re-subscribe when canvasId changes

  // Get objects by type
  const getObjectsByType = useCallback((type) => {
    return objects.filter(obj => obj.type === type)
  }, [objects])

  // Get object by ID
  const getObjectById = useCallback((id) => {
    return objects.find(obj => obj.id === id) || null
  }, [objects])

  // Get objects created by current user
  const getMyObjects = useCallback((currentUserId) => {
    return objects.filter(obj => obj.createdBy === currentUserId)
  }, [objects])

  // Get recently modified objects (within last 5 minutes)
  const getRecentlyModified = useCallback(() => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    return objects.filter(obj => obj.lastModifiedAt > fiveMinutesAgo)
  }, [objects])

  // Get summary statistics
  const getSummary = useCallback(() => {
    const summary = {
      total: objects.length,
      rectangles: objects.filter(obj => obj.type === 'rectangle').length,
      circles: objects.filter(obj => obj.type === 'circle').length,
      text: objects.filter(obj => obj.type === 'text').length,
      recentlyModified: getRecentlyModified().length
    }
    
    return summary
  }, [objects, getRecentlyModified])

  return {
    objects,
    isLoading,
    error,
    // Utility functions
    getObjectsByType,
    getObjectById, 
    getMyObjects,
    getRecentlyModified,
    getSummary
  }
}

export default useCanvasObjects
