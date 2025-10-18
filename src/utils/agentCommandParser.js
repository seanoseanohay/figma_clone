import { validateCommand } from './agentSchemas.js'

/**
 * Agent Command Parser
 * 
 * Processes and validates AI agent responses, converting them into
 * executable commands with proper sanitization and fallback values.
 * 
 * Features:
 * - Command validation using Zod schemas  
 * - Sanitization of dangerous inputs
 * - Fallback to default values for missing fields
 * - Graceful error handling
 * - Command batching and ordering
 */

/**
 * Parse and validate a complete AI agent response
 * @param {Object} agentResponse - Raw response from AI agent
 * @returns {Object} - { success: boolean, commands?: Array, errors?: Array, warnings?: Array }
 */
export const parseAgentResponse = (agentResponse) => {
  const result = {
    success: false,
    commands: [],
    errors: [],
    warnings: [],
    explanation: agentResponse.explanation || 'AI agent response'
  }

  try {
    // Validate response structure
    if (!agentResponse || typeof agentResponse !== 'object') {
      result.errors.push('Invalid response format: expected object')
      return result
    }

    // Extract commands array
    const { commands } = agentResponse
    if (!Array.isArray(commands)) {
      result.errors.push('Invalid commands format: expected array')
      return result
    }

    if (commands.length === 0) {
      result.warnings.push('No commands provided in response')
      result.success = true
      return result
    }

    if (commands.length > 10) {
      result.warnings.push(`Too many commands (${commands.length}), limiting to first 10`)
      commands.splice(10)
    }

    // Parse and validate each command
    const parsedCommands = []
    
    console.log(`🔍 Parsing ${commands.length} agent commands`)
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      console.log(`🧪 Command ${i + 1} type: "${command.type}"`)
      
      const commandResult = parseCommand(command, i)
      
      if (commandResult.success) {
        parsedCommands.push(commandResult.command)
        console.log(`✅ Command ${i + 1} (${command.type}) parsed successfully`)
      } else {
        console.error(`❌ Command ${i + 1} (${command.type}) failed:`, commandResult.errors)
        result.errors.push(`Command ${i + 1}: ${commandResult.errors.join(', ')}`)
      }
      
      // Add any warnings
      if (commandResult.warnings?.length > 0) {
        result.warnings.push(...commandResult.warnings.map(w => `Command ${i + 1}: ${w}`))
      }
    }

    // Check if we have any valid commands
    if (parsedCommands.length === 0) {
      result.errors.push('No valid commands could be parsed')
      return result
    }

    result.success = true
    result.commands = parsedCommands
    
    console.log(`✅ Parsed ${parsedCommands.length} valid commands from AI response`)
    
    return result

  } catch (error) {
    console.error('❌ Command parsing error:', error)
    result.errors.push(`Parsing error: ${error.message}`)
    return result
  }
}

/**
 * Parse and validate a single command
 * @param {Object} rawCommand - Raw command object from AI
 * @param {number} index - Command index for error reporting
 * @returns {Object} - { success: boolean, command?: Object, errors?: Array, warnings?: Array }
 */
export const parseCommand = (rawCommand, index = 0) => {
  const result = {
    success: false,
    command: null,
    errors: [],
    warnings: []
  }

  try {
    // Basic validation
    if (!rawCommand || typeof rawCommand !== 'object') {
      result.errors.push('Invalid command format: expected object')
      return result
    }

    if (!rawCommand.type || typeof rawCommand.type !== 'string') {
      result.errors.push('Missing or invalid command type')
      return result
    }

    // Create a sanitized copy of the command
    const sanitizedCommand = sanitizeCommand(rawCommand)
    
    // Validate using Zod schemas
    const validation = validateCommand(sanitizedCommand)
    
    if (!validation.success) {
      result.errors.push(...validation.errors)
      return result
    }

    // Apply additional sanitization and defaults
    const finalCommand = applyCommandDefaults(validation.data)
    
    result.success = true
    result.command = finalCommand
    
    return result

  } catch (error) {
    console.error(`❌ Error parsing command ${index}:`, error)
    result.errors.push(`Command parsing error: ${error.message}`)
    return result
  }
}

/**
 * Sanitize a raw command object to prevent dangerous inputs
 * @param {Object} rawCommand - Raw command from AI
 * @returns {Object} - Sanitized command
 */
export const sanitizeCommand = (rawCommand) => {
  const sanitized = { ...rawCommand }
  
  try {
    // Sanitize command type
    if (typeof sanitized.type === 'string') {
      const originalType = sanitized.type
      sanitized.type = sanitized.type.trim().toLowerCase()
      
      // Map common variations to canonical names
      const typeAliases = {
        // Creation Commands
        'rect': 'createRectangle',
        'rectangle': 'createRectangle',
        'box': 'createRectangle',
        'square': 'createRectangle',
        'createrectangle': 'createRectangle',
        'circle': 'createCircle',
        'oval': 'createCircle',
        'ellipse': 'createCircle',
        'createcircle': 'createCircle',
        'star': 'createStar',
        'createstar': 'createStar',
        'text': 'createText',
        'createtext': 'createText',
        'addtext': 'createText',
        'label': 'createText',
        
        // Manipulation Commands
        'move': 'moveShape',
        'moveshape': 'moveShape',
        'moveobject': 'moveObject', // Keep for backwards compatibility
        'drag': 'moveShape',
        'resize': 'resizeShape',
        'resizeshape': 'resizeShape',
        'resizeobject': 'resizeObject', // Keep for backwards compatibility
        'scale': 'resizeShape',
        'rotate': 'rotateShape',
        'rotateshape': 'rotateShape',
        'rotateobject': 'rotateObject', // Keep for backwards compatibility
        'spin': 'rotateShape',
        
        // Layout Commands
        'arrange': 'arrangeLayout',
        'arrangelayout': 'arrangeLayout',
        'layout': 'arrangeLayout',
        'grid': 'arrangeLayout',
        'row': 'arrangeLayout',
        'column': 'arrangeLayout',
        'align': 'arrangeLayout',
        
        // Complex Commands
        'form': 'createForm',
        'createform': 'createForm',
        'loginform': 'createForm',
        'navbar': 'createNavBar',
        'createnavbar': 'createNavBar',
        'navigation': 'createNavBar',
        'nav': 'createNavBar',
        'menu': 'createNavBar',
        'cardlayout': 'createLayout',
        'createlayout': 'createLayout',
        'cards': 'createLayout',
        'dashboard': 'createLayout',
        
        // Existing commands
        'update': 'updateObjectProperties',
        'delete': 'deleteObject',
        'remove': 'deleteObject',
        'clear': 'clearCanvas',
        'background': 'setCanvasBackground',
        'group': 'groupObjects',
        'ungroup': 'ungroupObjects'
      }
      
      const mappedType = typeAliases[sanitized.type] || sanitized.type
      console.log(`🔄 Type mapping: "${originalType}" -> "${sanitized.type}" -> "${mappedType}"`)
      sanitized.type = mappedType
    }

    // Sanitize positions - clamp to canvas bounds
    if (sanitized.position && typeof sanitized.position === 'object') {
      sanitized.position = sanitizePosition(sanitized.position)
    }

    // Sanitize size - ensure reasonable bounds
    if (sanitized.size && typeof sanitized.size === 'object') {
      sanitized.size = sanitizeSize(sanitized.size)
    }

    // Sanitize radius for circles/stars
    if (typeof sanitized.radius === 'number') {
      sanitized.radius = Math.max(1, Math.min(1000, Math.abs(sanitized.radius)))
    }

    // Sanitize colors - ensure hex format
    if (sanitized.fill && typeof sanitized.fill === 'string') {
      sanitized.fill = sanitizeColor(sanitized.fill)
    }
    
    if (sanitized.stroke && typeof sanitized.stroke === 'string') {
      sanitized.stroke = sanitizeColor(sanitized.stroke)
    }

    // Sanitize stroke width
    if (typeof sanitized.strokeWidth === 'number') {
      sanitized.strokeWidth = Math.max(0, Math.min(50, Math.abs(sanitized.strokeWidth)))
    }

    // Sanitize rotation
    if (typeof sanitized.rotation === 'number') {
      sanitized.rotation = ((sanitized.rotation % 360) + 360) % 360
    }

    // Sanitize opacity
    if (sanitized.properties?.opacity !== undefined) {
      sanitized.properties.opacity = Math.max(0, Math.min(1, sanitized.properties.opacity))
    }

    // Sanitize object IDs - remove dangerous characters
    if (sanitized.objectId && typeof sanitized.objectId === 'string') {
      sanitized.objectId = sanitized.objectId.replace(/[^a-zA-Z0-9_-]/g, '').substr(0, 100)
    }

    // Sanitize arrays (for grouping commands)
    if (Array.isArray(sanitized.objectIds)) {
      sanitized.objectIds = sanitized.objectIds
        .filter(id => typeof id === 'string' && id.length > 0)
        .map(id => id.replace(/[^a-zA-Z0-9_-]/g, '').substr(0, 100))
        .slice(0, 20) // Max 20 objects per group
    }

    return sanitized

  } catch (error) {
    console.error('❌ Command sanitization error:', error)
    return rawCommand // Return original if sanitization fails
  }
}

/**
 * Sanitize position coordinates
 * @param {Object} position - Position object {x, y}
 * @returns {Object} - Sanitized position
 */
const sanitizePosition = (position) => {
  const sanitized = { ...position }
  
  // Clamp x coordinate to canvas bounds (0-5000)
  if (typeof sanitized.x === 'number') {
    sanitized.x = Math.max(0, Math.min(5000, Math.round(sanitized.x)))
  }
  
  // Clamp y coordinate to canvas bounds (0-5000)  
  if (typeof sanitized.y === 'number') {
    sanitized.y = Math.max(0, Math.min(5000, Math.round(sanitized.y)))
  }
  
  return sanitized
}

/**
 * Sanitize size dimensions
 * @param {Object} size - Size object {width, height}
 * @returns {Object} - Sanitized size
 */
const sanitizeSize = (size) => {
  const sanitized = { ...size }
  
  // Clamp width to reasonable bounds (1-2000)
  if (typeof sanitized.width === 'number') {
    sanitized.width = Math.max(1, Math.min(2000, Math.round(Math.abs(sanitized.width))))
  }
  
  // Clamp height to reasonable bounds (1-2000)
  if (typeof sanitized.height === 'number') {
    sanitized.height = Math.max(1, Math.min(2000, Math.round(Math.abs(sanitized.height))))
  }
  
  return sanitized
}

/**
 * Sanitize color values to ensure valid hex format
 * @param {string} color - Color string (various formats)
 * @returns {string} - Sanitized hex color
 */
const sanitizeColor = (color) => {
  if (typeof color !== 'string') {
    return '#808080' // Default gray
  }
  
  // Remove whitespace
  color = color.trim()
  
  // Convert named colors to hex
  const namedColors = {
    'red': '#ff0000',
    'green': '#008000',
    'blue': '#0000ff',
    'yellow': '#ffff00',
    'orange': '#ffa500',
    'purple': '#800080',
    'pink': '#ffc0cb',
    'brown': '#a52a2a',
    'black': '#000000',
    'white': '#ffffff',
    'gray': '#808080',
    'grey': '#808080'
  }
  
  const lowerColor = color.toLowerCase()
  if (namedColors[lowerColor]) {
    return namedColors[lowerColor]
  }
  
  // Handle hex colors
  if (color.startsWith('#')) {
    // Validate hex format
    const hexMatch = color.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    if (hexMatch) {
      // Expand 3-digit hex to 6-digit
      if (hexMatch[1].length === 3) {
        return '#' + hexMatch[1].split('').map(c => c + c).join('')
      }
      return color.toUpperCase()
    }
  }
  
  // Handle RGB format rgb(r, g, b)
  const rgbMatch = color.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
  if (rgbMatch) {
    const r = Math.max(0, Math.min(255, parseInt(rgbMatch[1])))
    const g = Math.max(0, Math.min(255, parseInt(rgbMatch[2])))
    const b = Math.max(0, Math.min(255, parseInt(rgbMatch[3])))
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
  }
  
  // Default fallback
  console.warn(`Invalid color format: ${color}, using default gray`)
  return '#808080'
}

/**
 * Apply default values to validated commands
 * @param {Object} command - Validated command object
 * @returns {Object} - Command with defaults applied
 */
const applyCommandDefaults = (command) => {
  const withDefaults = { ...command }
  
  // Apply type-specific defaults
  switch (command.type) {
    case 'createRectangle':
      withDefaults.fill = withDefaults.fill || '#3b82f6' // Blue default
      withDefaults.strokeWidth = withDefaults.strokeWidth ?? 0
      withDefaults.rotation = withDefaults.rotation ?? 0
      break
      
    case 'createCircle':
      withDefaults.fill = withDefaults.fill || '#ef4444' // Red default
      withDefaults.strokeWidth = withDefaults.strokeWidth ?? 0
      break
      
    case 'createStar':
      withDefaults.fill = withDefaults.fill || '#f59e0b' // Yellow default
      withDefaults.numPoints = withDefaults.numPoints ?? 5
      withDefaults.innerRadius = withDefaults.innerRadius ?? 30
      withDefaults.outerRadius = withDefaults.outerRadius ?? 60
      withDefaults.strokeWidth = withDefaults.strokeWidth ?? 0
      withDefaults.rotation = withDefaults.rotation ?? 0
      break
      
    case 'createText':
      withDefaults.fill = withDefaults.fill || '#000000' // Black default
      withDefaults.fontSize = withDefaults.fontSize ?? 24
      withDefaults.fontFamily = withDefaults.fontFamily || 'Arial'
      withDefaults.text = withDefaults.text || 'Text'
      withDefaults.strokeWidth = withDefaults.strokeWidth ?? 0
      break
      
    case 'moveObject':
    case 'resizeObject':
    case 'rotateObject':
    case 'moveShape':
    case 'resizeShape':
    case 'rotateShape':
      withDefaults.animate = withDefaults.animate ?? false
      withDefaults.targetId = withDefaults.targetId || 'lastCreated'
      break
      
    case 'arrangeLayout':
      withDefaults.layoutType = withDefaults.layoutType || 'row'
      withDefaults.spacing = withDefaults.spacing ?? 50
      withDefaults.columns = withDefaults.columns ?? 3
      withDefaults.rows = withDefaults.rows ?? 1
      break
      
    case 'createForm':
      withDefaults.formType = withDefaults.formType || 'login'
      withDefaults.width = withDefaults.width ?? 300
      withDefaults.fields = withDefaults.fields || ['username', 'password']
      break
      
    case 'createNavBar':
      withDefaults.width = withDefaults.width ?? 800
      withDefaults.height = withDefaults.height ?? 60
      withDefaults.items = withDefaults.items || ['Home', 'About', 'Services', 'Contact']
      break
      
    case 'createLayout':
      withDefaults.layoutType = withDefaults.layoutType || 'card'
      withDefaults.cardCount = withDefaults.cardCount ?? 3
      withDefaults.elements = withDefaults.elements || ['title', 'image', 'description']
      break
      
    case 'clearCanvas':
      withDefaults.confirm = withDefaults.confirm ?? false
      break
  }
  
  return withDefaults
}

/**
 * Order commands for optimal execution
 * Some commands should be executed before others for better UX
 * @param {Array} commands - Array of parsed commands
 * @returns {Array} - Ordered commands
 */
export const orderCommands = (commands) => {
  // Command priority order (lower numbers execute first)
  const priorities = {
    'clearCanvas': 1,
    'setCanvasBackground': 2,
    
    // Creation commands
    'createRectangle': 3,
    'createCircle': 3,
    'createStar': 3,
    'createText': 3,
    
    // Complex creation commands
    'createForm': 3,
    'createNavBar': 3,
    'createLayout': 3,
    
    // Manipulation commands
    'moveObject': 4,
    'resizeObject': 4,
    'rotateObject': 4,
    'moveShape': 4,
    'resizeShape': 4,
    'rotateShape': 4,
    
    // Layout commands
    'arrangeLayout': 5,
    
    // Property updates
    'updateObjectProperties': 6,
    
    // Grouping operations
    'groupObjects': 7,
    'ungroupObjects': 8,
    
    // Deletion (last)
    'deleteObject': 9
  }
  
  return commands.sort((a, b) => {
    const priorityA = priorities[a.type] || 5
    const priorityB = priorities[b.type] || 5
    return priorityA - priorityB
  })
}

/**
 * Batch commands that can be executed together
 * @param {Array} commands - Array of ordered commands
 * @returns {Array} - Array of command batches
 */
export const batchCommands = (commands) => {
  const batches = []
  let currentBatch = []
  
  for (const command of commands) {
    // Commands that should be executed individually
    const individualCommands = ['clearCanvas', 'setCanvasBackground']
    
    if (individualCommands.includes(command.type)) {
      // Finish current batch
      if (currentBatch.length > 0) {
        batches.push(currentBatch)
        currentBatch = []
      }
      // Add individual command as its own batch
      batches.push([command])
    } else {
      // Add to current batch
      currentBatch.push(command)
      
      // Limit batch size to 5 commands for performance
      if (currentBatch.length >= 5) {
        batches.push(currentBatch)
        currentBatch = []
      }
    }
  }
  
  // Add remaining commands
  if (currentBatch.length > 0) {
    batches.push(currentBatch)
  }
  
  return batches
}

export default {
  parseAgentResponse,
  parseCommand,
  sanitizeCommand,
  orderCommands,
  batchCommands
}
