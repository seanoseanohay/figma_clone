import { getAgentToken } from './apiToken.service.js'

/**
 * Agent Service
 * 
 * Handles communication with AI agent endpoints
 * Features:
 * - Real AI agent requests via OpenAI
 * - Mock agent responses for development/testing
 * - Request validation and error handling
 * - Automatic fallback to mock when needed
 */

const AGENT_API_BASE = import.meta.env.VITE_FUNCTIONS_URL || 'http://localhost:5001/collabcanvas-c91ec/us-central1/api'
const MOCK_MODE = import.meta.env.VITE_AGENT_MOCK_MODE === 'true' || true // Temporarily force mock mode

/**
 * Request AI agent response from OpenAI
 * @param {string} prompt - User prompt/command
 * @param {Object} canvasState - Current canvas state
 * @param {Object} options - Optional parameters
 * @returns {Promise<Object>} Agent response with commands
 */
export const requestAgentResponse = async (prompt, canvasState, options = {}) => {
  try {
    const token = await getAgentToken(canvasState.canvasId)
    if (!token) {
      throw new Error('No API token available')
    }

    // Force mock mode if enabled
    if (MOCK_MODE) {
      console.log('🤖 Mock mode enabled, using mock response')
      return await getMockAgentResponse(prompt, canvasState, options)
    }

    const requestBody = {
      prompt,
      canvasId: canvasState.canvasId,
      options: {
        selectedObjectIds: canvasState.selectedObjectIds || [],
        viewport: canvasState.viewport || { x: 0, y: 0, zoom: 1 },
        ...options
      }
    }

    console.log('🤖 Requesting AI response:', { prompt, canvasId: canvasState.canvasId })

    const response = await fetch(`${AGENT_API_BASE}/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Agent request failed: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      success: true,
      data: {
        commands: data.commands || [],
        explanation: data.explanation || 'AI processed your request.',
        metadata: data.metadata || {}
      }
    }

  } catch (error) {
    console.error('❌ Agent request failed:', error)
    
    return {
      success: false,
      error: error.message || 'Failed to get AI response',
      data: null
    }
  }
}

/**
 * Get mock AI agent response for testing/development
 * @param {string} prompt - User prompt/command
 * @param {Object} canvasState - Current canvas state
 * @param {Object} options - Optional parameters
 * @returns {Promise<Object>} Mock agent response with commands
 */
export const getMockAgentResponse = async (prompt, canvasState, options = {}) => {
  try {
    console.log('🤖 Using local mock AI response for:', { prompt, canvasId: canvasState.canvasId })
    
    // Skip API call and go directly to local mock for now
    return generateLocalMockResponse(prompt, canvasState)

  } catch (error) {
    console.error('❌ Mock agent request failed:', error)
    
    // Fallback to local mock generation
    return generateLocalMockResponse(prompt, canvasState)
  }
}

/**
 * Generate local mock response when API is unavailable
 * @param {string} prompt - User prompt/command
 * @param {Object} canvasState - Current canvas state
 * @returns {Promise<Object>} Local mock response
 */
const generateLocalMockResponse = async (prompt, canvasState) => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 300))

  const commands = []
  const lowerPrompt = prompt.toLowerCase()

  // Basic command detection with better parsing
  if (lowerPrompt.includes('rectangle') || lowerPrompt.includes('square')) {
    // Extract dimensions from prompt
    const widthMatch = prompt.match(/(\d+).*?(?:pixels?|px).*?(?:by|x|\*).*?(\d+).*?(?:pixels?|px)/i) ||
                      prompt.match(/(\d+).*?by.*?(\d+)/i);
    const width = widthMatch ? parseInt(widthMatch[1]) : 150;
    const height = widthMatch ? parseInt(widthMatch[2]) : 100;
    
    // Extract color from prompt
    let fill = '#3b82f6'; // default blue
    if (lowerPrompt.includes('red')) fill = '#ef4444';
    if (lowerPrompt.includes('blue')) fill = '#3b82f6';
    if (lowerPrompt.includes('green')) fill = '#10b981';
    if (lowerPrompt.includes('yellow')) fill = '#f59e0b';
    if (lowerPrompt.includes('purple')) fill = '#8b5cf6';
    if (lowerPrompt.includes('orange')) fill = '#f97316';
    if (lowerPrompt.includes('pink')) fill = '#ec4899';
    
    // Extract position (check for "center", "middle")
    let position;
    if (lowerPrompt.includes('center') || lowerPrompt.includes('middle')) {
      position = { x: 2500 - width/2, y: 2500 - height/2 }; // Canvas center (5000x5000 canvas)
    } else {
      position = { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 };
    }
    
    commands.push({
      type: 'createRectangle',
      position,
      size: { width: Math.min(width, 1000), height: Math.min(height, 1000) }, // Cap at reasonable size
      fill: fill
    })
  }

  if (lowerPrompt.includes('circle')) {
    // Extract color from prompt
    let fill = '#ef4444'; // default red
    if (lowerPrompt.includes('blue')) fill = '#3b82f6';
    if (lowerPrompt.includes('red')) fill = '#ef4444';
    if (lowerPrompt.includes('green')) fill = '#22c55e';
    if (lowerPrompt.includes('yellow')) fill = '#f59e0b';
    if (lowerPrompt.includes('purple')) fill = '#8b5cf6';
    if (lowerPrompt.includes('orange')) fill = '#f97316';
    if (lowerPrompt.includes('pink')) fill = '#ec4899';
    
    // Extract size (parse "500 pixel", "500px", "500 wide", etc.)
    const sizeMatch = prompt.match(/(\d+)\s*(?:pixel|px|wide)/i);
    const diameter = sizeMatch ? Math.min(parseInt(sizeMatch[1]), 1000) : 120;
    const radius = diameter / 2;
    
    // Extract position (check for "center", "middle")
    let position;
    if (lowerPrompt.includes('center') || lowerPrompt.includes('middle')) {
      position = { x: 2500, y: 2500 }; // Canvas center (5000x5000 canvas)
    } else {
      position = { x: 200 + Math.random() * 200, y: 150 + Math.random() * 200 };
    }
    
    commands.push({
      type: 'createCircle',
      position,
      radius,
      fill
    });
  }

  if (lowerPrompt.includes('star')) {
    commands.push({
      type: 'createStar',
      position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
      radius: 80,
      numPoints: 5,
      fill: '#f59e0b'
    })
  }

  // Move commands
  if ((lowerPrompt.includes('move') || lowerPrompt.includes('drag')) && canvasState.selectedObjectIds?.length > 0) {
    let deltaX = 50, deltaY = 50
    
    if (lowerPrompt.includes('left')) deltaX = -50
    if (lowerPrompt.includes('right')) deltaX = 50
    if (lowerPrompt.includes('up')) deltaY = -50
    if (lowerPrompt.includes('down')) deltaY = 50

    canvasState.selectedObjectIds.forEach(objectId => {
      commands.push({
        type: 'moveObject',
        objectId,
        position: { deltaX, deltaY }
      })
    })
  }

  // Default fallback
  if (commands.length === 0) {
    commands.push({
      type: 'createRectangle',
      position: { x: 200, y: 200 },
      size: { width: 100, height: 100 },
      fill: '#10b981'
    })
  }

  return {
    success: true,
    data: {
      commands,
      explanation: `Local mock AI response: "${prompt}". This is a local fallback response when API is unavailable.`,
      metadata: {
        model: 'local-mock',
        timestamp: Date.now(),
        processingTimeMs: 300,
        isMock: true,
        isLocalFallback: true
      }
    }
  }
}

/**
 * Check agent service health
 * @returns {Promise<Object>} Health status
 */
export const checkAgentHealth = async () => {
  try {
    // For health check, we can use a mock canvas ID or skip token requirement
    const token = 'health-check-token'

    const response = await fetch(`${AGENT_API_BASE}/agent/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`)
    }

    return await response.json()

  } catch (error) {
    console.error('❌ Agent health check failed:', error)
    
    return {
      status: 'unhealthy',
      enabled: false,
      configured: false,
      error: error.message,
      timestamp: Date.now()
    }
  }
}

export default {
  requestAgentResponse,
  getMockAgentResponse,
  checkAgentHealth
}