import { useState } from 'react'
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, CircularProgress, Paper, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { toast } from 'react-toastify'
import { useCanvas } from '../../hooks/useCanvas'
import { useAuth } from '../auth/AuthProvider'
import { useCanvases } from '../../hooks/useCanvases'
import { addCollaboratorToCanvas } from '../../services/canvas.service'

/**
 * InviteModal Component
 * Modal for inviting collaborators to a canvas via email
 */
const InviteModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { canvasId } = useCanvas()
  const { currentUser } = useAuth()
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
    if (currentUser && email.trim().toLowerCase() === currentUser.email?.toLowerCase()) {
      toast.error('You cannot invite yourself')
      return
    }
    
    setLoading(true)
    
    try {
      const result = await addCollaboratorToCanvas(
        canvasId,
        email.trim(),
        currentUser.uid
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

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h5" fontWeight="bold">
          Invite Collaborator
        </Typography>
        <IconButton
          onClick={handleClose}
          disabled={loading}
          size="small"
          sx={{ color: 'grey.400', '&:hover': { color: 'grey.600' } }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent>
        {/* Current Canvas Display */}
        {currentCanvas && (
          <Paper
            sx={{
              mb: 3,
              p: 2,
              bgcolor: 'primary.light',
              opacity: 0.1,
              border: 1,
              borderColor: 'primary.main',
            }}
          >
            <Typography variant="caption" color="grey.600" display="block" mb={0.5}>
              Canvas:
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {currentCanvas.name}
            </Typography>
          </Paper>
        )}

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            type="email"
            label="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="Enter email address"
            fullWidth
            autoFocus
            helperText="If the user exists, they'll be added immediately. Otherwise, they'll receive an invite when they sign up."
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !email.trim()}
          variant="contained"
          startIcon={loading && <CircularProgress size={16} color="inherit" />}
        >
          {loading ? 'Sending...' : 'Send Invitation'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default InviteModal
