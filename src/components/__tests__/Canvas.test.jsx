import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Canvas from '../canvas/Canvas.jsx'
import { TOOLS } from '../canvas/Toolbar.jsx'
import { CanvasContext } from '../../contexts/CanvasContext.jsx'

// Mock the constants
vi.mock('../../constants/canvas.constants.js', () => ({
  CANVAS_WIDTH: 5000,
  CANVAS_HEIGHT: 5000,
  INITIAL_X: 2500,
  INITIAL_Y: 2500,
  INITIAL_ZOOM: 1,
  CANVAS_BACKGROUND: '#ffffff',
  BOUNDARY_BACKGROUND: '#f0f0f0',
  CURSOR_UPDATE_THROTTLE: 50,
  FIREBASE_COLLECTIONS: {
    USERS: 'users',
    CANVAS_OBJECTS: 'canvasObjects',
    PROJECTS: 'projects'
  }
}))

describe('Canvas Component', () => {
  const mockOnToolChange = vi.fn()
  
  // Helper to render Canvas with required context
  const renderCanvas = (props = {}) => {
    const mockCanvasContext = {
      canvasId: 'test-canvas-id',
      canvasName: 'Test Canvas',
      canvases: [{ id: 'test-canvas-id', name: 'Test Canvas' }],
      loading: false
    }
    
    return render(
      <CanvasContext.Provider value={mockCanvasContext}>
        <Canvas selectedTool={TOOLS.PAN} onToolChange={mockOnToolChange} {...props} />
      </CanvasContext.Provider>
    )
  }
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Konva stage and layer', () => {
    renderCanvas({ selectedTool: TOOLS.SELECT })
    
    expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
    expect(screen.getByTestId('konva-layer')).toBeInTheDocument()
  })

  it('renders canvas boundary and main canvas area', () => {
    renderCanvas({ selectedTool: TOOLS.SELECT })
    
    const rects = screen.getAllByTestId('konva-rect')
    expect(rects).toHaveLength(2) // Boundary background + main canvas
  })

  it('starts with no rectangles', () => {
    renderCanvas({ selectedTool: TOOLS.SELECT })
    
    const rects = screen.getAllByTestId('konva-rect')
    // Should only have boundary and canvas background, no user rectangles
    expect(rects).toHaveLength(2)
  })

  describe('Tool-specific behavior', () => {
    it('handles Hand tool cursor changes', () => {
      renderCanvas({ selectedTool: TOOLS.PAN })
      
      const stage = screen.getByTestId('konva-stage')
      expect(stage).toBeInTheDocument()
      // Note: Cursor testing would require more complex setup with real DOM elements
    })

    it('handles Arrow tool for selection', () => {
      renderCanvas({ selectedTool: TOOLS.SELECT })
      
      const stage = screen.getByTestId('konva-stage')
      expect(stage).toBeInTheDocument()
    })

    it('handles Rectangle tool for creation', () => {
      renderCanvas({ selectedTool: TOOLS.RECTANGLE })
      
      const stage = screen.getByTestId('konva-stage')
      expect(stage).toBeInTheDocument()
    })
  })

  describe('Mouse event handling', () => {
    it('handles mouse down events', () => {
      renderCanvas({ selectedTool: TOOLS.SELECT })
      
      const stage = screen.getByTestId('konva-stage')
      
      // Simulate mouse down
      fireEvent.mouseDown(stage, { clientX: 100, clientY: 100 })
      
      // Should not crash and component should still be rendered
      expect(stage).toBeInTheDocument()
    })

    it('handles mouse move events', () => {
      renderCanvas({ selectedTool: TOOLS.PAN })
      
      const stage = screen.getByTestId('konva-stage')
      
      // Simulate mouse move
      fireEvent.mouseMove(stage, { clientX: 150, clientY: 150 })
      
      expect(stage).toBeInTheDocument()
    })

    it('handles mouse up events', () => {
      renderCanvas({ selectedTool: TOOLS.RECTANGLE })
      
      const stage = screen.getByTestId('konva-stage')
      
      // Simulate mouse up
      fireEvent.mouseUp(stage, { clientX: 200, clientY: 200 })
      
      expect(stage).toBeInTheDocument()
    })

    it('handles wheel events for zoom', () => {
      renderCanvas({ selectedTool: TOOLS.SELECT })
      
      const stage = screen.getByTestId('konva-stage')
      
      // Simulate wheel event
      fireEvent.wheel(stage, { deltaY: -100 })
      
      expect(stage).toBeInTheDocument()
    })
  })

  describe('Rectangle creation workflow', () => {
    it('switches to Arrow tool after rectangle creation', () => {
      renderCanvas({ selectedTool: TOOLS.RECTANGLE })
      
      const stage = screen.getByTestId('konva-stage')
      
      // Simulate rectangle creation workflow
      fireEvent.mouseDown(stage, { clientX: 100, clientY: 100 })
      fireEvent.mouseMove(stage, { clientX: 200, clientY: 200 })
      fireEvent.mouseUp(stage, { clientX: 200, clientY: 200 })
      
      // Should have called onToolChange to switch to Arrow tool
      expect(mockOnToolChange).toHaveBeenCalledWith(TOOLS.SELECT)
    })
  })

  describe('Boundary enforcement', () => {
    it('renders within canvas container', () => {
      renderCanvas({ selectedTool: TOOLS.SELECT })
      
      const container = screen.getByRole('generic')
      expect(container).toHaveClass('canvas-container')
    })
  })
})
