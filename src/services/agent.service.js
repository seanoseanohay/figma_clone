import OpenAI from 'openai'
import { validateAgentRequest, validateAgentResponse } from '../utils/agentSchemas.js'

/**
 * Agent Service
 * 
 * Handles all AI agent interactions and response validation
 * Abstracts OpenAI API calls and provides structured command output
 */

// Initialize OpenAI client (will be configured with environment variables)
let openaiClient = null

/**
 * Initialize OpenAI client with API key
 * @param {string} apiKey - OpenAI API key
 */
export const initializeAgent = (apiKey) => {
  if (!apiKey) {
    throw new Error('OpenAI API key is required')
  }
  
  openaiClient = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Only for client-side usage in development
  })
  
  console.log('AI Agent initialized')
}

/**
 * Check if agent is initialized
 * @returns {boolean} - True if agent is ready
 */
export const isAgentInitialized = () => {
  return openaiClient !== null
}

/**
 * Create system prompt for the AI agent
 * @param {Object} canvasState - Current canvas state
 * @returns {string} - System prompt
 */
const createSystemPrompt = (canvasState) => {
  const objectCount = canvasState.objects.length
  const canvasSize = "5000x5000" // Fixed canvas size
  
  return `You are an AI assistant that helps users create and manipulate objects on a collaborative canvas.

CANVAS CONTEXT:
- Canvas ID: ${canvasState.canvasId}
- Canvas Size: ${canvasSize} pixels
- Current Objects: ${objectCount} objects
- Selected Objects: ${canvasState.selectedObjectIds?.length || 0} objects

AVAILABLE COMMANDS:
1. CREATE SHAPES:
   - createRectangle: Create rectangles with position, size, and styling
   - createCircle: Create circles with position, radius, and styling  
   - createStar: Create stars with position, radius, points, and styling

2. MODIFY OBJECTS:
   - moveObject: Move existing objects to new positions
   - resizeObject: Change object dimensions
   - rotateObject: Rotate objects by degrees
   - updateObjectProperties: Change colors, stroke, opacity
   - deleteObject: Remove objects from canvas

3. CANVAS OPERATIONS:
   - clearCanvas: Remove all objects (requires confirmation)
   - setCanvasBackground: Change canvas background color

RULES:
- Always stay within canvas bounds (0-5000 for x/y coordinates)
- Use hex colors (#RRGGBB format)
- Keep object sizes reasonable (max 2000px width/height, max 1000px radius)
- Maximum 10 commands per response
- Provide clear explanations for your actions
- When modifying existing objects, use their exact IDs from the canvas state

RESPONSE FORMAT:
Respond with a JSON object containing:
{
  "commands": [array of command objects],
  "explanation": "Brief explanation of what you're doing"
}

CURRENT CANVAS STATE:
${JSON.stringify(canvasState, null, 2)}`
}

/**
 * Request response from AI agent
 * @param {string} prompt - User prompt/command
 * @param {Object} canvasState - Current canvas state
 * @param {Object} options - Optional configuration
 * @returns {Promise<Object>} - { success: boolean, data?: object, error?: string }
 */
export const requestAgentResponse = async (prompt, canvasState, options = {}) => {
  try {
    // Validate input
    const requestValidation = validateAgentRequest({ prompt, canvasState, options })
    if (!requestValidation.success) {
      return {
        success: false,
        error: `Invalid request: ${requestValidation.errors.join(', ')}`
      }
    }
    
    // Check if agent is initialized
    if (!isAgentInitialized()) {
      return {
        success: false,
        error: 'AI Agent not initialized. Please configure OpenAI API key.'
      }
    }
    
    const startTime = Date.now()
    
    // Configure request options
    const model = options.model || process.env.AGENT_MODEL || 'gpt-4o-mini'
    const temperature = options.temperature || parseFloat(process.env.AGENT_TEMPERATURE) || 0.1
    const maxTokens = options.maxTokens || parseInt(process.env.AGENT_MAX_TOKENS) || 1000
    
    // Create system prompt with canvas context
    const systemPrompt = createSystemPrompt(canvasState)
    
    console.log('🤖 Sending request to AI agent:', { model, temperature, maxTokens })
    
    // Make request to OpenAI
    const completion = await openaiClient.chat.completions.create({
      model: model,
      temperature: temperature,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user', 
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    })
    
    const processingTime = Date.now() - startTime
    
    // Extract response content
    const responseContent = completion.choices[0]?.message?.content
    if (!responseContent) {
      return {
        success: false,
        error: 'No response content received from AI model'
      }
    }
    
    // Parse JSON response
    let parsedResponse
    try {
      parsedResponse = JSON.parse(responseContent)
    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse AI response as JSON: ${parseError.message}`
      }
    }
    
    // Add metadata
    if (parsedResponse && typeof parsedResponse === 'object') {
      parsedResponse.metadata = {
        model: model,
        timestamp: Date.now(),
        processingTimeMs: processingTime,
        usage: completion.usage
      }
    }
    
    // Validate response structure
    const validation = validateAgentResponse(parsedResponse)
    if (!validation.success) {
      return {
        success: false,
        error: `Invalid AI response structure: ${validation.errors.join(', ')}`,
        rawResponse: parsedResponse
      }
    }
    
    console.log('✅ AI agent response validated successfully')
    
    return {
      success: true,
      data: validation.data
    }
    
  } catch (error) {
    console.error('❌ Agent service error:', error)
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return {
        success: false,
        error: 'OpenAI API quota exceeded. Please check your account.'
      }
    } else if (error.code === 'invalid_api_key') {
      return {
        success: false,
        error: 'Invalid OpenAI API key. Please check your configuration.'
      }
    } else if (error.code === 'rate_limit_exceeded') {
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait before making another request.'
      }
    }
    
    return {
      success: false,
      error: `Agent service error: ${error.message}`
    }
  }
}

/**
 * Mock agent response for testing (when OpenAI is not available)
 * @param {string} prompt - User prompt
 * @param {Object} canvasState - Canvas state
 * @returns {Promise<Object>} - Mock response
 */
export const getMockAgentResponse = async (prompt, canvasState) => {
  const startTime = Date.now()
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Generate mock commands based on prompt content
  const mockCommands = []
  
  if (prompt.toLowerCase().includes('rectangle') || prompt.toLowerCase().includes('square')) {
    mockCommands.push({
      type: 'createRectangle',
      position: { x: 100, y: 100 },
      size: { width: 150, height: 100 },
      fill: '#3b82f6'
    })
  }
  
  if (prompt.toLowerCase().includes('circle')) {
    mockCommands.push({
      type: 'createCircle',
      position: { x: 300, y: 150 },
      radius: 60,
      fill: '#ef4444'
    })
  }
  
  if (prompt.toLowerCase().includes('star')) {
    mockCommands.push({
      type: 'createStar',
      position: { x: 500, y: 200 },
      radius: 80,
      numPoints: 5,
      fill: '#f59e0b'
    })
  }
  
  // Default response if no specific shapes mentioned
  if (mockCommands.length === 0) {
    mockCommands.push({
      type: 'createRectangle',
      position: { x: 200, y: 200 },
      size: { width: 100, height: 100 },
      fill: '#10b981'
    })
  }

  const processingTime = Date.now() - startTime
  
  const mockResponse = {
    commands: mockCommands,
    explanation: `Mock AI response for: "${prompt}". This is a simulated response for testing.`,
    metadata: {
      model: 'mock-model',
      timestamp: Date.now(),
      processingTimeMs: processingTime,
      isMock: true
    }
  }
  
  // Validate mock response
  const validation = validateAgentResponse(mockResponse)
  if (!validation.success) {
    throw new Error(`Mock response validation failed: ${validation.errors.join(', ')}`)
  }
  
  return {
    success: true,
    data: validation.data
  }
}

/**
 * Validate agent output data (public utility function)
 * @param {any} data - Data to validate
 * @returns {Object} - Validation result
 */
export const validateAgentOutput = validateAgentResponse

// Export for testing
export { createSystemPrompt }
