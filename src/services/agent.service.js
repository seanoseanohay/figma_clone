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

  // === QUANTITY DETECTION ===
  const numberWords = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  }
  let count = 1
  
  // Check for numeric quantities first
  const numMatch = prompt.match(/\b(\d+)\b/)
  if (numMatch) {
    count = parseInt(numMatch[1], 10)
  } else {
    // Check for word quantities
    const wordMatch = prompt.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i)
    if (wordMatch) {
      count = numberWords[wordMatch[1].toLowerCase()]
    }
  }
  
  // Base layout logic for multiple objects
  const canvasWidth = 1000
  const spacing = canvasWidth / (count + 1)
  const isEvenlySpaced = /evenly|row|across|grid/i.test(prompt)
  
  // Determine vertical positioning
  let baseY = 300 // Default center-ish
  if (/top/i.test(prompt)) baseY = 100
  else if (/bottom/i.test(prompt)) baseY = 800
  else if (/center|middle/i.test(prompt)) baseY = 500

  // === CREATION COMMANDS ===
  
  // Text creation
  if (lowerPrompt.includes('text') || lowerPrompt.includes('add text') || lowerPrompt.includes('create text')) {
    const textMatch = prompt.match(/['"](.*?)['"]/) || prompt.match(/says?\s+([^.!?]+)/i)
    const text = textMatch ? textMatch[1] : 'Hello World'
    
    let position
    if (lowerPrompt.includes('center') || lowerPrompt.includes('middle')) {
      position = { x: 2400, y: 2500 } // Canvas center adjusted for text
    } else {
      position = { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 }
    }
    
    commands.push({
      type: 'createText',
      position,
      text,
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#000000'
    })
  }

  // Rectangle creation
  if (lowerPrompt.includes('rectangle') || lowerPrompt.includes('square') || lowerPrompt.includes('box')) {
    const widthMatch = prompt.match(/(\d+).*?(?:pixels?|px).*?(?:by|x|\*).*?(\d+).*?(?:pixels?|px)/i) ||
                      prompt.match(/(\d+).*?by.*?(\d+)/i)
    const width = widthMatch ? parseInt(widthMatch[1]) : 150
    const height = widthMatch ? parseInt(widthMatch[2]) : (lowerPrompt.includes('square') ? width : 100)
    
    let fill = extractColor(prompt, '#3b82f6')
    
    for (let i = 0; i < count; i++) {
      let position
      if (isEvenlySpaced) {
        position = { x: spacing * (i + 1), y: baseY }
      } else {
        // When position keywords are used (top, bottom, center), align on that Y even without "evenly"
        const hasPositionKeyword = /top|bottom|center|middle/i.test(prompt)
        position = extractPosition(prompt) || { 
          x: 100 + i * 120, 
          y: hasPositionKeyword ? baseY : baseY + Math.random() * 50 
        }
      }
      
      commands.push({
        type: 'createRectangle',
        position,
        size: { width: Math.min(width, 1000), height: Math.min(height, 1000) },
        fill,
        strokeWidth: 0
      })
    }
  }

  // Circle creation
  if (lowerPrompt.includes('circle') || lowerPrompt.includes('oval')) {
    let fill = extractColor(prompt, '#ef4444')
    const sizeMatch = prompt.match(/(\d+)\s*(?:pixel|px|wide|radius)/i)
    const radius = sizeMatch ? Math.min(parseInt(sizeMatch[1]), 500) : 60
    
    for (let i = 0; i < count; i++) {
      let position
      if (isEvenlySpaced) {
        position = { x: spacing * (i + 1), y: baseY }
      } else {
        // When position keywords are used (top, bottom, center), align on that Y even without "evenly"
        const hasPositionKeyword = /top|bottom|center|middle/i.test(prompt)
        position = extractPosition(prompt) || { 
          x: 200 + i * 100, 
          y: hasPositionKeyword ? baseY : baseY + Math.random() * 50 
        }
      }
      
      commands.push({
        type: 'createCircle',
        position,
        radius,
        fill,
        strokeWidth: 0
      })
    }
  }

  // Star creation
  if (lowerPrompt.includes('star')) {
    let fill = extractColor(prompt, '#f59e0b')
    
    for (let i = 0; i < count; i++) {
      let position
      if (isEvenlySpaced) {
        position = { x: spacing * (i + 1), y: baseY }
      } else {
        // When position keywords are used (top, bottom, center), align on that Y even without "evenly"
        const hasPositionKeyword = /top|bottom|center|middle/i.test(prompt)
        position = extractPosition(prompt) || { 
          x: 300 + i * 120, 
          y: hasPositionKeyword ? baseY : baseY + Math.random() * 50 
        }
      }
      
      commands.push({
        type: 'createStar',
        position,
        numPoints: 5,
        innerRadius: 30,
        outerRadius: 80,
        fill,
        strokeWidth: 0
      })
    }
  }

  // === MANIPULATION COMMANDS ===
  
  // Move commands - check for both generic and specific
  if (lowerPrompt.includes('move') && canvasState.selectedObjectIds?.length > 0) {
    let newPosition
    
    if (lowerPrompt.includes('center')) {
      newPosition = { x: 2500, y: 2500 }
    } else {
      // Calculate delta movement
      let deltaX = 50, deltaY = 50
      if (lowerPrompt.includes('left')) deltaX = -100
      if (lowerPrompt.includes('right')) deltaX = 100
      if (lowerPrompt.includes('up')) deltaY = -100
      if (lowerPrompt.includes('down')) deltaY = 100
      
      // For now, use delta - could be enhanced to calculate absolute positions
      newPosition = { deltaX, deltaY }
    }

    canvasState.selectedObjectIds.forEach(objectId => {
      commands.push({
        type: 'moveShape',
        targetId: objectId,
        newPosition
      })
    })
  }

  // Resize commands
  if (lowerPrompt.includes('resize') && canvasState.selectedObjectIds?.length > 0) {
    let scale = 1.5
    if (lowerPrompt.includes('twice') || lowerPrompt.includes('2x')) scale = 2.0
    if (lowerPrompt.includes('smaller') || lowerPrompt.includes('shrink')) scale = 0.5
    if (lowerPrompt.includes('bigger') || lowerPrompt.includes('larger')) scale = 1.5
    
    canvasState.selectedObjectIds.forEach(objectId => {
      commands.push({
        type: 'resizeShape',
        targetId: objectId,
        scale
      })
    })
  }

  // Rotation commands
  if (lowerPrompt.includes('rotate') && canvasState.selectedObjectIds?.length > 0) {
    const angleMatch = prompt.match(/(\d+)\s*degrees?/i)
    const angle = angleMatch ? parseInt(angleMatch[1]) : 45
    
    canvasState.selectedObjectIds.forEach(objectId => {
      commands.push({
        type: 'rotateShape',
        targetId: objectId,
        angle
      })
    })
  }

  // === LAYOUT COMMANDS ===
  
  // Arrange in layouts - only if we have selected objects to arrange
  // Don't arrange when creating new objects (they get positioned during creation)
  const hasSelectedObjects = canvasState.selectedObjectIds && canvasState.selectedObjectIds.length > 0
  const isExplicitArrange = lowerPrompt.includes('arrange') || lowerPrompt.includes('layout')
  const isGridCommand = lowerPrompt.includes('grid') && !lowerPrompt.includes('create')
  
  if (hasSelectedObjects && (isExplicitArrange || isGridCommand)) {
    let layoutType = 'row'
    let columns = 3, rows = 1
    
    if (lowerPrompt.includes('grid')) {
      layoutType = 'grid'
      const gridMatch = prompt.match(/(\d+)\s*x\s*(\d+)/i)
      if (gridMatch) {
        columns = parseInt(gridMatch[1])
        rows = parseInt(gridMatch[2])
      } else {
        rows = 3
      }
    }
    
    commands.push({
      type: 'arrangeLayout',
      layoutType,
      columns,
      rows,
      spacing: 50,
      targetIds: canvasState.selectedObjectIds
    })
  }

  // === COMPLEX COMMANDS ===
  
  // Login form
  if (lowerPrompt.includes('login') && lowerPrompt.includes('form')) {
    commands.push({
      type: 'createForm',
      formType: 'login',
      position: extractPosition(prompt) || { x: 400, y: 300 },
      fields: ['username', 'password'],
      width: 300
    })
  }

  // Navigation bar
  if (lowerPrompt.includes('nav') || (lowerPrompt.includes('navigation') && lowerPrompt.includes('bar'))) {
    const itemMatch = prompt.match(/(\d+)\s*(?:items?|menu)/i)
    const itemCount = itemMatch ? parseInt(itemMatch[1]) : 4
    
    commands.push({
      type: 'createNavBar',
      position: extractPosition(prompt) || { x: 100, y: 50 },
      items: Array.from({length: itemCount}, (_, i) => `Item ${i + 1}`),
      width: 800
    })
  }

  // Card layout
  if (lowerPrompt.includes('card') && lowerPrompt.includes('layout')) {
    const cardMatch = prompt.match(/(\d+)\s*cards?/i)
    const cardCount = cardMatch ? parseInt(cardMatch[1]) : 3
    
    commands.push({
      type: 'createLayout',
      layoutType: 'card',
      position: extractPosition(prompt) || { x: 200, y: 200 },
      cardCount,
      elements: ['title', 'image', 'description']
    })
  }

  // Default fallback - create a simple shape
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
      explanation: `AI Agent Response: "${prompt}". Generated ${commands.length} command(s) for execution.`,
      metadata: {
        model: 'local-mock',
        timestamp: Date.now(),
        processingTimeMs: 300,
        isMock: true,
        commandCategories: categorizeCommands(commands)
      }
    }
  }
}

/**
 * Helper function to extract color from prompt
 */
const extractColor = (prompt, defaultColor) => {
  const lowerPrompt = prompt.toLowerCase()
  if (lowerPrompt.includes('red')) return '#ef4444'
  if (lowerPrompt.includes('blue')) return '#3b82f6'
  if (lowerPrompt.includes('green')) return '#10b981'
  if (lowerPrompt.includes('yellow')) return '#f59e0b'
  if (lowerPrompt.includes('purple')) return '#8b5cf6'
  if (lowerPrompt.includes('orange')) return '#f97316'
  if (lowerPrompt.includes('pink')) return '#ec4899'
  if (lowerPrompt.includes('black')) return '#000000'
  if (lowerPrompt.includes('white')) return '#ffffff'
  if (lowerPrompt.includes('gray') || lowerPrompt.includes('grey')) return '#6b7280'
  return defaultColor
}

/**
 * Helper function to extract position from prompt
 */
const extractPosition = (prompt) => {
  const lowerPrompt = prompt.toLowerCase()
  
  // Check for center/middle
  if (lowerPrompt.includes('center') || lowerPrompt.includes('middle')) {
    return { x: 2500, y: 2500 } // Canvas center
  }
  
  // Check for coordinate patterns like "at 100, 200" or "position 100 200"
  const coordMatch = prompt.match(/(?:at|position)\s*(\d+)[,\s]+(\d+)/i)
  if (coordMatch) {
    return { 
      x: Math.min(parseInt(coordMatch[1]), 5000), 
      y: Math.min(parseInt(coordMatch[2]), 5000) 
    }
  }
  
  return null // Let caller handle default
}

/**
 * Helper function to categorize commands for metadata
 */
const categorizeCommands = (commands) => {
  const categories = { creation: 0, manipulation: 0, layout: 0, complex: 0 }
  
  commands.forEach(cmd => {
    if (['createRectangle', 'createCircle', 'createStar', 'createText'].includes(cmd.type)) {
      categories.creation++
    } else if (['moveShape', 'resizeShape', 'rotateShape'].includes(cmd.type)) {
      categories.manipulation++
    } else if (['arrangeLayout'].includes(cmd.type)) {
      categories.layout++
    } else if (['createForm', 'createNavBar', 'createLayout'].includes(cmd.type)) {
      categories.complex++
    }
  })
  
  return categories
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

// Export specific functions for testing
export { generateLocalMockResponse, extractColor, extractPosition, categorizeCommands }