/**
 * PanTool - Handles canvas panning (moving viewport)
 */

export class PanTool {
  constructor() {
    this.isPanning = false
  }

  /**
   * Handle mouse down - start panning
   */
  onMouseDown(e, state, helpers) {
    state.setIsPanning(true)
    e.target.getStage().container().style.cursor = 'grabbing'
  }

  /**
   * Handle mouse move - pan the canvas
   */
  onMouseMove(e, state, helpers) {
    if (!state.isPanning) return

    const stage = e.target.getStage()
    const newPos = {
      x: stage.x() + e.evt.movementX,
      y: stage.y() + e.evt.movementY,
    }

    stage.position(newPos)
    state.setStagePos(newPos)
  }

  /**
   * Handle mouse up - stop panning
   */
  onMouseUp(e, state, helpers) {
    state.setIsPanning(false)
    const stage = e.target.getStage()
    if (stage) {
      stage.container().style.cursor = 'grab'
    }
  }

  /**
   * Get cursor style for this tool
   */
  getCursor() {
    return 'grab'
  }
}

export default PanTool




