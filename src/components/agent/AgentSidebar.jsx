import React, { useState, useEffect } from 'react'
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

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  // Prepare canvas state for chat panel
  const canvasState = {
    objects: objects || [],
    selectedObjectIds: selectedObjectIds || [],
    viewport: viewport || { x: 0, y: 0, zoom: 1 }
  }

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        style={{ zIndex: 9998 }}
        onClick={handleBackdropClick}
      />
      
      {/* Modal Content */}
      <div 
        className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl transform transition-transform flex flex-col"
        style={{ zIndex: 9999 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Canvas Agent</h2>
              <p className="text-xs text-gray-500">
                {canvasId ? `Canvas: ${canvasId.substring(0, 8)}...` : 'No canvas selected'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Metrics Toggle */}
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Toggle metrics"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Close AI Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'chat'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Bot className="w-4 h-4" />
              Chat
            </div>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Chat Panel */}
          {activeTab === 'chat' && (
            <AgentChatPanel
              canvasId={canvasId}
              canvasState={canvasState}
              isVisible={true}
              onToggle={onClose}
            />
          )}
        </div>

        {/* Floating Metrics Panel */}
        {showMetrics && (
          <AgentMetricsPanel
            isVisible={showMetrics}
            onToggle={() => setShowMetrics(!showMetrics)}
          />
        )}
      </div>
    </>
  )
}

export default AgentSidebar