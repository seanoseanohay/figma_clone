import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MoveTool } from './MoveTool.js';
import * as canvasService from '../services/canvas.service.js';
import { createTestRectangle, createTestCircle } from '../test/fixtures/testData.js';

// Mock canvas service
vi.mock('../services/canvas.service.js', () => ({
  updateActiveObjectPosition: vi.fn(),
  updateObjectPosition: vi.fn(),
  updateObject: vi.fn(() => Promise.resolve()),
  clearActiveObject: vi.fn(() => Promise.resolve()),
}));

describe('MoveTool', () => {
  let tool;
  let mockState;
  let mockHelpers;
  let mockObjects;

  beforeEach(() => {
    tool = new MoveTool();
    
    // Create test objects
    mockObjects = {
      rectangle: createTestRectangle({ id: 'rect-1', x: 100, y: 100, width: 150, height: 100 }),
      circle: createTestCircle({ id: 'circle-1', x: 300, y: 200, radius: 75 }),
    };

    // Mock state functions
    mockState = {
      selectedObjectId: 'rect-1',
      mouseDownPos: null,
      isDragThresholdExceeded: false,
      isMoving: false,
      moveStartPos: null,
      moveOriginalPos: null,
      canvasObjects: [mockObjects.rectangle, mockObjects.circle],
      localRectUpdates: {},
      findObjectAt: vi.fn((pos) => {
        const rect = mockObjects.rectangle;
        if (
          pos.x >= rect.x &&
          pos.x <= rect.x + rect.width &&
          pos.y >= rect.y &&
          pos.y <= rect.y + rect.height
        ) {
          return rect;
        }
        return null;
      }),
      doWeOwnObject: vi.fn(() => true),
      clampRectToCanvas: vi.fn((obj) => obj), // No clamping by default
      clampCircleToCanvas: vi.fn((obj) => obj),
      clampStarToCanvas: vi.fn((obj) => obj),
      setMouseDownPos: vi.fn((pos) => {
        mockState.mouseDownPos = pos;
      }),
      setIsDragThresholdExceeded: vi.fn((value) => {
        mockState.isDragThresholdExceeded = value;
      }),
      setMoveOriginalPos: vi.fn((pos) => {
        mockState.moveOriginalPos = pos;
      }),
      setIsMoving: vi.fn((value) => {
        mockState.isMoving = value;
      }),
      setMoveStartPos: vi.fn((pos) => {
        mockState.moveStartPos = pos;
      }),
      setLocalRectUpdates: vi.fn((updaterOrValue) => {
        if (typeof updaterOrValue === 'function') {
          mockState.localRectUpdates = updaterOrValue(mockState.localRectUpdates);
        } else {
          mockState.localRectUpdates = updaterOrValue;
        }
      }),
    };

    mockHelpers = {
      pos: { x: 0, y: 0 },
      canvasId: 'test-canvas-id',
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct drag threshold', () => {
      expect(tool.DRAG_THRESHOLD).toBe(5);
    });
  });

  describe('onMouseDown', () => {
    it('should setup movement state when clicking selected object', async () => {
      mockHelpers.pos = { x: 150, y: 150 }; // Inside rectangle
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(mockState.setMouseDownPos).toHaveBeenCalledWith({ x: 150, y: 150 });
      expect(mockState.setIsDragThresholdExceeded).toHaveBeenCalledWith(false);
      expect(mockState.setMoveOriginalPos).toHaveBeenCalledWith({ x: 100, y: 100 });
    });

    it('should not start movement if no object is selected', async () => {
      mockState.selectedObjectId = null;
      mockHelpers.pos = { x: 150, y: 150 };
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(mockState.setMouseDownPos).not.toHaveBeenCalled();
    });

    it('should not start movement if clicked object is not selected', async () => {
      mockState.selectedObjectId = 'circle-1'; // Circle is selected
      mockHelpers.pos = { x: 150, y: 150 }; // But clicking rectangle
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(mockState.setMouseDownPos).not.toHaveBeenCalled();
    });

    it('should not start movement if selected object is not found in canvas objects', async () => {
      mockState.selectedObjectId = 'non-existent-id';
      mockHelpers.pos = { x: 150, y: 150 };
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(mockState.setMoveOriginalPos).not.toHaveBeenCalled();
    });
  });

  describe('onMouseMove - Drag Threshold', () => {
    beforeEach(async () => {
      // Setup: mouse down on rectangle
      mockHelpers.pos = { x: 150, y: 150 };
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // Clear mocks from onMouseDown (which calls setIsDragThresholdExceeded(false))
      vi.clearAllMocks();
    });

    it('should not start dragging if threshold not exceeded', () => {
      // Move within threshold (< 5 pixels)
      mockHelpers.pos = { x: 152, y: 152 };
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      expect(mockState.setIsDragThresholdExceeded).not.toHaveBeenCalled();
      expect(mockState.setIsMoving).not.toHaveBeenCalled();
    });

    it('should start dragging when threshold is exceeded', () => {
      // Move beyond threshold (> 5 pixels)
      mockHelpers.pos = { x: 160, y: 160 };
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      expect(mockState.setIsDragThresholdExceeded).toHaveBeenCalledWith(true);
      expect(mockState.setIsMoving).toHaveBeenCalledWith(true);
      expect(mockState.setMoveStartPos).toHaveBeenCalledWith({ x: 150, y: 150 });
    });

    it('should calculate correct distance for threshold detection', () => {
      // Move exactly 5 pixels horizontally (at threshold boundary)
      mockHelpers.pos = { x: 155, y: 150 };
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      // Should trigger because distance = 5, threshold = 5
      expect(mockState.setIsDragThresholdExceeded).not.toHaveBeenCalled();
      
      // Move 6 pixels (just past threshold)
      mockHelpers.pos = { x: 156, y: 150 };
      tool.onMouseMove({}, mockState, mockHelpers);
      
      expect(mockState.setIsDragThresholdExceeded).toHaveBeenCalledWith(true);
    });
  });

  describe('onMouseMove - Object Movement', () => {
    beforeEach(async () => {
      // Setup: mouse down and exceed drag threshold
      mockHelpers.pos = { x: 150, y: 150 };
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // Exceed threshold
      mockState.isDragThresholdExceeded = true;
      mockState.isMoving = true;
      mockState.moveStartPos = { x: 150, y: 150 };
      mockState.moveOriginalPos = { x: 100, y: 100 };
    });

    it('should update object position based on delta', () => {
      // Move 50 pixels right and 30 pixels down
      mockHelpers.pos = { x: 200, y: 180 };
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      // Original position (100, 100) + delta (50, 30) = (150, 130)
      expect(mockState.setLocalRectUpdates).toHaveBeenCalled();
      const updatedObject = mockState.localRectUpdates['rect-1'];
      expect(updatedObject).toBeDefined();
      expect(updatedObject.x).toBe(150);
      expect(updatedObject.y).toBe(130);
    });

    it('should broadcast position updates via RTDB', () => {
      mockHelpers.pos = { x: 200, y: 180 };
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      expect(canvasService.updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas-id',
        'rect-1',
        expect.objectContaining({
          x: 150,
          y: 130,
          width: 150,
          height: 100,
        })
      );
    });

    it('should not broadcast if user does not own object', () => {
      mockState.doWeOwnObject = vi.fn(() => false);
      mockHelpers.pos = { x: 200, y: 180 };
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      expect(canvasService.updateActiveObjectPosition).not.toHaveBeenCalled();
    });

    it('should apply boundary constraints for rectangles', () => {
      mockState.clampRectToCanvas = vi.fn((obj) => ({
        ...obj,
        x: Math.max(0, Math.min(obj.x, 500)),
        y: Math.max(0, Math.min(obj.y, 400)),
      }));
      
      // Try to move object to negative position
      mockState.moveOriginalPos = { x: 50, y: 50 };
      mockHelpers.pos = { x: 0, y: 0 }; // Delta: -150, -150 = would be negative
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      expect(mockState.clampRectToCanvas).toHaveBeenCalled();
      const updatedObject = mockState.localRectUpdates['rect-1'];
      expect(updatedObject.x).toBeGreaterThanOrEqual(0);
      expect(updatedObject.y).toBeGreaterThanOrEqual(0);
    });

    it('should handle circle movement with radius property', () => {
      mockState.selectedObjectId = 'circle-1';
      mockState.moveOriginalPos = { x: 300, y: 200 };
      mockHelpers.pos = { x: 350, y: 250 };
      
      // Simulate threshold already exceeded
      mockState.isDragThresholdExceeded = true;
      mockState.isMoving = true;
      mockState.moveStartPos = { x: 300, y: 200 };
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      expect(canvasService.updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas-id',
        'circle-1',
        expect.objectContaining({
          x: 350,
          y: 250,
          radius: 75,
        })
      );
    });
  });

  describe('onMouseUp', () => {
    beforeEach(async () => {
      // Setup: complete drag operation
      mockHelpers.pos = { x: 150, y: 150 };
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      mockState.isDragThresholdExceeded = true;
      mockState.isMoving = true;
      mockState.moveStartPos = { x: 150, y: 150 };
      mockState.moveOriginalPos = { x: 100, y: 100 };
      mockState.localRectUpdates = {
        'rect-1': { ...mockObjects.rectangle, x: 150, y: 130 },
      };
    });

    it('should finalize position to Firestore on mouse up', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);
      
      expect(canvasService.clearActiveObject).toHaveBeenCalledWith('test-canvas-id', 'rect-1');
      expect(canvasService.updateObject).toHaveBeenCalledWith(
        'rect-1',
        { x: 150, y: 130 },
        undefined, // recordAction callback (undefined in tests)
        expect.objectContaining({
          actionType: 'MOVE_OBJECT',
          before: { x: 100, y: 100 },
          objectType: 'Rectangle'
        })
      );
    });

    it('should reset movement state', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);
      
      expect(mockState.setIsMoving).toHaveBeenCalledWith(false);
      expect(mockState.setMoveStartPos).toHaveBeenCalledWith(null);
      expect(mockState.setMouseDownPos).toHaveBeenCalledWith(null);
      expect(mockState.setIsDragThresholdExceeded).toHaveBeenCalledWith(false);
      expect(mockState.setMoveOriginalPos).toHaveBeenCalledWith(null);
    });

    it('should clear local updates', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);
      
      expect(mockState.setLocalRectUpdates).toHaveBeenCalled();
      expect(mockState.localRectUpdates['rect-1']).toBeUndefined();
    });

    it('should not sync if user does not own object', async () => {
      mockState.doWeOwnObject = vi.fn(() => false);
      
      await tool.onMouseUp({}, mockState, mockHelpers);
      
      expect(canvasService.updateObjectPosition).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      canvasService.updateObjectPosition.mockRejectedValueOnce(new Error('Sync failed'));
      
      await expect(tool.onMouseUp({}, mockState, mockHelpers)).resolves.not.toThrow();
      
      // Should still try to clear active object
      expect(canvasService.clearActiveObject).toHaveBeenCalled();
    });

    it('should handle click without drag', async () => {
      mockState.isMoving = false;
      
      await tool.onMouseUp({}, mockState, mockHelpers);
      
      // Should not sync since no movement occurred
      expect(canvasService.updateObjectPosition).not.toHaveBeenCalled();
      expect(canvasService.clearActiveObject).not.toHaveBeenCalled();
    });
  });

  describe('getCursor', () => {
    it('should return default cursor', () => {
      expect(tool.getCursor()).toBe('default');
    });
  });

  describe('Delta Calculation', () => {
    it('should prevent position accumulation by using original position', async () => {
      // Setup
      mockHelpers.pos = { x: 150, y: 150 };
      await tool.onMouseDown({}, mockState, mockHelpers);
      mockState.isDragThresholdExceeded = true;
      mockState.isMoving = true;
      mockState.moveStartPos = { x: 150, y: 150 };
      mockState.moveOriginalPos = { x: 100, y: 100 };
      
      // First move
      mockHelpers.pos = { x: 170, y: 170 };
      tool.onMouseMove({}, mockState, mockHelpers);
      
      let updatedObject = mockState.localRectUpdates['rect-1'];
      expect(updatedObject.x).toBe(120); // 100 + (170 - 150) = 120
      expect(updatedObject.y).toBe(120);
      
      // Second move (should still calculate from original position)
      mockHelpers.pos = { x: 200, y: 200 };
      tool.onMouseMove({}, mockState, mockHelpers);
      
      updatedObject = mockState.localRectUpdates['rect-1'];
      expect(updatedObject.x).toBe(150); // 100 + (200 - 150) = 150, not 120 + 30 = 150
      expect(updatedObject.y).toBe(150);
    });
  });
});
