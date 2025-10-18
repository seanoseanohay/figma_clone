import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MoveTool } from './MoveTool.js';
import {
  updateActiveObjectPosition,
  updateObjectPosition,
  clearActiveObject,
} from '../services/canvas.service.js';
import {
  createTestRectangle,
  createTestCircle,
  createTestStar,
  createTestText,
} from '../test/fixtures/testData.js';

// Mock canvas service
vi.mock('../services/canvas.service.js', () => ({
  updateActiveObjectPosition: vi.fn(),
  updateObjectPosition: vi.fn(() => Promise.resolve()),
  clearActiveObject: vi.fn(() => Promise.resolve()),
}));

describe('MoveTool', () => {
  let moveTool;
  let mockState;
  let mockHelpers;
  let testRectangle;
  let testCircle;
  let testStar;

  beforeEach(() => {
    moveTool = new MoveTool();

    // Create test objects
    testRectangle = createTestRectangle({ id: 'rect-1', x: 100, y: 100, width: 150, height: 100 });
    testCircle = createTestCircle({ id: 'circle-1', x: 200, y: 200, radius: 75 });
    testStar = createTestStar({ id: 'star-1', x: 300, y: 300, innerRadius: 40, outerRadius: 80 });

    // Mock state
    mockState = {
      selectedObjectId: null,
      canvasObjects: [],
      mouseDownPos: null,
      isDragThresholdExceeded: false,
      isMoving: false,
      moveStartPos: null,
      moveOriginalPos: null,
      localRectUpdates: {},
      setSelectedObjectId: vi.fn((id) => { mockState.selectedObjectId = id; }),
      setMouseDownPos: vi.fn((pos) => { mockState.mouseDownPos = pos; }),
      setIsDragThresholdExceeded: vi.fn((val) => { mockState.isDragThresholdExceeded = val; }),
      setIsMoving: vi.fn((val) => { mockState.isMoving = val; }),
      setMoveStartPos: vi.fn((pos) => { mockState.moveStartPos = pos; }),
      setMoveOriginalPos: vi.fn((pos) => { mockState.moveOriginalPos = pos; }),
      setLocalRectUpdates: vi.fn((updates) => {
        if (typeof updates === 'function') {
          mockState.localRectUpdates = updates(mockState.localRectUpdates);
        } else {
          mockState.localRectUpdates = updates;
        }
      }),
      findObjectAt: vi.fn(),
      doWeOwnObject: vi.fn(() => true),
      clampRectToCanvas: vi.fn((obj) => obj),
      clampCircleToCanvas: vi.fn((obj) => obj),
      clampStarToCanvas: vi.fn((obj) => obj),
    };

    // Mock helpers
    mockHelpers = {
      pos: { x: 100, y: 100 },
      canvasId: 'test-canvas-id',
    };

    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct drag threshold', () => {
      expect(moveTool.DRAG_THRESHOLD).toBe(5);
    });

    it('should return default cursor', () => {
      expect(moveTool.getCursor()).toBe('default');
    });
  });

  describe('Movement Initialization (Mouse Down)', () => {
    it('should require pre-selected object', async () => {
      mockState.selectedObjectId = null;

      await moveTool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setMouseDownPos).not.toHaveBeenCalled();
    });

    it('should setup movement when clicking selected object', async () => {
      mockState.selectedObjectId = 'rect-1';
      mockState.canvasObjects = [testRectangle];
      mockState.findObjectAt.mockReturnValue(testRectangle);

      await moveTool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setMouseDownPos).toHaveBeenCalledWith({ x: 100, y: 100 });
      expect(mockState.setIsDragThresholdExceeded).toHaveBeenCalledWith(false);
      expect(mockState.setMoveOriginalPos).toHaveBeenCalledWith({ x: 100, y: 100 });
    });

    it('should not setup movement when clicking non-selected object', async () => {
      mockState.selectedObjectId = 'rect-1';
      mockState.canvasObjects = [testRectangle];
      mockState.findObjectAt.mockReturnValue(testCircle); // Different object

      await moveTool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setMouseDownPos).not.toHaveBeenCalled();
    });

    it('should not setup movement when clicking empty space', async () => {
      mockState.selectedObjectId = 'rect-1';
      mockState.canvasObjects = [testRectangle];
      mockState.findObjectAt.mockReturnValue(null);

      await moveTool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setMouseDownPos).not.toHaveBeenCalled();
    });

    it('should handle missing object data gracefully', async () => {
      mockState.selectedObjectId = 'rect-1';
      mockState.canvasObjects = []; // Object not in list
      mockState.findObjectAt.mockReturnValue(testRectangle);

      await expect(moveTool.onMouseDown({}, mockState, mockHelpers)).resolves.not.toThrow();

      expect(mockState.setMouseDownPos).not.toHaveBeenCalled();
    });
  });

  describe('Drag Threshold Detection (Mouse Move)', () => {
    beforeEach(() => {
      mockState.selectedObjectId = 'rect-1';
      mockState.canvasObjects = [testRectangle];
      mockState.mouseDownPos = { x: 100, y: 100 };
      mockState.moveOriginalPos = { x: 100, y: 100 };
    });

    it('should not move if below threshold', () => {
      mockHelpers.pos = { x: 102, y: 102 }; // Distance: ~2.83px (below 5px threshold)

      moveTool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setIsDragThresholdExceeded).not.toHaveBeenCalled();
      expect(mockState.setIsMoving).not.toHaveBeenCalled();
    });

    it('should start moving when threshold exceeded', () => {
      mockHelpers.pos = { x: 110, y: 100 }; // Distance: 10px (above threshold)

      moveTool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setIsDragThresholdExceeded).toHaveBeenCalledWith(true);
      expect(mockState.setIsMoving).toHaveBeenCalledWith(true);
      expect(mockState.setMoveStartPos).toHaveBeenCalledWith({ x: 100, y: 100 });
    });

    it('should calculate correct distance for threshold', () => {
      mockHelpers.pos = { x: 104, y: 103 }; // Distance: 5px exactly

      moveTool.onMouseMove({}, mockState, mockHelpers);

      // Threshold is > 5, so distance = 5 should NOT trigger (need to be greater than 5)
      expect(mockState.setIsDragThresholdExceeded).not.toHaveBeenCalled();
      
      // Test with distance slightly above threshold
      mockHelpers.pos = { x: 106, y: 100 }; // Distance: 6px (above threshold)
      moveTool.onMouseMove({}, mockState, mockHelpers);
      
      expect(mockState.setIsDragThresholdExceeded).toHaveBeenCalledWith(true);
    });
  });

  describe('Object Movement (Mouse Move - After Threshold)', () => {
    beforeEach(() => {
      mockState.selectedObjectId = 'rect-1';
      mockState.canvasObjects = [testRectangle];
      mockState.mouseDownPos = { x: 100, y: 100 };
      mockState.isDragThresholdExceeded = true;
      mockState.isMoving = true;
      mockState.moveStartPos = { x: 100, y: 100 };
      mockState.moveOriginalPos = { x: 100, y: 100 };
    });

    it('should update local position during drag', () => {
      mockHelpers.pos = { x: 150, y: 120 }; // Moved 50px right, 20px down

      moveTool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setLocalRectUpdates).toHaveBeenCalled();
      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const updatedObjects = updateCall({});
      
      expect(updatedObjects['rect-1']).toBeDefined();
      expect(updatedObjects['rect-1'].x).toBe(150); // 100 + 50
      expect(updatedObjects['rect-1'].y).toBe(120); // 100 + 20
    });

    it('should send real-time updates via RTDB when we own object', () => {
      mockState.doWeOwnObject.mockReturnValue(true);
      mockHelpers.pos = { x: 120, y: 110 };

      moveTool.onMouseMove({}, mockState, mockHelpers);

      expect(updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas-id',
        'rect-1',
        expect.objectContaining({
          x: 120,
          y: 110,
        })
      );
    });

    it('should not send real-time updates if we dont own object', () => {
      mockState.doWeOwnObject.mockReturnValue(false);
      mockHelpers.pos = { x: 120, y: 110 };

      moveTool.onMouseMove({}, mockState, mockHelpers);

      expect(updateActiveObjectPosition).not.toHaveBeenCalled();
    });

    it('should apply boundary clamping for rectangles', () => {
      mockState.clampRectToCanvas.mockReturnValue({ 
        ...testRectangle, 
        x: 150, 
        y: 120, 
        clamped: true 
      });
      mockHelpers.pos = { x: 160, y: 130 }; // Would go out of bounds

      moveTool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.clampRectToCanvas).toHaveBeenCalled();
      
      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const updatedObjects = updateCall({});
      expect(updatedObjects['rect-1'].clamped).toBe(true);
    });

    it('should apply boundary clamping for circles', () => {
      mockState.selectedObjectId = 'circle-1';
      mockState.canvasObjects = [testCircle];
      mockState.moveOriginalPos = { x: 200, y: 200 };
      mockState.clampCircleToCanvas.mockReturnValue({ 
        ...testCircle, 
        x: 210, 
        y: 210, 
        clamped: true 
      });
      mockHelpers.pos = { x: 220, y: 220 };

      moveTool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.clampCircleToCanvas).toHaveBeenCalled();
    });

    it('should apply boundary clamping for stars', () => {
      mockState.selectedObjectId = 'star-1';
      mockState.canvasObjects = [testStar];
      mockState.moveOriginalPos = { x: 300, y: 300 };
      mockState.clampStarToCanvas.mockReturnValue({ 
        ...testStar, 
        x: 310, 
        y: 310, 
        clamped: true 
      });
      mockHelpers.pos = { x: 320, y: 320 };

      moveTool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.clampStarToCanvas).toHaveBeenCalled();
    });

    it('should include rectangle dimensions in RTDB update', () => {
      mockState.doWeOwnObject.mockReturnValue(true);
      mockHelpers.pos = { x: 120, y: 110 };

      moveTool.onMouseMove({}, mockState, mockHelpers);

      expect(updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas-id',
        'rect-1',
        expect.objectContaining({
          x: 120,
          y: 110,
          width: 150,
          height: 100,
        })
      );
    });

    it('should include circle radius in RTDB update', () => {
      mockState.selectedObjectId = 'circle-1';
      mockState.canvasObjects = [testCircle];
      mockState.moveOriginalPos = { x: 200, y: 200 };
      mockState.moveStartPos = { x: 200, y: 200 }; // Set moveStartPos
      mockState.doWeOwnObject.mockReturnValue(true);
      mockHelpers.pos = { x: 210, y: 210 };

      moveTool.onMouseMove({}, mockState, mockHelpers);

      expect(updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas-id',
        'circle-1',
        expect.objectContaining({
          x: 210,
          y: 210,
          radius: 75,
        })
      );
    });

    it('should include star radii in RTDB update', () => {
      mockState.selectedObjectId = 'star-1';
      mockState.canvasObjects = [testStar];
      mockState.moveOriginalPos = { x: 300, y: 300 };
      mockState.moveStartPos = { x: 300, y: 300 }; // Set moveStartPos
      mockState.doWeOwnObject.mockReturnValue(true);
      mockHelpers.pos = { x: 310, y: 310 };

      moveTool.onMouseMove({}, mockState, mockHelpers);

      expect(updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas-id',
        'star-1',
        expect.objectContaining({
          x: 310,
          y: 310,
          innerRadius: 40,
          outerRadius: 80,
        })
      );
    });
  });

  describe('Movement Finalization (Mouse Up)', () => {
    beforeEach(() => {
      mockState.selectedObjectId = 'rect-1';
      mockState.canvasObjects = [testRectangle];
      mockState.isMoving = true;
      mockState.localRectUpdates = {
        'rect-1': { ...testRectangle, x: 150, y: 120 },
      };
      mockState.doWeOwnObject.mockReturnValue(true);
    });

    it('should sync final position to Firestore', async () => {
      await moveTool.onMouseUp({}, mockState, mockHelpers);

      expect(updateObjectPosition).toHaveBeenCalledWith(
        'rect-1',
        { x: 150, y: 120 },
        false // Keep locked
      );
    });

    it('should clear active object from RTDB', async () => {
      await moveTool.onMouseUp({}, mockState, mockHelpers);

      expect(clearActiveObject).toHaveBeenCalledWith('test-canvas-id', 'rect-1');
    });

    it('should reset movement states', async () => {
      await moveTool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.setIsMoving).toHaveBeenCalledWith(false);
      expect(mockState.setMoveStartPos).toHaveBeenCalledWith(null);
      expect(mockState.setMouseDownPos).toHaveBeenCalledWith(null);
      expect(mockState.setIsDragThresholdExceeded).toHaveBeenCalledWith(false);
      expect(mockState.setMoveOriginalPos).toHaveBeenCalledWith(null);
    });

    it('should clear local updates after sync', async () => {
      await moveTool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.setLocalRectUpdates).toHaveBeenCalled();
      
      // Verify local updates are cleared
      const clearCall = mockState.setLocalRectUpdates.mock.calls.find(call => {
        const result = call[0]({ 'rect-1': {} });
        return !result['rect-1'];
      });
      expect(clearCall).toBeDefined();
    });

    it('should handle sync errors gracefully', async () => {
      updateObjectPosition.mockRejectedValueOnce(new Error('Sync failed'));

      await expect(moveTool.onMouseUp({}, mockState, mockHelpers)).resolves.not.toThrow();

      // Should still try to clear RTDB even if Firestore fails
      expect(clearActiveObject).toHaveBeenCalledTimes(2); // Once initially, once in error handler
    });

    it('should handle clear active object errors gracefully', async () => {
      clearActiveObject.mockRejectedValueOnce(new Error('Clear failed'));

      await expect(moveTool.onMouseUp({}, mockState, mockHelpers)).resolves.not.toThrow();

      // If clearActiveObject fails initially, it goes to catch block which tries again
      // updateObjectPosition is NOT called if clearActiveObject fails first
      expect(clearActiveObject).toHaveBeenCalledTimes(2);
      expect(updateObjectPosition).not.toHaveBeenCalled();
    });

    it('should not sync if we dont own object', async () => {
      mockState.doWeOwnObject.mockReturnValue(false);

      await moveTool.onMouseUp({}, mockState, mockHelpers);

      expect(updateObjectPosition).not.toHaveBeenCalled();
      expect(clearActiveObject).not.toHaveBeenCalled();
    });

    it('should not sync if not moving (just a click)', async () => {
      mockState.isMoving = false;

      await moveTool.onMouseUp({}, mockState, mockHelpers);

      expect(updateObjectPosition).not.toHaveBeenCalled();
      expect(clearActiveObject).not.toHaveBeenCalled();
      
      // Should still reset states
      expect(mockState.setIsMoving).toHaveBeenCalledWith(false);
    });

    it('should keep object locked after movement', async () => {
      await moveTool.onMouseUp({}, mockState, mockHelpers);

      // Verify the 'false' parameter keeps object locked
      expect(updateObjectPosition).toHaveBeenCalledWith(
        'rect-1',
        expect.any(Object),
        false
      );
    });
  });

  describe('Edge Cases', () => {
    it('should not move if mouse down position not set', () => {
      mockState.selectedObjectId = 'rect-1';
      mockState.canvasObjects = [testRectangle];
      mockState.mouseDownPos = null;

      moveTool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setIsDragThresholdExceeded).not.toHaveBeenCalled();
    });

    it('should not move if no selected object', () => {
      mockState.selectedObjectId = null;
      mockState.mouseDownPos = { x: 100, y: 100 };

      moveTool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setIsDragThresholdExceeded).not.toHaveBeenCalled();
    });

    it('should handle missing object during movement', () => {
      mockState.selectedObjectId = 'rect-1';
      mockState.canvasObjects = []; // Object not found
      mockState.mouseDownPos = { x: 100, y: 100 };
      mockState.isDragThresholdExceeded = true;
      mockState.isMoving = true;
      mockState.moveStartPos = { x: 100, y: 100 };
      mockState.moveOriginalPos = { x: 100, y: 100 };

      expect(() => moveTool.onMouseMove({}, mockState, mockHelpers)).not.toThrow();
      
      expect(mockState.setLocalRectUpdates).not.toHaveBeenCalled();
    });

    it('should handle unknown shape types gracefully', () => {
      const unknownShape = { ...testRectangle, type: 'unknown' };
      mockState.selectedObjectId = 'rect-1';
      mockState.canvasObjects = [unknownShape];
      mockState.mouseDownPos = { x: 100, y: 100 };
      mockState.isDragThresholdExceeded = true;
      mockState.isMoving = true;
      mockState.moveStartPos = { x: 100, y: 100 };
      mockState.moveOriginalPos = { x: 100, y: 100 };
      mockHelpers.pos = { x: 120, y: 110 };

      expect(() => moveTool.onMouseMove({}, mockState, mockHelpers)).not.toThrow();
      
      // Should still update position without clamping
      expect(mockState.setLocalRectUpdates).toHaveBeenCalled();
    });
  });
});

