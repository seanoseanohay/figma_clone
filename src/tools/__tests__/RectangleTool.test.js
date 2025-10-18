import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RectangleTool } from '../RectangleTool'
import { createObject } from '../../services/canvas.service.js'

// Mock canvas service
vi.mock('../../services/canvas.service.js', () => ({
  createObject: vi.fn(() => Promise.resolve('new-rect-id')),
}))

describe('RectangleTool', () => {
  let rectangleTool
  let mockState
  let mockHelpers
  let mockCurrentRect

  beforeEach(() => {
    rectangleTool = new RectangleTool()
    
    mockCurrentRect = null
    
    mockState = {
      isDrawing: false,
      currentRect: null,
      selectedColor: '#808080',
      setIsDrawing: vi.fn((value) => { mockState.isDrawing = value }),
      setCurrentRect: vi.fn((rect) => { 
        mockCurrentRect = rect
        mockState.currentRect = rect 
      }),
      setSelectedObjectId: vi.fn(),
      onToolChange: vi.fn(),
    }
    
    mockHelpers = {
      pos: { x: 100, y: 100 },
      canvasId: 'test-canvas',
    }

    // Clear mocks
    createObject.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('onMouseDown', () => {
    it('should start rectangle creation at pointer position', () => {
      rectangleTool.onMouseDown({}, mockState, mockHelpers)
      
      expect(mockState.setIsDrawing).toHaveBeenCalledWith(true)
      expect(mockState.setCurrentRect).toHaveBeenCalled()
      expect(mockCurrentRect).toMatchObject({
        x: 100,
        y: 100,
        width: 0,
        height: 0,
        fill: '#808080'
      })
    })

    it('should use selected color when creating rectangle', () => {
      mockState.selectedColor = '#FF5733'
      
      rectangleTool.onMouseDown({}, mockState, mockHelpers)
      
      expect(mockCurrentRect.fill).toBe('#FF5733')
    })

    it('should create rectangle within canvas bounds', () => {
      mockHelpers.pos = { x: 50, y: 75 }
      
      rectangleTool.onMouseDown({}, mockState, mockHelpers)
      
      expect(mockState.setIsDrawing).toHaveBeenCalledWith(true)
      expect(mockCurrentRect).toMatchObject({
        x: 50,
        y: 75
      })
    })
  })

  describe('onMouseMove', () => {
    beforeEach(() => {
      // Start drawing first
      rectangleTool.onMouseDown({}, mockState, mockHelpers)
    })

    it('should update rectangle dimensions during drag', () => {
      mockHelpers.pos = { x: 200, y: 200 }
      
      rectangleTool.onMouseMove({}, mockState, mockHelpers)
      
      expect(mockState.setCurrentRect).toHaveBeenCalled()
      expect(mockCurrentRect.width).toBe(100)
      expect(mockCurrentRect.height).toBe(100)
    })

    it('should calculate correct dimensions when dragging right-down', () => {
      mockHelpers.pos = { x: 250, y: 300 }
      
      rectangleTool.onMouseMove({}, mockState, mockHelpers)
      
      expect(mockCurrentRect.x).toBe(100)
      expect(mockCurrentRect.y).toBe(100)
      expect(mockCurrentRect.width).toBe(150)
      expect(mockCurrentRect.height).toBe(200)
    })

    it('should calculate correct dimensions when dragging left-up', () => {
      mockHelpers.pos = { x: 50, y: 50 }
      
      rectangleTool.onMouseMove({}, mockState, mockHelpers)
      
      // Width and height can be negative during drag
      expect(mockCurrentRect.width).toBe(-50)
      expect(mockCurrentRect.height).toBe(-50)
    })

    it('should do nothing if not drawing', () => {
      mockState.isDrawing = false
      mockState.currentRect = null
      
      rectangleTool.onMouseMove({}, mockState, mockHelpers)
      
      // Should not update when not drawing (only initial call from beforeEach)
      expect(mockState.setCurrentRect).toHaveBeenCalledTimes(1)
    })

    it('should update dimensions continuously during drag', () => {
      mockHelpers.pos = { x: 150, y: 150 }
      rectangleTool.onMouseMove({}, mockState, mockHelpers)
      
      mockHelpers.pos = { x: 200, y: 200 }
      rectangleTool.onMouseMove({}, mockState, mockHelpers)
      
      expect(mockCurrentRect.width).toBe(100)
      expect(mockCurrentRect.height).toBe(100)
    })
  })

  describe('onMouseUp', () => {
    beforeEach(() => {
      rectangleTool.onMouseDown({}, mockState, mockHelpers)
      mockState.clampRectToCanvas = vi.fn((rect) => rect) // Simple passthrough
    })

    it('should create rectangle and reset drawing state', async () => {
      // Drag to create a large enough rectangle
      mockHelpers.pos = { x: 200, y: 200 }
      rectangleTool.onMouseMove({}, mockState, mockHelpers)
      
      await rectangleTool.onMouseUp({}, mockState, mockHelpers)
      
      expect(createObject).toHaveBeenCalledWith(
        'rectangle',
        expect.objectContaining({
          x: 100,
          y: 100,
          width: 100,
          height: 100
        }),
        'test-canvas',
        expect.objectContaining({
          fill: '#808080',
          stroke: '#333333',
          strokeWidth: 1
        })
      )
      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false)
      expect(mockState.setCurrentRect).toHaveBeenCalledWith(null)
    })

    it('should not create rectangle if too small', async () => {
      // Drag only 1px (below minWidth of 2)
      mockHelpers.pos = { x: 101, y: 100 }
      rectangleTool.onMouseMove({}, mockState, mockHelpers)
      
      await rectangleTool.onMouseUp({}, mockState, mockHelpers)
      
      expect(createObject).not.toHaveBeenCalled()
      // Should still reset state
      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false)
    })

    it('should include styling properties with selected color', async () => {
      mockState.selectedColor = '#FF5733'
      mockHelpers.pos = { x: 200, y: 200 }
      rectangleTool.onMouseMove({}, mockState, mockHelpers)
      
      await rectangleTool.onMouseUp({}, mockState, mockHelpers)
      
      expect(createObject).toHaveBeenCalledWith(
        'rectangle',
        expect.anything(),
        'test-canvas',
        expect.objectContaining({
          fill: '#FF5733',
          stroke: '#333333',
          strokeWidth: 1
        })
      )
    })

    it('should reset drawing state after creation', async () => {
      mockHelpers.pos = { x: 200, y: 200 }
      rectangleTool.onMouseMove({}, mockState, mockHelpers)
      
      await rectangleTool.onMouseUp({}, mockState, mockHelpers)
      
      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false)
      expect(mockState.setCurrentRect).toHaveBeenCalledWith(null)
    })

    it('should do nothing if not drawing', async () => {
      mockState.isDrawing = false
      mockState.currentRect = null
      
      await rectangleTool.onMouseUp({}, mockState, mockHelpers)
      
      expect(createObject).not.toHaveBeenCalled()
    })

    it('should normalize negative dimensions', async () => {
      // Drag left-up (negative dimensions)
      mockHelpers.pos = { x: 50, y: 50 }
      rectangleTool.onMouseMove({}, mockState, mockHelpers)
      
      await rectangleTool.onMouseUp({}, mockState, mockHelpers)
      
      expect(createObject).toHaveBeenCalledWith(
        'rectangle',
        expect.objectContaining({
          x: 50,     // Should be at the smaller x
          y: 50,     // Should be at the smaller y
          width: 50, // Should be positive
          height: 50 // Should be positive
        }),
        expect.anything(),
        expect.anything()
      )
    })
  })

  describe('edge cases', () => {
    it('should not start drawing outside canvas bounds', () => {
      mockHelpers.pos = { x: -50, y: -50 }
      
      rectangleTool.onMouseDown({}, mockState, mockHelpers)
      
      expect(mockState.setIsDrawing).not.toHaveBeenCalledWith(true)
    })

    it('should handle negative coordinates during drag', () => {
      rectangleTool.onMouseDown({}, mockState, mockHelpers)
      mockHelpers.pos = { x: -50, y: -50 }
      
      rectangleTool.onMouseMove({}, mockState, mockHelpers)
      
      expect(mockCurrentRect.width).toBe(-150) // 100 to -50 = -150
      expect(mockCurrentRect.height).toBe(-150)
    })

    it('should handle very large rectangles', () => {
      rectangleTool.onMouseDown({}, mockState, mockHelpers)
      mockHelpers.pos = { x: 100000, y: 100000 }
      
      rectangleTool.onMouseMove({}, mockState, mockHelpers)
      
      expect(mockCurrentRect.width).toBe(99900)
      expect(mockCurrentRect.height).toBe(99900)
    })

    it('should handle errors during save gracefully', async () => {
      createObject.mockRejectedValueOnce(new Error('Firestore error'))
      
      rectangleTool.onMouseDown({}, mockState, mockHelpers)
      mockHelpers.pos = { x: 200, y: 200 }
      rectangleTool.onMouseMove({}, mockState, mockHelpers)
      mockState.clampRectToCanvas = vi.fn((rect) => rect)
      
      // Should not throw
      await expect(rectangleTool.onMouseUp({}, mockState, mockHelpers)).resolves.not.toThrow()
      
      // Should still reset state even on error
      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false)
      expect(mockState.setCurrentRect).toHaveBeenCalledWith(null)
    })
  })

  describe('tool properties', () => {
    it('should have correct minimum dimensions', () => {
      expect(rectangleTool.minWidth).toBe(2)
      expect(rectangleTool.minHeight).toBe(1)
    })

    it('should return crosshair cursor', () => {
      expect(rectangleTool.getCursor()).toBe('crosshair')
    })
  })
})



