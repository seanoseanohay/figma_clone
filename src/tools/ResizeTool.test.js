import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResizeTool } from './ResizeTool.js';
import {
  createTestRectangle,
  createTestCircle,
  createTestStar,
  createTestText,
  createMouseEvent,
  createToolContext,
} from '../test/fixtures/testData.js';

// Mock canvas service
vi.mock('../services/canvas.service.js', () => ({
  updateActiveObjectPosition: vi.fn(() => Promise.resolve()),
  updateObjectPosition: vi.fn(() => Promise.resolve()),
  clearActiveObject: vi.fn(() => Promise.resolve()),
  unlockObject: vi.fn(() => Promise.resolve()),
}));

// Import after mocking
import {
  updateActiveObjectPosition,
  updateObjectPosition,
  clearActiveObject,
  unlockObject,
} from '../services/canvas.service.js';

describe('ResizeTool', () => {
  let tool;
  let mockState;
  let mockHelpers;
  let testRect;
  let testCircle;
  let testStar;
  let testText;

  beforeEach(() => {
    tool = new ResizeTool();

    // Create test shapes
    testRect = createTestRectangle({
      id: 'rect-1',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    });

    testCircle = createTestCircle({
      id: 'circle-1',
      x: 300,
      y: 300,
      radius: 50,
    });

    testStar = createTestStar({
      id: 'star-1',
      x: 500,
      y: 500,
      outerRadius: 60,
      innerRadius: 24,
    });

    testText = createTestText({
      id: 'text-1',
      x: 700,
      y: 700,
      width: 200,
    });

    // Mock state
    mockState = {
      selectedObjectId: null,
      canvasObjects: [testRect, testCircle, testStar, testText],
      isResizing: false,
      resizeHandle: null,
      resizeSelectedId: null,
      resizeStartData: null,
      localRectUpdates: {},
      setSelectedObjectId: vi.fn(),
      setIsResizing: vi.fn(),
      setResizeHandle: vi.fn(),
      setResizeSelectedId: vi.fn(),
      setResizeStartData: vi.fn(),
      setLocalRectUpdates: vi.fn(),
      doWeOwnObject: vi.fn(() => true),
      clampRectToCanvas: vi.fn((rect) => rect),
      clampCircleToCanvas: vi.fn((circle) => circle),
      clampStarToCanvas: vi.fn((star) => star),
    };

    // Mock helpers
    mockHelpers = createToolContext({
      pos: { x: 150, y: 150 },
      canvasId: 'test-canvas',
    });

    // Reset Firebase mocks
    updateActiveObjectPosition.mockClear();
    updateObjectPosition.mockClear();
    clearActiveObject.mockClear();
  });

  describe('Tool Properties', () => {
    it('should have correct minimum size', () => {
      expect(tool.minSize).toBe(2);
    });

    it('should return correct cursor style', () => {
      expect(tool.getCursor()).toBe('nw-resize');
    });
  });

  describe('getClosestCorner', () => {
    it('should detect nw corner for rectangle', () => {
      const pos = { x: 100, y: 100 };
      const corner = tool.getClosestCorner(pos, testRect);
      expect(corner).toBe('nw');
    });

    it('should detect ne corner for rectangle', () => {
      const pos = { x: 300, y: 100 };
      const corner = tool.getClosestCorner(pos, testRect);
      expect(corner).toBe('ne');
    });

    it('should detect sw corner for rectangle', () => {
      const pos = { x: 100, y: 250 };
      const corner = tool.getClosestCorner(pos, testRect);
      expect(corner).toBe('sw');
    });

    it('should detect se corner for rectangle', () => {
      const pos = { x: 300, y: 250 };
      const corner = tool.getClosestCorner(pos, testRect);
      expect(corner).toBe('se');
    });

    it('should return null when click is outside rectangle bounds', () => {
      const pos = { x: 50, y: 50 };
      const corner = tool.getClosestCorner(pos, testRect);
      expect(corner).toBeNull();
    });

    it('should detect corners for circle using bounding box', () => {
      // Circle at (300, 300) with radius 50 has bounds (250, 250, 100, 100)
      const nwPos = { x: 250, y: 250 };
      const corner = tool.getClosestCorner(nwPos, testCircle);
      expect(corner).toBe('nw');
    });

    it('should detect corners for star using bounding box', () => {
      // Star at (500, 500) with outerRadius 60 has bounds (440, 440, 120, 120)
      const sePos = { x: 560, y: 560 };
      const corner = tool.getClosestCorner(sePos, testStar);
      expect(corner).toBe('se');
    });

    it('should return null when click is outside circle bounds', () => {
      const pos = { x: 400, y: 400 };
      const corner = tool.getClosestCorner(pos, testCircle);
      expect(corner).toBeNull();
    });
  });

  describe('onMouseDown - Resize Initialization', () => {
    it('should do nothing if no object is selected', async () => {
      mockState.selectedObjectId = null;

      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsResizing).not.toHaveBeenCalled();
    });

    it('should do nothing if selected object is not found', async () => {
      mockState.selectedObjectId = 'nonexistent-id';

      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsResizing).not.toHaveBeenCalled();
    });

    it('should do nothing if click is not on a corner handle', async () => {
      mockState.selectedObjectId = 'rect-1';
      mockHelpers.pos = { x: 50, y: 50 }; // Outside bounds

      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsResizing).not.toHaveBeenCalled();
    });

    it('should start resize when clicking on nw corner', async () => {
      mockState.selectedObjectId = 'rect-1';
      mockHelpers.pos = { x: 100, y: 100 }; // NW corner

      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsResizing).toHaveBeenCalledWith(true);
      expect(mockState.setResizeHandle).toHaveBeenCalledWith('nw');
      expect(mockState.setResizeSelectedId).toHaveBeenCalledWith('rect-1');
      expect(mockState.setResizeStartData).toHaveBeenCalledWith({
        object: testRect,
        startPos: mockHelpers.pos,
      });
    });

    it('should start resize when clicking on se corner', async () => {
      mockState.selectedObjectId = 'rect-1';
      mockHelpers.pos = { x: 300, y: 250 }; // SE corner

      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setResizeHandle).toHaveBeenCalledWith('se');
    });

    it('should not start new resize if already resizing', async () => {
      mockState.selectedObjectId = 'rect-1';
      mockState.isResizing = true;
      mockHelpers.pos = { x: 100, y: 100 };

      await tool.onMouseDown({}, mockState, mockHelpers);

      // Should not call setIsResizing again
      expect(mockState.setIsResizing).not.toHaveBeenCalled();
    });
  });

  describe('calculateRectangleResize', () => {
    it('should resize from nw corner correctly', () => {
      const newRect = tool.calculateRectangleResize(testRect, 'nw', 20, 10);

      expect(newRect.x).toBe(120); // x + 20
      expect(newRect.y).toBe(110); // y + 10
      expect(newRect.width).toBe(180); // width - 20
      expect(newRect.height).toBe(140); // height - 10
    });

    it('should resize from ne corner correctly', () => {
      const newRect = tool.calculateRectangleResize(testRect, 'ne', 20, 10);

      expect(newRect.x).toBe(100); // unchanged
      expect(newRect.y).toBe(110); // y + 10
      expect(newRect.width).toBe(220); // width + 20
      expect(newRect.height).toBe(140); // height - 10
    });

    it('should resize from sw corner correctly', () => {
      const newRect = tool.calculateRectangleResize(testRect, 'sw', 20, 10);

      expect(newRect.x).toBe(120); // x + 20
      expect(newRect.y).toBe(100); // unchanged
      expect(newRect.width).toBe(180); // width - 20
      expect(newRect.height).toBe(160); // height + 10
    });

    it('should resize from se corner correctly', () => {
      const newRect = tool.calculateRectangleResize(testRect, 'se', 20, 10);

      expect(newRect.x).toBe(100); // unchanged
      expect(newRect.y).toBe(100); // unchanged
      expect(newRect.width).toBe(220); // width + 20
      expect(newRect.height).toBe(160); // height + 10
    });
  });

  describe('calculateCircleResize', () => {
    it('should adjust radius based on distance from center', () => {
      const currentPos = { x: 380, y: 300 }; // 80px from center
      const startPos = { x: 350, y: 300 };

      const newCircle = tool.calculateCircleResize(testCircle, 'se', currentPos, startPos);

      expect(newCircle.x).toBe(300); // Center unchanged
      expect(newCircle.y).toBe(300);
      expect(newCircle.radius).toBe(80); // Distance from center
    });

    it('should enforce minimum radius', () => {
      const currentPos = { x: 300, y: 300 }; // At center = 0 distance
      const startPos = { x: 350, y: 300 };

      const newCircle = tool.calculateCircleResize(testCircle, 'se', currentPos, startPos);

      expect(newCircle.radius).toBe(1); // minSize / 2 = 2 / 2 = 1
    });

    it('should calculate radius correctly for diagonal drag', () => {
      const currentPos = { x: 360, y: 360 }; // 60px diagonal from center
      const startPos = { x: 350, y: 300 };
      const expectedRadius = Math.sqrt(60 * 60 + 60 * 60); // ~84.85

      const newCircle = tool.calculateCircleResize(testCircle, 'se', currentPos, startPos);

      expect(newCircle.radius).toBeCloseTo(expectedRadius, 1);
    });
  });

  describe('calculateStarResize', () => {
    it('should adjust outer and inner radius based on distance from center', () => {
      const currentPos = { x: 580, y: 500 }; // 80px from center
      const startPos = { x: 560, y: 500 };

      const newStar = tool.calculateStarResize(testStar, 'se', currentPos, startPos);

      expect(newStar.x).toBe(500); // Center unchanged
      expect(newStar.y).toBe(500);
      expect(newStar.outerRadius).toBe(80); // Distance from center
      expect(newStar.innerRadius).toBe(32); // 40% of outer radius
    });

    it('should maintain 40% ratio between inner and outer radius', () => {
      const currentPos = { x: 600, y: 500 }; // 100px from center
      const startPos = { x: 560, y: 500 };

      const newStar = tool.calculateStarResize(testStar, 'se', currentPos, startPos);

      expect(newStar.outerRadius).toBe(100);
      expect(newStar.innerRadius).toBe(40); // 40% of 100
    });

    it('should enforce minimum radii', () => {
      const currentPos = { x: 500, y: 500 }; // At center = 0 distance
      const startPos = { x: 560, y: 500 };

      const newStar = tool.calculateStarResize(testStar, 'se', currentPos, startPos);

      expect(newStar.outerRadius).toBe(1); // minSize / 2 = 2 / 2 = 1
      expect(newStar.innerRadius).toBe(0.5); // minSize / 4 = 2 / 4 = 0.5
    });
  });

  describe('handleCrossoverDetection - E4 REGRESSION TEST', () => {
    it('should detect nw -> se crossover when dragging nw past se', () => {
      const originalRect = { x: 100, y: 100, width: 200, height: 150 };
      const currentRect = { x: 320, y: 270, width: -20, height: -20 }; // Crossed over
      const currentHandle = 'nw';

      const result = tool.handleCrossoverDetection(currentRect, currentHandle, originalRect);

      expect(result.flipped).toBe(true);
      expect(result.handle).toBe('se');
    });

    it('should detect horizontal crossover (nw -> ne)', () => {
      const originalRect = { x: 100, y: 100, width: 200, height: 150 };
      const currentRect = { x: 320, y: 120, width: -20, height: 130 }; // Crossed horizontally
      const currentHandle = 'nw';

      const result = tool.handleCrossoverDetection(currentRect, currentHandle, originalRect);

      expect(result.flipped).toBe(true);
      expect(result.handle).toBe('ne');
    });

    it('should detect vertical crossover (nw -> sw)', () => {
      const originalRect = { x: 100, y: 100, width: 200, height: 150 };
      const currentRect = { x: 120, y: 270, width: 180, height: -20 }; // Crossed vertically
      const currentHandle = 'nw';

      const result = tool.handleCrossoverDetection(currentRect, currentHandle, originalRect);

      expect(result.flipped).toBe(true);
      expect(result.handle).toBe('sw');
    });

    it('should detect ne -> sw crossover', () => {
      const originalRect = { x: 100, y: 100, width: 200, height: 150 };
      const currentRect = { x: 80, y: 270, width: -100, height: -20 }; // NE crossed to SW
      const currentHandle = 'ne';

      const result = tool.handleCrossoverDetection(currentRect, currentHandle, originalRect);

      expect(result.flipped).toBe(true);
      expect(result.handle).toBe('sw');
    });

    it('should detect se -> nw crossover', () => {
      const originalRect = { x: 100, y: 100, width: 200, height: 150 };
      const currentRect = { x: 80, y: 80, width: -100, height: -100 }; // SE crossed to NW
      const currentHandle = 'se';

      const result = tool.handleCrossoverDetection(currentRect, currentHandle, originalRect);

      expect(result.flipped).toBe(true);
      expect(result.handle).toBe('nw');
    });

    it('should detect sw -> ne crossover', () => {
      const originalRect = { x: 100, y: 100, width: 200, height: 150 };
      const currentRect = { x: 320, y: 80, width: 20, height: -100 }; // SW crossed to NE
      const currentHandle = 'sw';

      const result = tool.handleCrossoverDetection(currentRect, currentHandle, originalRect);

      expect(result.flipped).toBe(true);
      expect(result.handle).toBe('ne');
    });

    it('should not detect crossover during normal resize', () => {
      const originalRect = { x: 100, y: 100, width: 200, height: 150 };
      const currentRect = { x: 120, y: 120, width: 180, height: 130 }; // Normal resize
      const currentHandle = 'nw';

      const result = tool.handleCrossoverDetection(currentRect, currentHandle, originalRect);

      expect(result.flipped).toBe(false);
      expect(result.handle).toBe('nw');
    });
  });

  describe('onMouseMove - Rectangle Resize', () => {
    beforeEach(() => {
      mockState.isResizing = true;
      mockState.resizeHandle = 'se';
      mockState.resizeSelectedId = 'rect-1';
      mockState.resizeStartData = {
        object: testRect,
        startPos: { x: 300, y: 250 },
      };
    });

    it('should do nothing if not resizing', () => {
      mockState.isResizing = false;

      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setLocalRectUpdates).not.toHaveBeenCalled();
    });

    it('should update rectangle dimensions during resize', () => {
      mockHelpers.pos = { x: 350, y: 300 }; // Dragged 50px right, 50px down

      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setLocalRectUpdates).toHaveBeenCalled();
      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const updatedRect = updateCall(mockState.localRectUpdates)['rect-1'];

      expect(updatedRect.width).toBe(250); // 200 + 50
      expect(updatedRect.height).toBe(200); // 150 + 50
    });

    it('should send RTDB updates during drag', () => {
      mockHelpers.pos = { x: 350, y: 300 };

      tool.onMouseMove({}, mockState, mockHelpers);

      expect(updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas',
        'rect-1',
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
        })
      );
    });

    it('should not send RTDB updates for objects we don\'t own', () => {
      mockState.doWeOwnObject.mockReturnValue(false);
      mockHelpers.pos = { x: 350, y: 300 };

      tool.onMouseMove({}, mockState, mockHelpers);

      expect(updateActiveObjectPosition).not.toHaveBeenCalled();
    });

    it('should enforce minimum size during resize', () => {
      mockHelpers.pos = { x: 101, y: 101 }; // Dragged to make rect very small

      tool.onMouseMove({}, mockState, mockHelpers);

      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const updatedRect = updateCall(mockState.localRectUpdates)['rect-1'];

      expect(updatedRect.width).toBeGreaterThanOrEqual(2);
      expect(updatedRect.height).toBeGreaterThanOrEqual(2);
    });

    it('should apply boundary clamping', () => {
      mockState.clampRectToCanvas = vi.fn((rect) => ({
        ...rect,
        x: Math.max(0, rect.x),
        y: Math.max(0, rect.y),
      }));

      mockHelpers.pos = { x: 350, y: 300 };
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.clampRectToCanvas).toHaveBeenCalled();
    });

    it('should reset resize data when crossover occurs', () => {
      // Setup for crossover: NW handle dragged past SE corner
      mockState.resizeHandle = 'nw';
      mockState.resizeStartData = {
        object: testRect,
        startPos: { x: 100, y: 100 },
      };
      // Drag far past SE corner
      mockHelpers.pos = { x: 400, y: 350 };

      tool.onMouseMove({}, mockState, mockHelpers);

      // Should detect crossover and update handle
      expect(mockState.setResizeHandle).toHaveBeenCalled();
      expect(mockState.setResizeStartData).toHaveBeenCalled();
    });
  });

  describe('onMouseMove - Circle Resize', () => {
    beforeEach(() => {
      mockState.isResizing = true;
      mockState.resizeHandle = 'se';
      mockState.resizeSelectedId = 'circle-1';
      mockState.resizeStartData = {
        object: testCircle,
        startPos: { x: 350, y: 300 },
      };
    });

    it('should update circle radius during resize', () => {
      mockHelpers.pos = { x: 380, y: 300 }; // 80px from center

      tool.onMouseMove({}, mockState, mockHelpers);

      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const updatedCircle = updateCall(mockState.localRectUpdates)['circle-1'];

      expect(updatedCircle.radius).toBe(80);
    });

    it('should send RTDB updates with circle properties', () => {
      mockHelpers.pos = { x: 380, y: 300 };

      tool.onMouseMove({}, mockState, mockHelpers);

      expect(updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas',
        'circle-1',
        expect.objectContaining({
          x: 300,
          y: 300,
          radius: 80,
        })
      );
    });

    it('should apply circle boundary clamping', () => {
      mockHelpers.pos = { x: 450, y: 300 };

      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.clampCircleToCanvas).toHaveBeenCalled();
    });
  });

  describe('onMouseMove - Star Resize', () => {
    beforeEach(() => {
      mockState.isResizing = true;
      mockState.resizeHandle = 'se';
      mockState.resizeSelectedId = 'star-1';
      mockState.resizeStartData = {
        object: testStar,
        startPos: { x: 560, y: 500 },
      };
    });

    it('should update star radii during resize', () => {
      mockHelpers.pos = { x: 600, y: 500 }; // 100px from center

      tool.onMouseMove({}, mockState, mockHelpers);

      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const updatedStar = updateCall(mockState.localRectUpdates)['star-1'];

      expect(updatedStar.outerRadius).toBe(100);
      expect(updatedStar.innerRadius).toBe(40);
    });

    it('should send RTDB updates with star properties', () => {
      mockHelpers.pos = { x: 600, y: 500 };

      tool.onMouseMove({}, mockState, mockHelpers);

      expect(updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas',
        'star-1',
        expect.objectContaining({
          x: 500,
          y: 500,
          innerRadius: 100 * 0.4,
          outerRadius: 100,
        })
      );
    });

    it('should apply star boundary clamping if available', () => {
      mockHelpers.pos = { x: 650, y: 500 };

      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.clampStarToCanvas).toHaveBeenCalled();
    });
  });

  describe('Post-Rotation State Fallback', () => {
    it('should use localRectUpdates when object not found in canvasObjects', async () => {
      // Simulate post-rotation state: object missing from canvasObjects but in localUpdates
      mockState.selectedObjectId = 'star-1'; // Object is selected
      mockState.canvasObjects = []; // Empty - object not synced from Firestore yet
      mockState.localRectUpdates = {
        'star-1': {
          ...testStar,
          rotation: 45, // Rotated star state
          innerRadius: 25,
          outerRadius: 50
        }
      };

      mockHelpers.pos = { x: 540, y: 480 }; // Near corner

      // Should not throw - should use fallback
      await expect(tool.onMouseDown({}, mockState, mockHelpers)).resolves.not.toThrow();

      // Should successfully initialize resize with merged data
      expect(mockState.setIsResizing).toHaveBeenCalledWith(true);
      expect(mockState.setResizeStartData).toHaveBeenCalled();
      
      // Verify the merged object includes both Firestore and local data
      const resizeData = mockState.setResizeStartData.mock.calls[0][0];
      expect(resizeData.object).toMatchObject({
        id: 'star-1',
        rotation: 45,
        innerRadius: 25,
        outerRadius: 50
      });
    });

    it('should merge canvasObjects with localRectUpdates when both exist', async () => {
      // Object exists in both canvasObjects (stale) and localUpdates (fresh)
      mockState.selectedObjectId = 'star-1'; // Object is selected
      mockState.canvasObjects = [{ ...testStar, rotation: 0 }]; // Stale Firestore data
      mockState.localRectUpdates = {
        'star-1': {
          rotation: 90, // Fresh rotation from local updates
          innerRadius: 30 // Updated radius
        }
      };

      mockHelpers.pos = { x: 540, y: 480 };

      await tool.onMouseDown({}, mockState, mockHelpers);

      // Should merge the data correctly
      const resizeData = mockState.setResizeStartData.mock.calls[0][0];
      expect(resizeData.object).toMatchObject({
        id: 'star-1',
        x: 500,
        y: 500,
        rotation: 90, // From local updates
        innerRadius: 30, // From local updates  
        outerRadius: 60 // From canvasObjects (unchanged)
      });
    });

    it('should log appropriate debug info for missing objects', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Object completely missing
      mockState.selectedObjectId = 'missing-object'; // Object selected but doesn't exist
      mockState.canvasObjects = [];
      mockState.localRectUpdates = {};
      
      mockHelpers.pos = { x: 540, y: 480 };

      await tool.onMouseDown({}, mockState, mockHelpers);

      // Should log debug information
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Selected object not found')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Available objects:', []
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Local updates:', []
      );

      consoleSpy.mockRestore();
    });
  });

  describe('onMouseMove - Text Resize', () => {
    beforeEach(() => {
      mockState.isResizing = true;
      mockState.resizeHandle = 'se';
      mockState.resizeSelectedId = 'text-1';
      mockState.resizeStartData = {
        object: testText,
        startPos: { x: 900, y: 700 },
      };
    });

    it('should update text width from right handle (se/ne)', () => {
      mockHelpers.pos = { x: 950, y: 700 }; // Dragged 50px right

      tool.onMouseMove({}, mockState, mockHelpers);

      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const updatedText = updateCall(mockState.localRectUpdates)['text-1'];

      expect(updatedText.width).toBe(250); // 200 + 50
      expect(updatedText.x).toBe(700); // X unchanged for right handles
    });

    it('should update text width and position from left handle (sw/nw)', () => {
      mockState.resizeHandle = 'nw';
      mockState.resizeStartData.startPos = { x: 700, y: 700 };
      mockHelpers.pos = { x: 720, y: 700 }; // Dragged 20px right

      tool.onMouseMove({}, mockState, mockHelpers);

      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const updatedText = updateCall(mockState.localRectUpdates)['text-1'];

      expect(updatedText.x).toBe(720); // X moves with handle
      expect(updatedText.width).toBe(180); // 200 - 20
    });

    it('should enforce minimum text width', () => {
      mockHelpers.pos = { x: 710, y: 700 }; // Try to make width tiny

      tool.onMouseMove({}, mockState, mockHelpers);

      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const updatedText = updateCall(mockState.localRectUpdates)['text-1'];

      expect(updatedText.width).toBeGreaterThanOrEqual(50);
    });

    it('should send RTDB updates with text width (not height)', () => {
      mockHelpers.pos = { x: 950, y: 700 };

      tool.onMouseMove({}, mockState, mockHelpers);

      expect(updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas',
        'text-1',
        expect.objectContaining({
          x: expect.any(Number),
          width: expect.any(Number),
        })
      );

      // Height should NOT be in RTDB updates
      const callArgs = updateActiveObjectPosition.mock.calls[0][2];
      expect(callArgs.height).toBeUndefined();
    });
  });

  describe('onMouseUp - Finalize Resize', () => {
    beforeEach(() => {
      mockState.isResizing = true;
      mockState.resizeSelectedId = 'rect-1';
      mockState.localRectUpdates = {
        'rect-1': { ...testRect, width: 250, height: 200 },
      };
    });

    it('should sync rectangle to Firestore on mouse up', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(updateObjectPosition).toHaveBeenCalledWith(
        'rect-1',
        expect.objectContaining({
          x: 100,
          y: 100,
          width: 250,
          height: 200,
        }),
        false // Keep locked
      );
    });

    it('should clear RTDB active object', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(clearActiveObject).toHaveBeenCalledWith('test-canvas', 'rect-1');
    });

    it('should reset resize states', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.setIsResizing).toHaveBeenCalledWith(false);
      expect(mockState.setResizeHandle).toHaveBeenCalledWith(null);
      expect(mockState.setResizeStartData).toHaveBeenCalledWith(null);
    });

    it('should clear local updates after sync', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.setLocalRectUpdates).toHaveBeenCalled();
      const updateCall = mockState.setLocalRectUpdates.mock.calls[0][0];
      const result = updateCall(mockState.localRectUpdates);

      expect(result['rect-1']).toBeUndefined();
    });

    it('should not sync if we don\'t own the object', async () => {
      mockState.doWeOwnObject.mockReturnValue(false);

      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(updateObjectPosition).not.toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      updateObjectPosition.mockRejectedValueOnce(new Error('Sync failed'));

      await expect(tool.onMouseUp({}, mockState, mockHelpers)).resolves.not.toThrow();

      // Should still clear active object
      expect(clearActiveObject).toHaveBeenCalled();
    });

    it('should sync circle with radius property', async () => {
      mockState.resizeSelectedId = 'circle-1';
      mockState.localRectUpdates = {
        'circle-1': { ...testCircle, radius: 75 },
      };

      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(updateObjectPosition).toHaveBeenCalledWith(
        'circle-1',
        expect.objectContaining({
          x: 300,
          y: 300,
          radius: 75,
        }),
        false
      );
    });

    it('should sync star with innerRadius and outerRadius properties', async () => {
      mockState.resizeSelectedId = 'star-1';
      mockState.localRectUpdates = {
        'star-1': { ...testStar, outerRadius: 80, innerRadius: 32 },
      };

      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(updateObjectPosition).toHaveBeenCalledWith(
        'star-1',
        expect.objectContaining({
          x: 500,
          y: 500,
          innerRadius: 32,
          outerRadius: 80,
        }),
        false
      );
    });

    it('should sync text with width but not height', async () => {
      mockState.resizeSelectedId = 'text-1';
      mockState.localRectUpdates = {
        'text-1': { ...testText, width: 300 },
      };

      await tool.onMouseUp({}, mockState, mockHelpers);

      const callArgs = updateObjectPosition.mock.calls[0][1];
      expect(callArgs.width).toBe(300);
      expect(callArgs.height).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing resizeStartData gracefully', () => {
      mockState.isResizing = true;
      mockState.resizeHandle = 'se';
      mockState.resizeStartData = null;

      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setLocalRectUpdates).not.toHaveBeenCalled();
    });

    it('should handle unknown shape types gracefully', () => {
      const unknownShape = {
        id: 'unknown-1',
        type: 'unknown',
        x: 100,
        y: 100,
      };

      mockState.isResizing = true;
      mockState.resizeHandle = 'se';
      mockState.resizeSelectedId = 'unknown-1';
      mockState.resizeStartData = {
        object: unknownShape,
        startPos: { x: 100, y: 100 },
      };

      tool.onMouseMove({}, mockState, mockHelpers);

      // Should not update or crash
      expect(mockState.setLocalRectUpdates).not.toHaveBeenCalled();
    });

    it('should handle missing localRectUpdates on mouse up', async () => {
      mockState.localRectUpdates = {};

      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(updateObjectPosition).not.toHaveBeenCalled();
    });

    it('should skip RTDB updates for test objects (matching ^[12]$)', () => {
      mockState.resizeSelectedId = '1';
      mockState.isResizing = true;
      mockState.resizeHandle = 'se';
      mockState.resizeStartData = {
        object: { ...testRect, id: '1' },
        startPos: { x: 300, y: 250 },
      };

      mockHelpers.pos = { x: 350, y: 300 };

      tool.onMouseMove({}, mockState, mockHelpers);

      // Should update local state but not RTDB
      expect(mockState.setLocalRectUpdates).toHaveBeenCalled();
      expect(updateActiveObjectPosition).not.toHaveBeenCalled();
    });

    it('should handle clearActiveObject failure gracefully', async () => {
      clearActiveObject.mockRejectedValueOnce(new Error('Clear failed'));

      await expect(tool.onMouseUp({}, mockState, mockHelpers)).resolves.not.toThrow();
    });
  });
});

