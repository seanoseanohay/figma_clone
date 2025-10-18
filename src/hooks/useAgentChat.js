import { useState, useCallback, useRef, useEffect } from 'react'
import { requestAgentResponse, getMockAgentResponse } from '../services/agent.service.js'
import { executeAgentResponse, createAgentCheckpoint } from '../services/agentExecutor.service.js'
import { useAgentMetrics } from './useAgentMetrics.js'

/**
 * useAgentChat Hook
 * 
 * Manages chat state and AI agent interactions
 * Features:
 * - Message history management
 * - AI response handling with command execution
 * - Error handling and retry functionality
 * - Loading states
 * - Automatic canvas state updates
 */
export const useAgentChat = ({ canvasId, canvasState }) => {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const lastMessageRef = useRef(null)
  const messageIdCounter = useRef(1)
  const { recordRequest } = useAgentMetrics()

  // Generate unique message ID
  const getNextMessageId = () => {
    return `msg_${messageIdCounter.current++}_${Date.now()}`
  }

  // Add a new message to the chat
  const addMessage = useCallback((type, content, metadata = {}) => {
    const message = {
      id: getNextMessageId(),
      type, // 'user' or 'agent'
      content,
      timestamp: Date.now(),
      ...metadata
    }
    
    setMessages(prev => [...prev, message])
    return message
  }, [])

  // Update the last message with additional data
  const updateLastMessage = useCallback((updates) => {
    setMessages(prev => {
      const newMessages = [...prev]
      const lastIndex = newMessages.length - 1
      if (lastIndex >= 0) {
        newMessages[lastIndex] = { ...newMessages[lastIndex], ...updates }
      }
      return newMessages
    })
  }, [])

  // Send message to AI agent
  const sendMessage = useCallback(async (userMessage) => {
    if (!canvasId || !canvasState) {
      setError('Canvas not available. Please select a canvas first.')
      return
    }

    // Clear any previous errors
    setError(null)
    setIsLoading(true)

    // Add user message to chat
    const userMessageObj = addMessage('user', userMessage)
    lastMessageRef.current = userMessageObj

    const startTime = Date.now()
    
    try {
      // Get current canvas state (this should be passed from parent component)
      const currentCanvasState = {
        canvasId,
        objects: canvasState.objects || [],
        selectedObjectIds: canvasState.selectedObjectIds || [],
        viewport: canvasState.viewport || { x: 0, y: 0, zoom: 1 }
      }

      console.log('🤖 Sending message to agent:', userMessage)
      console.log('Canvas state:', currentCanvasState)

      // Try real AI first, fallback to mock if needed
      let response
      try {
        response = await requestAgentResponse(userMessage, currentCanvasState)
      } catch (aiError) {
        console.warn('AI service unavailable, using mock response:', aiError.message)
        response = await getMockAgentResponse(userMessage, currentCanvasState)
      }

      const responseTime = Date.now() - startTime

      if (response.success) {
        const { commands, explanation, metadata } = response.data

        // Add agent response to chat
        const agentMessage = addMessage('agent', explanation || 'I\'ve processed your request.', {
          commands,
          metadata,
          commandsExecuted: commands?.length || 0
        })

        // Execute commands using the execution layer
        console.log('📋 Executing commands:', commands)
        
        const executionResult = await executeAgentResponse(response.data, canvasId, {
          stopOnError: false // Continue executing other commands even if some fail
        })

        // Record metrics
        recordRequest({
          success: executionResult.success,
          responseTimeMs: responseTime,
          executionTimeMs: executionResult.executionTimeMs,
          commandsTotal: executionResult.commandsTotal,
          commandsExecuted: executionResult.commandsExecuted,
          errors: executionResult.errors,
          explanation: explanation
        })

        // Update the agent message with execution results
        if (executionResult.success) {
          console.log(`✅ Successfully executed ${executionResult.commandsExecuted}/${executionResult.commandsTotal} commands`)
          
          // Create an undo checkpoint for this AI action
          createAgentCheckpoint(executionResult, explanation || 'AI Agent Action')
          
          // Update the message with success info
          updateLastMessage({
            commandsExecuted: executionResult.commandsExecuted,
            executionTimeMs: executionResult.executionTimeMs,
            createdObjects: executionResult.createdObjects.length,
            modifiedObjects: executionResult.modifiedObjects.length
          })
        } else {
          console.error('❌ Command execution failed:', executionResult.errors)
          
          // Update the message with error info
          updateLastMessage({
            error: `Execution failed: ${executionResult.errors.join(', ')}`,
            commandsExecuted: executionResult.commandsExecuted,
            commandsTotal: executionResult.commandsTotal
          })
        }

        // Show warnings if any
        if (executionResult.warnings.length > 0) {
          console.warn('⚠️ Execution warnings:', executionResult.warnings)
        }

      } else {
        // Handle AI response error
        const errorMessage = response.error || 'Failed to get AI response'
        
        // Record failed request
        recordRequest({
          success: false,
          responseTimeMs: responseTime,
          executionTimeMs: 0,
          commandsTotal: 0,
          commandsExecuted: 0,
          errors: [errorMessage],
          explanation: userMessage
        })
        
        addMessage('agent', 'Sorry, I encountered an error processing your request.', {
          error: errorMessage
        })
        setError(errorMessage)
      }

    } catch (error) {
      console.error('❌ Chat error:', error)
      const errorMessage = error.message || 'An unexpected error occurred'
      
      // Record failed request
      recordRequest({
        success: false,
        responseTimeMs: Date.now() - startTime,
        executionTimeMs: 0,
        commandsTotal: 0,
        commandsExecuted: 0,
        errors: [errorMessage],
        explanation: userMessage
      })
      
      addMessage('agent', 'Sorry, I encountered an error processing your request.', {
        error: errorMessage
      })
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [canvasId, canvasState, addMessage])

  // Retry the last message
  const retryLastMessage = useCallback(async () => {
    if (!lastMessageRef.current || lastMessageRef.current.type !== 'user') {
      return
    }

    // Remove any error messages after the last user message
    setMessages(prev => {
      const lastUserIndex = prev.findLastIndex(msg => msg.type === 'user')
      if (lastUserIndex >= 0) {
        return prev.slice(0, lastUserIndex + 1)
      }
      return prev
    })

    // Resend the last user message
    await sendMessage(lastMessageRef.current.content)
  }, [sendMessage])

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
    lastMessageRef.current = null
    messageIdCounter.current = 1
  }, [])

  // Clear error when canvas changes
  useEffect(() => {
    setError(null)
  }, [canvasId])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    retryLastMessage,
    addMessage
  }
}

export default useAgentChat
