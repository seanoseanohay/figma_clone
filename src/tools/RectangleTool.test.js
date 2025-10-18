import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RectangleTool } from './RectangleTool.js';
import { createObject } from '../services/canvas.service.js';

// Mock canvas service
vi.mock('../services/canvas.service.js', () => ({
  createObject: vi.fn(() => Promise.resolve('new-rect-id')),
}));

// Mock canvas constants
vi.mock('../constants/canvas.constants.js', () => ({
  CANVAS_WIDTH: 1600,
  CANVAS_HEIGHT: 900,
}));

describe('RectangleTool', () => {
  let tool;
  let mockState;
  let mockHelpers;

  beforeEach(() => {
    tool = new RectangleTool();

    // Mock state
    mockState = {
      isDrawing: false,
      currentRect: null,
      selectedColor: '#FF0000',
      setIsDrawing: vi.fn((val) => { mockState.isDrawing = val; }),
      setCurrentRect: vi.fn((rect) => { mockState.currentRect = rect; }),
      clampRectToCanvas: vi.fn((rect) => rect), // No clamping by default
    };

    // Mock helpers
    mockHelpers = {
      pos: { x: 100, y: 100 },
      canvasId: 'test-canvas',
    };

    // Clear mocks
    createObject.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct minimum width', () => {
      expect(tool.minWidth).toBe(2);
    });

    it('should have correct minimum height', () => {
      expect(tool.minHeight).toBe(1);
    });

    it('should return crosshair cursor', () => {
      expect(tool.getCursor()).toBe('crosshair');
    });
  });

  describe('onMouseDown - Start Drawing', () => {
    it('should start drawing when clicking inside canvas bounds', () => {
      tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).toHaveBeenCalledWith(true);
      expect(mockState.setCurrentRect).toHaveBeenCalled();
    });

    it('should create rectangle at click position', () => {
      mockHelpers.pos = { x: 250, y: 350 };
      
      tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setCurrentRect).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 250,
          y: 350,
          width: 0,
          height: 0,
        })
      );
    });

    it('should use selected color for rectangle', () => {
      mockState.selectedColor = '#00FF00';
      
      tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setCurrentRect).toHaveBeenCalledWith(
        expect.objectContaining({
          fill: '#00FF00',
        })
      );
    });

    it('should use default color when no color selected', () => {
      mockState.selectedColor = null;
      
      tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setCurrentRect).toHaveBeenCalledWith(
        expect.objectContaining({
          fill: '#808080',
        })
      );
    });

    it('should assign temporary ID based on timestamp', () => {
      const beforeTime = Date.now();
      tool.onMouseDown({}, mockState, mockHelpers);
      const afterTime = Date.now();

      const callArgs = mockState.setCurrentRect.mock.calls[0][0];
      expect(callArgs.id).toBeGreaterThanOrEqual(beforeTime);
      expect(callArgs.id).toBeLessThanOrEqual(afterTime);
    });

    it('should not start drawing outside canvas bounds (negative x)', () => {
      mockHelpers.pos = { x: -10, y: 100 };
      
      tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).not.toHaveBeenCalled();
    });

    it('should not start drawing outside canvas bounds (negative y)', () => {
      mockHelpers.pos = { x: 100, y: -10 };
      
      tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).not.toHaveBeenCalled();
    });

    it('should not start drawing outside canvas bounds (x too large)', () => {
      mockHelpers.pos = { x: 1700, y: 100 };
      
      tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).not.toHaveBeenCalled();
    });

    it('should not start drawing outside canvas bounds (y too large)', () => {
      mockHelpers.pos = { x: 100, y: 1000 };
      
      tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).not.toHaveBeenCalled();
    });

    it('should allow drawing at canvas origin (0, 0)', () => {
      mockHelpers.pos = { x: 0, y: 0 };
      
      tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).toHaveBeenCalledWith(true);
    });

    it('should allow drawing at canvas bottom-right (max bounds)', () => {
      mockHelpers.pos = { x: 1600, y: 900 };
      
      tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).toHaveBeenCalledWith(true);
    });
  });

  describe('onMouseMove - Update Dimensions', () => {
    beforeEach(() => {
      // Simulate rectangle started at (100, 100)
      mockState.isDrawing = true;
      mockState.currentRect = {
        id: 123456,
        x: 100,
        y: 100,
        width: 0,
        height: 0,
        fill: '#FF0000',
      };
    });

    it('should do nothing when not drawing', () => {
      mockState.isDrawing = false;
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentRect).not.toHaveBeenCalled();
    });

    it('should do nothing when no current rectangle', () => {
      mockState.currentRect = null;
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentRect).not.toHaveBeenCalled();
    });

    it('should update width and height as mouse moves', () => {
      mockHelpers.pos = { x: 250, y: 200 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentRect).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 150, // 250 - 100
          height: 100, // 200 - 100
        })
      );
    });

    it('should allow negative width (dragging left)', () => {
      mockHelpers.pos = { x: 50, y: 150 }; // Left of start
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentRect).toHaveBeenCalledWith(
        expect.objectContaining({
          width: -50, // 50 - 100
          height: 50, // 150 - 100
        })
      );
    });

    it('should allow negative height (dragging up)', () => {
      mockHelpers.pos = { x: 150, y: 50 }; // Above start
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentRect).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 50, // 150 - 100
          height: -50, // 50 - 100
        })
      );
    });

    it('should allow both negative width and height (dragging top-left)', () => {
      mockHelpers.pos = { x: 50, y: 50 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentRect).toHaveBeenCalledWith(
        expect.objectContaining({
          width: -50,
          height: -50,
        })
      );
    });

    it('should preserve rectangle ID and position', () => {
      mockHelpers.pos = { x: 200, y: 200 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      const updatedRect = mockState.setCurrentRect.mock.calls[0][0];
      expect(updatedRect.id).toBe(123456);
      expect(updatedRect.x).toBe(100);
      expect(updatedRect.y).toBe(100);
    });

    it('should preserve rectangle fill color', () => {
      mockHelpers.pos = { x: 200, y: 200 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentRect).toHaveBeenCalledWith(
        expect.objectContaining({
          fill: '#FF0000',
        })
      );
    });
  });

  describe('onMouseUp - Finalize Rectangle', () => {
    beforeEach(() => {
      mockState.isDrawing = true;
      mockState.currentRect = {
        id: 123456,
        x: 100,
        y: 100,
        width: 150,
        height: 100,
        fill: '#FF0000',
      };
    });

    it('should do nothing when not drawing', async () => {
      mockState.isDrawing = false;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).not.toHaveBeenCalled();
    });

    it('should do nothing when no current rectangle', async () => {
      mockState.currentRect = null;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).not.toHaveBeenCalled();
    });

    it('should save rectangle when dimensions meet minimum', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'rectangle',
        expect.objectContaining({
          x: 100,
          y: 100,
          width: 150,
          height: 100,
        }),
        'test-canvas',
        expect.objectContaining({
          fill: '#FF0000',
          stroke: '#333333',
          strokeWidth: 1,
        })
      );
    });

    it('should normalize negative width before saving', async () => {
      mockState.currentRect = {
        ...mockState.currentRect,
        width: -150, // Negative width
      };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'rectangle',
        expect.objectContaining({
          x: -50, // 100 + (-150) = -50 (would be clamped)
          width: 150, // Absolute value
        }),
        'test-canvas',
        expect.any(Object)
      );
    });

    it('should normalize negative height before saving', async () => {
      mockState.currentRect = {
        ...mockState.currentRect,
        height: -100, // Negative height
      };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'rectangle',
        expect.objectContaining({
          y: 0, // 100 + (-100) = 0
          height: 100, // Absolute value
        }),
        'test-canvas',
        expect.any(Object)
      );
    });

    it('should normalize both negative dimensions', async () => {
      mockState.currentRect = {
        ...mockState.currentRect,
        x: 200,
        y: 200,
        width: -100,
        height: -80,
      };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'rectangle',
        expect.objectContaining({
          x: 100, // 200 + (-100)
          y: 120, // 200 + (-80)
          width: 100,
          height: 80,
        }),
        'test-canvas',
        expect.any(Object)
      );
    });

    it('should clamp rectangle to canvas bounds', async () => {
      mockState.clampRectToCanvas.mockReturnValue({
        x: 0,
        y: 0,
        width: 100,
        height: 80,
      });
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.clampRectToCanvas).toHaveBeenCalled();
      expect(createObject).toHaveBeenCalledWith(
        'rectangle',
        expect.objectContaining({
          x: 0,
          y: 0,
          width: 100,
          height: 80,
        }),
        'test-canvas',
        expect.any(Object)
      );
    });

    it('should reset drawing state after saving', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false);
      expect(mockState.setCurrentRect).toHaveBeenCalledWith(null);
    });

    it('should not save rectangle below minimum width', async () => {
      mockState.currentRect = {
        ...mockState.currentRect,
        width: 1, // Below minWidth of 2
      };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).not.toHaveBeenCalled();
      
      // Should still reset state
      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false);
      expect(mockState.setCurrentRect).toHaveBeenCalledWith(null);
    });

    it('should not save rectangle below minimum height', async () => {
      mockState.currentRect = {
        ...mockState.currentRect,
        height: 0.5, // Below minHeight of 1
      };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).not.toHaveBeenCalled();
    });

    it('should save rectangle at exactly minimum dimensions', async () => {
      mockState.currentRect = {
        ...mockState.currentRect,
        width: 2, // Exactly minWidth
        height: 1, // Exactly minHeight
      };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalled();
    });

    it('should use current selected color when saving', async () => {
      mockState.selectedColor = '#0000FF';
      mockState.currentRect = { ...mockState.currentRect, fill: '#FF0000' };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'rectangle',
        expect.any(Object),
        'test-canvas',
        expect.objectContaining({
          fill: '#0000FF', // Uses current selected color, not rect's fill
        })
      );
    });

    it('should use default color when no color selected', async () => {
      mockState.selectedColor = null;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'rectangle',
        expect.any(Object),
        'test-canvas',
        expect.objectContaining({
          fill: '#808080',
        })
      );
    });

    it('should include stroke properties', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'rectangle',
        expect.any(Object),
        'test-canvas',
        expect.objectContaining({
          stroke: '#333333',
          strokeWidth: 1,
        })
      );
    });

    it('should handle save errors gracefully', async () => {
      createObject.mockRejectedValueOnce(new Error('Save failed'));
      
      await expect(tool.onMouseUp({}, mockState, mockHelpers)).resolves.not.toThrow();
      
      // Should still reset state even on error
      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false);
      expect(mockState.setCurrentRect).toHaveBeenCalledWith(null);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large rectangles', async () => {
      mockState.isDrawing = true;
      mockState.currentRect = {
        id: 123,
        x: 0,
        y: 0,
        width: 1600,
        height: 900,
        fill: '#000000',
      };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'rectangle',
        expect.objectContaining({
          width: 1600,
          height: 900,
        }),
        'test-canvas',
        expect.any(Object)
      );
    });

    it('should handle very small rectangles (but above minimum)', async () => {
      mockState.isDrawing = true;
      mockState.currentRect = {
        id: 123,
        x: 100,
        y: 100,
        width: 3,
        height: 2,
        fill: '#000000',
      };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalled();
    });

    it('should handle rectangle at canvas boundaries', async () => {
      mockState.isDrawing = true;
      mockState.currentRect = {
        id: 123,
        x: 1598,
        y: 898,
        width: 2,
        height: 2,
        fill: '#000000',
      };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalled();
    });

    it('should handle rapid mouse movements during drawing', () => {
      mockState.isDrawing = true;
      mockState.currentRect = { id: 123, x: 100, y: 100, width: 0, height: 0, fill: '#000' };

      // Simulate rapid movements
      mockHelpers.pos = { x: 110, y: 110 };
      tool.onMouseMove({}, mockState, mockHelpers);

      mockHelpers.pos = { x: 120, y: 120 };
      tool.onMouseMove({}, mockState, mockHelpers);

      mockHelpers.pos = { x: 150, y: 150 };
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentRect).toHaveBeenCalledTimes(3);
    });

    it('should handle drawing multiple rectangles in sequence', async () => {
      // First rectangle
      mockHelpers.pos = { x: 100, y: 100 };
      tool.onMouseDown({}, mockState, mockHelpers);
      
      mockState.isDrawing = true;
      mockState.currentRect = { id: 1, x: 100, y: 100, width: 50, height: 50, fill: '#000' };
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledTimes(1);

      // Second rectangle
      mockState.setIsDrawing.mockClear();
      mockState.setCurrentRect.mockClear();
      createObject.mockClear();

      mockHelpers.pos = { x: 200, y: 200 };
      tool.onMouseDown({}, mockState, mockHelpers);
      
      mockState.isDrawing = true;
      mockState.currentRect = { id: 2, x: 200, y: 200, width: 60, height: 60, fill: '#FFF' };
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledTimes(1);
    });
  });
});

