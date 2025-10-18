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
      background: '#ffffff',
      primary: '#3b82f6',
      text: '#374151',
      border: '#d1d5db'
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
    strokeWidth: 1
  })

  currentY += spacing

  // Title
  commands.push({
    type: 'createRectangle', // Using rectangle as text placeholder
    position: { x: position.x + spacing, y: currentY },
    size: { width: width - (spacing * 2), height: 30 },
    fill: colors.text,
    // Note: In a real implementation, this would be a text element
  })

  currentY += 50

  // Username field
  commands.push({
    type: 'createRectangle',
    position: { x: position.x + spacing, y: currentY },
    size: { width: width - (spacing * 2), height: 40 },
    fill: '#f9fafb',
    stroke: colors.border,
    strokeWidth: 1
  })

  currentY += 60

  // Password field  
  commands.push({
    type: 'createRectangle',
    position: { x: position.x + spacing, y: currentY },
    size: { width: width - (spacing * 2), height: 40 },
    fill: '#f9fafb',
    stroke: colors.border,
    strokeWidth: 1
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
   - createCardLayout: Grid of cards with headers and content
   - createDashboard: Full dashboard with sidebar, header, and content areas
   - createButtonGroup: Group of styled buttons

COMPOSITE COMMAND USAGE:
- Use composite commands for complex UI patterns
- Specify position, colors, and layout options
- Templates automatically handle spacing and alignment
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
    'createButtonGroup'
  ]
  
  return compositeTypes.includes(command?.type)
}

export default {
  createLoginFormComposite,
  createNavBarComposite,
  createCardLayoutComposite,
  createDashboardComposite,
  createButtonGroupComposite,
  parseCompositeCommand,
  isCompositeCommand,
  getCompositeSystemPrompt
}
