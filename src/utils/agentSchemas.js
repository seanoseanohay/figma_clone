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
  numPoints: z.number().min(3).max(20).optional().default(5),
  innerRadius: z.number().min(1).max(500),
  outerRadius: z.number().min(1).max(1000),
  fill: ColorSchema.optional().default('#808080'),
  stroke: ColorSchema.optional(),
  strokeWidth: z.number().min(0).max(50).optional().default(0),
  rotation: z.number().min(-360).max(360).optional().default(0)
})

const CreateTextSchema = z.object({
  type: z.literal('createText'),
  position: PositionSchema,
  text: z.string().min(1).max(500),
  fontSize: z.number().min(8).max(200).optional().default(24),
  fontFamily: z.string().optional().default('Arial'),
  fill: ColorSchema.optional().default('#000000'),
  fontWeight: z.enum(['normal', 'bold']).optional().default('normal'),
  fontStyle: z.enum(['normal', 'italic']).optional().default('normal'),
  rotation: z.number().min(-360).max(360).optional().default(0)
})

// Object modification commands
const MoveObjectSchema = z.object({
  type: z.literal('moveObject'),
  objectId: z.string().min(1),
  offset: z.object({
    x: z.number().default(0),
    y: z.number().default(0)
  }),
  animate: z.boolean().optional().default(false)
})

const RotateShapeSchema = z.object({
  type: z.literal('rotateShape'),
  objectId: z.string().min(1),
  rotation: z.number().min(-360).max(360),
  animate: z.boolean().optional().default(false)
})

const ResizeObjectSchema = z.object({
  type: z.literal('resizeObject'),
  objectId: z.string().min(1),
  size: SizeSchema.or(z.object({ radius: z.number().min(1).max(1000) })).optional(),
  scale: z.number().min(0.1).max(10).optional(),
  animate: z.boolean().optional().default(false)
}).refine(
  (data) => data.size || data.scale,
  {
    message: "Either 'size' or 'scale' must be provided",
    path: ["size", "scale"]
  }
)

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

// Layout arrangement commands
const ArrangeLayoutSchema = z.object({
  type: z.literal('arrangeLayout'),
  layoutType: z.enum(['row', 'grid', 'column']).default('row'),
  spacing: z.number().min(0).max(200).default(50),
  rows: z.number().min(1).max(10).optional(),
  columns: z.number().min(1).max(10).optional(),
  targetIds: z.array(z.string().min(1)).min(1).optional() // Require at least 1 item
})

// Union of all command schemas
const AgentCommandSchema = z.union([
  CreateRectangleSchema,
  CreateCircleSchema,
  CreateStarSchema,
  CreateTextSchema,
  MoveObjectSchema,
  ResizeObjectSchema,
  RotateObjectSchema,
  RotateShapeSchema,
  UpdateObjectPropertiesSchema,
  DeleteObjectSchema,
  ClearCanvasSchema,
  SetCanvasBackgroundSchema,
  GroupObjectsSchema,
  UngroupObjectsSchema,
  ArrangeLayoutSchema
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
    type: z.enum(['rectangle', 'circle', 'star', 'text']),
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
    radius: z.number().optional(),
    text: z.string().optional(),
    fontSize: z.number().optional(),
    fontFamily: z.string().optional(),
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
    console.error('❌ Command validation failed for:', command.type, error)
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
  RotateShapeSchema,
  UpdateObjectPropertiesSchema,
  DeleteObjectSchema,
  ArrangeLayoutSchema
}
