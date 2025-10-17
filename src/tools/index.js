import { PanTool } from './PanTool.js'
import { MoveTool } from './MoveTool.js'
import { ResizeTool } from './ResizeTool.js'
import { RectangleTool } from './RectangleTool.js'
import { TOOLS } from '../components/canvas/Toolbar.jsx'

/**
 * Tool Registry - Maps tool types to handler instances
 */
export const toolRegistry = {
  [TOOLS.PAN]: new PanTool(),
  [TOOLS.MOVE]: new MoveTool(),
  [TOOLS.RESIZE]: new ResizeTool(),
  [TOOLS.RECTANGLE]: new RectangleTool()
}

/**
 * Get tool handler for given tool type
 */
export const getToolHandler = (toolType) => {
  return toolRegistry[toolType] || null
}

export { PanTool, MoveTool, ResizeTool, RectangleTool }




