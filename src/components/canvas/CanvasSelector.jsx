import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Loader2 } from 'lucide-react'
import { useCanvases } from '../../hooks/useCanvases'
import { useCanvas } from '../../hooks/useCanvas'
import { useAuth } from '../auth/AuthProvider'
import { createCanvas } from '../../services/canvas.service'

/**
 * CanvasSelector Component
 * Dropdown showing current canvas name with ability to switch or create new canvases
 */
export const CanvasSelector = () => {
  const { user } = useAuth()
  const { canvasId, setCurrentCanvas } = useCanvas()
  const { canvases, loading, refreshCanvases } = useCanvases()
  const [isOpen, setIsOpen] = useState(false)
  const [newCanvasName, setNewCanvasName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const dropdownRef = useRef(null)

  // Find current canvas
  const currentCanvas = canvases.find(c => c.id === canvasId)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelectCanvas = (canvas) => {
    setCurrentCanvas(canvas.id)
    setIsOpen(false)
  }

  const handleCreateCanvas = async () => {
    if (!newCanvasName.trim()) {
      return
    }

    if (!user) {
      console.error('User must be authenticated to create canvas')
      return
    }

    setIsCreating(true)
    try {
      const result = await createCanvas(newCanvasName.trim(), user.uid)
      
      if (result.success) {
        setNewCanvasName('')
        refreshCanvases()
        setCurrentCanvas(result.canvasId)
        setIsOpen(false)
      } else {
        console.error('Failed to create canvas:', result.error)
      }
    } catch (error) {
      console.error('Error creating canvas:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreateCanvas()
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors duration-150"
      >
        <span className="font-medium">
          {currentCanvas ? currentCanvas.name : 'Select Canvas'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          {/* Create Canvas Section */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCanvasName}
                onChange={(e) => setNewCanvasName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="New canvas name..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isCreating}
              />
              <button
                onClick={handleCreateCanvas}
                disabled={!newCanvasName.trim() || isCreating}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Create</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Canvas List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading canvases...</p>
              </div>
            ) : canvases.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <p className="text-sm">No canvases yet</p>
                <p className="text-xs mt-1">Create your first canvas above</p>
              </div>
            ) : (
              <div className="py-2">
                {canvases.map((canvas) => (
                  <button
                    key={canvas.id}
                    onClick={() => handleSelectCanvas(canvas)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 ${
                      canvas.id === canvasId
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{canvas.name}</span>
                      {canvas.id === canvasId && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">Current</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

