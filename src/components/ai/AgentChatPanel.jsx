import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, Loader2, AlertCircle, Bot, User, Sparkles } from 'lucide-react'
import { useAgentChat } from '../../hooks/useAgentChat.js'

/**
 * AgentChatPanel Component
 * 
 * Provides a chat interface for users to interact with the AI agent.
 * Features:
 * - Message history with user/agent distinction
 * - Loading states during AI processing
 * - Error handling with retry functionality
 * - Auto-scroll to latest messages
 * - Responsive design
 */
const AgentChatPanel = ({ canvasId, canvasState, isVisible, onToggle }) => {
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    retryLastMessage
  } = useAgentChat({ canvasId, canvasState })

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Focus input when panel becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isVisible])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading) return

    const message = inputMessage.trim()
    setInputMessage('')
    
    await sendMessage(message)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleRetry = () => {
    retryLastMessage()
  }

  if (!isVisible) return null

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Welcome Message - Shown only when embedded in sidebar */}
      {isVisible && (
        <div className="p-4 border-b border-gray-200 bg-blue-50 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">Ready to help!</h3>
          </div>
          <p className="text-sm text-blue-700">
            Create and modify canvas objects with natural language commands.
          </p>
        </div>
      )}

      {/* Messages Area - Constrained to leave space for input */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Welcome to AI Canvas Agent!</h4>
            <p className="text-gray-600 text-sm mb-4">
              Try commands like:
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="bg-gray-50 p-2 rounded text-left">
                "Create a red rectangle in the center"
              </div>
              <div className="bg-gray-50 p-2 rounded text-left">
                "Add three blue circles in a row"
              </div>
              <div className="bg-gray-50 p-2 rounded text-left">
                "Move the selected object to the right"
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.type === 'agent' && (
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full flex-shrink-0">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
              )}
              
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
                
                {/* Show command execution results */}
                {message.type === 'agent' && message.commandsExecuted !== undefined && (
                  <div className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.commandsExecuted > 0 ? (
                      <>
                        ✅ Executed {message.commandsExecuted} command{message.commandsExecuted !== 1 ? 's' : ''}
                        {message.createdObjects > 0 && ` • Created ${message.createdObjects} object${message.createdObjects !== 1 ? 's' : ''}`}
                        {message.modifiedObjects > 0 && ` • Modified ${message.modifiedObjects} object${message.modifiedObjects !== 1 ? 's' : ''}`}
                        {message.executionTimeMs && ` • ${message.executionTimeMs}ms`}
                      </>
                    ) : (
                      <>❌ No commands executed</>
                    )}
                  </div>
                )}
                
                {/* Show errors */}
                {message.error && (
                  <div className="text-xs mt-2 text-red-600 bg-red-50 p-2 rounded">
                    Error: {message.error}
                  </div>
                )}
              </div>
              
              {message.type === 'user' && (
                <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full flex-shrink-0">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error state with retry */}
        {error && (
          <div className="flex gap-3 justify-start">
            <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="bg-red-50 border border-red-200 px-4 py-2 rounded-lg">
              <p className="text-sm text-red-800 mb-2">
                {error}
              </p>
              <button
                onClick={handleRetry}
                className="text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-red-800"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom with clean styling */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your AI command here... (e.g., 'Create a red rectangle')"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              rows={3}
              disabled={isLoading}
              style={{ 
                minHeight: '80px'
              }}
            />
            
            {/* Character count / helper text */}
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {inputMessage.length > 0 && `${inputMessage.length} chars`}
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors self-end"
            style={{ minHeight: '48px', minWidth: '48px' }}
            title={isLoading ? 'Processing...' : 'Send message'}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Press Enter to send, Shift+Enter for new line</span>
          </div>
          
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </span>
            )}
            <button
              type="button"
              onClick={clearMessages}
              className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition-colors"
              disabled={isLoading || messages.length === 0}
            >
              Clear chat
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default AgentChatPanel