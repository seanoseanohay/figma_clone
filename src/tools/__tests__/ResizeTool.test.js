import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase services before importing ResizeTool
vi.mock('../../services/firebase.js', () => ({
  auth: {
    currentUser: { uid: 'test-user-123' }
  },
  db: {},
  rtdb: {}
}))

vi.mock('../../services/canvas.service.js', () => ({
  lockObject: vi.fn(() => Promise.resolve()),
  unlockObject: vi.fn(() => Promise.resolve()),
  updateActiveObjectPosition: vi.fn(() => Promise.resolve()),
  updateObjectPosition: vi.fn(() => Promise.resolve()),
  clearActiveObject: vi.fn(() => Promise.resolve())
}))

import { ResizeTool } from '../ResizeTool'

describe('ResizeTool', () => {
  let resizeTool
  let mockState
  let mockHelpers
  let mockStage

  beforeEach(() => {
    resizeTool = new ResizeTool()
    
    mockHelpers = {
      pos: { x: 100, y: 100 },
      canvasId: 'test-canvas-id'
    }
    
    mockState = {
      resizeSelectedId: null,
      rectangles: [],
      isResizing: false,
      findRectAt: vi.fn(() => null),
      canEditObject: vi.fn(() => true),
      getClosestCorner: vi.fn(() => null),
      setResizeSelectedId: vi.fn(),
      setIsResizing: vi.fn(),
      setResizeHandle: vi.fn(),
      setResizeStartData: vi.fn(),
      doWeOwnObject: vi.fn(() => true),
      clampRectToCanvas: vi.fn((rect) => rect),
      handleCrossoverDetection: vi.fn((currentRect) => ({ flipped: false, handle: 'nw', rect: currentRect })),
      setLocalRectUpdates: vi.fn(),
      localRectUpdates: {}
    }
  })

  describe('Rectangle Selection', () => {
    it('should select rectangle when clicked', async () => {
      const mockRect = { id: 'rect-1', x: 100, y: 100, width: 100, height: 100 }
      mockState.rectangles = [mockRect]
      mockState.findRectAt.mockReturnValue(mockRect)
      
      await resizeTool.onMouseDown({}, mockState, mockHelpers)
      
      expect(mockState.setResizeSelectedId).toHaveBeenCalledWith('rect-1')
    })

    it('should deselect when clicking empty space', async () => {
      mockState.resizeSelectedId = 'rect-1'
      mockState.findRectAt.mockReturnValue(null)
      
      await resizeTool.onMouseDown({}, mockState, mockHelpers)
      
      expect(mockState.setResizeSelectedId).toHaveBeenCalledWith(null)
    })

    it('should not select object locked by another user', async () => {
      const mockRect = { id: 'rect-1', x: 100, y: 100, width: 100, height: 100 }
      mockState.rectangles = [mockRect]
      mockState.findRectAt.mockReturnValue(mockRect)
      mockState.canEditObject.mockReturnValue(false)
      
      await resizeTool.onMouseDown({}, mockState, mockHelpers)
      
      expect(mockState.setResizeSelectedId).not.toHaveBeenCalled()
    })
  })

  describe('Resize Operations', () => {
    beforeEach(() => {
      const selectedRect = {
        id: 'rect-1',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: '#ff0000'
      }
      mockState.resizeSelectedId = 'rect-1'
      mockState.rectangles = [selectedRect]
      mockState.isResizing = false
      mockState.getClosestCorner.mockReturnValue('se')
    })

    it('should start resize when handle is clicked', async () => {
      await resizeTool.onMouseDown({}, mockState, mockHelpers)
      
      expect(mockState.setIsResizing).toHaveBeenCalledWith(true)
      expect(mockState.setResizeHandle).toHaveBeenCalledWith('se')
      expect(mockState.setResizeStartData).toHaveBeenCalledWith({
        rect: expect.objectContaining({
          x: 100,
          y: 100,
          width: 100,
          height: 100
        }),
        startPos: { x: 100, y: 100 }
      })
    })

    it('should resize SE handle correctly', () => {
      mockState.isResizing = true
      mockState.resizeHandle = 'se'
      mockState.resizeStartData = {
        rect: { id: 'rect-1', x: 100, y: 100, width: 100, height: 100, fill: '#ff0000' },
        startPos: { x: 100, y: 100 }
      }
      mockHelpers.pos = { x: 150, y: 150 }
      
      resizeTool.onMouseMove({}, mockState, mockHelpers)
      
      // Check that local updates were set with new dimensions
      expect(mockState.setLocalRectUpdates).toHaveBeenCalled()
      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0]
      const updates = updateCall({})
      
      expect(updates['rect-1']).toMatchObject({
        x: 100,
        y: 100,
        width: 150,  // Original 100 + delta 50
        height: 150
      })
    })

    it('should resize NW handle correctly', () => {
      mockState.isResizing = true
      mockState.resizeHandle = 'nw'
      mockState.resizeStartData = {
        rect: { id: 'rect-1', x: 100, y: 100, width: 100, height: 100, fill: '#ff0000' },
        startPos: { x: 100, y: 100 }
      }
      mockHelpers.pos = { x: 50, y: 50 }
      
      resizeTool.onMouseMove({}, mockState, mockHelpers)
      
      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0]
      const updates = updateCall({})
      
      expect(updates['rect-1']).toMatchObject({
        x: 50,        // Moved left by 50
        y: 50,        // Moved up by 50
        width: 150,   // Grew by 50
        height: 150   // Grew by 50
      })
    })

    it('should enforce minimum size of 2px', () => {
      mockState.isResizing = true
      mockState.resizeHandle = 'se'
      mockState.resizeStartData = {
        rect: { id: 'rect-1', x: 100, y: 100, width: 100, height: 100, fill: '#ff0000' },
        startPos: { x: 100, y: 100 }
      }
      // Try to resize to 1x1 (should be clamped to 2x2)
      mockHelpers.pos = { x: 99, y: 99 }
      
      resizeTool.onMouseMove({}, mockState, mockHelpers)
      
      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0]
      const updates = updateCall({})
      
      expect(updates['rect-1'].width).toBeGreaterThanOrEqual(2)
      expect(updates['rect-1'].height).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Crossover Detection - Critical Bug Fix', () => {
    beforeEach(() => {
      const selectedRect = {
        id: 'rect-1',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: '#ff0000'
      }
      mockState.resizeSelectedId = 'rect-1'
      mockState.rectangles = [selectedRect]
      mockState.isResizing = true
      mockState.resizeHandle = 'nw'
      mockState.resizeStartData = {
        rect: selectedRect,
        startPos: { x: 100, y: 100 }
      }
    })

    it('should NOT jump position when NW handle crosses SE corner', () => {
      // User drags NW handle past SE corner (from 100,100 to 250,250)
      // Delta: +150, +150
      // Original rect: x:100, y:100, w:100, h:100
      // NW transformation: x = 100 + 150 = 250, y = 100 + 150 = 250
      //                    w = 100 - 150 = -50 (will be flipped by crossover)
      //                    h = 100 - 150 = -50 (will be flipped by crossover)
      mockHelpers.pos = { x: 250, y: 250 }
      
      // Mock crossover detection - it receives the current rect and just returns it
      // with a flipped handle (this mimics the fix we made)
      mockState.handleCrossoverDetection.mockImplementation((currentRect, handle, originalRect) => {
        // Crossover detected - but we keep the current rect as-is
        return {
          flipped: true,
          handle: 'se',  // Handle flipped from NW to SE
          rect: currentRect  // Keep the transformed rect
        }
      })
      
      resizeTool.onMouseMove({}, mockState, mockHelpers)
      
      // Handle should update to SE
      expect(mockState.setResizeHandle).toHaveBeenCalledWith('se')
      
      // Rectangle should maintain continuity - CRITICAL: position should NOT jump
      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0]
      const updates = updateCall({})
      
      // After crossover with our fix, the rect maintains the transformed coordinates
      // NW handle with delta +150,+150 gives: x=250, y=250, w=-50, h=-50
      // After correction (negative dimensions), becomes: x=250, y=250, w=2, h=2 (min size)
      expect(updates['rect-1'].x).toBe(250)
      expect(updates['rect-1'].y).toBe(250)
      expect(updates['rect-1'].width).toBeGreaterThanOrEqual(2)
      expect(updates['rect-1'].height).toBeGreaterThanOrEqual(2)
    })

    it('should maintain smooth resize through crossover point', () => {
      // Simulate dragging NW handle incrementally past SE corner
      const positions = [
        { x: 90, y: 90 },    // Before crossover
        { x: 150, y: 150 },  // Approaching crossover
        { x: 200, y: 200 },  // At crossover
        { x: 210, y: 210 },  // Just after crossover
      ]
      
      positions.forEach((pos, index) => {
        mockHelpers.pos = pos
        
        // Mock crossover for last two positions
        if (index >= 2) {
          mockState.handleCrossoverDetection.mockReturnValue({
            flipped: true,
            handle: 'se',
            rect: {
              x: 200,
              y: 200,
              width: Math.abs(pos.x - 200),
              height: Math.abs(pos.y - 200),
              fill: '#ff0000'
            }
          })
        } else {
          mockState.handleCrossoverDetection.mockReturnValue({
            flipped: false,
            handle: 'nw',
            rect: null
          })
        }
        
        resizeTool.onMouseMove({}, mockState, mockHelpers)
        
        const updateCall = mockState.setLocalRectUpdates.mock.calls[mockState.setLocalRectUpdates.mock.calls.length - 1][0]
        const updates = updateCall({})
        
        // Each position should produce a valid rectangle
        expect(updates['rect-1'].width).toBeGreaterThanOrEqual(2)
        expect(updates['rect-1'].height).toBeGreaterThanOrEqual(2)
      })
    })

    it('should handle NE to SW crossover correctly', () => {
      mockState.resizeHandle = 'ne'
      mockState.resizeStartData = {
        rect: { id: 'rect-1', x: 100, y: 100, width: 100, height: 100, fill: '#ff0000' },
        startPos: { x: 200, y: 100 }  // NE corner at original rect's right edge, top
      }
      
      // Drag NE handle to SW (past the opposite corner)
      // Delta: 50-200=-150 (x), 250-100=+150 (y)
      // NE transformation: y = 100 + 150 = 250
      //                    w = 100 + (-150) = -50 (negative, will be flipped)
      //                    h = 100 - 150 = -50 (negative, will be flipped)
      mockHelpers.pos = { x: 50, y: 250 }
      
      mockState.handleCrossoverDetection.mockImplementation((currentRect) => {
        return {
          flipped: true,
          handle: 'sw',
          rect: currentRect  // Keep transformed rect
        }
      })
      
      resizeTool.onMouseMove({}, mockState, mockHelpers)
      
      expect(mockState.setResizeHandle).toHaveBeenCalledWith('sw')
      
      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0]
      const updates = updateCall({})
      
      // NE handle: y changes, width changes, height changes
      // y = 100 + 150 = 250
      // width = 100 + (-150) = -50 → becomes 2 (min size)
      // height = 100 - 150 = -50 → becomes 2 (min size)
      // x stays at 100 initially (not modified by NE), but negative width is corrected
      expect(updates['rect-1'].y).toBe(250)
      expect(updates['rect-1'].width).toBeGreaterThanOrEqual(2)
      expect(updates['rect-1'].height).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Mouse Up - Finalize Resize', () => {
    beforeEach(() => {
      mockState.isResizing = true
      mockState.resizeSelectedId = 'rect-1'
      mockState.localRectUpdates = {
        'rect-1': { x: 100, y: 100, width: 150, height: 150 }
      }
    })

    it('should reset resize state but keep selection', async () => {
      await resizeTool.onMouseUp({}, mockState, mockHelpers)
      
      expect(mockState.setIsResizing).toHaveBeenCalledWith(false)
      expect(mockState.setResizeHandle).toHaveBeenCalledWith(null)
      expect(mockState.setResizeStartData).toHaveBeenCalledWith(null)
      // resizeSelectedId should NOT be cleared - kept for consecutive resizes
    })

    it('should clear local updates after resize', async () => {
      await resizeTool.onMouseUp({}, mockState, mockHelpers)
      
      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0]
      const updates = updateCall({ 'rect-1': { x: 100, y: 100, width: 150, height: 150 } })
      
      expect(updates['rect-1']).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    it('should not resize if not in resize mode', () => {
      mockState.isResizing = false
      mockHelpers.pos = { x: 150, y: 150 }
      
      resizeTool.onMouseMove({}, mockState, mockHelpers)
      
      expect(mockState.setLocalRectUpdates).not.toHaveBeenCalled()
    })

    it('should not resize without start data', () => {
      mockState.isResizing = true
      mockState.resizeHandle = 'se'
      mockState.resizeStartData = null
      mockHelpers.pos = { x: 150, y: 150 }
      
      resizeTool.onMouseMove({}, mockState, mockHelpers)
      
      expect(mockState.setLocalRectUpdates).not.toHaveBeenCalled()
    })

    it('should return correct cursor style', () => {
      expect(resizeTool.getCursor()).toBe('nw-resize')
    })
  })
})

