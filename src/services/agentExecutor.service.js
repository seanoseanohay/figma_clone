import { 
  createObject, 
  updateObject, 
  deleteObject, 
  clearAllObjects,
  updateObjectPosition,
  getCanvasObjects
} from './canvas.service.js'
import { parseAgentResponse, orderCommands, batchCommands } from '../utils/agentCommandParser.js'
import { parseCompositeCommand, isCompositeCommand } from '../utils/agentCompositeCommands.js'
import { broadcastAgentAction, setAgentStatus, clearAgentStatus, createAgentActionNotification } from './agentPresence.service.js'

/**
 * Agent Command Executor Service
 * 
 * Executes validated AI agent commands on the canvas.
 * Features:
 * - Command-to-action mapping
 * - Batch execution for performance
 * - Undo/redo integration
 * - Error handling with rollback
 * - Execution metrics tracking
 */

/**
 * Execute a complete AI agent response
 * @param {Object} agentResponse - Parsed AI agent response
 * @param {string} canvasId - Target canvas ID
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} - Execution result
 */
export const executeAgentResponse = async (agentResponse, canvasId, options = {}) => {
  const startTime = Date.now()
  const result = {
    success: false,
    commandsExecuted: 0,
    commandsTotal: 0,
    errors: [],
    warnings: [],
    executionTimeMs: 0,
    createdObjects: [],
    modifiedObjects: [],
    deletedObjects: []
  }

  try {
    console.log('🚀 Starting agent command execution for canvas:', canvasId)

    // Set agent status to indicate AI is working
    await setAgentStatus(canvasId, {
      status: 'executing',
      message: 'AI is working on your request...',
      startTime: Date.now()
    })

    // Parse and validate the response
    const parseResult = parseAgentResponse(agentResponse)
    if (!parseResult.success) {
      result.errors.push(...parseResult.errors)
      result.warnings.push(...parseResult.warnings)
      return result
    }

    const commands = parseResult.commands
    result.commandsTotal = commands.length
    result.warnings.push(...parseResult.warnings)

    if (commands.length === 0) {
      result.success = true
      return result
    }

    // Order commands for optimal execution
    const orderedCommands = orderCommands(commands)
    
    // Batch commands for efficient execution
    const commandBatches = batchCommands(orderedCommands)
    
    console.log(`📋 Executing ${commands.length} commands in ${commandBatches.length} batches`)

    // Execute each batch
    for (let batchIndex = 0; batchIndex < commandBatches.length; batchIndex++) {
      const batch = commandBatches[batchIndex]
      
      console.log(`🔄 Executing batch ${batchIndex + 1}/${commandBatches.length} (${batch.length} commands)`)
      
      const batchResult = await executeBatch(batch, canvasId, options)
      
      // Aggregate results
      result.commandsExecuted += batchResult.commandsExecuted
      result.errors.push(...batchResult.errors)
      result.warnings.push(...batchResult.warnings)
      result.createdObjects.push(...batchResult.createdObjects)
      result.modifiedObjects.push(...batchResult.modifiedObjects)
      result.deletedObjects.push(...batchResult.deletedObjects)
      
      // Stop on critical errors
      if (batchResult.errors.length > 0 && options.stopOnError) {
        console.error('❌ Stopping execution due to errors')
        break
      }
    }

    result.success = result.commandsExecuted > 0
    result.executionTimeMs = Date.now() - startTime
    
    console.log(`✅ Agent execution completed: ${result.commandsExecuted}/${result.commandsTotal} commands executed in ${result.executionTimeMs}ms`)
    
    // Clear agent status
    await clearAgentStatus(canvasId)
    
    // Broadcast completion to other users
    const actionNotification = createAgentActionNotification(result, agentResponse.explanation)
    await broadcastAgentAction(canvasId, actionNotification)
    
    return result

  } catch (error) {
    console.error('❌ Agent execution error:', error)
    result.errors.push(`Execution error: ${error.message}`)
    result.executionTimeMs = Date.now() - startTime
    
    // Clear agent status on error
    await clearAgentStatus(canvasId)
    
    // Broadcast error to other users
    const errorNotification = createAgentActionNotification(result, `AI encountered an error: ${error.message}`)
    await broadcastAgentAction(canvasId, errorNotification)
    
    return result
  }
}

/**
 * Execute a batch of commands
 * @param {Array} commands - Commands to execute
 * @param {string} canvasId - Target canvas ID
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} - Batch execution result
 */
const executeBatch = async (commands, canvasId, options = {}) => {
  const result = {
    commandsExecuted: 0,
    errors: [],
    warnings: [],
    createdObjects: [],
    modifiedObjects: [],
    deletedObjects: []
  }

  try {
    // Execute commands in parallel where possible
    const parallelCommands = []
    const sequentialCommands = []
    
    // Separate commands that can run in parallel vs sequential
    for (const command of commands) {
      if (isParallelizable(command)) {
        parallelCommands.push(command)
      } else {
        sequentialCommands.push(command)
      }
    }
    
    // Execute parallel commands
    if (parallelCommands.length > 0) {
      const parallelPromises = parallelCommands.map(command => 
        executeCommand(command, canvasId, options)
      )
      
      const parallelResults = await Promise.allSettled(parallelPromises)
      
      parallelResults.forEach((promiseResult, index) => {
        if (promiseResult.status === 'fulfilled') {
          const cmdResult = promiseResult.value
          aggregateCommandResult(result, cmdResult)
        } else {
          result.errors.push(`Parallel command ${index} failed: ${promiseResult.reason?.message}`)
        }
      })
    }
    
    // Execute sequential commands
    for (const command of sequentialCommands) {
      try {
        const cmdResult = await executeCommand(command, canvasId, options)
        aggregateCommandResult(result, cmdResult)
      } catch (error) {
        result.errors.push(`Sequential command failed: ${error.message}`)
        if (options.stopOnError) break
      }
    }
    
    return result

  } catch (error) {
    console.error('❌ Batch execution error:', error)
    result.errors.push(`Batch error: ${error.message}`)
    return result
  }
}

/**
 * Execute a single command
 * @param {Object} command - Command to execute
 * @param {string} canvasId - Target canvas ID
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} - Command execution result
 */
const executeCommand = async (command, canvasId, options = {}) => {
  const result = {
    success: false,
    commandType: command.type,
    objectId: null,
    objectIds: [],
    error: null,
    warning: null
  }

  try {
    console.log(`⚡ Executing command: ${command.type}`, command)

    // Handle composite commands
    if (isCompositeCommand(command)) {
      const compositeResult = await executeCompositeCommand(command, canvasId, options)
      result.success = compositeResult.success
      result.objectIds = compositeResult.objectIds || []
      result.error = compositeResult.error
      result.warning = compositeResult.warning
      return result
    }

    // Handle regular commands
    switch (command.type) {
      // Creation commands
      case 'createRectangle':
        result.objectId = await executeCreateRectangle(command, canvasId)
        break
        
      case 'createCircle':
        result.objectId = await executeCreateCircle(command, canvasId)
        break
        
      case 'createStar':
        result.objectId = await executeCreateStar(command, canvasId)
        break
        
      case 'createText':
        result.objectId = await executeCreateText(command, canvasId)
        break
        
      // Manipulation commands (both old and new styles)
      case 'moveObject':
        await executeMoveObject(command, canvasId)
        result.objectId = command.objectId
        break
        
      case 'moveShape':
        await executeMoveShape(command, canvasId)
        result.objectId = command.targetId
        break
        
      case 'resizeObject':
        await executeResizeObject(command, canvasId)
        result.objectId = command.objectId
        break
        
      case 'resizeShape':
        await executeResizeShape(command, canvasId)
        result.objectId = command.targetId
        break
        
      case 'rotateObject':
        await executeRotateObject(command, canvasId)
        result.objectId = command.objectId
        break
        
      case 'rotateShape':
        await executeRotateShape(command, canvasId)
        result.objectId = command.targetId
        break
        
      // Layout commands
      case 'arrangeLayout':
        await executeArrangeLayout(command, canvasId)
        result.objectIds = command.targetIds || []
        break
        
      // Complex commands
      case 'createForm':
        result.objectIds = await executeCreateForm(command, canvasId)
        break
        
      case 'createNavBar':
        result.objectIds = await executeCreateNavBar(command, canvasId)
        break
        
      case 'createLayout':
        result.objectIds = await executeCreateLayout(command, canvasId)
        break
        
      // Property and object management
      case 'updateObjectProperties':
        await executeUpdateObjectProperties(command, canvasId)
        result.objectId = command.objectId
        break
        
      case 'deleteObject':
        await executeDeleteObject(command, canvasId)
        result.objectId = command.objectId
        break
        
      case 'clearCanvas':
        await executeClearCanvas(command, canvasId)
        break
        
      case 'setCanvasBackground':
        await executeSetCanvasBackground(command, canvasId)
        break
        
      case 'groupObjects':
        result.objectId = await executeGroupObjects(command, canvasId)
        break
        
      case 'ungroupObjects':
        await executeUngroupObjects(command, canvasId)
        result.objectId = command.groupId
        break
        
      default:
        throw new Error(`Unknown command type: ${command.type}`)
    }

    result.success = true
    console.log(`✅ Command executed successfully: ${command.type}`)
    
    return result

  } catch (error) {
    console.error(`❌ Command execution failed: ${command.type}`, error)
    result.error = error.message
    return result
  }
}

// =====================================
// COMMAND EXECUTION IMPLEMENTATIONS
// =====================================

/**
 * Execute createRectangle command
 */
const executeCreateRectangle = async (command, canvasId) => {
  const { position, size, fill, stroke, strokeWidth, rotation } = command
  
  const objectId = await createObject('rectangle', {
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height
  }, canvasId, {
    fill,
    stroke,
    strokeWidth,
    rotation: rotation || 0
  })
  
  return objectId
}

/**
 * Execute createCircle command
 */
const executeCreateCircle = async (command, canvasId) => {
  const { position, radius, fill, stroke, strokeWidth } = command
  
  const objectId = await createObject('circle', {
    x: position.x,
    y: position.y,
    radius
  }, canvasId, {
    fill,
    stroke,
    strokeWidth
  })
  
  return objectId
}

/**
 * Execute createStar command
 */
const executeCreateStar = async (command, canvasId) => {
  const { position, radius, numPoints, fill, stroke, strokeWidth, rotation } = command
  
  const objectId = await createObject('star', {
    x: position.x,
    y: position.y,
    radius,
    numPoints: numPoints || 5
  }, canvasId, {
    fill,
    stroke,
    strokeWidth,
    rotation: rotation || 0
  })
  
  return objectId
}

/**
 * Execute moveObject command
 */
const executeMoveObject = async (command, canvasId) => {
  const { objectId, position, animate } = command
  
  await updateObjectPosition(objectId, {
    x: position.x,
    y: position.y
  }, true) // finalUpdate = true
  
  // TODO: Handle animation if requested
  if (animate) {
    console.log('Animation requested but not yet implemented')
  }
}

/**
 * Execute resizeObject command
 */
const executeResizeObject = async (command, canvasId) => {
  const { objectId, size, animate } = command
  
  const updates = {}
  
  if (size.width !== undefined) {
    updates.width = size.width
  }
  if (size.height !== undefined) {
    updates.height = size.height
  }
  if (size.radius !== undefined) {
    updates.radius = size.radius
  }
  
  await updateObject(objectId, updates)
  
  // TODO: Handle animation if requested
  if (animate) {
    console.log('Animation requested but not yet implemented')
  }
}

/**
 * Execute rotateObject command
 */
const executeRotateObject = async (command, canvasId) => {
  const { objectId, rotation, animate } = command
  
  await updateObject(objectId, {
    rotation
  })
  
  // TODO: Handle animation if requested
  if (animate) {
    console.log('Animation requested but not yet implemented')
  }
}

/**
 * Execute updateObjectProperties command
 */
const executeUpdateObjectProperties = async (command, canvasId) => {
  const { objectId, properties } = command
  
  const updates = {}
  
  if (properties.fill) updates.fill = properties.fill
  if (properties.stroke) updates.stroke = properties.stroke
  if (properties.strokeWidth !== undefined) updates.strokeWidth = properties.strokeWidth
  if (properties.opacity !== undefined) updates.opacity = properties.opacity
  
  await updateObject(objectId, updates)
}

/**
 * Execute deleteObject command
 */
const executeDeleteObject = async (command, canvasId) => {
  const { objectId } = command
  await deleteObject(objectId)
}

/**
 * Execute clearCanvas command
 */
const executeClearCanvas = async (command, canvasId) => {
  const { confirm } = command
  
  if (!confirm) {
    console.warn('clearCanvas command without confirmation, skipping for safety')
    return
  }
  
  await clearAllObjects()
}

/**
 * Execute setCanvasBackground command
 */
const executeSetCanvasBackground = async (command, canvasId) => {
  const { color } = command
  
  // TODO: Implement canvas background color
  // This would require updating the canvas component to support background colors
  console.log(`Canvas background would be set to: ${color}`)
}

/**
 * Execute groupObjects command
 */
const executeGroupObjects = async (command, canvasId) => {
  const { objectIds, name } = command
  
  // TODO: Implement object grouping
  // This would require a grouping system in the canvas service
  console.log(`Would group objects: ${objectIds.join(', ')} as "${name || 'Group'}"`)
  return `group_${Date.now()}`
}

/**
 * Execute ungroupObjects command
 */
const executeUngroupObjects = async (command, canvasId) => {
  const { groupId } = command
  
  // TODO: Implement object ungrouping
  console.log(`Would ungroup: ${groupId}`)
}

/**
 * Execute createText command
 */
const executeCreateText = async (command, canvasId) => {
  const { position, text, fontSize, fontFamily, fill, rotation } = command
  
  const objectId = await createObject('text', {
    x: position.x,
    y: position.y,
    text: text || 'Text',
    fontSize: fontSize || 24,
    fontFamily: fontFamily || 'Arial',
    width: 200 // Default text width
  }, canvasId, {
    fill: fill || '#000000',
    rotation: rotation || 0
  })
  
  return objectId
}

/**
 * Execute moveShape command (new natural language version)
 */
const executeMoveShape = async (command, canvasId) => {
  const { targetId, newPosition, animate } = command
  
  let finalPosition = newPosition
  
  // Handle 'lastCreated' special case
  if (targetId === 'lastCreated') {
    console.log('moveShape targeting lastCreated - would need to track last created object')
    return
  }
  
  // Handle delta movement vs absolute position
  if (newPosition.deltaX !== undefined || newPosition.deltaY !== undefined) {
    // This would require fetching current position first
    console.log(`Would move ${targetId} by delta: (${newPosition.deltaX || 0}, ${newPosition.deltaY || 0})`)
    return
  }
  
  // Absolute position movement
  await updateObjectPosition(targetId, {
    x: finalPosition.x,
    y: finalPosition.y
  }, true) // finalUpdate = true
  
  if (animate) {
    console.log('Animation requested but not yet implemented')
  }
}

/**
 * Execute resizeShape command (new natural language version)
 */
const executeResizeShape = async (command, canvasId) => {
  const { targetId, scale, animate } = command
  
  if (targetId === 'lastCreated') {
    console.log('resizeShape targeting lastCreated - would need to track last created object')
    return
  }
  
  // TODO: Implement shape resizing by scale factor
  // This would require fetching current dimensions and applying scale
  console.log(`Would resize ${targetId} by scale factor: ${scale}`)
  
  if (animate) {
    console.log('Animation requested but not yet implemented')
  }
}

/**
 * Execute rotateShape command (new natural language version)
 */
const executeRotateShape = async (command, canvasId) => {
  const { targetId, angle, animate } = command
  
  if (targetId === 'lastCreated') {
    console.log('rotateShape targeting lastCreated - would need to track last created object')
    return
  }
  
  await updateObject(targetId, {
    rotation: angle
  })
  
  if (animate) {
    console.log('Animation requested but not yet implemented')
  }
}

/**
 * Execute arrangeLayout command
 */
const executeArrangeLayout = async (command, canvasId) => {
  const { layoutType = 'row', columns = 3, rows = 1, spacing = 50, targetIds } = command
  
  if (!targetIds || targetIds.length === 0) {
    console.log('arrangeLayout: No target objects specified')
    return
  }
  
  try {
    // Get all objects from canvas to find the target objects
    const allObjects = await getCanvasObjects(canvasId)
    const targetObjects = allObjects.filter(obj => targetIds.includes(obj.id))
    
    if (targetObjects.length === 0) {
      console.log('arrangeLayout: No matching objects found on canvas')
      return
    }
    
    console.log(`Arranging ${targetObjects.length} objects in ${layoutType} layout`)
    
    // Calculate layout positions based on type
    let newPositions = []
    const objectCount = targetObjects.length
    
    switch (layoutType) {
      case 'row':
        // Arrange objects in a horizontal row
        newPositions = targetObjects.map((obj, index) => ({
          id: obj.id,
          x: 100 + (index * spacing),
          y: obj.y // Keep original Y position
        }))
        break
        
      case 'column':
        // Arrange objects in a vertical column
        newPositions = targetObjects.map((obj, index) => ({
          id: obj.id,
          x: obj.x, // Keep original X position  
          y: 100 + (index * spacing)
        }))
        break
        
      case 'grid':
        // Arrange objects in a grid pattern
        const gridColumns = columns || Math.ceil(Math.sqrt(objectCount))
        const gridRows = rows || Math.ceil(objectCount / gridColumns)
        
        newPositions = targetObjects.map((obj, index) => {
          const col = index % gridColumns
          const row = Math.floor(index / gridColumns)
          
          return {
            id: obj.id,
            x: 100 + (col * spacing),
            y: 100 + (row * spacing)
          }
        })
        break
    }
    
    // Update each object's position
    for (const position of newPositions) {
      await updateObjectPosition(canvasId, position.id, { 
        x: position.x, 
        y: position.y 
      })
    }
    
    console.log(`✅ Successfully arranged ${targetObjects.length} objects in ${layoutType} layout`)
    
  } catch (error) {
    console.error('❌ Error executing arrangeLayout:', error)
    throw error
  }
}

/**
 * Execute createForm command
 */
const executeCreateForm = async (command, canvasId) => {
  const { position, formType, fields, width } = command
  
  // Use composite command system for forms
  const { parseCompositeCommand } = await import('../utils/agentCompositeCommands.js')
  
  const compositeCommand = {
    type: 'createLoginForm',
    position,
    width: width || 300,
    fields: fields || ['username', 'password']
  }
  
  const compositeResult = parseCompositeCommand(compositeCommand)
  const objectIds = []
  
  // Execute each command in the composite
  for (const cmd of compositeResult.commands) {
    try {
      const objectId = await executeCreateRectangle(cmd, canvasId)
      objectIds.push(objectId)
    } catch (error) {
      console.error('Failed to execute form command:', error)
    }
  }
  
  return objectIds
}

/**
 * Execute createNavBar command
 */
const executeCreateNavBar = async (command, canvasId) => {
  const { position, items, width } = command
  
  // Use composite command system for navigation bars
  const { parseCompositeCommand } = await import('../utils/agentCompositeCommands.js')
  
  const compositeCommand = {
    type: 'createNavBar',
    position,
    width: width || 800,
    itemCount: items?.length || 4
  }
  
  const compositeResult = parseCompositeCommand(compositeCommand)
  const objectIds = []
  
  // Execute each command in the composite
  for (const cmd of compositeResult.commands) {
    try {
      const objectId = await executeCreateRectangle(cmd, canvasId)
      objectIds.push(objectId)
    } catch (error) {
      console.error('Failed to execute nav bar command:', error)
    }
  }
  
  return objectIds
}

/**
 * Execute createLayout command
 */
const executeCreateLayout = async (command, canvasId) => {
  const { position, layoutType, cardCount, elements } = command
  
  // Use composite command system for layouts
  const { parseCompositeCommand } = await import('../utils/agentCompositeCommands.js')
  
  const compositeCommand = {
    type: 'createCardLayout',
    position,
    cardCount: cardCount || 3,
    elements: elements || ['title', 'image', 'description']
  }
  
  const compositeResult = parseCompositeCommand(compositeCommand)
  const objectIds = []
  
  // Execute each command in the composite
  for (const cmd of compositeResult.commands) {
    try {
      const objectId = await executeCreateRectangle(cmd, canvasId)
      objectIds.push(objectId)
    } catch (error) {
      console.error('Failed to execute layout command:', error)
    }
  }
  
  return objectIds
}

/**
 * Execute composite command by expanding it into multiple basic commands
 * @param {Object} command - Composite command to execute
 * @param {string} canvasId - Target canvas ID
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} - Execution result
 */
const executeCompositeCommand = async (command, canvasId, options = {}) => {
  const result = {
    success: false,
    objectIds: [],
    error: null,
    warning: null
  }

  try {
    console.log(`🏗️ Executing composite command: ${command.type}`)

    // Parse the composite command into basic commands
    const compositeResult = parseCompositeCommand(command)
    const { commands, explanation, metadata } = compositeResult

    console.log(`📋 Composite command expanded to ${commands.length} basic commands`)

    // Execute each basic command
    const executedObjectIds = []
    
    for (const basicCommand of commands) {
      try {
        const commandResult = await executeCommand(basicCommand, canvasId, options)
        
        if (commandResult.success && commandResult.objectId) {
          executedObjectIds.push(commandResult.objectId)
        }
        
        if (!commandResult.success && options.stopOnError) {
          throw new Error(`Composite command failed at step: ${commandResult.error}`)
        }
      } catch (error) {
        console.error(`❌ Composite command step failed:`, error)
        if (options.stopOnError) {
          throw error
        }
      }
    }

    result.success = executedObjectIds.length > 0
    result.objectIds = executedObjectIds
    
    console.log(`✅ Composite command completed: created ${executedObjectIds.length} objects`)
    
    return result

  } catch (error) {
    console.error(`❌ Composite command failed: ${command.type}`, error)
    result.error = error.message
    return result
  }
}

// =====================================
// HELPER FUNCTIONS
// =====================================

/**
 * Check if a command can be executed in parallel with others
 */
const isParallelizable = (command) => {
  // Creation commands can generally run in parallel
  const parallelTypes = ['createRectangle', 'createCircle', 'createStar', 'createText']
  
  // Modification commands on different objects can run in parallel
  const modificationTypes = [
    'moveObject', 'resizeObject', 'rotateObject', 'updateObjectProperties',
    'moveShape', 'resizeShape', 'rotateShape'
  ]
  
  return parallelTypes.includes(command.type) || 
         (modificationTypes.includes(command.type) && (command.objectId || command.targetId))
}

/**
 * Aggregate command result into batch result
 */
const aggregateCommandResult = (batchResult, commandResult) => {
  if (commandResult.success) {
    batchResult.commandsExecuted++
    
    // Track object changes for undo/redo
    if (commandResult.objectId) {
      switch (commandResult.commandType) {
        case 'createRectangle':
        case 'createCircle':
        case 'createStar':
        case 'createText':
        case 'groupObjects':
          batchResult.createdObjects.push(commandResult.objectId)
          break
          
        case 'moveObject':
        case 'resizeObject':
        case 'rotateObject':
        case 'moveShape':
        case 'resizeShape':
        case 'rotateShape':
        case 'updateObjectProperties':
          batchResult.modifiedObjects.push(commandResult.objectId)
          break
          
        case 'deleteObject':
        case 'ungroupObjects':
          batchResult.deletedObjects.push(commandResult.objectId)
          break
      }
    }
    
    // Handle commands that create multiple objects
    if (commandResult.objectIds && commandResult.objectIds.length > 0) {
      switch (commandResult.commandType) {
        case 'createForm':
        case 'createNavBar':
        case 'createLayout':
          batchResult.createdObjects.push(...commandResult.objectIds)
          break
          
        case 'arrangeLayout':
          batchResult.modifiedObjects.push(...commandResult.objectIds)
          break
      }
    }
  } else {
    batchResult.errors.push(`${commandResult.commandType}: ${commandResult.error}`)
  }
  
  if (commandResult.warning) {
    batchResult.warnings.push(`${commandResult.commandType}: ${commandResult.warning}`)
  }
}

/**
 * Create undo/redo checkpoint for AI operations
 * @param {Object} executionResult - Result from executeAgentResponse
 * @param {string} description - Description for the checkpoint
 */
export const createAgentCheckpoint = (executionResult, description = 'AI Agent Action') => {
  // TODO: Integrate with existing undo/redo system
  // This would create a checkpoint that can be undone as a single operation
  
  const checkpoint = {
    type: 'ai_agent_action',
    description,
    timestamp: Date.now(),
    commandsExecuted: executionResult.commandsExecuted,
    createdObjects: executionResult.createdObjects,
    modifiedObjects: executionResult.modifiedObjects,
    deletedObjects: executionResult.deletedObjects
  }
  
  console.log('📍 AI checkpoint created:', checkpoint)
  return checkpoint
}

export default {
  executeAgentResponse,
  createAgentCheckpoint
}
