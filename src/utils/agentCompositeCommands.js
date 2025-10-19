/**
 * Agent Composite Commands
 * 
 * Provides pre-built templates and multi-step command generators
 * for complex UI patterns like login forms, navigation bars, and card layouts.
 * 
 * Features:
 * - Template-based command generation
 * - Relative positioning and layout math
 * - Customizable colors, sizes, and spacing
 * - Responsive design considerations
 */

/**
 * Create a login form composite
 * @param {Object} options - Configuration options
 * @returns {Array} - Array of commands to create the login form
 */
export const createLoginFormComposite = (options = {}) => {
  const {
    position = { x: 500, y: 300 },
    width = 300,
    spacing = 20,
    colors = {
      background: '#f8fafc',
      primary: '#3b82f6',
      text: '#374151',
      border: '#94a3b8'
    }
  } = options

  const commands = []
  let currentY = position.y

  // Background container
  commands.push({
    type: 'createRectangle',
    position: { x: position.x, y: currentY },
    size: { width: width, height: 280 },
    fill: colors.background,
    stroke: colors.border,
    strokeWidth: 2
  })

  currentY += spacing

  // Title
  commands.push({
    type: 'createRectangle', // Using rectangle as text placeholder
    position: { x: position.x + spacing, y: currentY },
    size: { width: width - (spacing * 2), height: 30 },
    fill: colors.text,
    strokeWidth: 0,
    // Note: In a real implementation, this would be a text element
  })

  currentY += 50

  // Username field
  commands.push({
    type: 'createRectangle',
    position: { x: position.x + spacing, y: currentY },
    size: { width: width - (spacing * 2), height: 40 },
    fill: '#ffffff',
    stroke: colors.border,
    strokeWidth: 2
  })

  currentY += 60

  // Password field  
  commands.push({
    type: 'createRectangle',
    position: { x: position.x + spacing, y: currentY },
    size: { width: width - (spacing * 2), height: 40 },
    fill: '#ffffff',
    stroke: colors.border,
    strokeWidth: 2
  })

  currentY += 70

  // Login button
  commands.push({
    type: 'createRectangle',
    position: { x: position.x + spacing, y: currentY },
    size: { width: width - (spacing * 2), height: 44 },
    fill: colors.primary,
    stroke: colors.primary,
    strokeWidth: 0
  })

  return {
    commands,
    explanation: `Created a login form with username field, password field, and login button at position (${position.x}, ${position.y})`,
    metadata: {
      type: 'composite',
      template: 'loginForm',
      elementsCreated: commands.length,
      dimensions: { width, height: 280 }
    }
  }
}

/**
 * Create a navigation bar composite
 * @param {Object} options - Configuration options
 * @returns {Array} - Array of commands to create the navigation bar
 */
export const createNavBarComposite = (options = {}) => {
  const {
    position = { x: 100, y: 50 },
    width = 800,
    height = 60,
    itemCount = 4,
    colors = {
      background: '#1f2937',
      primary: '#3b82f6',
      text: '#f9fafb'
    }
  } = options

  const commands = []
  const itemWidth = (width - 40) / itemCount
  const itemSpacing = itemWidth

  // Background bar
  commands.push({
    type: 'createRectangle',
    position: { x: position.x, y: position.y },
    size: { width: width, height: height },
    fill: colors.background,
    strokeWidth: 0
  })

  // Navigation items
  for (let i = 0; i < itemCount; i++) {
    const itemX = position.x + 20 + (i * itemSpacing)
    const itemY = position.y + 10
    
    commands.push({
      type: 'createRectangle',
      position: { x: itemX, y: itemY },
      size: { width: itemWidth - 10, height: height - 20 },
      fill: i === 0 ? colors.primary : 'transparent', // First item active
      stroke: i === 0 ? colors.primary : colors.text,
      strokeWidth: 1
    })
  }

  return {
    commands,
    explanation: `Created a navigation bar with ${itemCount} items at position (${position.x}, ${position.y})`,
    metadata: {
      type: 'composite',
      template: 'navBar',
      elementsCreated: commands.length,
      dimensions: { width, height }
    }
  }
}

/**
 * Create a card layout composite
 * @param {Object} options - Configuration options
 * @returns {Array} - Array of commands to create the card layout
 */
export const createCardLayoutComposite = (options = {}) => {
  const {
    position = { x: 200, y: 200 },
    cardCount = 3,
    cardWidth = 200,
    cardHeight = 250,
    spacing = 20,
    columns = 3,
    colors = {
      background: '#ffffff',
      border: '#e5e7eb',
      accent: '#3b82f6'
    }
  } = options

  const commands = []
  const cardsPerRow = Math.min(cardCount, columns)
  const rows = Math.ceil(cardCount / columns)

  for (let i = 0; i < cardCount; i++) {
    const row = Math.floor(i / columns)
    const col = i % columns
    
    const cardX = position.x + (col * (cardWidth + spacing))
    const cardY = position.y + (row * (cardHeight + spacing))

    // Card background
    commands.push({
      type: 'createRectangle',
      position: { x: cardX, y: cardY },
      size: { width: cardWidth, height: cardHeight },
      fill: colors.background,
      stroke: colors.border,
      strokeWidth: 1
    })

    // Card header (image placeholder)
    commands.push({
      type: 'createRectangle',
      position: { x: cardX, y: cardY },
      size: { width: cardWidth, height: cardHeight * 0.4 },
      fill: '#f3f4f6',
      strokeWidth: 0
    })

    // Card accent line
    commands.push({
      type: 'createRectangle',
      position: { x: cardX, y: cardY + (cardHeight * 0.4) },
      size: { width: cardWidth, height: 3 },
      fill: colors.accent,
      strokeWidth: 0
    })

    // Card content area (title placeholder)
    commands.push({
      type: 'createRectangle',
      position: { x: cardX + 15, y: cardY + (cardHeight * 0.4) + 20 },
      size: { width: cardWidth - 30, height: 20 },
      fill: '#374151',
      strokeWidth: 0
    })

    // Card content area (description placeholder)
    commands.push({
      type: 'createRectangle',
      position: { x: cardX + 15, y: cardY + (cardHeight * 0.4) + 50 },
      size: { width: cardWidth - 30, height: 40 },
      fill: '#9ca3af',
      strokeWidth: 0
    })
  }

  return {
    commands,
    explanation: `Created a card layout with ${cardCount} cards in a ${columns}-column grid at position (${position.x}, ${position.y})`,
    metadata: {
      type: 'composite',
      template: 'cardLayout',
      elementsCreated: commands.length,
      dimensions: { 
        width: (cardsPerRow * cardWidth) + ((cardsPerRow - 1) * spacing), 
        height: (rows * cardHeight) + ((rows - 1) * spacing)
      }
    }
  }
}

/**
 * Create a dashboard layout composite
 * @param {Object} options - Configuration options
 * @returns {Array} - Array of commands to create the dashboard
 */
export const createDashboardComposite = (options = {}) => {
  const {
    position = { x: 100, y: 100 },
    width = 900,
    height = 600,
    colors = {
      background: '#f9fafb',
      sidebar: '#1f2937',
      card: '#ffffff',
      primary: '#3b82f6',
      text: '#374151'
    }
  } = options

  const commands = []
  const sidebarWidth = 200
  const contentWidth = width - sidebarWidth
  const headerHeight = 60
  const cardSpacing = 20

  // Background
  commands.push({
    type: 'createRectangle',
    position: { x: position.x, y: position.y },
    size: { width: width, height: height },
    fill: colors.background,
    strokeWidth: 0
  })

  // Sidebar
  commands.push({
    type: 'createRectangle',
    position: { x: position.x, y: position.y },
    size: { width: sidebarWidth, height: height },
    fill: colors.sidebar,
    strokeWidth: 0
  })

  // Header
  commands.push({
    type: 'createRectangle',  
    position: { x: position.x + sidebarWidth, y: position.y },
    size: { width: contentWidth, height: headerHeight },
    fill: colors.card,
    stroke: '#e5e7eb',
    strokeWidth: 1
  })

  // Stats cards
  const cardWidth = (contentWidth - (cardSpacing * 4)) / 3
  const cardHeight = 120
  const cardY = position.y + headerHeight + cardSpacing

  for (let i = 0; i < 3; i++) {
    const cardX = position.x + sidebarWidth + cardSpacing + (i * (cardWidth + cardSpacing))
    
    commands.push({
      type: 'createRectangle',
      position: { x: cardX, y: cardY },
      size: { width: cardWidth, height: cardHeight },
      fill: colors.card,
      stroke: '#e5e7eb',
      strokeWidth: 1
    })

    // Card accent
    commands.push({
      type: 'createRectangle',
      position: { x: cardX, y: cardY },
      size: { width: cardWidth, height: 4 },
      fill: colors.primary,
      strokeWidth: 0
    })
  }

  // Chart area
  const chartY = cardY + cardHeight + cardSpacing
  const chartHeight = height - (chartY - position.y) - cardSpacing

  commands.push({
    type: 'createRectangle',
    position: { x: position.x + sidebarWidth + cardSpacing, y: chartY },
    size: { width: contentWidth - (cardSpacing * 2), height: chartHeight },
    fill: colors.card,
    stroke: '#e5e7eb',
    strokeWidth: 1
  })

  return {
    commands,
    explanation: `Created a dashboard layout with sidebar, header, stats cards, and chart area at position (${position.x}, ${position.y})`,
    metadata: {
      type: 'composite',
      template: 'dashboard',
      elementsCreated: commands.length,
      dimensions: { width, height }
    }
  }
}

/**
 * Create a button group composite
 * @param {Object} options - Configuration options
 * @returns {Array} - Array of commands to create the button group
 */
export const createButtonGroupComposite = (options = {}) => {
  const {
    position = { x: 300, y: 400 },
    buttonCount = 3,
    buttonWidth = 100,
    buttonHeight = 40,
    spacing = 5,
    orientation = 'horizontal', // 'horizontal' or 'vertical'
    colors = {
      primary: '#3b82f6',
      secondary: '#6b7280',
      success: '#10b981',
      danger: '#ef4444'
    }
  } = options

  const commands = []
  const buttonColors = [colors.primary, colors.secondary, colors.success, colors.danger]

  for (let i = 0; i < buttonCount; i++) {
    let buttonX, buttonY
    
    if (orientation === 'horizontal') {
      buttonX = position.x + (i * (buttonWidth + spacing))
      buttonY = position.y
    } else {
      buttonX = position.x
      buttonY = position.y + (i * (buttonHeight + spacing))
    }

    commands.push({
      type: 'createRectangle',
      position: { x: buttonX, y: buttonY },
      size: { width: buttonWidth, height: buttonHeight },
      fill: buttonColors[i % buttonColors.length],
      strokeWidth: 0
    })
  }

  return {
    commands,
    explanation: `Created a ${orientation} button group with ${buttonCount} buttons at position (${position.x}, ${position.y})`,
    metadata: {
      type: 'composite',
      template: 'buttonGroup',
      elementsCreated: commands.length,
      orientation
    }
  }
}

/**
 * Enhanced system prompt with composite commands
 */
export const getCompositeSystemPrompt = () => {
  return `
COMPOSITE COMMANDS:
9. TEMPLATES:
   - createLoginForm: Complete login form with fields and button
   - createNavBar: Navigation bar with multiple items
   - createCardLayout: Grid of cards with headers and content areas
   - createDashboard: Full dashboard with sidebar, header, and content areas
   - createButtonGroup: Group of styled buttons
   - createTRex: ASCII-art inspired T-Rex face with detailed features and proper layering

COMPOSITE COMMAND USAGE:
- Use composite commands for complex UI patterns and illustrations
- Specify position, colors, scale, and layout options
- Templates automatically handle spacing, alignment, and z-layering
- Multiple elements created with single command

COMPOSITE EXAMPLES:
{
  "type": "createLoginForm",
  "position": {"x": 400, "y": 200},
  "width": 300,
  "colors": {"primary": "#3b82f6", "background": "#ffffff"}
}

{
  "type": "createCardLayout", 
  "position": {"x": 100, "y": 100},
  "cardCount": 6,
  "columns": 3,
  "spacing": 20
}

{
  "type": "createTRex",
  "position": {"x": 400, "y": 200},
  "scale": 1.0
}
`
}

/**
 * Parse and execute composite commands
 * @param {Object} command - Composite command to parse
 * @returns {Object} - Parsed command result
 */
export const parseCompositeCommand = (command) => {
  switch (command.type) {
    case 'createLoginForm':
      return createLoginFormComposite(command)
      
    case 'createNavBar':
      return createNavBarComposite(command)
      
    case 'createCardLayout':
      return createCardLayoutComposite(command)
      
    case 'createDashboard':
      return createDashboardComposite(command)
      
    case 'createButtonGroup':
      return createButtonGroupComposite(command)
      
    case 'createTRex':
    case 'drawTRex':
    case 'createTRexFace':
    case 'drawTRexFace':
    case 'createDinosaur':
    case 'drawDinosaur':
      return createTRexFaceComposite(command)
      
    default:
      throw new Error(`Unknown composite command: ${command.type}`)
  }
}

/**
 * Check if a command is a composite command
 * @param {Object} command - Command to check
 * @returns {boolean} - True if composite command
 */
export const isCompositeCommand = (command) => {
  const compositeTypes = [
    'createLoginForm',
    'createNavBar', 
    'createCardLayout',
    'createDashboard',
    'createButtonGroup',
    'createTRex',
    'drawTRex',
    'createTRexFace',
    'drawTRexFace',
    'createDinosaur',
    'drawDinosaur'
  ]
  
  return compositeTypes.includes(command?.type)
}

export const createTRexFaceComposite = (options = {}) => {
  const {
    position = { x: 400, y: 300 }, // Default to canvas center-ish
    scale = 1.0 // Allow scaling while maintaining proportions
  } = options

  // ASCII-art inspired T-Rex face blueprint - following exact user specifications
  const blueprint = [
    // Layer 1 - Background (light blue rectangle, 400x450)
    { "type": "rectangle", "x": 0, "y": 0, "width": 400, "height": 450, "color": "#87CEEB", "layer": 1 },
    
    // Layer 2 - Main head (green rectangle, 200x160, corner radius 30)
    { "type": "rectangle", "x": 100, "y": 120, "width": 200, "height": 160, "color": "#8FB830", "layer": 2 },
    
    // Layer 3 - Snout/jaw (olive rectangle, 240x120, corner radius 40)
    { "type": "rectangle", "x": 80, "y": 240, "width": 240, "height": 120, "color": "#7BA428", "layer": 3 },
    
    // Layer 4 - Upper jaw detail (dark olive rectangle, 220x40, corner radius 20)
    { "type": "rectangle", "x": 90, "y": 260, "width": 220, "height": 40, "color": "#6B8E23", "layer": 4 },
    
    // Layer 5 - Head bumps/ridges (dark olive circles)
    { "type": "circle", "x": 130, "y": 130, "radius": 15, "color": "#6B8E23", "layer": 5 },
    { "type": "circle", "x": 200, "y": 120, "radius": 18, "color": "#6B8E23", "layer": 5 },
    { "type": "circle", "x": 270, "y": 130, "radius": 15, "color": "#6B8E23", "layer": 5 },
    { "type": "circle", "x": 95, "y": 160, "radius": 12, "color": "#6B8E23", "layer": 5 },
    { "type": "circle", "x": 305, "y": 160, "radius": 12, "color": "#6B8E23", "layer": 5 },
    
    // Layer 6 - Eye ridges (dark olive rectangles, rotated)
    { "type": "rectangle", "x": 125, "y": 145, "width": 50, "height": 15, "color": "#6B8E23", "rotation": -10, "layer": 6 },
    { "type": "rectangle", "x": 225, "y": 145, "width": 50, "height": 15, "color": "#6B8E23", "rotation": 10, "layer": 6 },
    
    // Layer 7 - Eye whites (white circles, radius 30)
    { "type": "circle", "x": 150, "y": 180, "radius": 30, "color": "white", "layer": 7 },
    { "type": "circle", "x": 250, "y": 180, "radius": 30, "color": "white", "layer": 7 },
    
    // Layer 8 - Pupils (black circles, radius 18)
    { "type": "circle", "x": 150, "y": 180, "radius": 18, "color": "black", "layer": 8 },
    { "type": "circle", "x": 250, "y": 180, "radius": 18, "color": "black", "layer": 8 },
    
    // Layer 9 - Eye highlights (white circles, radius 6)
    { "type": "circle", "x": 156, "y": 174, "radius": 6, "color": "white", "layer": 9 },
    { "type": "circle", "x": 256, "y": 174, "radius": 6, "color": "white", "layer": 9 },
    
    // Layer 10 - Nostrils (dark olive circles, radius 12)
    { "type": "circle", "x": 150, "y": 280, "radius": 12, "color": "#4A5F1F", "layer": 10 },
    { "type": "circle", "x": 250, "y": 280, "radius": 12, "color": "#4A5F1F", "layer": 10 },
    
    // Layer 11 - Mouth line (very dark green rectangle, 160x6)
    { "type": "rectangle", "x": 120, "y": 318, "width": 160, "height": 6, "color": "#2F3F1F", "layer": 11 },
    
    // Layer 12 - Teeth (7 white rectangles with varying heights)
    { "type": "rectangle", "x": 130, "y": 318, "width": 12, "height": 25, "color": "#FFF", "layer": 12 },
    { "type": "rectangle", "x": 150, "y": 318, "width": 10, "height": 20, "color": "#FFF", "layer": 12 },
    { "type": "rectangle", "x": 168, "y": 318, "width": 12, "height": 28, "color": "#FFF", "layer": 12 },
    { "type": "rectangle", "x": 188, "y": 318, "width": 14, "height": 22, "color": "#FFF", "layer": 12 },
    { "type": "rectangle", "x": 210, "y": 318, "width": 12, "height": 26, "color": "#FFF", "layer": 12 },
    { "type": "rectangle", "x": 230, "y": 318, "width": 10, "height": 20, "color": "#FFF", "layer": 12 },
    { "type": "rectangle", "x": 248, "y": 318, "width": 12, "height": 24, "color": "#FFF", "layer": 12 },
    
    // Layer 13 - Text "ROAR" (dark green, 48px, centered at 200, 60)
    { "type": "text", "x": 200, "y": 60, "text": "ROAR", "fontSize": 48, "color": "#2F3F1F", "layer": 13 }
  ]

  const commands = []
  
  // Calculate offset from blueprint's origin (200, 225) to desired position
  const originX = 200
  const originY = 225
  const offsetX = position.x - originX
  const offsetY = position.y - originY

  // Convert blueprint to commands, sorted by layer for proper z-order
  const sortedBlueprint = blueprint.sort((a, b) => a.layer - b.layer)
  
  for (const shape of sortedBlueprint) {
    const scaledX = originX + (shape.x - originX) * scale + offsetX
    const scaledY = originY + (shape.y - originY) * scale + offsetY

    switch (shape.type) {
      case 'circle':
        commands.push({
          type: 'createCircle',
          position: { x: scaledX, y: scaledY },
          radius: shape.radius * scale,
          fill: shape.color,
          zIndex: shape.layer
        })
        break
        
      case 'rectangle':
        commands.push({
          type: 'createRectangle',
          position: { x: scaledX, y: scaledY },
          size: { 
            width: shape.width * scale, 
            height: shape.height * scale 
          },
          fill: shape.color,
          rotation: shape.rotation || 0,
          zIndex: shape.layer
        })
        break
        
      case 'text':
        commands.push({
          type: 'createText',
          position: { x: scaledX, y: scaledY },
          text: shape.text,
          fontSize: shape.fontSize * scale,
          fill: shape.color,
          zIndex: shape.layer
        })
        break
    }
  }

  return {
    commands,
    explanation: `Created ASCII-art inspired T-Rex face with ${commands.length} shapes: detailed head structure, eyes with highlights, nostrils, mouth with 7 teeth, and "ROAR" text at position (${position.x}, ${position.y}) with ${scale}x scale`,
    metadata: { 
      type: 'composite', 
      subtype: 'ascii_trex_face',
      shapeCount: commands.length,
      basePosition: position,
      scale: scale,
      canvasSize: { width: 400 * scale, height: 450 * scale }
    }
  }
}


export default {
  createLoginFormComposite,
  createNavBarComposite,
  createCardLayoutComposite,
  createDashboardComposite,
  createButtonGroupComposite,
  createTRexFaceComposite,
  parseCompositeCommand,
  isCompositeCommand,
  getCompositeSystemPrompt
}
