import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StarTool } from './StarTool.js';
import { createObject } from '../services/canvas.service.js';

// Mock canvas service
vi.mock('../services/canvas.service.js', () => ({
  createObject: vi.fn(() => Promise.resolve('new-star-id')),
}));

describe('StarTool', () => {
  let tool;
  let mockState;
  let mockHelpers;

  beforeEach(() => {
    tool = new StarTool();

    // Mock state
    mockState = {
      isDrawing: false,
      drawStart: null,
      currentStar: null,
      isOnline: true,
      selectedColor: '#FFD700',
      setIsDrawing: vi.fn((val) => { mockState.isDrawing = val; }),
      setDrawStart: vi.fn((pos) => { mockState.drawStart = pos; }),
      setCurrentStar: vi.fn((star) => { mockState.currentStar = star; }),
      clampStarToCanvas: vi.fn((star) => star), // No clamping by default
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

    it('should store start position as star center', () => {
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

    it('should prevent multiple simultaneous draws', () => {
      mockState.isDrawing = true;
      
      tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).not.toHaveBeenCalled();
    });
  });

  describe('onMouseMove - Update Star Radius', () => {
    beforeEach(() => {
      // Simulate star started at (400, 300)
      mockState.isDrawing = true;
      mockState.drawStart = { x: 400, y: 300 };
    });

    it('should do nothing when not drawing', () => {
      mockState.isDrawing = false;
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentStar).not.toHaveBeenCalled();
    });

    it('should do nothing when no draw start position', () => {
      mockState.drawStart = null;
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentStar).not.toHaveBeenCalled();
    });

    it('should calculate outer radius from center to current position', () => {
      // Start at (400, 300), move to (450, 300) = radius 50
      mockHelpers.pos = { x: 450, y: 300 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentStar).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 400,
          y: 300,
          outerRadius: 50,
        })
      );
    });

    it('should calculate inner radius as 40% of outer radius', () => {
      // Outer radius 50 → inner radius 20
      mockHelpers.pos = { x: 450, y: 300 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentStar).toHaveBeenCalledWith(
        expect.objectContaining({
          outerRadius: 50,
          innerRadius: 20, // 50 * 0.4 = 20
        })
      );
    });

    it('should create star with default 5 points', () => {
      mockHelpers.pos = { x: 450, y: 300 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentStar).toHaveBeenCalledWith(
        expect.objectContaining({
          numPoints: 5,
        })
      );
    });

    it('should calculate radius using Pythagorean theorem', () => {
      // Start at (400, 300), move to (440, 330)
      // Distance = sqrt((40^2) + (30^2)) = sqrt(1600 + 900) = sqrt(2500) = 50
      mockHelpers.pos = { x: 440, y: 330 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentStar).toHaveBeenCalledWith(
        expect.objectContaining({
          outerRadius: 50,
          innerRadius: 20,
        })
      );
    });

    it('should enforce minimum outer radius of 1 pixel', () => {
      // Move very close to center (almost no movement)
      mockHelpers.pos = { x: 400.1, y: 300.1 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      const star = mockState.setCurrentStar.mock.calls[0][0];
      expect(star.outerRadius).toBeGreaterThanOrEqual(1);
    });

    it('should enforce minimum inner radius of 1 pixel', () => {
      // Very small star (outer radius < 2.5 would make inner < 1)
      mockHelpers.pos = { x: 401, y: 300 }; // Outer = 1, inner would be 0.4
      
      tool.onMouseMove({}, mockState, mockHelpers);

      const star = mockState.setCurrentStar.mock.calls[0][0];
      expect(star.innerRadius).toBeGreaterThanOrEqual(1);
    });

    it('should clamp star to canvas boundaries', () => {
      mockState.clampStarToCanvas.mockReturnValue({
        x: 50,
        y: 50,
        numPoints: 5,
        innerRadius: 20,
        outerRadius: 50,
      });

      mockHelpers.pos = { x: 500, y: 400 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.clampStarToCanvas).toHaveBeenCalled();
      expect(mockState.setCurrentStar).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 50,
          y: 50,
          outerRadius: 50,
        })
      );
    });

    it('should handle missing clampStarToCanvas gracefully', () => {
      mockState.clampStarToCanvas = null;
      mockHelpers.pos = { x: 450, y: 300 };
      
      // Should not throw error and should still set star
      expect(() => tool.onMouseMove({}, mockState, mockHelpers)).not.toThrow();
      
      expect(mockState.setCurrentStar).toHaveBeenCalledWith(
        expect.objectContaining({
          outerRadius: 50,
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

        expect(mockState.setCurrentStar).toHaveBeenCalledWith(
          expect.objectContaining({ outerRadius: radius })
        );

        mockState.setCurrentStar.mockClear();
      });
    });

    it('should update star radius continuously as mouse moves', () => {
      // Simulate gradual dragging
      const positions = [
        { x: 410, y: 300, expectedRadius: 10 },
        { x: 420, y: 300, expectedRadius: 20 },
        { x: 430, y: 300, expectedRadius: 30 },
        { x: 440, y: 300, expectedRadius: 40 },
      ];

      positions.forEach(({ x, y, expectedRadius }) => {
        mockHelpers.pos = { x, y };
        tool.onMouseMove({}, mockState, mockHelpers);
        
        expect(mockState.setCurrentStar).toHaveBeenCalledWith(
          expect.objectContaining({
            outerRadius: expectedRadius,
            innerRadius: expectedRadius * 0.4,
          })
        );
      });

      expect(mockState.setCurrentStar).toHaveBeenCalledTimes(4);
    });

    it('should handle negative coordinates (dragging left/up from center)', () => {
      mockState.drawStart = { x: 100, y: 100 };
      mockHelpers.pos = { x: 50, y: 50 };

      // Distance = sqrt((50^2) + (50^2)) = sqrt(5000) ≈ 70.71
      tool.onMouseMove({}, mockState, mockHelpers);

      const star = mockState.setCurrentStar.mock.calls[0][0];
      expect(star.outerRadius).toBeCloseTo(70.71, 1);
      expect(star.innerRadius).toBeCloseTo(28.28, 1); // 70.71 * 0.4
    });

    it('should handle very large stars', () => {
      mockHelpers.pos = { x: 1200, y: 300 }; // Radius = 800
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentStar).toHaveBeenCalledWith(
        expect.objectContaining({
          outerRadius: 800,
          innerRadius: 320, // 800 * 0.4
        })
      );
    });

    it('should preserve star center position', () => {
      mockState.drawStart = { x: 250, y: 180 };
      mockHelpers.pos = { x: 300, y: 180 };
      
      tool.onMouseMove({}, mockState, mockHelpers);

      expect(mockState.setCurrentStar).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 250,
          y: 180,
        })
      );
    });
  });

  describe('onMouseUp - Finalize Star', () => {
    beforeEach(() => {
      mockState.isDrawing = true;
      mockState.drawStart = { x: 400, y: 300 };
      mockState.currentStar = {
        x: 400,
        y: 300,
        numPoints: 5,
        innerRadius: 32,
        outerRadius: 80,
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

    it('should do nothing when no current star', async () => {
      mockState.currentStar = null;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).not.toHaveBeenCalled();
    });

    it('should create star when outer radius is at least 5 pixels', async () => {
      mockState.currentStar.outerRadius = 50;
      mockState.currentStar.innerRadius = 20;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'star',
        { x: 400, y: 300 },
        'test-canvas',
        expect.objectContaining({
          numPoints: 5,
          innerRadius: 20,
          outerRadius: 50,
          fill: '#FFD700',
        })
      );
    });

    it('should not create star when outer radius is below 5 pixels', async () => {
      mockState.currentStar.outerRadius = 4;
      mockState.currentStar.innerRadius = 1.6;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).not.toHaveBeenCalled();
      
      // Should still reset state
      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false);
      expect(mockState.setDrawStart).toHaveBeenCalledWith(null);
      expect(mockState.setCurrentStar).toHaveBeenCalledWith(null);
    });

    it('should create star at exactly minimum radius (5px)', async () => {
      mockState.currentStar.outerRadius = 5;
      mockState.currentStar.innerRadius = 2;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'star',
        { x: 400, y: 300 },
        'test-canvas',
        expect.objectContaining({
          outerRadius: 5,
        })
      );
    });

    it('should use selected color for star fill', async () => {
      mockState.selectedColor = '#00FF00';
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'star',
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
        'star',
        expect.any(Object),
        'test-canvas',
        expect.objectContaining({
          fill: '#808080',
        })
      );
    });

    it('should clamp star before saving', async () => {
      mockState.clampStarToCanvas.mockReturnValue({
        x: 350,
        y: 280,
        numPoints: 5,
        innerRadius: 28,
        outerRadius: 70,
      });
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.clampStarToCanvas).toHaveBeenCalled();
      expect(createObject).toHaveBeenCalledWith(
        'star',
        { x: 350, y: 280 },
        'test-canvas',
        expect.objectContaining({
          innerRadius: 28,
          outerRadius: 70,
        })
      );
    });

    it('should handle missing clampStarToCanvas gracefully', async () => {
      mockState.clampStarToCanvas = null;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      // Should not throw and should create star
      expect(createObject).toHaveBeenCalled();
    });

    it('should reset drawing state after creating star', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false);
      expect(mockState.setDrawStart).toHaveBeenCalledWith(null);
      expect(mockState.setCurrentStar).toHaveBeenCalledWith(null);
    });

    it('should reset state even if star is too small', async () => {
      mockState.currentStar.outerRadius = 3;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false);
      expect(mockState.setDrawStart).toHaveBeenCalledWith(null);
      expect(mockState.setCurrentStar).toHaveBeenCalledWith(null);
    });

    it('should reset state even if offline', async () => {
      mockState.isOnline = false;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false);
      expect(mockState.setDrawStart).toHaveBeenCalledWith(null);
      expect(mockState.setCurrentStar).toHaveBeenCalledWith(null);
    });

    it('should reset state even on error', async () => {
      createObject.mockRejectedValueOnce(new Error('Create failed'));
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false);
      expect(mockState.setDrawStart).toHaveBeenCalledWith(null);
      expect(mockState.setCurrentStar).toHaveBeenCalledWith(null);
    });

    it('should not create star when offline', async () => {
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
      mockHelpers.canvasId = 'custom-canvas-456';
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'star',
        expect.any(Object),
        'custom-canvas-456',
        expect.any(Object)
      );
    });

    it('should create star with correct structure', async () => {
      mockState.currentStar = {
        x: 250,
        y: 180,
        numPoints: 5,
        innerRadius: 26,
        outerRadius: 65,
      };
      mockState.selectedColor = '#FFAA00';
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'star',
        { x: 250, y: 180 },
        'test-canvas',
        {
          numPoints: 5,
          innerRadius: 26,
          outerRadius: 65,
          fill: '#FFAA00',
        }
      );
    });

    it('should preserve numPoints value (always 5)', async () => {
      mockState.currentStar.numPoints = 5;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'star',
        expect.any(Object),
        'test-canvas',
        expect.objectContaining({
          numPoints: 5,
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large stars', async () => {
      mockState.isDrawing = true;
      mockState.drawStart = { x: 400, y: 300 };
      mockState.currentStar = {
        x: 400,
        y: 300,
        numPoints: 5,
        innerRadius: 200,
        outerRadius: 500,
      };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'star',
        { x: 400, y: 300 },
        'test-canvas',
        expect.objectContaining({
          outerRadius: 500,
          innerRadius: 200,
        })
      );
    });

    it('should handle star at canvas origin', async () => {
      mockState.isDrawing = true;
      mockState.drawStart = { x: 0, y: 0 };
      mockState.currentStar = {
        x: 0,
        y: 0,
        numPoints: 5,
        innerRadius: 20,
        outerRadius: 50,
      };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'star',
        { x: 0, y: 0 },
        'test-canvas',
        expect.objectContaining({
          outerRadius: 50,
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

      expect(mockState.setCurrentStar).toHaveBeenCalledTimes(3);
    });

    it('should handle creating multiple stars in sequence', async () => {
      // First star
      mockHelpers.pos = { x: 100, y: 100 };
      tool.onMouseDown({}, mockState, mockHelpers);
      
      mockState.isDrawing = true;
      mockState.drawStart = { x: 100, y: 100 };
      mockState.currentStar = {
        x: 100,
        y: 100,
        numPoints: 5,
        innerRadius: 20,
        outerRadius: 50,
      };
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledTimes(1);

      // Reset mocks for second star
      mockState.setIsDrawing.mockClear();
      mockState.setDrawStart.mockClear();
      mockState.setCurrentStar.mockClear();
      createObject.mockClear();

      // Second star
      mockState.isDrawing = false;
      mockHelpers.pos = { x: 300, y: 300 };
      tool.onMouseDown({}, mockState, mockHelpers);
      
      mockState.isDrawing = true;
      mockState.drawStart = { x: 300, y: 300 };
      mockState.currentStar = {
        x: 300,
        y: 300,
        numPoints: 5,
        innerRadius: 24,
        outerRadius: 60,
      };
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledTimes(1);
    });

    it('should handle fractional radii correctly', async () => {
      mockState.isDrawing = true;
      mockState.drawStart = { x: 400, y: 300 };
      mockState.currentStar = {
        x: 400,
        y: 300,
        numPoints: 5,
        innerRadius: 18.28,
        outerRadius: 45.7,
      };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'star',
        { x: 400, y: 300 },
        'test-canvas',
        expect.objectContaining({
          innerRadius: 18.28,
          outerRadius: 45.7,
        })
      );
    });

    it('should handle undefined color gracefully', async () => {
      mockState.isDrawing = true;
      mockState.drawStart = { x: 400, y: 300 };
      mockState.currentStar = {
        x: 400,
        y: 300,
        numPoints: 5,
        innerRadius: 20,
        outerRadius: 50,
      };
      mockState.selectedColor = undefined;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalledWith(
        'star',
        expect.any(Object),
        'test-canvas',
        expect.objectContaining({
          fill: '#808080', // Default color
        })
      );
    });

    it('should maintain 40% inner-to-outer radius ratio during movement', () => {
      mockState.isDrawing = true;
      mockState.drawStart = { x: 400, y: 300 };

      const testCases = [
        { outerRadius: 10, expectedInner: 4 },
        { outerRadius: 25, expectedInner: 10 },
        { outerRadius: 50, expectedInner: 20 },
        { outerRadius: 100, expectedInner: 40 },
        { outerRadius: 200, expectedInner: 80 },
      ];

      testCases.forEach(({ outerRadius, expectedInner }) => {
        mockHelpers.pos = { x: 400 + outerRadius, y: 300 };
        tool.onMouseMove({}, mockState, mockHelpers);

        expect(mockState.setCurrentStar).toHaveBeenCalledWith(
          expect.objectContaining({
            outerRadius,
            innerRadius: expectedInner,
          })
        );

        mockState.setCurrentStar.mockClear();
      });
    });

    it('should handle canceling star creation (too small + offline)', async () => {
      mockState.isDrawing = true;
      mockState.drawStart = { x: 400, y: 300 };
      mockState.currentStar = { x: 400, y: 300, numPoints: 5, innerRadius: 0.8, outerRadius: 2 };
      mockState.isOnline = false;
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      // Star too small, should not create even if it was online
      expect(createObject).not.toHaveBeenCalled();
      
      // Should reset state
      expect(mockState.setIsDrawing).toHaveBeenCalledWith(false);
    });

    it('should handle very small but valid star (5px minimum)', async () => {
      mockState.isDrawing = true;
      mockState.drawStart = { x: 400, y: 300 };
      mockState.currentStar = {
        x: 400,
        y: 300,
        numPoints: 5,
        innerRadius: 2,
        outerRadius: 5, // Minimum
      };
      
      await tool.onMouseUp({}, mockState, mockHelpers);

      expect(createObject).toHaveBeenCalled();
    });
  });
});

