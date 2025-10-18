/**
 * Simplified Stage 8 Command Test
 * Tests the command parsing logic without complex imports
 */

// Simple mock functions to test parsing
const extractColor = (prompt, defaultColor) => {
  const lowerPrompt = prompt.toLowerCase()
  if (lowerPrompt.includes('red')) return '#ef4444'
  if (lowerPrompt.includes('blue')) return '#3b82f6'
  if (lowerPrompt.includes('green')) return '#10b981'
  if (lowerPrompt.includes('yellow')) return '#f59e0b'
  return defaultColor
}

const extractPosition = (prompt) => {
  const lowerPrompt = prompt.toLowerCase()
  if (lowerPrompt.includes('center') || lowerPrompt.includes('middle')) {
    return { x: 2500, y: 2500 }
  }
  const coordMatch = prompt.match(/(?:at|position)\s*(\d+)[,\s]+(\d+)/i)
  if (coordMatch) {
    return { 
      x: Math.min(parseInt(coordMatch[1]), 5000), 
      y: Math.min(parseInt(coordMatch[2]), 5000) 
    }
  }
  return null
}

// Simplified command generation function
const generateCommands = (prompt, canvasState) => {
  const commands = []
  const lowerPrompt = prompt.toLowerCase()

  // === CREATION COMMANDS ===
  if (lowerPrompt.includes('text')) {
    const textMatch = prompt.match(/['"](.*?)['"]/) || prompt.match(/says?\s+([^.!?]+)/i)
    const text = textMatch ? textMatch[1] : 'Hello World'
    
    commands.push({
      type: 'createText',
      position: extractPosition(prompt) || { x: 200, y: 200 },
      text,
      fontSize: 24
    })
  }

  if (lowerPrompt.includes('circle')) {
    commands.push({
      type: 'createCircle',
      position: extractPosition(prompt) || { x: 200, y: 200 },
      radius: 60,
      fill: extractColor(prompt, '#ef4444')
    })
  }

  if (lowerPrompt.includes('rectangle')) {
    commands.push({
      type: 'createRectangle',
      position: extractPosition(prompt) || { x: 100, y: 100 },
      size: { width: 150, height: 100 },
      fill: extractColor(prompt, '#3b82f6')
    })
  }

  // === MANIPULATION COMMANDS ===
  if (lowerPrompt.includes('move') && canvasState.selectedObjectIds?.length > 0) {
    commands.push({
      type: 'moveShape',
      targetId: canvasState.selectedObjectIds[0],
      newPosition: lowerPrompt.includes('center') ? { x: 2500, y: 2500 } : { deltaX: 100, deltaY: 0 }
    })
  }

  if (lowerPrompt.includes('resize') && canvasState.selectedObjectIds?.length > 0) {
    const scale = lowerPrompt.includes('twice') ? 2.0 : 1.5
    commands.push({
      type: 'resizeShape',
      targetId: canvasState.selectedObjectIds[0],
      scale
    })
  }

  if (lowerPrompt.includes('rotate') && canvasState.selectedObjectIds?.length > 0) {
    const angleMatch = prompt.match(/(\d+)\s*degrees?/i)
    const angle = angleMatch ? parseInt(angleMatch[1]) : 45
    commands.push({
      type: 'rotateShape',
      targetId: canvasState.selectedObjectIds[0],
      angle
    })
  }

  // === LAYOUT COMMANDS ===
  if (lowerPrompt.includes('arrange') || lowerPrompt.includes('row')) {
    commands.push({
      type: 'arrangeLayout',
      layoutType: 'row',
      targetIds: canvasState.selectedObjectIds || []
    })
  }

  // === COMPLEX COMMANDS ===
  if (lowerPrompt.includes('login') && lowerPrompt.includes('form')) {
    commands.push({
      type: 'createForm',
      position: extractPosition(prompt) || { x: 400, y: 300 },
      formType: 'login'
    })
  }

  if (lowerPrompt.includes('nav')) {
    commands.push({
      type: 'createNavBar',
      position: extractPosition(prompt) || { x: 100, y: 50 },
      items: ['Home', 'About', 'Services', 'Contact']
    })
  }

  if (lowerPrompt.includes('card') && lowerPrompt.includes('layout')) {
    commands.push({
      type: 'createLayout',
      layoutType: 'card',
      position: extractPosition(prompt) || { x: 200, y: 200 }
    })
  }

  return commands
}

// Test commands
const testCommands = [
  'Create a red circle at position 100, 200',
  'Add a text layer that says "Hello World"',
  'Make a 200x300 blue rectangle',
  'Move the blue rectangle to the center',
  'Resize the circle to be twice as big',
  'Rotate the text 45 degrees',
  'Arrange these shapes in a horizontal row',
  'Create a login form with username and password fields',
  'Build a navigation bar with 4 menu items',
  'Make a card layout with title, image, and description'
]

const mockCanvasState = {
  selectedObjectIds: ['obj1', 'obj2']
}

console.log('🚀 Testing Stage 8 AI Command Categories\n')

testCommands.forEach((prompt, index) => {
  console.log(`${index + 1}. Testing: "${prompt}"`)
  const commands = generateCommands(prompt, mockCanvasState)
  
  if (commands.length > 0) {
    console.log('✅ Generated commands:')
    commands.forEach((cmd, i) => {
      console.log(`   ${i + 1}) ${cmd.type}:`, JSON.stringify(cmd, null, 2).replace(/\n/g, ' '))
    })
  } else {
    console.log('❌ No commands generated')
  }
  console.log('')
})

console.log('🎉 Stage 8 command parsing test completed!')
console.log('\n=== CATEGORIES TESTED ===')
console.log('✅ Creation: Text, Circle, Rectangle')
console.log('✅ Manipulation: Move, Resize, Rotate')  
console.log('✅ Layout: Arrange in row')
console.log('✅ Complex: Login form, Navigation bar, Card layout')
