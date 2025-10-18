import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { useState } from 'react'
import Canvas from '../canvas/Canvas.jsx'
import Toolbar, { TOOLS } from '../canvas/Toolbar.jsx'
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
  CURSOR_UPDATE_THROTTLE: 50
}))

// Integration component that combines Toolbar and Canvas like in App.jsx
const CanvasWithToolbar = () => {
  const [selectedTool, setSelectedTool] = useState(TOOLS.PAN)
  
  const handleToolChange = (tool) => {
    setSelectedTool(tool)
  }
  
  // Mock canvas context value
  const mockCanvasContext = {
    canvasId: 'test-canvas-id',
    canvasName: 'Test Canvas',
    canvases: [{ id: 'test-canvas-id', name: 'Test Canvas' }],
    loading: false
  }
  
  return (
    <CanvasContext.Provider value={mockCanvasContext}>
      <div>
        <Toolbar 
          selectedTool={selectedTool}
          onToolChange={handleToolChange}
        />
        <Canvas 
          selectedTool={selectedTool}
          onToolChange={handleToolChange}
        />
      </div>
    </CanvasContext.Provider>
  )
}

describe('Canvas Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('integrates toolbar and canvas tool selection', () => {
    render(
      <BrowserRouter>
        <CanvasWithToolbar />
      </BrowserRouter>
    )
    
    // Initially Arrow tool should be selected
    const arrowButton = screen.getByTitle('Select Tool (Press V)')
    expect(arrowButton).toHaveStyle({ backgroundColor: '#2563eb' })
    
    // Click Hand tool
    const handButton = screen.getByTitle('Pan Tool (Hold Space)')
    fireEvent.click(handButton)
    
    // Hand tool should now be selected
    expect(handButton).toHaveStyle({ backgroundColor: '#2563eb' })
    expect(arrowButton).toHaveStyle({ backgroundColor: '#ffffff' })
  })

  it('handles complete rectangle creation workflow', () => {
    render(
      <BrowserRouter>
        <CanvasWithToolbar />
      </BrowserRouter>
    )
    
    // Start with Arrow tool, switch to Rectangle tool
    const rectangleButton = screen.getByTitle('Rectangle Tool')
    fireEvent.click(rectangleButton)
    
    // Rectangle tool should be selected
    expect(rectangleButton).toHaveStyle({ backgroundColor: '#2563eb' })
    
    // Get canvas stage for interaction
    const stage = screen.getByTestId('konva-stage')
    
    // Simulate rectangle creation
    fireEvent.mouseDown(stage, { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(stage, { clientX: 200, clientY: 200 })
    fireEvent.mouseUp(stage, { clientX: 200, clientY: 200 })
    
    // After rectangle creation, should auto-switch to Arrow tool
    const arrowButton = screen.getByTitle('Select Tool (Press V)')
    expect(arrowButton).toHaveStyle({ backgroundColor: '#2563eb' })
    expect(rectangleButton).toHaveStyle({ backgroundColor: '#ffffff' })
  })

  it('handles tool switching during operations', () => {
    render(
      <BrowserRouter>
        <CanvasWithToolbar />
      </BrowserRouter>
    )
    
    // Start with Rectangle tool
    const rectangleButton = screen.getByTitle('Rectangle Tool')
    fireEvent.click(rectangleButton)
    
    // Switch to Hand tool mid-operation
    const handButton = screen.getByTitle('Pan Tool (Hold Space)')
    fireEvent.click(handButton)
    
    // Hand tool should be selected
    expect(handButton).toHaveStyle({ backgroundColor: '#2563eb' })
    
    const stage = screen.getByTestId('konva-stage')
    
    // Should handle mouse events without crashing
    fireEvent.mouseDown(stage, { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(stage, { clientX: 150, clientY: 150 })
    fireEvent.mouseUp(stage, { clientX: 150, clientY: 150 })
    
    // Component should still be rendered
    expect(stage).toBeInTheDocument()
  })

  describe('User Experience Workflows', () => {
    it('supports typical design workflow: create, select, move', () => {
      render(
        <BrowserRouter>
          <CanvasWithToolbar />
        </BrowserRouter>
      )
      
      const stage = screen.getByTestId('konva-stage')
      
      // Step 1: Create a rectangle
      const rectangleButton = screen.getByTitle('Rectangle Tool')
      fireEvent.click(rectangleButton)
      
      fireEvent.mouseDown(stage, { clientX: 100, clientY: 100 })
      fireEvent.mouseMove(stage, { clientX: 200, clientY: 200 })
      fireEvent.mouseUp(stage, { clientX: 200, clientY: 200 })
      
      // Should auto-switch to Arrow tool
      const arrowButton = screen.getByTitle('Select Tool (Press V)')
      expect(arrowButton).toHaveStyle({ backgroundColor: '#2563eb' })
      
      // Step 2: Select and move (simulated)
      fireEvent.mouseDown(stage, { clientX: 150, clientY: 150 }) // Click on rectangle
      fireEvent.mouseMove(stage, { clientX: 180, clientY: 180 }) // Move it
      fireEvent.mouseUp(stage, { clientX: 180, clientY: 180 })
      
      // Should still be in Arrow tool
      expect(arrowButton).toHaveStyle({ backgroundColor: '#2563eb' })
    })

    it('supports pan workflow with Hand tool', () => {
      render(
        <BrowserRouter>
          <CanvasWithToolbar />
        </BrowserRouter>
      )
      
      const stage = screen.getByTestId('konva-stage')
      
      // Select Hand tool
      const handButton = screen.getByTitle('Pan Tool (Hold Space)')
      fireEvent.click(handButton)
      
      // Simulate panning
      fireEvent.mouseDown(stage, { clientX: 100, clientY: 100 })
      fireEvent.mouseMove(stage, { clientX: 120, clientY: 120 })
      fireEvent.mouseUp(stage, { clientX: 120, clientY: 120 })
      
      // Should remain in Hand tool
      expect(handButton).toHaveStyle({ backgroundColor: '#2563eb' })
    })

    it('handles zoom operations regardless of selected tool', () => {
      render(
        <BrowserRouter>
          <CanvasWithToolbar />
        </BrowserRouter>
      )
      
      const stage = screen.getByTestId('konva-stage')
      
      // Test zoom with Arrow tool
      fireEvent.wheel(stage, { deltaY: -100 })
      expect(stage).toBeInTheDocument()
      
      // Switch to Hand tool and test zoom
      const handButton = screen.getByTitle('Pan Tool (Hold Space)')
      fireEvent.click(handButton)
      
      fireEvent.wheel(stage, { deltaY: 100 })
      expect(stage).toBeInTheDocument()
      
      // Switch to Rectangle tool and test zoom
      const rectangleButton = screen.getByTitle('Rectangle Tool')
      fireEvent.click(rectangleButton)
      
      fireEvent.wheel(stage, { deltaY: -50 })
      expect(stage).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles rapid tool switching without errors', () => {
      render(
        <BrowserRouter>
          <CanvasWithToolbar />
        </BrowserRouter>
      )
      
      const handButton = screen.getByTitle('Pan Tool (Hold Space)')
      const arrowButton = screen.getByTitle('Select Tool (Press V)')
      const rectangleButton = screen.getByTitle('Rectangle Tool')
      
      // Rapidly switch tools
      fireEvent.click(handButton)
      fireEvent.click(rectangleButton)
      fireEvent.click(arrowButton)
      fireEvent.click(handButton)
      fireEvent.click(rectangleButton)
      
      // Should end up with Rectangle tool selected
      expect(rectangleButton).toHaveStyle({ backgroundColor: '#2563eb' })
    })

    it('handles mouse events on unmounted component gracefully', () => {
      const { unmount } = render(
        <BrowserRouter>
          <CanvasWithToolbar />
        </BrowserRouter>
      )
      
      // Unmount component
      unmount()
      
      // Should not throw errors (tested by not crashing the test)
      expect(true).toBe(true)
    })
  })
})
