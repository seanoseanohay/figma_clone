import React, { useState, useEffect } from 'react'
import { Box, Drawer, IconButton, Typography, Tab, Tabs, Badge } from '@mui/material'
import { X, Bot } from 'lucide-react'
import AgentChatPanel from '../ai/AgentChatPanel.jsx'
import { useCanvas } from '../../hooks/useCanvas.js'

/**
 * AgentSidebar Component
 * 
 * Main modal/sidebar container for AI agent functionality.
 * Includes:
 * - Chat interface for AI interactions
 * - Proper modal overlay and positioning
 * - Responsive design
 */
const AgentSidebar = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('chat')
  const { canvasId, objects, selectedObjectIds, viewport } = useCanvas()

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Prepare canvas state for chat panel
  const canvasState = {
    objects: objects || [],
    selectedObjectIds: selectedObjectIds || [],
    viewport: viewport || { x: 0, y: 0, zoom: 1 }
  }

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      sx={{
        zIndex: 9999,
        '& .MuiDrawer-paper': {
          width: 384,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      ModalProps={{
        BackdropProps: {
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.25)',
            // Fix: Ensure backdrop doesn't intercept clicks that should go to drawer content
            pointerEvents: 'auto',
          },
          // Only close on backdrop click, not on clicks inside drawer
          onClick: (e) => {
            // Only close if clicking directly on backdrop (not on drawer content)
            if (e.target === e.currentTarget) {
              onClose();
            }
          },
        },
        // Prevent modal from closing on inside clicks
        disableEscapeKeyDown: false,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: 1,
          borderColor: 'grey.200',
          bgcolor: 'grey.50',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              bgcolor: 'primary.light',
              opacity: 0.2,
              borderRadius: '50%',
            }}
          >
            <Bot style={{ width: 20, height: 20, color: '#2563eb' }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              AI Canvas Agent
            </Typography>
            <Typography variant="caption" color="grey.500">
              {canvasId ? `Canvas: ${canvasId.substring(0, 8)}...` : 'No canvas selected'}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Close Button */}
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'grey.400',
              '&:hover': { color: 'error.main', bgcolor: 'grey.100' },
            }}
            title="Close AI Assistant"
          >
            <X style={{ width: 20, height: 20 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'grey.200', bgcolor: 'grey.50' }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab
            value="chat"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Bot style={{ width: 16, height: 16 }} />
                Chat
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Content Area */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Chat Panel */}
        {activeTab === 'chat' && (
          <AgentChatPanel
            canvasId={canvasId}
            canvasState={canvasState}
            isVisible={true}
            onToggle={onClose}
          />
        )}
      </Box>

    </Drawer>
  )
}

export default AgentSidebar
