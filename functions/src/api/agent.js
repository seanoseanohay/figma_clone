/**
 * AI Agent API Endpoints
 * Handles AI-powered canvas manipulation requests
 */

const express = require('express');
const admin = require('firebase-admin');
const { authenticate, requirePermission } = require('../middleware/auth');
const { readLimiter } = require('../middleware/rateLimit');
const OpenAI = require('openai');

const router = express.Router();
const db = admin.firestore();

// Initialize OpenAI client
let openaiClient = null;

function initializeOpenAI() {
  // Use environment variables for emulator and production
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (apiKey) {
    openaiClient = new OpenAI({ apiKey });
    console.log('🤖 OpenAI client initialized');
  } else {
    console.warn('⚠️ OpenAI API key not configured - using mock responses only');
  }
}

// Initialize on startup
initializeOpenAI();

/**
 * Helper: Check if user has access to canvas
 */
async function checkCanvasAccess(canvasId, userId) {
  // Allow access in mock/development mode
  if (userId === 'mock-user-id' || !canvasId) {
    console.log('🔧 Mock mode: granting canvas access');
    return { 
      hasAccess: true, 
      canvas: { 
        id: canvasId || 'mock-canvas',
        ownerId: userId,
        collaborators: []
      }
    };
  }

  try {
    const canvasDoc = await db.collection('canvases').doc(canvasId).get();
    
    if (!canvasDoc.exists) {
      return { hasAccess: false, error: 'Canvas not found' };
    }

    const canvasData = canvasDoc.data();
    const hasAccess = canvasData.ownerId === userId || 
                     (canvasData.collaborators && canvasData.collaborators.includes(userId));

    return { hasAccess, canvas: canvasData };
  } catch (error) {
    console.error('Error checking canvas access:', error);
    return { hasAccess: false, error: 'Failed to check canvas access' };
  }
}

/**
 * Helper: Get canvas objects for context
 */
async function getCanvasObjects(canvasId) {
  // Return empty array for mock mode
  if (!canvasId || canvasId === 'mock-canvas') {
    console.log('🔧 Mock mode: returning empty objects array');
    return [];
  }

  try {
    const objectsSnapshot = await db.collection('canvasObjects')
      .where('canvasId', '==', canvasId)
      .limit(100) // Limit for performance
      .get();

    const objects = [];
    objectsSnapshot.forEach(doc => {
      const data = doc.data();
      objects.push({
        id: doc.id,
        type: data.type,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        radius: data.radius,
        fill: data.fill,
        stroke: data.stroke,
        rotation: data.rotation || 0
      });
    });

    return objects;
  } catch (error) {
    console.error('Error fetching canvas objects:', error);
    return [];
  }
}

/**
 * Helper: Create system prompt for AI
 */
function createSystemPrompt(canvasState) {
  const objectCount = canvasState.objects.length;
  const canvasSize = "5000x5000";
  
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
${JSON.stringify(canvasState, null, 2)}`;
}

/**
 * Helper: Validate agent response structure
 */
function validateAgentResponse(data) {
  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Response must be an object' };
  }

  if (!data.commands || !Array.isArray(data.commands)) {
    return { success: false, error: 'Response must contain commands array' };
  }

  if (data.commands.length === 0 || data.commands.length > 10) {
    return { success: false, error: 'Commands array must contain 1-10 commands' };
  }

  // Basic validation for each command
  for (let i = 0; i < data.commands.length; i++) {
    const cmd = data.commands[i];
    if (!cmd.type) {
      return { success: false, error: `Command ${i + 1} missing type` };
    }
  }

  return { success: true };
}

/**
 * POST /api/agent
 * Process AI agent request
 */
router.post('/', authenticate, requirePermission('agent_requests'), readLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId, canvasId: tokenCanvasId } = req;
    const { prompt, canvasId, options = {} } = req.body;

    // Validate required fields
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: {
          message: 'prompt is required and must be a string',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    if (!canvasId) {
      return res.status(400).json({
        error: {
          message: 'canvasId is required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    if (prompt.length > 1000) {
      return res.status(400).json({
        error: {
          message: 'prompt must be less than 1000 characters',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    // Token must have access to this canvas
    if (tokenCanvasId && tokenCanvasId !== canvasId) {
      return res.status(403).json({
        error: {
          message: 'Token does not have access to this canvas',
          code: 'FORBIDDEN'
        }
      });
    }

    // Check canvas access
    const { hasAccess, error } = await checkCanvasAccess(canvasId, userId);
    if (!hasAccess) {
      return res.status(error === 'Canvas not found' ? 404 : 403).json({
        error: {
          message: error,
          code: error === 'Canvas not found' ? 'NOT_FOUND' : 'FORBIDDEN'
        }
      });
    }

    // Check if AI is enabled (default to true for emulator)
    const agentEnabled = process.env.AGENT_ENABLED !== 'false'; // Default to true
    
    if (!agentEnabled) {
      return res.status(503).json({
        error: {
          message: 'AI agent is temporarily disabled',
          code: 'SERVICE_DISABLED'
        }
      });
    }

    // Check if OpenAI is available
    if (!openaiClient) {
      return res.status(503).json({
        error: {
          message: 'AI service not configured',
          code: 'SERVICE_UNAVAILABLE'
        }
      });
    }

    // Get canvas objects for context
    const objects = await getCanvasObjects(canvasId);
    
    const canvasState = {
      canvasId,
      objects,
      selectedObjectIds: options.selectedObjectIds || []
    };

    // Configure AI request
    const model = options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const temperature = parseFloat(options.temperature || process.env.OPENAI_TEMPERATURE || 0.1);
    const maxTokens = parseInt(options.maxTokens || process.env.OPENAI_MAX_TOKENS || 1000);

    // Create system prompt
    const systemPrompt = createSystemPrompt(canvasState);

    console.log(`🤖 Processing AI request: "${prompt}" (canvas: ${canvasId})`);

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
    });

    const processingTime = Date.now() - startTime;

    // Extract and parse response
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      return res.status(500).json({
        error: {
          message: 'No response content received from AI model',
          code: 'AI_ERROR'
        }
      });
    }

    let aiResponse;
    try {
      aiResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return res.status(500).json({
        error: {
          message: 'Invalid JSON response from AI model',
          code: 'AI_PARSE_ERROR'
        }
      });
    }

    // Validate response structure
    const validation = validateAgentResponse(aiResponse);
    if (!validation.success) {
      console.error('AI response validation failed:', validation.error);
      return res.status(500).json({
        error: {
          message: `Invalid AI response: ${validation.error}`,
          code: 'AI_VALIDATION_ERROR'
        }
      });
    }

    // Add metadata
    aiResponse.metadata = {
      model: model,
      timestamp: Date.now(),
      processingTimeMs: processingTime,
      usage: completion.usage,
      canvasObjectCount: objects.length
    };

    console.log(`✅ AI request completed (${processingTime}ms, ${completion.usage?.total_tokens} tokens)`);

    // Return successful response
    res.json(aiResponse);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ Agent API error:', error);

    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({
        error: {
          message: 'AI service quota exceeded',
          code: 'QUOTA_EXCEEDED'
        }
      });
    } else if (error.code === 'invalid_api_key') {
      return res.status(503).json({
        error: {
          message: 'AI service configuration error',
          code: 'SERVICE_CONFIG_ERROR'
        }
      });
    } else if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({
        error: {
          message: 'AI service rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        }
      });
    } else if (error.code === 'context_length_exceeded') {
      return res.status(413).json({
        error: {
          message: 'Request too large. Please try with fewer objects or shorter prompt.',
          code: 'REQUEST_TOO_LARGE'
        }
      });
    }

    // Generic error response
    res.status(500).json({
      error: {
        message: 'AI agent request failed',
        code: 'AGENT_ERROR',
        processingTimeMs: processingTime
      }
    });
  }
});

/**
 * GET /api/agent/health
 * Check AI agent service health
 */
router.get('/health', authenticate, async (req, res) => {
  try {
    const agentEnabled = process.env.AGENT_ENABLED !== 'false';
    const hasApiKey = !!process.env.OPENAI_API_KEY;

    res.json({
      status: agentEnabled && hasApiKey ? 'healthy' : 'unavailable',
      enabled: agentEnabled,
      configured: hasApiKey,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Agent health check error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * POST /api/agent/mock
 * Mock agent response for testing (bypasses OpenAI)
 */
router.post('/mock', authenticate, readLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId, canvasId: tokenCanvasId } = req;
    const { prompt, canvasId } = req.body;

    // Basic validation
    if (!prompt || !canvasId) {
      return res.status(400).json({
        error: {
          message: 'prompt and canvasId are required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    // Check canvas access
    const { hasAccess, error } = await checkCanvasAccess(canvasId, userId);
    if (!hasAccess) {
      return res.status(error === 'Canvas not found' ? 404 : 403).json({
        error: {
          message: error,
          code: error === 'Canvas not found' ? 'NOT_FOUND' : 'FORBIDDEN'
        }
      });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Generate mock response based on prompt
    const mockCommands = [];
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('rectangle') || lowerPrompt.includes('square')) {
      // Extract dimensions and color from prompt
      const widthMatch = prompt.match(/(\d+).*?(?:pixels?|px).*?(?:by|x|\*).*?(\d+).*?(?:pixels?|px)/i) ||
                        prompt.match(/(\d+).*?by.*?(\d+)/i);
      const width = widthMatch ? Math.min(parseInt(widthMatch[1]), 1000) : 150;
      const height = widthMatch ? Math.min(parseInt(widthMatch[2]), 1000) : 100;
      
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
      
      mockCommands.push({
        type: 'createRectangle',
        position,
        size: { width, height },
        fill: fill
      });
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
        position = { x: 300 + Math.random() * 200, y: 150 + Math.random() * 200 };
      }
      
      mockCommands.push({
        type: 'createCircle',
        position,
        radius,
        fill
      });
    }
    
    if (lowerPrompt.includes('star')) {
      let fill = '#f59e0b'; // default yellow
      if (lowerPrompt.includes('red')) fill = '#ef4444';
      if (lowerPrompt.includes('blue')) fill = '#3b82f6';
      if (lowerPrompt.includes('green')) fill = '#10b981';
      
      mockCommands.push({
        type: 'createStar',
        position: { x: 500 + Math.random() * 200, y: 200 + Math.random() * 200 },
        radius: 80,
        numPoints: 5,
        fill: fill
      });
    }
    
    // Default response if no specific shapes mentioned
    if (mockCommands.length === 0) {
      mockCommands.push({
        type: 'createRectangle',
        position: { x: 200, y: 200 },
        size: { width: 100, height: 100 },
        fill: '#10b981'
      });
    }

    const processingTime = Date.now() - startTime;

    const mockResponse = {
      commands: mockCommands,
      explanation: `Mock AI response for: "${prompt}". This is a simulated response for testing purposes.`,
      metadata: {
        model: 'mock-model',
        timestamp: Date.now(),
        processingTimeMs: processingTime,
        isMock: true
      }
    };

    res.json(mockResponse);
  } catch (error) {
    console.error('Mock agent error:', error);
    res.status(500).json({
      error: {
        message: 'Mock agent request failed',
        code: 'MOCK_ERROR'
      }
    });
  }
});

module.exports = router;
