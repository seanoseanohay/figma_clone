import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RotateTool } from './RotateTool.js';
import {
  lockObject,
  unlockObject,
  updateObject,
  updateActiveObjectPosition,
} from '../services/canvas.service.js';
import {
  createTestRectangle,
  createTestCircle,
  createTestStar,
  createTestText,
} from '../test/fixtures/testData.js';

// Mock canvas service
vi.mock('../services/canvas.service.js', () => ({
  lockObject: vi.fn(() => Promise.resolve()),
  unlockObject: vi.fn(() => Promise.resolve()),
  updateObject: vi.fn(() => Promise.resolve()),
  updateActiveObjectPosition: vi.fn(),
}));

describe('RotateTool', () => {
  let tool;
  let mockState;
  let mockHelpers;
  let testRect;
  let testCircle;
  let testStar;

  beforeEach(() => {
    tool = new RotateTool();

    // Create test shapes
    testRect = createTestRectangle({
      id: 'rect-1',
      x: 400,
      y: 300,
      width: 200,
      height: 150,
      rotation: 0,
    });

    testCircle = createTestCircle({
      id: 'circle-1',
      x: 600,
      y: 400,
      radius: 75,
      rotation: 45,
    });

    testStar = createTestStar({
      id: 'star-1',
      x: 800,
      y: 500,
      outerRadius: 60,
      innerRadius: 24,
      rotation: 90,
    });

    // Mock state
    mockState = {
      selectedObjectId: null,
      canvasObjects: [testRect, testCircle, testStar],
      isRotating: false,
      rotateSelectedId: null,
      rotateStartData: null,
      localRectUpdates: {},
      setSelectedObjectId: vi.fn((id) => { mockState.selectedObjectId = id; }),
      setRotateSelectedId: vi.fn((id) => { mockState.rotateSelectedId = id; }),
      setIsRotating: vi.fn((val) => { mockState.isRotating = val; }),
      setRotateStartData: vi.fn((data) => { mockState.rotateStartData = data; }),
      setLocalRectUpdates: vi.fn((updater) => {
        if (typeof updater === 'function') {
          mockState.localRectUpdates = updater(mockState.localRectUpdates);
        } else {
          mockState.localRectUpdates = updater;
        }
      }),
      findObjectAt: vi.fn(),
      canEditObject: vi.fn(() => true),
      doWeOwnObject: vi.fn(() => true),
    };

    // Mock helpers
    mockHelpers = {
      pos: { x: 400, y: 270 }, // Above rectangle center (rotation handle position)
      canvasId: 'test-canvas',
    };

    // Clear mocks
    lockObject.mockClear();
    unlockObject.mockClear();
    updateObject.mockClear();
    updateActiveObjectPosition.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool Constants', () => {
    it('should have correct rotation handle offset', () => {
      expect(tool.ROTATION_HANDLE_OFFSET).toBe(30);
    });

    it('should have correct rotation handle radius', () => {
      expect(tool.ROTATION_HANDLE_RADIUS).toBe(12);
    });

    it('should have correct snap angle', () => {
      expect(tool.SNAP_ANGLE).toBe(15);
    });
  });

  describe('getRotationHandlePosition', () => {
    it('should position handle above unrotated object', () => {
      const pos = tool.getRotationHandlePosition(testRect);
      
      expect(pos.x).toBeCloseTo(400, 1); // Same x as object
      expect(pos.y).toBeCloseTo(270, 1); // 30px above object (300 - 30)
    });

    it('should adjust handle position for rotated objects', () => {
      const rotatedRect = { ...testRect, rotation: 90 };
      const pos = tool.getRotationHandlePosition(rotatedRect);
      
      // At 90° rotation, handle should be to the left
      expect(pos.x).toBeCloseTo(370, 1); // 30px to the left (sin(90°)=1, so 400-30=370)
      expect(pos.y).toBeCloseTo(300, 1); // Same y as object (cos(90°)=0)
    });

    it('should handle 180° rotation', () => {
      const rotatedRect = { ...testRect, rotation: 180 };
      const pos = tool.getRotationHandlePosition(rotatedRect);
      
      expect(pos.x).toBeCloseTo(400, 1); // Same x
      expect(pos.y).toBeCloseTo(330, 1); // Below object (300 + 30)
    });

    it('should handle 270° rotation', () => {
      const rotatedRect = { ...testRect, rotation: 270 };
      const pos = tool.getRotationHandlePosition(rotatedRect);
      
      expect(pos.x).toBeCloseTo(430, 1); // To the right (sin(270°)=-1, so 400-30*(-1)=430)
      expect(pos.y).toBeCloseTo(300, 1); // Same y (cos(270°)=0)
    });
  });

  describe('calculateAngle', () => {
    it('should return 0° for point directly above object', () => {
      const mousePos = { x: 400, y: 200 }; // Above center
      const angle = tool.calculateAngle(testRect, mousePos);
      
      expect(angle).toBeCloseTo(0, 1);
    });

    it('should return 90° for point to the right of object', () => {
      const mousePos = { x: 500, y: 300 }; // Right of center
      const angle = tool.calculateAngle(testRect, mousePos);
      
      expect(angle).toBeCloseTo(90, 1);
    });

    it('should return 180° for point below object', () => {
      const mousePos = { x: 400, y: 400 }; // Below center
      const angle = tool.calculateAngle(testRect, mousePos);
      
      expect(angle).toBeCloseTo(180, 1);
    });

    it('should return 270° for point to the left of object', () => {
      const mousePos = { x: 300, y: 300 }; // Left of center
      const angle = tool.calculateAngle(testRect, mousePos);
      
      expect(angle).toBeCloseTo(270, 1);
    });

    it('should handle 45° angle', () => {
      const mousePos = { x: 500, y: 200 }; // Top-right diagonal
      const angle = tool.calculateAngle(testRect, mousePos);
      
      expect(angle).toBeCloseTo(45, 1);
    });
  });

  describe('isPointOnRotationHandle', () => {
    it('should detect when point is on rotation handle', () => {
      const handlePos = tool.getRotationHandlePosition(testRect);
      const isOn = tool.isPointOnRotationHandle(handlePos, testRect);
      
      expect(isOn).toBe(true);
    });

    it('should detect when point is within handle radius', () => {
      const handlePos = tool.getRotationHandlePosition(testRect);
      const nearbyPoint = { x: handlePos.x + 5, y: handlePos.y + 5 };
      const isOn = tool.isPointOnRotationHandle(nearbyPoint, testRect);
      
      expect(isOn).toBe(true);
    });

    it('should return false when point is outside handle radius', () => {
      const handlePos = tool.getRotationHandlePosition(testRect);
      const farPoint = { x: handlePos.x + 20, y: handlePos.y + 20 };
      const isOn = tool.isPointOnRotationHandle(farPoint, testRect);
      
      expect(isOn).toBe(false);
    });
  });

  describe('onMouseDown - Rotation Handle Click', () => {
    beforeEach(() => {
      mockState.selectedObjectId = 'rect-1';
    });

    it('should start rotation when clicking on rotation handle', async () => {
      // Position mouse on rotation handle
      const handlePos = tool.getRotationHandlePosition(testRect);
      mockHelpers.pos = handlePos;

      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(lockObject).toHaveBeenCalledWith('rect-1');
      expect(mockState.setIsRotating).toHaveBeenCalledWith(true);
      expect(mockState.setRotateSelectedId).toHaveBeenCalledWith('rect-1');
      expect(mockState.setRotateStartData).toHaveBeenCalledWith(
        expect.objectContaining({
          object: testRect,
          startPos: handlePos,
          initialRotation: 0,
        })
      );
    });

    it('should calculate start angle when clicking handle', async () => {
      const handlePos = tool.getRotationHandlePosition(testRect);
      mockHelpers.pos = handlePos;

      await tool.onMouseDown({}, mockState, mockHelpers);

      const startData = mockState.setRotateStartData.mock.calls[0][0];
      expect(startData.startAngle).toBeDefined();
      expect(typeof startData.startAngle).toBe('number');
    });

    it('should not start rotation if object is locked by another user', async () => {
      testRect.isLockedByOther = true;
      const handlePos = tool.getRotationHandlePosition(testRect);
      mockHelpers.pos = handlePos;

      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(lockObject).not.toHaveBeenCalled();
      expect(mockState.setIsRotating).not.toHaveBeenCalled();
    });

    it('should handle lock errors gracefully', async () => {
      lockObject.mockRejectedValueOnce(new Error('Lock failed'));
      const handlePos = tool.getRotationHandlePosition(testRect);
      mockHelpers.pos = handlePos;

      await expect(tool.onMouseDown({}, mockState, mockHelpers)).resolves.not.toThrow();
      
      expect(mockState.setIsRotating).not.toHaveBeenCalled();
    });

    it('should preserve existing rotation as initial rotation', async () => {
      testCircle.rotation = 45;
      mockState.selectedObjectId = 'circle-1';
      mockState.canvasObjects = [testCircle];
      
      const handlePos = tool.getRotationHandlePosition(testCircle);
      mockHelpers.pos = handlePos;

      await tool.onMouseDown({}, mockState, mockHelpers);

      const startData = mockState.setRotateStartData.mock.calls[0][0];
      expect(startData.initialRotation).toBe(45);
    });
  });

  describe('onMouseDown - Object Selection', () => {
    it('should select object when clicking on it (not on handle)', async () => {
      mockHelpers.pos = { x: 400, y: 300 }; // On object center
      mockState.findObjectAt.mockReturnValue(testRect);

      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(lockObject).toHaveBeenCalledWith('rect-1');
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith('rect-1');
      expect(mockState.setRotateSelectedId).toHaveBeenCalledWith('rect-1');
    });

    it('should unlock previous selection when selecting new object', async () => {
      mockState.selectedObjectId = 'circle-1';
      mockHelpers.pos = { x: 400, y: 300 };
      mockState.findObjectAt.mockReturnValue(testRect);

      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(unlockObject).toHaveBeenCalledWith('circle-1');
      expect(lockObject).toHaveBeenCalledWith('rect-1');
    });

    it('should not select objects that cannot be edited', async () => {
      mockState.canEditObject.mockReturnValue(false);
      mockHelpers.pos = { x: 400, y: 300 };
      mockState.findObjectAt.mockReturnValue(testRect);

      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(lockObject).not.toHaveBeenCalled();
      expect(mockState.setSelectedObjectId).not.toHaveBeenCalled();
    });

    it('should deselect when clicking empty space', async () => {
      mockState.selectedObjectId = 'rect-1';
      mockHelpers.pos = { x: 100, y: 100 };
      mockState.findObjectAt.mockReturnValue(null);

      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(unlockObject).toHaveBeenCalledWith('rect-1');
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith(null);
      expect(mockState.setRotateSelectedId).toHaveBeenCalledWith(null);
    });
  });

  describe('onMouseMove - Rotation', () => {
    beforeEach(() => {
      mockState.isRotating = true;
      mockState.rotateSelectedId = 'rect-1';
      mockState.rotateStartData = {
        object: testRect,
        startPos: { x: 400, y: 270 },
        startAngle: 0,
        initialRotation: 0,
      };
    });

    it('should do nothing if not rotating', () => {
      mockState.isRotating = false;

      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setLocalRectUpdates).not.toHaveBeenCalled();
    });

    it('should update rotation when dragging handle', () => {
      // Drag handle to the right (90° rotation)
      mockHelpers.pos = { x: 500, y: 300 };
      const evt = { evt: { shiftKey: false } };

      tool.onMouseMove(evt, mockState, mockHelpers);

      expect(mockState.setLocalRectUpdates).toHaveBeenCalled();
      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const updatedObj = updateCall({});
      
      expect(updatedObj['rect-1'].rotation).toBeCloseTo(90, 0);
    });

    it('should snap to 15° increments when Shift is pressed', () => {
      // Drag to approximately 47° (should snap to 45°)
      mockHelpers.pos = { x: 475, y: 225 };
      const evt = { evt: { shiftKey: true } };

      tool.onMouseMove(evt, mockState, mockHelpers);

      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const updatedObj = updateCall({});
      
      // Should snap to nearest 15° (45°)
      expect(updatedObj['rect-1'].rotation % 15).toBe(0);
    });

    it('should handle full 360° rotation', () => {
      // Start at 350° and rotate to 10°
      mockState.rotateStartData.initialRotation = 350;
      mockState.rotateStartData.startAngle = 350;
      
      // Mouse position that would result in 20° total rotation
      mockHelpers.pos = { x: 450, y: 250 };
      const evt = { evt: { shiftKey: false } };

      tool.onMouseMove(evt, mockState, mockHelpers);

      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const updatedObj = updateCall({});
      
      // Should normalize to 0-360 range
      expect(updatedObj['rect-1'].rotation).toBeGreaterThanOrEqual(0);
      expect(updatedObj['rect-1'].rotation).toBeLessThan(360);
    });

    it('should send RTDB updates when we own the object', () => {
      mockState.doWeOwnObject.mockReturnValue(true);
      mockHelpers.pos = { x: 500, y: 300 };
      const evt = { evt: { shiftKey: false } };

      tool.onMouseMove(evt, mockState, mockHelpers);

      expect(updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas',
        'rect-1',
        expect.objectContaining({
          x: 400,
          y: 300,
          rotation: expect.any(Number),
        })
      );
    });

    it('should not send RTDB updates when we dont own the object', () => {
      mockState.doWeOwnObject.mockReturnValue(false);
      mockHelpers.pos = { x: 500, y: 300 };
      const evt = { evt: { shiftKey: false } };

      tool.onMouseMove(evt, mockState, mockHelpers);

      expect(updateActiveObjectPosition).not.toHaveBeenCalled();
    });

    it('should handle negative angles correctly', () => {
      // Rotate counterclockwise
      mockHelpers.pos = { x: 300, y: 300 }; // To the left (270°)
      const evt = { evt: { shiftKey: false } };

      tool.onMouseMove(evt, mockState, mockHelpers);

      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const updatedObj = updateCall({});
      
      // Should normalize to positive angle (270°)
      expect(updatedObj['rect-1'].rotation).toBeCloseTo(270, 0);
    });

    it('should accumulate rotation from initial rotation', () => {
      mockState.rotateStartData.initialRotation = 45;
      mockState.rotateStartData.startAngle = 0;
      
      // Rotate an additional 45°
      mockHelpers.pos = { x: 500, y: 200 };
      const evt = { evt: { shiftKey: false } };

      tool.onMouseMove(evt, mockState, mockHelpers);

      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const updatedObj = updateCall({});
      
      // Should be approximately 90° (45 initial + 45 delta)
      expect(updatedObj['rect-1'].rotation).toBeCloseTo(90, 0);
    });
  });

  describe('onMouseUp - Finalize Rotation', () => {
    beforeEach(() => {
      mockState.isRotating = true;
      mockState.rotateSelectedId = 'rect-1';
      mockState.rotateStartData = {
        object: testRect,
        startPos: { x: 400, y: 270 },
        startAngle: 0,
        initialRotation: 0,
      };
      mockState.localRectUpdates = {
        'rect-1': { ...testRect, rotation: 90 },
      };
    });

    it('should save rotation to Firestore', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(updateObject).toHaveBeenCalledWith('rect-1', {
        rotation: 90,
      });
    });

    it('should clear RTDB active object', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas',
        'rect-1',
        null
      );
    });

    it('should unlock the object', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(unlockObject).toHaveBeenCalledWith('rect-1');
    });

    it('should reset rotation states', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.setIsRotating).toHaveBeenCalledWith(false);
      expect(mockState.setRotateStartData).toHaveBeenCalledWith(null);
    });

    it('should clear local updates for rotated object', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.setLocalRectUpdates).toHaveBeenCalled();
      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const result = updateCall(mockState.localRectUpdates);
      
      expect(result['rect-1']).toBeUndefined();
    });

    it('should not save if not rotating', async () => {
      mockState.isRotating = false;

      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(updateObject).not.toHaveBeenCalled();
    });

    it('should not save if no rotate start data', async () => {
      mockState.rotateStartData = null;

      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(updateObject).not.toHaveBeenCalled();
    });

    it('should not save if no local updates', async () => {
      mockState.localRectUpdates = {};

      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(updateObject).not.toHaveBeenCalled();
    });

    it('should handle save errors gracefully', async () => {
      updateObject.mockRejectedValueOnce(new Error('Save failed'));

      await expect(tool.onMouseUp({}, mockState, mockHelpers)).resolves.not.toThrow();
      
      // Should still try to unlock
      expect(unlockObject).toHaveBeenCalled();
    });

    it('should handle unlock errors gracefully', async () => {
      unlockObject.mockRejectedValueOnce(new Error('Unlock failed'));

      await expect(tool.onMouseUp({}, mockState, mockHelpers)).resolves.not.toThrow();
      
      // Should still reset states
      expect(mockState.setIsRotating).toHaveBeenCalledWith(false);
    });

    it('should handle RTDB clear errors gracefully', async () => {
      updateActiveObjectPosition.mockRejectedValueOnce(new Error('RTDB failed'));

      await expect(tool.onMouseUp({}, mockState, mockHelpers)).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle objects without initial rotation', () => {
      const objWithoutRotation = { ...testRect };
      delete objWithoutRotation.rotation;
      
      const handlePos = tool.getRotationHandlePosition(objWithoutRotation);
      
      expect(handlePos.x).toBeDefined();
      expect(handlePos.y).toBeDefined();
    });

    it('should handle very small rotation angles', () => {
      mockState.isRotating = true;
      mockState.rotateSelectedId = 'rect-1';
      mockState.rotateStartData = {
        object: testRect,
        startPos: { x: 400, y: 270 },
        startAngle: 0,
        initialRotation: 0,
      };
      
      // Tiny movement (should produce small angle)
      mockHelpers.pos = { x: 401, y: 269 };
      const evt = { evt: { shiftKey: false } };

      expect(() => tool.onMouseMove(evt, mockState, mockHelpers)).not.toThrow();
    });

    it('should handle rotation at exactly 0°', () => {
      const angle = tool.calculateAngle(testRect, { x: 400, y: 200 });
      expect(angle).toBeCloseTo(0, 1);
    });

    it('should handle rotation at exactly 360° (wraps to 0°)', () => {
      mockState.isRotating = true;
      mockState.rotateSelectedId = 'rect-1';
      mockState.rotateStartData = {
        object: testRect,
        startPos: { x: 400, y: 270 },
        startAngle: 0,
        initialRotation: 359,
      };
      
      // Rotate by 1 more degree
      mockHelpers.pos = { x: 410, y: 265 };
      const evt = { evt: { shiftKey: false } };

      tool.onMouseMove(evt, mockState, mockHelpers);

      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const updatedObj = updateCall({});
      
      // Should wrap to 0-360 range
      expect(updatedObj['rect-1'].rotation).toBeLessThan(360);
    });

    it('should work with all shape types', () => {
      const shapes = [testRect, testCircle, testStar];
      
      shapes.forEach(shape => {
        const handlePos = tool.getRotationHandlePosition(shape);
        expect(handlePos.x).toBeDefined();
        expect(handlePos.y).toBeDefined();
        
        const angle = tool.calculateAngle(shape, { x: shape.x + 50, y: shape.y });
        expect(angle).toBeDefined();
        expect(typeof angle).toBe('number');
      });
    });
  });
});

