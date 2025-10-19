import React, { useState, useEffect } from 'react'
import { Box, Drawer, IconButton, Typography, Tab, Tabs, Badge } from '@mui/material'
import { X, Bot, BarChart3 } from 'lucide-react'
import AgentChatPanel from '../ai/AgentChatPanel.jsx'
import AgentMetricsPanel from '../ai/AgentMetricsPanel.jsx'
import { useCanvas } from '../../hooks/useCanvas.js'

/**
 * AgentSidebar Component
 * 
 * Main modal/sidebar container for AI agent functionality.
 * Includes:
 * - Chat interface for AI interactions
 * - Metrics panel for performance tracking
 * - Proper modal overlay and positioning
 * - Responsive design
 */
const AgentSidebar = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('chat')
  const [showMetrics, setShowMetrics] = useState(false)
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
            zIndex: 9998,
          },
        },
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
          {/* Metrics Toggle */}
          <IconButton
            onClick={() => setShowMetrics(!showMetrics)}
            size="small"
            sx={{
              color: 'grey.400',
              '&:hover': { color: 'grey.600', bgcolor: 'grey.100' },
            }}
            title="Toggle metrics"
          >
            <BarChart3 style={{ width: 20, height: 20 }} />
          </IconButton>
          
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

      {/* Floating Metrics Panel */}
      {showMetrics && (
        <AgentMetricsPanel
          isVisible={showMetrics}
          onToggle={() => setShowMetrics(!showMetrics)}
        />
      )}
    </Drawer>
  )
}

export default AgentSidebar
