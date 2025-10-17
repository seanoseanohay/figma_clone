import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RectangleTool } from '../RectangleTool'

describe('RectangleTool', () => {
  let rectangleTool
  let mockState
  let mockHelpers
  let mockStage

  beforeEach(() => {
    rectangleTool = new RectangleTool()
    
    mockState = {
      objects: [],
      selectedObjectId: null,
      isConnected: true,
      stageX: 0,
      stageY: 0,
      stageScale: 1
    }
    
    mockHelpers = {
      addObject: vi.fn(),
      setSelectedObjectId: vi.fn(),
      onToolChange: vi.fn()
    }

    mockStage = {
      getPointerPosition: vi.fn(() => ({ x: 100, y: 100 }))
    }
  })

  describe('onMouseDown', () => {
    it('should start rectangle creation at pointer position', () => {
      rectangleTool.onMouseDown({}, mockStage, mockState, mockHelpers)
      
      expect(rectangleTool.startPoint).toEqual({ x: 100, y: 100 })
      expect(rectangleTool.isDrawing).toBe(true)
    })

    it('should not start drawing when offline', () => {
      mockState.isConnected = false
      
      rectangleTool.onMouseDown({}, mockStage, mockState, mockHelpers)
      
      expect(rectangleTool.isDrawing).toBe(false)
    })

    it('should transform pointer position by stage offset and scale', () => {
      mockState.stageX = -100
      mockState.stageY = -50
      mockState.stageScale = 2
      
      rectangleTool.onMouseDown({}, mockStage, mockState, mockHelpers)
      
      // startPoint should be transformed: (pointerX - stageX) / scale
      // (100 - (-100)) / 2 = 100
      // (100 - (-50)) / 2 = 75
      expect(rectangleTool.startPoint.x).toBe(100)
      expect(rectangleTool.startPoint.y).toBe(75)
    })
  })

  describe('onMouseMove', () => {
    beforeEach(() => {
      // Start drawing first
      rectangleTool.onMouseDown({}, mockStage, mockState, mockHelpers)
    })

    it('should create preview rectangle during drag', () => {
      mockStage.getPointerPosition.mockReturnValue({ x: 200, y: 200 })
      
      const result = rectangleTool.onMouseMove({}, mockStage, mockState, mockHelpers)
      
      expect(result.previewObject).toBeDefined()
      expect(result.previewObject.type).toBe('rectangle')
      expect(result.previewObject.width).toBe(100)
      expect(result.previewObject.height).toBe(100)
    })

    it('should calculate correct dimensions when dragging right-down', () => {
      mockStage.getPointerPosition.mockReturnValue({ x: 250, y: 300 })
      
      const result = rectangleTool.onMouseMove({}, mockStage, mockState, mockHelpers)
      
      expect(result.previewObject.x).toBe(100)
      expect(result.previewObject.y).toBe(100)
      expect(result.previewObject.width).toBe(150)
      expect(result.previewObject.height).toBe(200)
    })

    it('should calculate correct dimensions when dragging left-up', () => {
      mockStage.getPointerPosition.mockReturnValue({ x: 50, y: 50 })
      
      const result = rectangleTool.onMouseMove({}, mockStage, mockState, mockHelpers)
      
      // When dragging left-up, x and y should be at pointer position
      // and width/height should be positive
      expect(result.previewObject.x).toBe(50)
      expect(result.previewObject.y).toBe(50)
      expect(result.previewObject.width).toBe(50)
      expect(result.previewObject.height).toBe(50)
    })

    it('should do nothing if not drawing', () => {
      rectangleTool.isDrawing = false
      
      const result = rectangleTool.onMouseMove({}, mockStage, mockState, mockHelpers)
      
      expect(result).toBeUndefined()
    })

    it('should enforce minimum rectangle size', () => {
      // Move pointer just 1px away
      mockStage.getPointerPosition.mockReturnValue({ x: 101, y: 101 })
      
      const result = rectangleTool.onMouseMove({}, mockStage, mockState, mockHelpers)
      
      // Should still create preview with at least 1px dimensions
      expect(result.previewObject.width).toBeGreaterThan(0)
      expect(result.previewObject.height).toBeGreaterThan(0)
    })
  })

  describe('onMouseUp', () => {
    beforeEach(() => {
      rectangleTool.onMouseDown({}, mockStage, mockState, mockHelpers)
    })

    it('should create rectangle and switch to arrow tool', () => {
      mockStage.getPointerPosition.mockReturnValue({ x: 200, y: 200 })
      
      rectangleTool.onMouseUp({}, mockStage, mockState, mockHelpers)
      
      expect(mockHelpers.addObject).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 100,
          height: 100
        })
      )
      expect(mockHelpers.onToolChange).toHaveBeenCalled()
    })

    it('should not create rectangle if too small', () => {
      // Move pointer only 2px away
      mockStage.getPointerPosition.mockReturnValue({ x: 102, y: 102 })
      
      rectangleTool.onMouseUp({}, mockStage, mockState, mockHelpers)
      
      expect(mockHelpers.addObject).not.toHaveBeenCalled()
    })

    it('should include default styling properties', () => {
      mockStage.getPointerPosition.mockReturnValue({ x: 200, y: 200 })
      
      rectangleTool.onMouseUp({}, mockStage, mockState, mockHelpers)
      
      expect(mockHelpers.addObject).toHaveBeenCalledWith(
        expect.objectContaining({
          fill: expect.any(String),
          stroke: expect.any(String),
          strokeWidth: expect.any(Number)
        })
      )
    })

    it('should reset drawing state after creation', () => {
      mockStage.getPointerPosition.mockReturnValue({ x: 200, y: 200 })
      
      rectangleTool.onMouseUp({}, mockStage, mockState, mockHelpers)
      
      expect(rectangleTool.isDrawing).toBe(false)
      expect(rectangleTool.startPoint).toBeNull()
    })

    it('should do nothing if not drawing', () => {
      rectangleTool.isDrawing = false
      
      rectangleTool.onMouseUp({}, mockStage, mockState, mockHelpers)
      
      expect(mockHelpers.addObject).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle stage pointer returning null', () => {
      mockStage.getPointerPosition.mockReturnValue(null)
      
      expect(() => {
        rectangleTool.onMouseDown({}, mockStage, mockState, mockHelpers)
      }).not.toThrow()
    })

    it('should handle negative coordinates', () => {
      mockStage.getPointerPosition.mockReturnValue({ x: -50, y: -50 })
      
      rectangleTool.onMouseDown({}, mockStage, mockState, mockHelpers)
      mockStage.getPointerPosition.mockReturnValue({ x: -150, y: -150 })
      const result = rectangleTool.onMouseMove({}, mockStage, mockState, mockHelpers)
      
      expect(result.previewObject).toBeDefined()
      expect(result.previewObject.width).toBeGreaterThan(0)
      expect(result.previewObject.height).toBeGreaterThan(0)
    })

    it('should handle very large rectangles', () => {
      rectangleTool.onMouseDown({}, mockStage, mockState, mockHelpers)
      mockStage.getPointerPosition.mockReturnValue({ x: 100000, y: 100000 })
      
      const result = rectangleTool.onMouseMove({}, mockStage, mockState, mockHelpers)
      
      expect(result.previewObject).toBeDefined()
      expect(result.previewObject.width).toBe(99900)
      expect(result.previewObject.height).toBe(99900)
    })
  })
})



