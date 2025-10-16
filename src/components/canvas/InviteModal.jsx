import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { useCanvas } from '../../hooks/useCanvas'
import { useAuth } from '../auth/AuthProvider'
import { useCanvases } from '../../hooks/useCanvases'
import { addCollaboratorToCanvas } from '../../services/canvas.service'

/**
 * InviteModal Component
 * Modal for inviting collaborators to a canvas via email
 */
export const InviteModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { canvasId } = useCanvas()
  const { user } = useAuth()
  const { canvases } = useCanvases()

  // Find current canvas
  const currentCanvas = canvases.find(c => c.id === canvasId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate email
    if (!email || !email.trim()) {
      toast.error('Please enter an email address')
      return
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address')
      return
    }
    
    if (!canvasId) {
      toast.error('No canvas selected. Please select a canvas first.')
      return
    }

    // Check if inviting yourself
    if (user && email.trim().toLowerCase() === user.email?.toLowerCase()) {
      toast.error('You cannot invite yourself')
      return
    }
    
    setLoading(true)
    
    try {
      const result = await addCollaboratorToCanvas(
        canvasId,
        email.trim(),
        user.uid
      )
      
      if (result.success) {
        if (result.pending) {
          toast.success('Invitation sent! User will be added when they sign up.')
        } else {
          toast.success('Collaborator added successfully!')
        }
        setEmail('')
        
        // Close modal after short delay
        setTimeout(() => {
          onClose()
        }, 500)
      } else {
        toast.error(result.message || 'Failed to send invitation')
      }
    } catch (err) {
      console.error('Error inviting user:', err)
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setEmail('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invite Collaborator</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Current Canvas Display */}
        {currentCanvas && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Canvas:</p>
            <p className="font-medium text-gray-900 dark:text-white">{currentCanvas.name}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="Enter email address"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              autoFocus
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              If the user exists, they'll be added immediately. Otherwise, they'll receive an invite when they sign up.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

