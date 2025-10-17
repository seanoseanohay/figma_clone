import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SelectTool } from '../SelectTool.js'
import * as canvasService from '../../services/canvas.service.js'

// Mock canvas service
vi.mock('../../services/canvas.service.js', () => ({
  lockObject: vi.fn(),
  unlockObject: vi.fn()
}))

describe('SelectTool', () => {
  let tool
  let mockState
  let mockHelpers

  beforeEach(() => {
    tool = new SelectTool()
    
    // Reset mocks
    vi.clearAllMocks()

    // Mock state
    mockState = {
      selectedObjectId: null,
      setSelectedObjectId: vi.fn(),
      findObjectAt: vi.fn(),
      canEditObject: vi.fn()
    }

    // Mock helpers
    mockHelpers = {
      pos: { x: 100, y: 100 },
      canvasId: 'test-canvas'
    }
  })

  describe('onMouseDown', () => {
    it('should select an object when clicking on it', async () => {
      const mockObject = { id: 'obj1', x: 90, y: 90, width: 50, height: 50 }
      mockState.findObjectAt.mockReturnValue(mockObject)
      mockState.canEditObject.mockReturnValue(true)

      await tool.onMouseDown({}, mockState, mockHelpers)

      expect(canvasService.lockObject).toHaveBeenCalledWith('obj1')
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith('obj1')
    })

    it('should deselect when clicking empty space', async () => {
      mockState.selectedObjectId = 'obj1'
      mockState.findObjectAt.mockReturnValue(null)

      await tool.onMouseDown({}, mockState, mockHelpers)

      expect(canvasService.unlockObject).toHaveBeenCalledWith('obj1')
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith(null)
    })

    it('should not select locked objects', async () => {
      const mockObject = { id: 'obj1', x: 90, y: 90 }
      mockState.findObjectAt.mockReturnValue(mockObject)
      mockState.canEditObject.mockReturnValue(false)

      await tool.onMouseDown({}, mockState, mockHelpers)

      expect(canvasService.lockObject).not.toHaveBeenCalled()
      expect(mockState.setSelectedObjectId).not.toHaveBeenCalled()
    })

    it('should keep selection when clicking already-selected object', async () => {
      const mockObject = { id: 'obj1', x: 90, y: 90 }
      mockState.selectedObjectId = 'obj1'
      mockState.findObjectAt.mockReturnValue(mockObject)

      await tool.onMouseDown({}, mockState, mockHelpers)

      // Should not unlock or relock
      expect(canvasService.lockObject).not.toHaveBeenCalled()
      expect(canvasService.unlockObject).not.toHaveBeenCalled()
    })

    it('should switch selection when clicking different object', async () => {
      const mockObject = { id: 'obj2', x: 90, y: 90 }
      mockState.selectedObjectId = 'obj1'
      mockState.findObjectAt.mockReturnValue(mockObject)
      mockState.canEditObject.mockReturnValue(true)

      await tool.onMouseDown({}, mockState, mockHelpers)

      expect(canvasService.unlockObject).toHaveBeenCalledWith('obj1')
      expect(canvasService.lockObject).toHaveBeenCalledWith('obj2')
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith('obj2')
    })
  })

  describe('onMouseMove', () => {
    it('should do nothing - select tool has no mouse move behavior', () => {
      // Just verify it doesn't throw
      expect(() => tool.onMouseMove({}, mockState, mockHelpers)).not.toThrow()
    })
  })

  describe('onMouseUp', () => {
    it('should do nothing - select tool completes on mouse down', () => {
      // Just verify it doesn't throw
      expect(() => tool.onMouseUp({}, mockState, mockHelpers)).not.toThrow()
    })
  })

  describe('getCursor', () => {
    it('should return default cursor', () => {
      expect(tool.getCursor()).toBe('default')
    })
  })
})

