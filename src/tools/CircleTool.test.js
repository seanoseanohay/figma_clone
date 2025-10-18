import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircleTool } from './CircleTool.js';
import { createObject } from '../services/canvas.service.js';

// Mock canvas service
vi.mock('../services/canvas.service.js', () => ({
  createObject: vi.fn(() => Promise.resolve('new-circle-id')),
}));

describe('CircleTool', () => {
  let tool;
  let mockState;
  let mockHelpers;

  beforeEach(() => {
    tool = new CircleTool();

    // Mock state
    mockState = {
      isDrawing: false,
      drawStart: null,
      currentCircle: null,
      isOnline: true,
      selectedColor: '#FF0000',
      setIsDrawing: vi.fn((val) => { mockState.isDrawing = val; }),
      setDrawStart: vi.fn((pos) => { mockState.drawStart = pos; }),
      setCurrentCircle: vi.fn((circle) => { mockState.currentCircle = circle; }),
      clampCircleToCanvas: vi.fn((circle) => circle), // No clamping by default
    };

    // Mock helpers
    mockHelpers = {
      pos: { x: 400, y: 300 },
      canvasId: 'test-canvas',
    };

    // Clear mocks
    createObject.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should return crosshair cursor', () => {
      expect(tool.getCursor()).toBe('crosshair');
    });
  });

  describe('onMouseDown - Start Drawing', () => {
    it('should start drawing when mouse is pressed', () => {
      tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).toHaveBeenCalledWith(true);
      expect(mockState.setDrawStart).toHaveBeenCalledWith({ x: 400, y: 300 });
    });

    it('should store start position as circle center', () => {
      mockHelpers.pos = { x: 500, y: 250 };
      
      tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setDrawStart).toHaveBeenCalledWith({ x: 500, y: 250 });
    });

    it('should not start drawing if already drawing', () => {
      mockState.isDrawing = true;
      
      tool.onMouseDown({}, mockState, mockHelpers);

      // setIsDrawing should not be called again
      expect(mockState.setIsDrawing).not.toHaveBeenCalled();
      expect(mockState.setDrawStart).not.toHaveBeenCalled();
    });

    it('should handle mouse down at origin (0, 0)', () => {
      mockHelpers.pos = { x: 0, y: 0 };
      
      tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).toHaveBeenCalledWith(true);
      expect(mockState.setDrawStart).toHaveBeenCalledWith({ x: 0, y: 0 });
    });
  });

  describe('onMouseMove - Update Radius', () => {
    beforeEach(() => {
      // Simulate circle started at (400, 300)
      mockState.isDrawing = true;
      mockState.drawStart = { x: 400, y: 300 };
    });

    it('should do nothing when not drawing', () => {
      mockState.isDrawing = false;
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentCircle).not.toHaveBeenCalled();
    });

    it('should do nothing when no draw start position', () => {
      mockState.drawStart = null;
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentCircle).not.toHaveBeenCalled();
    });

    it('should calculate radius from center to current position', () => {
      // Start at (400, 300), move to (450, 300) = radius 50
      mockHelpers.pos = { x: 450, y: 300 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentCircle).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 400,
          y: 300,
          radius: 50,
        })
      );
    });

    it('should calculate radius using Pythagorean theorem', () => {
      // Start at (400, 300), move to (440, 330)
      // Distance = sqrt((40^2) + (30^2)) = sqrt(1600 + 900) = sqrt(2500) = 50
      mockHelpers.pos = { x: 440, y: 330 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentCircle).toHaveBeenCalledWith(
        expect.objectContaining({
          radius: 50,
        })
      );
    });

    it('should enforce minimum radius of 1 pixel', () => {
      // Move very close to center (almost no movement)
      mockHelpers.pos = { x: 400.1, y: 300.1 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      const circle = mockState.setCurrentCircle.mock.calls[0][0];
      expect(circle.radius).toBeGreaterThanOrEqual(1);
    });

    it('should clamp circle to canvas boundaries', () => {
      mockState.clampCircleToCanvas.mockReturnValue({
        x: 50,
        y: 50,
        radius: 50, // Clamped from larger radius
      });

      mockHelpers.pos = { x: 500, y: 400 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.clampCircleToCanvas).toHaveBeenCalled();
      expect(mockState.setCurrentCircle).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 50,
          y: 50,
          radius: 50,
        })
      );
    });

    it('should handle dragging in all directions', () => {
      const directions = [
        { x: 500, y: 300, radius: 100 }, // Right
        { x: 300, y: 300, radius: 100 }, // Left
        { x: 400, y: 400, radius: 100 }, // Down
        { x: 400, y: 200, radius: 100 }, // Up
      ];

      directions.forEach(({ x, y, radius }) => {
        mockHelpers.pos = { x, y };
        tool.onMouseMove({}, mockState, mockHelpers);

        expect(mockState.setCurrentCircle).toHaveBeenCalledWith(
          expect.objectContaining({ radius })
        );

        mockState.setCurrentCircle.mockClear();
      });
    });

    it('should update circle radius continuously as mouse moves', () => {
      // Simulate gradual dragging
      const positions = [
        { x: 410, y: 300 },
        { x: 420, y: 300 },
        { x: 430, y: 300 },
        { x: 440, y: 300 },
      ];

      positions.forEach((pos, index) => {
        mockHelpers.pos = pos;
        tool.onMouseMove({}, mockState, mockHelpers);
        
        const expectedRadius = 10 + (index * 10);
        expect(mockState.setCurrentCircle).toHaveBeenCalledWith(
          expect.objectContaining({
            radius: expectedRadius,
          })
        );
      });

      expect(mockState.setCurrentCircle).toHaveBeenCalledTimes(4);
    });

    it('should handle negative coordinates (dragging left/up from center)', () => {
      mockState.drawStart = { x: 100, y: 100 };
      mockHelpers.pos = { x: 50, y: 50 };

      // Distance = sqrt((50^2) + (50^2)) = sqrt(5000) ≈ 70.71
      tool.onMouseMove({}, mockState, mockHelpers);

      const circle = mockState.setCurrentCircle.mock.calls[0][0];
      expect(circle.radius).toBeCloseTo(70.71, 1);
    });

    it('should handle very large circles', () => {
      mockHelpers.pos = { x: 1200, y: 300 }; // Radius = 800
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentCircle).toHaveBeenCalledWith(
        expect.objectContaining({
          radius: 800,
        })
      );
    });

    it('should use clampCircleToCanvas if available', () => {
      mockState.clampCircleToCanvas = vi.fn((circle) => ({
        ...circle,
        radius: Math.min(circle.radius, 100), // Mock clamping
      }));

      mockHelpers.pos = { x: 600, y: 300 }; // Would be radius 200
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.clampCircleToCanvas).toHaveBeenCalled();
      expect(mockState.setCurrentCircle).toHaveBeenCalledWith(
        expect.objectContaining({
          radius: 100, // Clamped
        })
      );
    });

    it('should always call clampCircleToCanvas when available', () => {
      mockHelpers.pos = { x: 450, y: 300 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.clampCircleToCanvas).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 400,
          y: 300,
          radius: 50,
        })
      );
    });
  });

  describe('onMouseUp - Finalize Circle', () => {
    beforeEach(() => {
      mockState.isDrawing = true;
      mockState.drawStart = { x: 400, y: 300 };
      mockState.currentCircle = {
        x: 400,
        y: 300,
        radius: 80,
      };
    });

    it('should do nothing when not drawing', async () => {
      mockState.isDrawing = false;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).not.toHaveBeenCalled();
    });

    it('should do nothing when no draw start', async () => {
      mockState.drawStart = null;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).not.toHaveBeenCalled();
    });

    it('should do nothing when no current circle', async () => {
      mockState.currentCircle = null;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).not.toHaveBeenCalled();
    });

    it('should create circle when radius is at least 1 pixel', async () => {
      mockState.currentCircle.radius = 50;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'circle',
        { x: 400, y: 300 },
        'test-canvas',
        expect.objectContaining({
          radius: 50,
          fill: '#FF0000',
        })
      );
    });

    it('should not create circle when radius is below 1 pixel', async () => {
      mockState.currentCircle.radius = 0.5;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).not.toHaveBeenCalled();
      
      // Should still reset state
      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false);
      expect(mockState.setDrawStart).toHaveBeenCalledWith(null);
      expect(mockState.setCurrentCircle).toHaveBeenCalledWith(null);
    });

    it('should create circle at exactly minimum radius (1px)', async () => {
      mockState.currentCircle.radius = 1;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'circle',
        { x: 400, y: 300 },
        'test-canvas',
        expect.objectContaining({
          radius: 1,
        })
      );
    });

    it('should use selected color for circle fill', async () => {
      mockState.selectedColor = '#00FF00';
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'circle',
        expect.any(Object),
        'test-canvas',
        expect.objectContaining({
          fill: '#00FF00',
        })
      );
    });

    it('should use default color when no color selected', async () => {
      mockState.selectedColor = null;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'circle',
        expect.any(Object),
        'test-canvas',
        expect.objectContaining({
          fill: '#808080',
        })
      );
    });

    it('should clamp circle before saving', async () => {
      mockState.clampCircleToCanvas.mockReturnValue({
        x: 350,
        y: 280,
        radius: 70, // Clamped
      });
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.clampCircleToCanvas).toHaveBeenCalled();
      expect(createObject).toHaveBeenCalledWith(
        'circle',
        { x: 350, y: 280 },
        'test-canvas',
        expect.objectContaining({
          radius: 70,
        })
      );
    });

    it('should reset drawing state after creating circle', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false);
      expect(mockState.setDrawStart).toHaveBeenCalledWith(null);
      expect(mockState.setCurrentCircle).toHaveBeenCalledWith(null);
    });

    it('should reset state even if circle is too small', async () => {
      mockState.currentCircle.radius = 0.5;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false);
      expect(mockState.setDrawStart).toHaveBeenCalledWith(null);
      expect(mockState.setCurrentCircle).toHaveBeenCalledWith(null);
    });

    it('should reset state even if offline', async () => {
      mockState.isOnline = false;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false);
      expect(mockState.setDrawStart).toHaveBeenCalledWith(null);
      expect(mockState.setCurrentCircle).toHaveBeenCalledWith(null);
    });

    it('should reset state even on error', async () => {
      createObject.mockRejectedValueOnce(new Error('Create failed'));
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false);
      expect(mockState.setDrawStart).toHaveBeenCalledWith(null);
      expect(mockState.setCurrentCircle).toHaveBeenCalledWith(null);
    });

    it('should not create circle when offline', async () => {
      mockState.isOnline = false;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).not.toHaveBeenCalled();
    });

    it('should handle createObject errors gracefully', async () => {
      createObject.mockRejectedValueOnce(new Error('Create failed'));
      
      await expect(tool.onMouseUp({}, mockState, mockHelpers)).resolves.not.toThrow();
      
      // Should still reset state
      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false);
    });

    it('should pass canvas ID to createObject', async () => {
      mockHelpers.canvasId = 'custom-canvas-123';
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'circle',
        expect.any(Object),
        'custom-canvas-123',
        expect.any(Object)
      );
    });

    it('should create circle with correct structure', async () => {
      mockState.currentCircle = { x: 250, y: 180, radius: 65 };
      mockState.selectedColor = '#FFAA00';
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'circle',
        { x: 250, y: 180 },
        'test-canvas',
        {
          radius: 65,
          fill: '#FFAA00',
        }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large circles', async () => {
      mockState.isDrawing = true;
      mockState.drawStart = { x: 400, y: 300 };
      mockState.currentCircle = {
        x: 400,
        y: 300,
        radius: 500,
      };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'circle',
        { x: 400, y: 300 },
        'test-canvas',
        expect.objectContaining({
          radius: 500,
        })
      );
    });

    it('should handle circle at canvas origin', async () => {
      mockState.isDrawing = true;
      mockState.drawStart = { x: 0, y: 0 };
      mockState.currentCircle = { x: 0, y: 0, radius: 50 };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'circle',
        { x: 0, y: 0 },
        'test-canvas',
        expect.objectContaining({
          radius: 50,
        })
      );
    });

    it('should handle rapid mouse movements during drawing', () => {
      mockState.isDrawing = true;
      mockState.drawStart = { x: 400, y: 300 };

      // Simulate rapid movements
      mockHelpers.pos = { x: 410, y: 300 };
      tool.onMouseMove({}, mockState, mockHelpers);

      mockHelpers.pos = { x: 430, y: 300 };
      tool.onMouseMove({}, mockState, mockHelpers);

      mockHelpers.pos = { x: 460, y: 300 };
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentCircle).toHaveBeenCalledTimes(3);
    });

    it('should handle creating multiple circles in sequence', async () => {
      // First circle
      mockHelpers.pos = { x: 100, y: 100 };
      tool.onMouseDown({}, mockState, mockHelpers);
      
      mockState.isDrawing = true;
      mockState.drawStart = { x: 100, y: 100 };
      mockState.currentCircle = { x: 100, y: 100, radius: 50 };
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledTimes(1);

      // Reset mocks for second circle
      mockState.setIsDrawing.mockClear();
      mockState.setDrawStart.mockClear();
      mockState.setCurrentCircle.mockClear();
      createObject.mockClear();

      // Second circle
      mockState.isDrawing = false;
      mockHelpers.pos = { x: 300, y: 300 };
      tool.onMouseDown({}, mockState, mockHelpers);
      
      mockState.isDrawing = true;
      mockState.drawStart = { x: 300, y: 300 };
      mockState.currentCircle = { x: 300, y: 300, radius: 60 };
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledTimes(1);
    });

    it('should handle fractional radii correctly', async () => {
      mockState.isDrawing = true;
      mockState.drawStart = { x: 400, y: 300 };
      mockState.currentCircle = {
        x: 400,
        y: 300,
        radius: 45.7,
      };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'circle',
        { x: 400, y: 300 },
        'test-canvas',
        expect.objectContaining({
          radius: 45.7,
        })
      );
    });

    it('should clamp circle in onMouseMove', () => {
      mockState.clampCircleToCanvas.mockReturnValue({
        x: 350,
        y: 280,
        radius: 45,
      });
      mockState.isDrawing = true;
      mockState.drawStart = { x: 400, y: 300 };
      mockHelpers.pos = { x: 450, y: 300 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.clampCircleToCanvas).toHaveBeenCalled();
      expect(mockState.setCurrentCircle).toHaveBeenCalledWith({
        x: 350,
        y: 280,
        radius: 45,
      });
    });

    it('should handle undefined color gracefully', async () => {
      mockState.isDrawing = true;
      mockState.drawStart = { x: 400, y: 300 };
      mockState.currentCircle = { x: 400, y: 300, radius: 50 };
      mockState.selectedColor = undefined;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'circle',
        expect.any(Object),
        'test-canvas',
        expect.objectContaining({
          fill: '#808080', // Default color
        })
      );
    });
  });
});

