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
  lockObject: vi.fn(() => Promise.resolve()),
  unlockObject: vi.fn(() => Promise.resolve()),
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
      isMoving: false,
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
      canEditObject: vi.fn(() => true),
      clampRectToCanvas: vi.fn((obj) => obj), // No clamping by default
      clampCircleToCanvas: vi.fn((obj) => obj),
      clampStarToCanvas: vi.fn((obj) => obj),
      setMouseDownPos: vi.fn((pos) => {
        mockState.mouseDownPos = pos;
      }),
      setMoveOriginalPos: vi.fn((pos) => {
        mockState.moveOriginalPos = pos;
      }),
      setIsMoving: vi.fn((value) => {
        mockState.isMoving = value;
      }),
      setLocalRectUpdates: vi.fn((updaterOrValue) => {
        if (typeof updaterOrValue === 'function') {
          mockState.localRectUpdates = updaterOrValue(mockState.localRectUpdates);
        } else {
          mockState.localRectUpdates = updaterOrValue;
        }
      }),
      setSelectedObjectId: vi.fn((id) => {
        mockState.selectedObjectId = id;
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
    it('should initialize without drag threshold (immediate movement)', () => {
      expect(tool.DRAG_THRESHOLD).toBeUndefined();
    });
  });

  describe('onMouseDown', () => {
    it('should setup movement state when clicking selected object', async () => {
      mockHelpers.pos = { x: 150, y: 150 }; // Inside rectangle
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(mockState.setMouseDownPos).toHaveBeenCalledWith({ x: 150, y: 150 });
      expect(mockState.setMoveOriginalPos).toHaveBeenCalledWith({ x: 100, y: 100 });
    });

    it('should auto-select object when no object is currently selected', async () => {
      mockState.selectedObjectId = null;
      mockHelpers.pos = { x: 150, y: 150 }; // Clicking on rectangle
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // With auto-selection, it should select the object and set up movement
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith('rect-1');
      expect(mockState.setMouseDownPos).toHaveBeenCalledWith({ x: 150, y: 150 });
      expect(mockState.setMoveOriginalPos).toHaveBeenCalledWith({ x: 100, y: 100 });
    });

    it('should switch selection when clicking different object', async () => {
      mockState.selectedObjectId = 'circle-1'; // Circle is selected
      mockHelpers.pos = { x: 150, y: 150 }; // But clicking rectangle
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // With auto-selection, it should switch to the clicked object
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith('rect-1');
      expect(mockState.setMouseDownPos).toHaveBeenCalledWith({ x: 150, y: 150 });
      expect(mockState.setMoveOriginalPos).toHaveBeenCalledWith({ x: 100, y: 100 });
    });

    it('should auto-select clicked object when current selection does not exist', async () => {
      mockState.selectedObjectId = 'non-existent-id'; // Invalid selected ID
      mockHelpers.pos = { x: 150, y: 150 }; // But clicking on valid rectangle
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // Should auto-select the clicked object (rectangle) even though current selection is invalid
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith('rect-1');
      expect(mockState.setMouseDownPos).toHaveBeenCalledWith({ x: 150, y: 150 });
      expect(mockState.setMoveOriginalPos).toHaveBeenCalledWith({ x: 100, y: 100 });
    });
  });

  describe('onMouseMove - Immediate Movement', () => {
    beforeEach(async () => {
      // Setup: mouse down on rectangle
      mockHelpers.pos = { x: 150, y: 150 };
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // Clear mocks from onMouseDown
      vi.clearAllMocks();
    });

    it('should start moving immediately on any mouse movement', () => {
      // Even tiny movement (1 pixel) should start drag
      mockHelpers.pos = { x: 151, y: 150 };
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      expect(mockState.setIsMoving).toHaveBeenCalledWith(true);
    });

    it('should start moving with zero pixel threshold', () => {
      // Any movement should trigger drag
      mockHelpers.pos = { x: 150.5, y: 150.5 };
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      expect(mockState.setIsMoving).toHaveBeenCalledWith(true);
    });

    it('should calculate movement from mouseDownPos immediately', () => {
      // Movement calculation should be immediate
      mockHelpers.pos = { x: 155, y: 155 }; // 5 pixel movement
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      expect(mockState.setIsMoving).toHaveBeenCalledWith(true);
      // Should update localRectUpdates with new position
      expect(mockState.setLocalRectUpdates).toHaveBeenCalled();
    });
  });

  describe('onMouseMove - Object Movement', () => {
    beforeEach(async () => {
      // Setup: mouse down (immediate movement ready)
      mockHelpers.pos = { x: 150, y: 150 };
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // Set up for immediate movement (no threshold)
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
      mockState.mouseDownPos = { x: 300, y: 200 }; // Start position
      mockHelpers.pos = { x: 350, y: 250 }; // End position (50px right, 50px down)
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      expect(canvasService.updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas-id',
        'circle-1',
        expect.objectContaining({
          x: 350, // 300 + (350-300) = 350
          y: 250, // 200 + (250-200) = 250
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
      
      mockState.isMoving = true;
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
      expect(mockState.setMouseDownPos).toHaveBeenCalledWith(null);
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
