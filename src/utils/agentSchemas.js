import { z } from 'zod'

/**
 * Agent Schemas for AI Command Validation
 * 
 * Defines JSON schemas for all supported AI agent commands
 * Ensures AI responses match expected structure before execution
 */

// Base position schema
const PositionSchema = z.object({
  x: z.number().min(0).max(5000),
  y: z.number().min(0).max(5000)
})

// Base size schema
const SizeSchema = z.object({
  width: z.number().min(1).max(2000),
  height: z.number().min(1).max(2000)
})

// Color schema (hex colors)
const ColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color')

// Shape creation commands
const CreateRectangleSchema = z.object({
  type: z.literal('createRectangle'),
  position: PositionSchema,
  size: SizeSchema,
  fill: ColorSchema.optional().default('#808080'),
  stroke: ColorSchema.optional(),
  strokeWidth: z.number().min(0).max(50).optional().default(0),
  rotation: z.number().min(-360).max(360).optional().default(0)
})

const CreateCircleSchema = z.object({
  type: z.literal('createCircle'),
  position: PositionSchema,
  radius: z.number().min(1).max(1000),
  fill: ColorSchema.optional().default('#808080'),
  stroke: ColorSchema.optional(),
  strokeWidth: z.number().min(0).max(50).optional().default(0)
})

const CreateStarSchema = z.object({
  type: z.literal('createStar'),
  position: PositionSchema,
  radius: z.number().min(1).max(1000),
  numPoints: z.number().min(3).max(20).optional().default(5),
  fill: ColorSchema.optional().default('#808080'),
  stroke: ColorSchema.optional(),
  strokeWidth: z.number().min(0).max(50).optional().default(0),
  rotation: z.number().min(-360).max(360).optional().default(0)
})

// Object modification commands
const MoveObjectSchema = z.object({
  type: z.literal('moveObject'),
  objectId: z.string().min(1),
  position: PositionSchema,
  animate: z.boolean().optional().default(false)
})

const ResizeObjectSchema = z.object({
  type: z.literal('resizeObject'),
  objectId: z.string().min(1),
  size: SizeSchema.or(z.object({ radius: z.number().min(1).max(1000) })),
  animate: z.boolean().optional().default(false)
})

const RotateObjectSchema = z.object({
  type: z.literal('rotateObject'),
  objectId: z.string().min(1),
  rotation: z.number().min(-360).max(360),
  animate: z.boolean().optional().default(false)
})

const UpdateObjectPropertiesSchema = z.object({
  type: z.literal('updateObjectProperties'),
  objectId: z.string().min(1),
  properties: z.object({
    fill: ColorSchema.optional(),
    stroke: ColorSchema.optional(),
    strokeWidth: z.number().min(0).max(50).optional(),
    opacity: z.number().min(0).max(1).optional()
  })
})

const DeleteObjectSchema = z.object({
  type: z.literal('deleteObject'),
  objectId: z.string().min(1)
})

// Canvas manipulation commands
const ClearCanvasSchema = z.object({
  type: z.literal('clearCanvas'),
  confirm: z.boolean().default(false)
})

const SetCanvasBackgroundSchema = z.object({
  type: z.literal('setCanvasBackground'),
  color: ColorSchema
})

// Grouping commands
const GroupObjectsSchema = z.object({
  type: z.literal('groupObjects'),
  objectIds: z.array(z.string().min(1)).min(2),
  name: z.string().optional()
})

const UngroupObjectsSchema = z.object({
  type: z.literal('ungroupObjects'),
  groupId: z.string().min(1)
})

// Union of all command schemas
const AgentCommandSchema = z.union([
  CreateRectangleSchema,
  CreateCircleSchema,
  CreateStarSchema,
  MoveObjectSchema,
  ResizeObjectSchema,
  RotateObjectSchema,
  UpdateObjectPropertiesSchema,
  DeleteObjectSchema,
  ClearCanvasSchema,
  SetCanvasBackgroundSchema,
  GroupObjectsSchema,
  UngroupObjectsSchema
])

// Agent response schema
const AgentResponseSchema = z.object({
  commands: z.array(AgentCommandSchema).min(1).max(10),
  explanation: z.string().optional(),
  metadata: z.object({
    model: z.string().optional(),
    timestamp: z.number().optional(),
    processingTimeMs: z.number().optional(),
    isMock: z.boolean().optional()
  }).optional()
})

// Canvas state schema (for input validation)
const CanvasStateSchema = z.object({
  canvasId: z.string().min(1),
  objects: z.array(z.object({
    id: z.string(),
    type: z.enum(['rectangle', 'circle', 'star']),
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
    radius: z.number().optional(),
    fill: z.string().optional(),
    stroke: z.string().optional(),
    rotation: z.number().optional()
  })),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number()
  }).optional(),
  selectedObjectIds: z.array(z.string()).optional()
})

// Agent request schema
const AgentRequestSchema = z.object({
  prompt: z.string().min(1).max(1000),
  canvasState: CanvasStateSchema,
  options: z.object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(100).max(4000).optional()
  }).optional()
})

/**
 * Validate agent response data
 * @param {any} data - Raw response data from AI model
 * @returns {Object} - { success: boolean, data?: object, errors?: string[] }
 */
export const validateAgentResponse = (data) => {
  try {
    const validatedData = AgentResponseSchema.parse(data)
    return {
      success: true,
      data: validatedData
    }
  } catch (error) {
    const errors = error.issues?.map(err => 
      `${err.path.join('.')}: ${err.message}`
    ) || [error.message]
    
    return {
      success: false,
      errors
    }
  }
}

/**
 * Validate agent request data
 * @param {any} data - Request data to validate
 * @returns {Object} - { success: boolean, data?: object, errors?: string[] }
 */
export const validateAgentRequest = (data) => {
  try {
    const validatedData = AgentRequestSchema.parse(data)
    return {
      success: true,
      data: validatedData
    }
  } catch (error) {
    const errors = error.issues?.map(err => 
      `${err.path.join('.')}: ${err.message}`
    ) || [error.message]
    
    return {
      success: false,
      errors
    }
  }
}

/**
 * Validate individual command
 * @param {any} command - Single command to validate
 * @returns {Object} - { success: boolean, data?: object, errors?: string[] }
 */
export const validateCommand = (command) => {
  try {
    const validatedCommand = AgentCommandSchema.parse(command)
    return {
      success: true,
      data: validatedCommand
    }
  } catch (error) {
    const errors = error.issues?.map(err => 
      `${err.path.join('.')}: ${err.message}`
    ) || [error.message]
    
    return {
      success: false,
      errors
    }
  }
}

// Export schemas for external use
export {
  AgentResponseSchema,
  AgentRequestSchema,
  AgentCommandSchema,
  CanvasStateSchema,
  CreateRectangleSchema,
  CreateCircleSchema,
  CreateStarSchema,
  MoveObjectSchema,
  ResizeObjectSchema,
  RotateObjectSchema,
  UpdateObjectPropertiesSchema,
  DeleteObjectSchema
}
