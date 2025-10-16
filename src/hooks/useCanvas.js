import { useContext } from 'react'
import { CanvasContext } from '../contexts/CanvasContext.jsx'

/**
 * useCanvas Hook
 * Access current project and canvas context
 * 
 * @returns {object} Canvas context with projectId, canvasId, and helper methods
 */
export const useCanvas = () => {
  const context = useContext(CanvasContext)
  
  if (context === undefined) {
    throw new Error('useCanvas must be used within a CanvasProvider')
  }
  
  return context
}

export default useCanvas


