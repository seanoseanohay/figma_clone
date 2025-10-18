import { useState, useRef, useEffect } from 'react'
import { useCanvas } from '../../hooks/useCanvas.js'

/**
 * AI Agent Sidebar Component
 * 
 * Placeholder sidebar for AI assistant integration
 * Will be enhanced with actual AI functionality in Stage 7
 */
const AgentSidebar = ({ isOpen, onClose }) => {
  const { canvasId } = useCanvas()
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [history, setHistory] = useState([])
  const textareaRef = useRef(null)

  // Focus textarea when sidebar opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!prompt.trim() || isLoading) return

    const currentPrompt = prompt.trim()
    setPrompt('')
    setIsLoading(true)

    // Add user message to history
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: currentPrompt,
      timestamp: new Date()
    }
    
    setHistory(prev => [...prev, userMessage])

    try {
      // TODO: Replace with actual AI API call in Stage 7
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const aiResponse = {
        id: Date.now() + 1,
        type: 'assistant',
        content: `I understand you want to "${currentPrompt}". This is a placeholder response. In Stage 7, I'll be able to actually create and modify shapes on your canvas!`,
        timestamp: new Date(),
        commands: [] // Will contain actual commands in Stage 7
      }
      
      setHistory(prev => [...prev, aiResponse])
    } catch (error) {
      const errorResponse = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }
      
      setHistory(prev => [...prev, errorResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const clearHistory = () => {
    setHistory([])
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getMessageIcon = (type) => {
    switch (type) {
      case 'user': return '👤'
      case 'assistant': return '🤖'
      case 'error': return '❌'
      default: return '💬'
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 flex items-center justify-center p-4"
        onClick={onClose}
        style={{ zIndex: 40, backgroundColor: '#ffffff' }}
      >
        {/* Modal */}
        <div 
          className="w-full max-w-lg bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col max-h-[80vh] transform transition-all duration-200 ease-out"
          style={{ zIndex: 50, backgroundColor: '#ffffff' }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">🤖</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Assistant</h3>
              <p className="text-xs text-gray-500">Canvas Helper (Beta)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/80 transition-colors"
            title="Close AI Assistant"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-gray-600">Stage 6 Preview</span>
            </div>
            {canvasId && (
              <div className="text-xs text-gray-500 truncate max-w-32" title={canvasId}>
                Canvas: {canvasId.slice(0, 8)}...
              </div>
            )}
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {history.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎨</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Welcome to AI Assistant!</h4>
              <p className="text-sm text-gray-600 mb-4">
                I can help you create and modify shapes on your canvas. Try asking me to:
              </p>
              <div className="text-sm text-gray-600 space-y-1">
                <div>• "Create a blue rectangle"</div>
                <div>• "Add three circles in a row"</div>
                <div>• "Make a red star in the center"</div>
                <div>• "Move the selected shape left"</div>
              </div>
              <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
                <strong>Note:</strong> This is a Stage 6 preview. Full AI functionality will be available in Stage 7.
              </div>
            </div>
          ) : (
            <>
              {history.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.type === 'error'
                      ? 'bg-red-50 text-red-900 border border-red-200'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm">{getMessageIcon(message.type)}</span>
                      <span className="text-xs opacity-75">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 max-w-xs px-4 py-2 rounded-2xl">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-gray-500">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
          {history.length > 0 && (
            <div className="flex justify-end mb-3">
              <button
                onClick={clearHistory}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear History
              </button>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="flex space-x-2">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe what you want to create or modify..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="2"
                  disabled={isLoading}
                  maxLength={1000}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">
                    {prompt.length}/1000
                  </span>
                  <span className="text-xs text-gray-500">
                    Press Enter to send, Shift+Enter for new line
                  </span>
                </div>
              </div>
              <button
                type="submit"
                disabled={!prompt.trim() || isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-start mt-0"
              >
                {isLoading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" width="20" height="20">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>
    </>
  )
}

export default AgentSidebar
