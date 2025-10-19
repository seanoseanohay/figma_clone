import { PanTool } from './PanTool.js'
import { SelectTool } from './SelectTool.js'
import { MoveTool } from './MoveTool.js'
import { ResizeTool } from './ResizeTool.js'
import { RotateTool } from './RotateTool.js'
import { TextTool } from './TextTool.js'
import { RectangleTool } from './RectangleTool.js'
import { CircleTool } from './CircleTool.js'
import { StarTool } from './StarTool.js'
import { DeleteTool } from './DeleteTool.js'
import { TOOLS } from '../components/canvas/Toolbar.jsx'

/**
 * Tool Registry - Maps tool types to handler instances
 */
export const toolRegistry = {
  [TOOLS.PAN]: new PanTool(),
  [TOOLS.SELECT]: new SelectTool(),
  [TOOLS.DELETE]: new DeleteTool(),
  [TOOLS.MOVE]: new MoveTool(),
  [TOOLS.RESIZE]: new ResizeTool(),
  [TOOLS.ROTATE]: new RotateTool(),
  [TOOLS.TEXT]: new TextTool(),
  [TOOLS.RECTANGLE]: new RectangleTool(),
  [TOOLS.CIRCLE]: new CircleTool(),
  [TOOLS.STAR]: new StarTool()
}

/**
 * Get tool handler for given tool type
 */
export const getToolHandler = (toolType) => {
  return toolRegistry[toolType] || null
}

export { PanTool, SelectTool, DeleteTool, MoveTool, ResizeTool, RotateTool, TextTool, RectangleTool, CircleTool, StarTool }





