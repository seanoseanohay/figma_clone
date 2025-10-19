import React, { useState, useRef, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Paper, 
  Alert, 
  Chip,
  Divider,
  CircularProgress 
} from '@mui/material'
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

  // Handle example command clicks
  const handleExampleClick = async (command) => {
    if (isLoading) return
    await sendMessage(command)
  }

  if (!isVisible) return null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'white' }}>
      {/* Welcome Message - Shown only when embedded in sidebar */}
      {isVisible && (
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'grey.300', 
          bgcolor: 'primary.light', 
          flexShrink: 0 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Sparkles style={{ width: 20, height: 20, color: '#1976d2' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 500, color: 'primary.dark' }}>
              Ready to help!
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'primary.dark' }}>
            Create and modify canvas objects with natural language commands.
          </Typography>
        </Box>
      )}

      {/* Messages Area - Constrained to leave space for input */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, minHeight: 0 }}>
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: 64, 
              height: 64, 
              bgcolor: 'primary.light', 
              borderRadius: '50%', 
              mx: 'auto', 
              mb: 2 
            }}>
              <Sparkles style={{ width: 32, height: 32, color: '#1976d2' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary', mb: 1 }}>
              Welcome to AI Canvas Agent!
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Try these commands:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button 
                onClick={() => handleExampleClick("Create a red rectangle in the center")}
                disabled={isLoading}
                sx={{ 
                  bgcolor: 'grey.50', 
                  p: 1.5, 
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  border: '1px solid transparent',
                  borderRadius: 2,
                  '&:hover': { 
                    bgcolor: 'primary.light', 
                    borderColor: 'primary.main',
                    color: 'primary.dark'
                  },
                  '&:disabled': {
                    bgcolor: 'grey.100'
                  }
                }}
                variant="text"
                fullWidth
              >
                <Typography variant="body2" sx={{ color: 'inherit', textTransform: 'none' }}>
                  "Create a red rectangle in the center"
                </Typography>
              </Button>
              <Button 
                onClick={() => handleExampleClick("Add three blue circles in a row")}
                disabled={isLoading}
                sx={{ 
                  bgcolor: 'grey.50', 
                  p: 1.5, 
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  border: '1px solid transparent',
                  borderRadius: 2,
                  '&:hover': { 
                    bgcolor: 'primary.light', 
                    borderColor: 'primary.main',
                    color: 'primary.dark'
                  },
                  '&:disabled': {
                    bgcolor: 'grey.100'
                  }
                }}
                variant="text"
                fullWidth
              >
                <Typography variant="body2" sx={{ color: 'inherit', textTransform: 'none' }}>
                  "Add three blue circles in a row"
                </Typography>
              </Button>
              <Button 
                onClick={() => handleExampleClick("Create a login form with user and password fields and a submit button")}
                disabled={isLoading}
                sx={{ 
                  bgcolor: 'grey.50', 
                  p: 1.5, 
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  border: '1px solid transparent',
                  borderRadius: 2,
                  '&:hover': { 
                    bgcolor: 'primary.light', 
                    borderColor: 'primary.main',
                    color: 'primary.dark'
                  },
                  '&:disabled': {
                    bgcolor: 'grey.100'
                  }
                }}
                variant="text"
                fullWidth
              >
                <Typography variant="body2" sx={{ color: 'inherit', textTransform: 'none' }}>
                  "Create a login form with user and password fields and a submit button"
                </Typography>
              </Button>
              <Button 
                onClick={() => handleExampleClick("Create 5x5 grid of gold stars")}
                disabled={isLoading}
                sx={{ 
                  bgcolor: 'grey.50', 
                  p: 1.5, 
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  border: '1px solid transparent',
                  borderRadius: 2,
                  '&:hover': { 
                    bgcolor: 'primary.light', 
                    borderColor: 'primary.main',
                    color: 'primary.dark'
                  },
                  '&:disabled': {
                    bgcolor: 'grey.100'
                  }
                }}
                variant="text"
                fullWidth
              >
                <Typography variant="body2" sx={{ color: 'inherit', textTransform: 'none' }}>
                  "Create 5x5 grid of gold stars"
                </Typography>
              </Button>
              <Button 
                onClick={() => handleExampleClick("Draw a T-Rex")}
                disabled={isLoading}
                sx={{ 
                  bgcolor: 'grey.50', 
                  p: 1.5, 
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  border: '1px solid transparent',
                  borderRadius: 2,
                  '&:hover': { 
                    bgcolor: 'primary.light', 
                    borderColor: 'primary.main',
                    color: 'primary.dark'
                  },
                  '&:disabled': {
                    bgcolor: 'grey.100'
                  }
                }}
                variant="text"
                fullWidth
              >
                <Typography variant="body2" sx={{ color: 'inherit', textTransform: 'none' }}>
                  "Draw a T-Rex"
                </Typography>
              </Button>
              <Button 
                onClick={() => handleExampleClick("Move the selected object to the right")}
                disabled={isLoading}
                sx={{ 
                  bgcolor: 'grey.50', 
                  p: 1.5, 
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  border: '1px solid transparent',
                  borderRadius: 2,
                  '&:hover': { 
                    bgcolor: 'primary.light', 
                    borderColor: 'primary.main',
                    color: 'primary.dark'
                  },
                  '&:disabled': {
                    bgcolor: 'grey.100'
                  }
                }}
                variant="text"
                fullWidth
              >
                <Typography variant="body2" sx={{ color: 'inherit', textTransform: 'none' }}>
                  "Move the selected object to the right"
                </Typography>
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {messages.map((message) => (
              <Box
                key={message.id}
                sx={{ 
                  display: 'flex', 
                  gap: 1.5,
                  justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                {message.type === 'agent' && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    width: 32, 
                    height: 32, 
                    bgcolor: 'primary.light', 
                    borderRadius: '50%', 
                    flexShrink: 0 
                  }}>
                    <Bot style={{ width: 16, height: 16, color: '#1976d2' }} />
                  </Box>
                )}
                
                <Paper
                  sx={{
                    maxWidth: { xs: '75%', lg: '60%' },
                    px: 2,
                    py: 1.5,
                    bgcolor: message.type === 'user' ? 'primary.main' : 'grey.100',
                    color: message.type === 'user' ? 'primary.contrastText' : 'text.primary'
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block',
                      mt: 0.5,
                      color: message.type === 'user' ? 'primary.light' : 'text.secondary'
                    }}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Typography>
                  
                  {/* Show command execution results */}
                  {message.type === 'agent' && message.commandsExecuted !== undefined && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block',
                        mt: 1,
                        color: 'text.secondary'
                      }}
                    >
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
                    </Typography>
                  )}
                  
                  {/* Show errors */}
                  {message.error && (
                    <Alert severity="error" sx={{ mt: 1, fontSize: '0.75rem' }}>
                      {message.error}
                    </Alert>
                  )}
                </Paper>
                
                {message.type === 'user' && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    width: 32, 
                    height: 32, 
                    bgcolor: 'grey.300', 
                    borderRadius: '50%', 
                    flexShrink: 0 
                  }}>
                    <User style={{ width: 16, height: 16, color: '#666' }} />
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-start' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: 32, 
              height: 32, 
              bgcolor: 'primary.light', 
              borderRadius: '50%', 
              flexShrink: 0 
            }}>
              <Bot style={{ width: 16, height: 16, color: '#1976d2' }} />
            </Box>
            <Paper sx={{ bgcolor: 'grey.100', px: 2, py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  AI is thinking...
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}

        {/* Error state with retry */}
        {error && (
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-start' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: 32, 
              height: 32, 
              bgcolor: 'error.light', 
              borderRadius: '50%', 
              flexShrink: 0 
            }}>
              <AlertCircle style={{ width: 16, height: 16, color: '#d32f2f' }} />
            </Box>
            <Alert 
              severity="error" 
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={handleRetry}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          </Box>
        )}

        <Box ref={messagesEndRef} />
      </Box>

      {/* Input Area - Fixed at bottom with clean styling */}
      <Box 
        component="form" 
        onSubmit={handleSubmit} 
        sx={{ 
          flexShrink: 0, 
          borderTop: 1, 
          borderColor: 'grey.300', 
          p: 2, 
          bgcolor: 'white' 
        }}
      >
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Box sx={{ flex: 1, position: 'relative' }}>
            <TextField
              inputRef={inputRef}
              multiline
              minRows={3}
              maxRows={6}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your AI command here... (e.g., 'Create a red rectangle')"
              disabled={isLoading}
              fullWidth
              variant="outlined"
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.875rem'
                }
              }}
            />
            
            {/* Character count / helper text */}
            {inputMessage.length > 0 && (
              <Typography 
                variant="caption" 
                sx={{ 
                  position: 'absolute', 
                  bottom: 8, 
                  right: 8, 
                  color: 'text.secondary',
                  bgcolor: 'white',
                  px: 0.5
                }}
              >
                {inputMessage.length} chars
              </Typography>
            )}
          </Box>
          
          <Button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            variant="contained"
            sx={{ 
              minHeight: 48, 
              minWidth: 48, 
              alignSelf: 'flex-end' 
            }}
            title={isLoading ? 'Processing...' : 'Send message'}
          >
            {isLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <Send style={{ width: 20, height: 20 }} />
            )}
          </Button>
        </Box>

        {/* Quick Actions */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          mt: 1.5, 
          pt: 1, 
          borderTop: 1, 
          borderColor: 'grey.100' 
        }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Press Enter to send, Shift+Enter for new line
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {messages.length > 0 && (
              <Chip 
                label={`${messages.length} message${messages.length !== 1 ? 's' : ''}`}
                size="small"
                variant="outlined"
              />
            )}
            <Button
              type="button"
              onClick={clearMessages}
              size="small"
              variant="outlined"
              sx={{ minWidth: 'auto' }}
              disabled={isLoading || messages.length === 0}
            >
              Clear chat
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default AgentChatPanel