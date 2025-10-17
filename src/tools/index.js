import { PanTool } from './PanTool.js'
import { SelectTool } from './SelectTool.js'
import { MoveTool } from './MoveTool.js'
import { ResizeTool } from './ResizeTool.js'
import { RectangleTool } from './RectangleTool.js'
import { CircleTool } from './CircleTool.js'
import { TOOLS } from '../components/canvas/Toolbar.jsx'

/**
 * Tool Registry - Maps tool types to handler instances
 */
export const toolRegistry = {
  [TOOLS.PAN]: new PanTool(),
  [TOOLS.SELECT]: new SelectTool(),
  [TOOLS.MOVE]: new MoveTool(),
  [TOOLS.RESIZE]: new ResizeTool(),
  [TOOLS.RECTANGLE]: new RectangleTool(),
  [TOOLS.CIRCLE]: new CircleTool()
}

/**
 * Get tool handler for given tool type
 */
export const getToolHandler = (toolType) => {
  return toolRegistry[toolType] || null
}

export { PanTool, SelectTool, MoveTool, ResizeTool, RectangleTool, CircleTool }





