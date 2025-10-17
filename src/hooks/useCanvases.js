import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../components/auth/AuthProvider'
import { getCanvasesForUser } from '../services/canvas.service'

/**
 * Custom hook for fetching and managing canvases for the current user
 * Returns all canvases the user owns or collaborates on
 */
export const useCanvases = () => {
  const { currentUser } = useAuth()
  const [canvases, setCanvases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /**
   * Fetch canvases for the current user
   */
  const fetchCanvases = useCallback(async () => {
    if (!currentUser) {
      setCanvases([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const result = await getCanvasesForUser(currentUser.uid)

      if (result.success) {
        setCanvases(result.canvases || [])
      } else {
        setError(result.error || 'Failed to fetch canvases')
        setCanvases([])
      }
    } catch (err) {
      console.error('Error in useCanvases:', err)
      setError('An unexpected error occurred')
      setCanvases([])
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  /**
   * Refresh the canvases list
   */
  const refreshCanvases = useCallback(() => {
    fetchCanvases()
  }, [fetchCanvases])

  // Fetch canvases when user changes
  useEffect(() => {
    fetchCanvases()
  }, [fetchCanvases])

  return {
    canvases,
    loading,
    error,
    refreshCanvases
  }
}

