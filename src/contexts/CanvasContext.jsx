import { createContext, useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'

/**
 * CanvasContext
 * Tracks the current canvas that the user is viewing
 * This enables canvas-scoped presence (users only see others on the same canvas)
 */
export const CanvasContext = createContext({
  canvasId: null,
  setCurrentCanvas: () => {},
  getCurrentCanvas: () => {},
  clearCurrentCanvas: () => {}
})

/**
 * CanvasProvider
 * Provides canvas context and manages persistence via localStorage
 */
export const CanvasProvider = ({ children }) => {
  const { canvasId: urlCanvasId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Initialize from URL or localStorage
  const [canvasId, setCanvasId] = useState(() => {
    // First check URL, then localStorage
    if (urlCanvasId) return urlCanvasId
    const stored = localStorage.getItem('currentCanvasId')
    return stored || null
  })

  // Sync with URL changes
  useEffect(() => {
    if (urlCanvasId) {
      setCanvasId(urlCanvasId)
      
      // Persist to localStorage
      localStorage.setItem('currentCanvasId', urlCanvasId)
    }
  }, [urlCanvasId, location.pathname])

  /**
   * Set the current canvas (called from dropdown or programmatically)
   * @param {string} newCanvasId - Canvas ID
   */
  const setCurrentCanvas = useCallback((newCanvasId) => {
    if (!newCanvasId) {
      console.warn('setCurrentCanvas called with invalid ID:', newCanvasId)
      return
    }

    setCanvasId(newCanvasId)
    
    // Persist to localStorage
    localStorage.setItem('currentCanvasId', newCanvasId)
    
    // Navigate to the canvas URL
    navigate(`/canvas/${newCanvasId}`)
    
    console.log(`Canvas context updated: canvas=${newCanvasId}`)
  }, [navigate])

  /**
   * Get current canvas information
   * @returns {object} Current canvas ID
   */
  const getCurrentCanvas = useCallback(() => {
    return {
      canvasId,
      hasCanvas: !!canvasId
    }
  }, [canvasId])

  /**
   * Clear the current canvas (when user navigates away)
   */
  const clearCurrentCanvas = useCallback(() => {
    setCanvasId(null)
    localStorage.removeItem('currentCanvasId')
    console.log('Canvas context cleared')
  }, [])

  const value = {
    canvasId,
    setCurrentCanvas,
    getCurrentCanvas,
    clearCurrentCanvas
  }

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  )
}

export default CanvasContext


