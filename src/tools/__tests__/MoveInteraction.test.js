import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MoveInteraction from '../MoveInteraction.js';

// Mock the updateActiveObjectPosition function
const mockUpdateActiveObjectPosition = vi.fn();
vi.mock('../../services/realtimeObjects.service.js', () => ({
  updateActiveObjectPosition: mockUpdateActiveObjectPosition,
}));

describe('MoveInteraction', () => {
  let mockCanEditObject;
  let mockOnUpdate;

  beforeEach(() => {
    mockCanEditObject = vi.fn().mockReturnValue(true);
    mockOnUpdate = vi.fn();
    mockUpdateActiveObjectPosition.mockClear();
    
    // Mock Date.now for consistent timing tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Performance optimization for large selections', () => {
    it('should use normal throttling for small selections (≤20 objects)', () => {
      const shapes = Array.from({ length: 10 }, (_, i) => ({
        id: `shape-${i}`,
        type: 'rectangle',
        x: i * 50,
        y: 100,
        width: 40,
        height: 40,
      }));

      const interaction = new MoveInteraction(
        shapes,
        { x: 100, y: 100 },
        mockOnUpdate,
        { canvasId: 'test-canvas', canEditObject: mockCanEditObject }
      );

      expect(interaction.isLargeSelection).toBe(false);
      expect(interaction.rtdbUpdateThrottle).toBe(16); // Normal throttling
    });

    it('should use adaptive throttling for large selections (>20 objects)', () => {
      const shapes = Array.from({ length: 25 }, (_, i) => ({
        id: `shape-${i}`,
        type: 'rectangle',
        x: i * 30,
        y: 100,
        width: 40,
        height: 40,
      }));

      const interaction = new MoveInteraction(
        shapes,
        { x: 100, y: 100 },
        mockOnUpdate,
        { canvasId: 'test-canvas', canEditObject: mockCanEditObject }
      );

      expect(interaction.isLargeSelection).toBe(true);
      expect(interaction.rtdbUpdateThrottle).toBe(100); // Adaptive throttling
    });

    it('should use adaptive throttling for very large selections (like 625 stars)', () => {
      // Test the exact scenario from the performance issue
      const shapes = Array.from({ length: 625 }, (_, i) => ({
        id: `star-${i}`,
        type: 'star',
        x: (i % 25) * 30 + 100,
        y: Math.floor(i / 25) * 30 + 100,
        numPoints: 5,
      }));

      const interaction = new MoveInteraction(
        shapes,
        { x: 200, y: 200 },
        mockOnUpdate,
        { canvasId: 'test-canvas', canEditObject: mockCanEditObject }
      );

      expect(interaction.isLargeSelection).toBe(true);
      expect(interaction.rtdbUpdateThrottle).toBe(100);
      expect(shapes.length).toBe(625);
    });
  });

  describe('RTDB update throttling', () => {
    it('should throttle RTDB updates for large selections', () => {
      const shapes = Array.from({ length: 30 }, (_, i) => ({
        id: `shape-${i}`,
        type: 'rectangle',
        x: i * 20,
        y: 100,
        width: 40,
        height: 40,
      }));

      const interaction = new MoveInteraction(
        shapes,
        { x: 100, y: 100 },
        mockOnUpdate,
        { canvasId: 'test-canvas', canEditObject: mockCanEditObject }
      );

      // Simulate rapid movement calls
      interaction.move({ x: 150, y: 150 });
      interaction.move({ x: 200, y: 200 });
      interaction.move({ x: 250, y: 250 });

      // Should queue updates but not send them immediately
      expect(mockUpdateActiveObjectPosition).not.toHaveBeenCalled();

      // Advance time by throttle amount
      vi.advanceTimersByTime(100);

      // Should send updates after throttle period
      interaction.move({ x: 300, y: 300 });
      expect(mockUpdateActiveObjectPosition).toHaveBeenCalled();
    });

    it('should not throttle RTDB updates for small selections', () => {
      const shapes = Array.from({ length: 5 }, (_, i) => ({
        id: `shape-${i}`,
        type: 'rectangle',
        x: i * 20,
        y: 100,
        width: 40,
        height: 40,
      }));

      const interaction = new MoveInteraction(
        shapes,
        { x: 100, y: 100 },
        mockOnUpdate,
        { canvasId: 'test-canvas', canEditObject: mockCanEditObject }
      );

      // Simulate movement
      interaction.move({ x: 150, y: 150 });

      // Should send updates immediately for small selections
      expect(mockUpdateActiveObjectPosition).toHaveBeenCalled();
    });
  });

  describe('RTDB update sampling for very large selections', () => {
    it('should sample RTDB updates when queue is very large (>10)', () => {
      const shapes = Array.from({ length: 50 }, (_, i) => ({
        id: `shape-${i}`,
        type: 'rectangle',
        x: i * 10,
        y: 100,
        width: 20,
        height: 20,
      }));

      const interaction = new MoveInteraction(
        shapes,
        { x: 100, y: 100 },
        mockOnUpdate,
        { canvasId: 'test-canvas', canEditObject: mockCanEditObject }
      );

      // Move to create a large queue
      interaction.move({ x: 200, y: 200 });

      // Advance time to trigger RTDB processing
      vi.advanceTimersByTime(100);
      interaction.move({ x: 250, y: 250 });

      // Should have sampled the updates (not all 50 objects)
      const callCount = mockUpdateActiveObjectPosition.mock.calls.length;
      expect(callCount).toBeLessThan(50);
      expect(callCount).toBeGreaterThan(0);
    });

    it('should not sample RTDB updates for smaller queues (≤10)', () => {
      const shapes = Array.from({ length: 8 }, (_, i) => ({
        id: `shape-${i}`,
        type: 'rectangle',
        x: i * 20,
        y: 100,
        width: 40,
        height: 40,
      }));

      const interaction = new MoveInteraction(
        shapes,
        { x: 100, y: 100 },
        mockOnUpdate,
        { canvasId: 'test-canvas', canEditObject: mockCanEditObject }
      );

      interaction.move({ x: 200, y: 200 });

      // Advance time to trigger RTDB processing
      vi.advanceTimersByTime(100);
      interaction.move({ x: 250, y: 250 });

      // Should send updates for all objects (no sampling)
      expect(mockUpdateActiveObjectPosition).toHaveBeenCalledTimes(8);
    });
  });

  describe('Performance logging', () => {
    it('should log performance mode for large selections', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      const shapes = Array.from({ length: 50 }, (_, i) => ({
        id: `shape-${i}`,
        type: 'rectangle',
        x: i * 20,
        y: 100,
      }));

      new MoveInteraction(
        shapes,
        { x: 100, y: 100 },
        mockOnUpdate,
        { canvasId: 'test-canvas', canEditObject: mockCanEditObject }
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance mode:'),
        expect.stringContaining('Large Selection (throttled)')
      );

      consoleSpy.mockRestore();
    });

    it('should log normal performance mode for small selections', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      const shapes = Array.from({ length: 5 }, (_, i) => ({
        id: `shape-${i}`,
        type: 'rectangle',
        x: i * 20,
        y: 100,
      }));

      new MoveInteraction(
        shapes,
        { x: 100, y: 100 },
        mockOnUpdate,
        { canvasId: 'test-canvas', canEditObject: mockCanEditObject }
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance mode:'),
        expect.stringContaining('Normal')
      );

      consoleSpy.mockRestore();
    });

    it('should log sampling optimization for very large selections', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      const shapes = Array.from({ length: 100 }, (_, i) => ({
        id: `shape-${i}`,
        type: 'rectangle',
        x: i * 10,
        y: 100,
      }));

      const interaction = new MoveInteraction(
        shapes,
        { x: 100, y: 100 },
        mockOnUpdate,
        { canvasId: 'test-canvas', canEditObject: mockCanEditObject }
      );

      // Trigger large queue and sampling
      interaction.move({ x: 200, y: 200 });
      vi.advanceTimersByTime(100);
      interaction.move({ x: 250, y: 250 });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Large selection optimization:'),
        expect.stringContaining('sending'),
        expect.stringContaining('RTDB updates')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Regression test for laggy movement', () => {
    it('should handle 625-star movement without network overload', () => {
      // Exact test case from the performance issue
      const stars = Array.from({ length: 625 }, (_, i) => ({
        id: `star-${i}`,
        type: 'star',
        x: (i % 25) * 30 + 100,
        y: Math.floor(i / 25) * 30 + 100,
        numPoints: 5,
        innerRadius: 15,
        outerRadius: 30,
        fill: '#ffd700',
      }));

      const interaction = new MoveInteraction(
        stars,
        { x: 200, y: 200 },
        mockOnUpdate,
        { canvasId: 'test-canvas', canEditObject: mockCanEditObject }
      );

      // Simulate rapid movement (like dragging)
      const moveCount = 10;
      for (let i = 0; i < moveCount; i++) {
        interaction.move({ x: 200 + i * 10, y: 200 + i * 10 });
        vi.advanceTimersByTime(16); // Simulate 60fps movement
      }

      // Final advance to process queued updates
      vi.advanceTimersByTime(100);

      // Should not have called RTDB update for every object in every frame
      // With 625 objects * 10 moves = 6250 potential calls
      // Should be much less due to throttling and sampling
      const totalCalls = mockUpdateActiveObjectPosition.mock.calls.length;
      expect(totalCalls).toBeLessThan(1000); // Much less than potential 6250
      expect(totalCalls).toBeGreaterThan(0); // But still some updates
    });

    it('should maintain responsive UI updates despite RTDB optimization', () => {
      const shapes = Array.from({ length: 100 }, (_, i) => ({
        id: `shape-${i}`,
        type: 'rectangle',
        x: i * 10,
        y: 100,
        width: 20,
        height: 20,
      }));

      const interaction = new MoveInteraction(
        shapes,
        { x: 100, y: 100 },
        mockOnUpdate,
        { canvasId: 'test-canvas', canEditObject: mockCanEditObject }
      );

      // Simulate movement
      interaction.move({ x: 200, y: 200 });

      // UI update callback (onUpdate) should always be called immediately
      // regardless of RTDB throttling
      expect(mockOnUpdate).toHaveBeenCalled();
      
      // Verify local updates contain all objects
      const localUpdates = mockOnUpdate.mock.calls[0][0];
      expect(Object.keys(localUpdates)).toHaveLength(100);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle exactly 20 objects (boundary case)', () => {
      const shapes = Array.from({ length: 20 }, (_, i) => ({
        id: `shape-${i}`,
        type: 'rectangle',
        x: i * 20,
        y: 100,
      }));

      const interaction = new MoveInteraction(
        shapes,
        { x: 100, y: 100 },
        mockOnUpdate,
        { canvasId: 'test-canvas', canEditObject: mockCanEditObject }
      );

      // Should NOT be considered large selection
      expect(interaction.isLargeSelection).toBe(false);
      expect(interaction.rtdbUpdateThrottle).toBe(16);
    });

    it('should handle exactly 21 objects (just over boundary)', () => {
      const shapes = Array.from({ length: 21 }, (_, i) => ({
        id: `shape-${i}`,
        type: 'rectangle',
        x: i * 20,
        y: 100,
      }));

      const interaction = new MoveInteraction(
        shapes,
        { x: 100, y: 100 },
        mockOnUpdate,
        { canvasId: 'test-canvas', canEditObject: mockCanEditObject }
      );

      // Should be considered large selection
      expect(interaction.isLargeSelection).toBe(true);
      expect(interaction.rtdbUpdateThrottle).toBe(100);
    });

    it('should handle empty selection', () => {
      const interaction = new MoveInteraction(
        [],
        { x: 100, y: 100 },
        mockOnUpdate,
        { canvasId: 'test-canvas', canEditObject: mockCanEditObject }
      );

      expect(interaction.isLargeSelection).toBe(false);
      
      // Should not crash when moving empty selection
      expect(() => {
        interaction.move({ x: 200, y: 200 });
      }).not.toThrow();
    });

    it('should handle single object selection', () => {
      const shapes = [{
        id: 'single-shape',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
      }];

      const interaction = new MoveInteraction(
        shapes,
        { x: 100, y: 100 },
        mockOnUpdate,
        { canvasId: 'test-canvas', canEditObject: mockCanEditObject }
      );

      expect(interaction.isLargeSelection).toBe(false);
      expect(interaction.rtdbUpdateThrottle).toBe(16);

      // Should work normally for single object
      interaction.move({ x: 200, y: 200 });
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });
});
