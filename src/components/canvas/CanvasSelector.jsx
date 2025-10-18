import { useState, useRef, useEffect } from 'react'
import { Box, Button, Menu, MenuItem, TextField, Typography, CircularProgress, Chip } from '@mui/material'
import { ChevronDown, Plus, Loader2 } from 'lucide-react'
import { useCanvases } from '../../hooks/useCanvases'
import { useCanvas } from '../../hooks/useCanvas'
import { useAuth } from '../auth/AuthProvider'
import { createCanvas } from '../../services/canvas.service'

/**
 * CanvasSelector Component
 * Dropdown showing current canvas name with ability to switch or create new canvases
 */
const CanvasSelector = () => {
  const { currentUser } = useAuth()
  const { canvasId, setCurrentCanvas } = useCanvas()
  const { canvases, loading, refreshCanvases } = useCanvases()
  const [anchorEl, setAnchorEl] = useState(null)
  const [newCanvasName, setNewCanvasName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Find current canvas
  const currentCanvas = canvases.find(c => c.id === canvasId)

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSelectCanvas = (canvas) => {
    setCurrentCanvas(canvas.id)
    handleClose()
  }

  const handleCreateCanvas = async () => {
    if (!newCanvasName.trim()) {
      return
    }

    if (!currentUser) {
      console.error('User must be authenticated to create canvas')
      return
    }

    setIsCreating(true)
    try {
      const result = await createCanvas(newCanvasName.trim(), currentUser.uid)
      
      if (result.success) {
        setNewCanvasName('')
        refreshCanvases()
        setCurrentCanvas(result.canvasId)
        handleClose()
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
    <Box>
      {/* Dropdown Button */}
      <Button
        onClick={handleOpen}
        variant="contained"
        endIcon={<ChevronDown style={{ width: 16, height: 16, transition: 'transform 0.2s', transform: anchorEl ? 'rotate(180deg)' : 'rotate(0)' }} />}
        sx={{
          bgcolor: 'grey.800',
          color: 'white',
          '&:hover': {
            bgcolor: 'grey.700',
          },
        }}
      >
        <Typography variant="body2" fontWeight={500}>
          {currentCanvas ? currentCanvas.name : 'Select Canvas'}
        </Typography>
      </Button>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 320,
            maxHeight: 500,
            mt: 1,
          },
        }}
      >
        {/* Create Canvas Section */}
        <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'grey.200' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              value={newCanvasName}
              onChange={(e) => setNewCanvasName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="New canvas name..."
              size="small"
              fullWidth
              disabled={isCreating}
              sx={{ flex: 1 }}
            />
            <Button
              onClick={handleCreateCanvas}
              disabled={!newCanvasName.trim() || isCreating}
              variant="contained"
              size="small"
              sx={{ minWidth: 80 }}
            >
              {isCreating ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <>
                  <Plus style={{ width: 16, height: 16, marginRight: 4 }} />
                  Create
                </>
              )}
            </Button>
          </Box>
        </Box>

        {/* Canvas List */}
        <Box sx={{ maxHeight: 384, overflowY: 'auto' }}>
          {loading ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <CircularProgress size={20} sx={{ mb: 1 }} />
              <Typography variant="body2" color="grey.500">
                Loading canvases...
              </Typography>
            </Box>
          ) : canvases.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="grey.500">
                No canvases yet
              </Typography>
              <Typography variant="caption" color="grey.400" mt={0.5}>
                Create your first canvas above
              </Typography>
            </Box>
          ) : (
            <Box sx={{ py: 1 }}>
              {canvases.map((canvas) => (
                <MenuItem
                  key={canvas.id}
                  onClick={() => handleSelectCanvas(canvas)}
                  selected={canvas.id === canvasId}
                  sx={{
                    py: 1,
                    px: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    '&.Mui-selected': {
                      bgcolor: 'primary.light',
                      opacity: 0.1,
                      '&:hover': {
                        bgcolor: 'primary.light',
                        opacity: 0.15,
                      },
                    },
                  }}
                >
                  <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                    {canvas.name}
                  </Typography>
                  {canvas.id === canvasId && (
                    <Chip label="Current" size="small" color="primary" sx={{ height: 20, fontSize: '0.625rem' }} />
                  )}
                </MenuItem>
              ))}
            </Box>
          )}
        </Box>
      </Menu>
    </Box>
  )
}

export default CanvasSelector
