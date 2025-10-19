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

    // Requesting AI response for canvas: ${canvasState.canvasId}

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
    // Using local mock AI response for canvas: ${canvasState.canvasId}
    
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
  
  /**
   * Extract position coordinates from prompt
   * @param {string} prompt - The user prompt
   * @returns {Object|null} - Position object {x, y} or null if no coordinates found
   */
  function extractPosition(prompt) {
    // Check for center/middle first
    const lowerPrompt = prompt.toLowerCase()
    if (lowerPrompt.includes('center') || lowerPrompt.includes('middle')) {
      return { x: 2500, y: 2500 } // Canvas center
    }
    
    // Match patterns like "at 100,200" or "of position 100-200"
    const match = prompt.match(/(?:at|position)\s*(\d+)[,\-\s]+(\d+)/i)
    if (!match) return null // default will be handled by caller
    return { x: parseInt(match[1]), y: parseInt(match[2]) }
  }
  
  /**
   * Extract count from prompt, only considering explicit creation commands
   * @param {string} prompt - The user prompt
   * @returns {number} - Count of objects to create
   */
  function extractCount(prompt) {
    // consider 'create N', 'add N', 'arrange N', or 'make N'
    const match = prompt.match(/\b(?:create|add|arrange|make)\s+(\d+)\b/i)
    return match ? parseInt(match[1]) : 1
  }
  
  /**
   * Extract layout type from prompt
   * @param {string} prompt - The user prompt
   * @returns {string|null} - Layout type: 'grid', 'row', 'column', 'even', or null
   */
  function extractLayoutType(prompt) {
    if (/grid/i.test(prompt)) return "grid";
    if (/row|horizontal/i.test(prompt)) return "row";
    if (/column|vertical/i.test(prompt)) return "column";
    if (/evenly spaced/i.test(prompt)) return "even";
    return null;
  }
  
  /**
   * Extract grid dimensions from prompt
   * @param {string} prompt - The user prompt
   * @returns {Object|null} - Grid dimensions {rows, cols} or null
   */
  function extractGridDimensions(prompt) {
    // Match patterns like "3x3 grid" or "4 by 5 grid"
    const match = prompt.match(/(\d+)\s*(?:x|by)\s*(\d+)/i);
    if (!match) return null;
    return { rows: parseInt(match[1]), cols: parseInt(match[2]) };
  }
  
  /**
   * Extract numeric context from prompt, distinguishing between counts vs measurements (DEPRECATED)
   * @param {string} prompt - The user prompt
   * @returns {number|null} - Count if it's a quantity, null if it's a measurement
   */
  function extractNumericContext(prompt) {
    // Deprecated - use extractCount() instead
    return extractCount(prompt)
  }
  
  const numberWords = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  }
  
  const count = extractCount(prompt)
  const layout = extractLayoutType(prompt)
  const grid = extractGridDimensions(prompt)
  
  // Check for word quantities if no numeric count was found from extractCount
  let finalCount = count
  if (count === 1) {
    const wordMatch = prompt.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i)
    if (wordMatch && !/\b(move|rotate|resize|scale|shift)\b/i.test(prompt)) {
      finalCount = numberWords[wordMatch[1].toLowerCase()]
    }
  }
  
  // For grid layouts, calculate count from dimensions if not explicitly specified
  if (layout === "grid" && grid && count === 1) {
    finalCount = grid.rows * grid.cols
  }
  
  // Base layout logic for multiple objects
  const canvasWidth = 1000
  const spacing = 100 // Default gap between shapes
  const isEvenlySpaced = /evenly|row|across|grid/i.test(prompt)
  
  // Determine vertical positioning
  let baseY = 300 // Default center-ish
  if (/top/i.test(prompt)) baseY = 100
  else if (/bottom/i.test(prompt)) baseY = 800
  else if (/center|middle/i.test(prompt)) baseY = 500

  // Check if this is a manipulation command (not creation)
  const isManipulationCommand = lowerPrompt.includes('move') || lowerPrompt.includes('rotate') || 
                              lowerPrompt.includes('resize') || lowerPrompt.includes('scale') || 
                              lowerPrompt.includes('delete') || lowerPrompt.includes('remove') ||
                              lowerPrompt.includes('make bigger') || lowerPrompt.includes('make smaller') ||
                              lowerPrompt.includes('twice the size') || lowerPrompt.includes('half the size') ||
                              (lowerPrompt.includes('make') && (lowerPrompt.includes('bigger') || lowerPrompt.includes('smaller') || lowerPrompt.includes('larger')))

  // === CREATION COMMANDS ===
  // Skip creation if this is a manipulation command
  if (!isManipulationCommand) {
    
    // Text creation
    if (lowerPrompt.includes('text') || lowerPrompt.includes('add text') || lowerPrompt.includes('create text') || 
        lowerPrompt.includes('text layer') || lowerPrompt.includes('add a text')) {
    const textMatch = prompt.match(/['"](.*?)['"]/) || prompt.match(/says?[,\s]+(.+?)(?:[.!?]|$)/i)
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
    
    if (layout === "grid" && grid) {
      // Grid layout for rectangles
      for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
          const x = 100 + c * spacing
          const y = 100 + r * spacing
          commands.push({
            type: 'createRectangle',
            position: { x, y },
            size: { width: Math.min(width, 1000), height: Math.min(height, 1000) },
            fill,
            strokeWidth: 0
          })
        }
      }
    } else if (layout === "row" || layout === "even") {
      // Row/horizontal layout
      for (let i = 0; i < finalCount; i++) {
        const x = 100 + i * spacing
        const y = extractPosition(prompt)?.y || baseY
        commands.push({
          type: 'createRectangle',
          position: { x, y },
          size: { width: Math.min(width, 1000), height: Math.min(height, 1000) },
          fill,
          strokeWidth: 0
        })
      }
    } else if (layout === "column") {
      // Column/vertical layout
      for (let i = 0; i < finalCount; i++) {
        const x = extractPosition(prompt)?.x || 100
        const y = 100 + i * spacing
        commands.push({
          type: 'createRectangle',
          position: { x, y },
          size: { width: Math.min(width, 1000), height: Math.min(height, 1000) },
          fill,
          strokeWidth: 0
        })
      }
    } else {
      // Default/single shape layout
      for (let i = 0; i < finalCount; i++) {
        let position
        if (isEvenlySpaced) {
          position = { x: 100 + i * spacing, y: baseY }
        } else {
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
  }

  // Circle creation
  if (lowerPrompt.includes('circle') || lowerPrompt.includes('oval')) {
    const extractedPosition = extractPosition(prompt)
    const color = extractColor(prompt) || '#EF4444'
    const radius = extractRadius(prompt) || 60
    
    if (layout === "grid" && grid) {
      // Grid layout for circles
      for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
          const x = 100 + c * spacing
          const y = 100 + r * spacing
          commands.push({
            type: 'createCircle',
            position: { x, y },
            radius,
            fill: color,
            strokeWidth: 0
          })
        }
      }
    } else if (layout === "row" || layout === "even") {
      // Row/horizontal layout
      for (let i = 0; i < finalCount; i++) {
        const x = 100 + i * spacing
        const y = extractedPosition?.y || baseY
        commands.push({
          type: 'createCircle',
          position: { x, y },
          radius,
          fill: color,
          strokeWidth: 0
        })
      }
    } else if (layout === "column") {
      // Column/vertical layout
      for (let i = 0; i < finalCount; i++) {
        const x = extractedPosition?.x || 100
        const y = 100 + i * spacing
        commands.push({
          type: 'createCircle',
          position: { x, y },
          radius,
          fill: color,
          strokeWidth: 0
        })
      }
    } else {
      // Default/single shape layout
      for (let i = 0; i < finalCount; i++) {
        let position
        if (isEvenlySpaced) {
          position = { x: 100 + i * spacing, y: baseY }
        } else {
          const hasPositionKeyword = /top|bottom|center|middle/i.test(prompt)
          position = extractedPosition || { 
            x: 200 + i * 100, 
            y: hasPositionKeyword ? baseY : baseY + Math.random() * 50 
          }
        }
        
        commands.push({
          type: 'createCircle',
          position,
          radius,
          fill: color,
          strokeWidth: 0
        })
      }
    }
  }

  // Star creation
  if (lowerPrompt.includes('star')) {
    let fill = extractColor(prompt, '#f59e0b')
    
    if (layout === "grid" && grid) {
      // Grid layout for stars
      for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
          const x = 100 + c * spacing
          const y = 100 + r * spacing
          commands.push({
            type: 'createStar',
            position: { x, y },
            numPoints: 5,
            innerRadius: 30,
            outerRadius: 80,
            fill,
            strokeWidth: 0
          })
        }
      }
    } else if (layout === "row" || layout === "even") {
      // Row/horizontal layout
      for (let i = 0; i < finalCount; i++) {
        const x = 100 + i * spacing
        const y = extractPosition(prompt)?.y || baseY
        commands.push({
          type: 'createStar',
          position: { x, y },
          numPoints: 5,
          innerRadius: 30,
          outerRadius: 80,
          fill,
          strokeWidth: 0
        })
      }
    } else if (layout === "column") {
      // Column/vertical layout
      for (let i = 0; i < finalCount; i++) {
        const x = extractPosition(prompt)?.x || 100
        const y = 100 + i * spacing
        commands.push({
          type: 'createStar',
          position: { x, y },
          numPoints: 5,
          innerRadius: 30,
          outerRadius: 80,
          fill,
          strokeWidth: 0
        })
      }
    } else {
      // Default/single shape layout
      for (let i = 0; i < finalCount; i++) {
        let position
        if (isEvenlySpaced) {
          position = { x: 100 + i * spacing, y: baseY }
        } else {
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
  }
  
  } // End creation commands section (skip if manipulation command)

  // === MANIPULATION COMMANDS ===
  
  // Move commands - handle both selected objects and implicit targeting
  if (lowerPrompt.includes('move')) {
    // Extract movement amount from prompt (defaults to 100 if no number specified)
    const moveAmountMatch = prompt.match(/(\d+)\s*(?:px|pixels?)?/i)
    const moveAmount = moveAmountMatch ? parseInt(moveAmountMatch[1]) : 100
    
    // Determine direction
    let direction = { x: 0, y: 0 }
    if (lowerPrompt.includes('left')) {
      direction = { x: -moveAmount, y: 0 }
    } else if (lowerPrompt.includes('right')) {
      direction = { x: moveAmount, y: 0 }
    } else if (lowerPrompt.includes('up')) {
      direction = { x: 0, y: -moveAmount }
    } else if (lowerPrompt.includes('down')) {
      direction = { x: 0, y: moveAmount }
    } else if (lowerPrompt.includes('center')) {
      // Special case for centering - use absolute position
      // This would need different handling in executor
      direction = { x: 2500, y: 2500, absolute: true }
    }
    
    // Handle movement for selected objects or most recent object
    const targetObjects = canvasState.selectedObjectIds?.length > 0 
      ? canvasState.selectedObjectIds 
      : ['lastCreated'] // Special identifier for most recently created object
    
    targetObjects.forEach(objectId => {
      commands.push({
        type: 'moveObject',
        objectId,
        offset: direction
      })
    })
  }

  // Resize commands
  if (lowerPrompt.includes('resize') || lowerPrompt.includes('twice the size') || lowerPrompt.includes('half the size') || 
      lowerPrompt.includes('make bigger') || lowerPrompt.includes('make smaller') || 
      (lowerPrompt.includes('make') && (lowerPrompt.includes('bigger') || lowerPrompt.includes('smaller') || lowerPrompt.includes('larger')))) {
    let scale = 1.5
    if (lowerPrompt.includes('twice') || lowerPrompt.includes('2x') || lowerPrompt.includes('twice the size')) scale = 2.0
    if (lowerPrompt.includes('smaller') || lowerPrompt.includes('shrink') || lowerPrompt.includes('half the size')) scale = 0.5
    if (lowerPrompt.includes('bigger') || lowerPrompt.includes('larger') || lowerPrompt.includes('make bigger')) scale = 1.5
    
    // Handle both selected objects and objects identified in the prompt
    let targetObjects = []
    
    if (canvasState.selectedObjectIds?.length > 0) {
      targetObjects = canvasState.selectedObjectIds
    } else {
      // Try to identify target objects from the prompt
      if (lowerPrompt.includes('rectangle') || lowerPrompt.includes('square')) {
        targetObjects = ['lastRectangle'] // Special identifier for most recent rectangle
      } else if (lowerPrompt.includes('circle')) {
        targetObjects = ['lastCircle'] // Special identifier for most recent circle
      } else if (lowerPrompt.includes('star')) {
        targetObjects = ['lastStar'] // Special identifier for most recent star
      } else if (lowerPrompt.includes('text')) {
        targetObjects = ['lastText'] // Special identifier for most recent text
      } else {
        targetObjects = ['lastCreated'] // Special identifier for most recently created object
      }
      
      // Add color filtering if color is mentioned
      const mentionedColor = extractColor(prompt)
      if (mentionedColor) {
        // This would be handled by the executor to find objects matching the color
        targetObjects = targetObjects.map(id => `${id}:${mentionedColor}`)
      }
    }
    
    targetObjects.forEach(objectId => {
      commands.push({
        type: 'resizeObject',
        objectId: objectId,
        scale: scale  // We'll handle scaling in the executor since schema expects actual size
      })
    })
  }

  // Rotation commands
  if (lowerPrompt.includes('rotate')) {
    const angleMatch = prompt.match(/(\d+)\s*degrees?/i)
    const rotation = angleMatch ? parseInt(angleMatch[1]) : 45
    
    // Handle rotation for selected objects or most recent object
    const targetObjects = canvasState.selectedObjectIds?.length > 0 
      ? canvasState.selectedObjectIds 
      : ['lastCreated'] // Special identifier for most recently created object
    
    targetObjects.forEach(objectId => {
      commands.push({
        type: 'rotateShape',
        objectId,
        rotation
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

  // T-Rex drawing
  if (lowerPrompt.includes('t-rex') || lowerPrompt.includes('trex') || lowerPrompt.includes('dinosaur')) {
    const scaleMatch = prompt.match(/(?:small|large|big|tiny|huge)/i)
    const frontMatch = prompt.match(/front|facing|face/i)
    let scale = 1.0
    
    if (scaleMatch) {
      const scaleWord = scaleMatch[0].toLowerCase()
      if (scaleWord === 'small' || scaleWord === 'tiny') scale = 0.5
      if (scaleWord === 'large' || scaleWord === 'big' || scaleWord === 'huge') scale = 1.5
    }
    
    const commandType = 'createTRex'
    
    commands.push({
      type: commandType,
      position: extractPosition(prompt) || { x: 400, y: 300 },
      scale: scale
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
  const colors = {
    red: '#EF4444',
    blue: '#3B82F6',
    green: '#22C55E',
    purple: '#A855F7',
    yellow: '#EAB308',
    orange: '#f97316',
    pink: '#ec4899',
    black: '#000000',
    white: '#ffffff',
    gray: '#6b7280',
    grey: '#6b7280'
  }
  const found = Object.keys(colors).find(c => prompt.toLowerCase().includes(c))
  return found ? colors[found] : defaultColor
}

/**
 * Helper function to extract radius from prompt
 */
const extractRadius = (prompt) => {
  const match = prompt.match(/radius\s*(\d+)/i)
  return match ? parseInt(match[1]) : 60
}

/**
 * Helper function to extract position from prompt (legacy version, kept for compatibility)
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