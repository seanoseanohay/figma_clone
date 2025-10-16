import { createContext, useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'

/**
 * CanvasContext
 * Tracks the current project and canvas that the user is viewing
 * This enables canvas-scoped presence (users only see others on the same canvas)
 */
export const CanvasContext = createContext({
  projectId: null,
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
  const { projectId: urlProjectId, canvasId: urlCanvasId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Initialize from URL or localStorage
  const [projectId, setProjectId] = useState(() => {
    // First check URL, then localStorage
    if (urlProjectId) return urlProjectId
    const stored = localStorage.getItem('currentProjectId')
    return stored || null
  })
  
  const [canvasId, setCanvasId] = useState(() => {
    // First check URL, then localStorage
    if (urlCanvasId) return urlCanvasId
    const stored = localStorage.getItem('currentCanvasId')
    return stored || null
  })

  // Sync with URL changes
  useEffect(() => {
    if (urlProjectId && urlCanvasId) {
      setProjectId(urlProjectId)
      setCanvasId(urlCanvasId)
      
      // Persist to localStorage
      localStorage.setItem('currentProjectId', urlProjectId)
      localStorage.setItem('currentCanvasId', urlCanvasId)
    }
  }, [urlProjectId, urlCanvasId, location.pathname])

  /**
   * Set the current canvas (called from dropdown or programmatically)
   * @param {string} newProjectId - Project ID
   * @param {string} newCanvasId - Canvas ID
   */
  const setCurrentCanvas = useCallback((newProjectId, newCanvasId) => {
    if (!newProjectId || !newCanvasId) {
      console.warn('setCurrentCanvas called with invalid IDs:', { newProjectId, newCanvasId })
      return
    }

    setProjectId(newProjectId)
    setCanvasId(newCanvasId)
    
    // Persist to localStorage
    localStorage.setItem('currentProjectId', newProjectId)
    localStorage.setItem('currentCanvasId', newCanvasId)
    
    // Navigate to the canvas URL
    navigate(`/project/${newProjectId}/canvas/${newCanvasId}`)
    
    console.log(`Canvas context updated: project=${newProjectId}, canvas=${newCanvasId}`)
  }, [navigate])

  /**
   * Get current canvas information
   * @returns {object} Current project and canvas IDs
   */
  const getCurrentCanvas = useCallback(() => {
    return {
      projectId,
      canvasId,
      hasCanvas: !!(projectId && canvasId)
    }
  }, [projectId, canvasId])

  /**
   * Clear the current canvas (when user navigates away)
   */
  const clearCurrentCanvas = useCallback(() => {
    setProjectId(null)
    setCanvasId(null)
    localStorage.removeItem('currentProjectId')
    localStorage.removeItem('currentCanvasId')
    console.log('Canvas context cleared')
  }, [])

  const value = {
    projectId,
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


