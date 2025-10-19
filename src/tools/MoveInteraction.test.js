import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MoveInteraction } from './MoveInteraction.js';
import * as canvasService from '../services/canvas.service.js';
import { createTestRectangle, createTestCircle, createTestStar } from '../test/fixtures/testData.js';

// Mock canvas service
vi.mock('../services/canvas.service.js', () => ({
  updateActiveObjectPosition: vi.fn(),
  clearActiveObject: vi.fn(() => Promise.resolve()),
  updateObject: vi.fn(() => Promise.resolve()),
}));

describe('MoveInteraction', () => {
  let mockShapes;
  let mockOnUpdate;
  let mockOptions;

  beforeEach(() => {
    // Create test shapes
    mockShapes = [
      createTestRectangle({ id: 'rect-1', x: 100, y: 100, width: 150, height: 100 }),
      createTestCircle({ id: 'circle-1', x: 300, y: 200, radius: 75 }),
      createTestStar({ id: 'star-1', x: 500, y: 150, innerRadius: 30, outerRadius: 60, numPoints: 5 })
    ];

    // Mock update callback
    mockOnUpdate = vi.fn();

    // Mock options
    mockOptions = {
      canvasId: 'test-canvas-id',
      canEditObject: vi.fn(() => true),
      clampRectToCanvas: vi.fn((obj) => obj), // No clamping by default
      clampCircleToCanvas: vi.fn((obj) => obj),
      clampStarToCanvas: vi.fn((obj) => obj)
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with selected shapes and start point', () => {
      const startPoint = { x: 150, y: 150 };
      const interaction = new MoveInteraction(mockShapes, startPoint, mockOnUpdate, mockOptions);

      expect(interaction.selectedShapes).toHaveLength(3);
      expect(interaction.selectedShapes[0]).toMatchObject({
        id: 'rect-1',
        startX: 100,
        startY: 100,
        type: 'rectangle'
      });
      expect(interaction.startPoint).toEqual(startPoint);
      expect(interaction.canvasId).toBe('test-canvas-id');
    });

    it('should store original shape data for boundary calculations', () => {
      const startPoint = { x: 150, y: 150 };
      const interaction = new MoveInteraction(mockShapes, startPoint, mockOnUpdate, mockOptions);

      expect(interaction.selectedShapes[0].originalShape).toEqual(mockShapes[0]);
      expect(interaction.selectedShapes[1].originalShape).toEqual(mockShapes[1]);
      expect(interaction.selectedShapes[2].originalShape).toEqual(mockShapes[2]);
    });

    it('should work with single object', () => {
      const singleShape = [mockShapes[0]];
      const startPoint = { x: 125, y: 125 };
      const interaction = new MoveInteraction(singleShape, startPoint, mockOnUpdate, mockOptions);

      expect(interaction.selectedShapes).toHaveLength(1);
      expect(interaction.selectedShapes[0]).toMatchObject({
        id: 'rect-1',
        startX: 100,
        startY: 100,
        type: 'rectangle'
      });
    });
  });

  describe('move', () => {
    let interaction;
    const startPoint = { x: 150, y: 150 };

    beforeEach(() => {
      interaction = new MoveInteraction(mockShapes, startPoint, mockOnUpdate, mockOptions);
    });

    it('should calculate correct delta and update positions', () => {
      const currentPoint = { x: 200, y: 180 }; // Move 50px right, 30px down

      const localUpdates = interaction.move(currentPoint);

      // Rectangle: (100, 100) + (50, 30) = (150, 130)
      expect(localUpdates['rect-1']).toMatchObject({
        x: 150,
        y: 130
      });

      // Circle: (300, 200) + (50, 30) = (350, 230)
      expect(localUpdates['circle-1']).toMatchObject({
        x: 350,
        y: 230
      });

      // Star: (500, 150) + (50, 30) = (550, 180)
      expect(localUpdates['star-1']).toMatchObject({
        x: 550,
        y: 180
      });
    });

    it('should call onUpdate callback with local updates', () => {
      const currentPoint = { x: 175, y: 175 };

      interaction.move(currentPoint);

      expect(mockOnUpdate).toHaveBeenCalledOnce();
      expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({
        'rect-1': expect.objectContaining({ x: 125, y: 125 }),
        'circle-1': expect.objectContaining({ x: 325, y: 225 }),
        'star-1': expect.objectContaining({ x: 525, y: 175 })
      }));
    });

    it('should apply boundary constraints for rectangles', () => {
      // Create interaction with only a rectangle
      const rectangleOnly = [mockShapes[0]]; // Just the rectangle
      const rectangleInteraction = new MoveInteraction(rectangleOnly, startPoint, mockOnUpdate, {
        ...mockOptions,
        clampRectToCanvas: vi.fn((obj) => ({
          ...obj,
          x: Math.max(0, obj.x),
          y: Math.max(0, obj.y)
        }))
      });

      // Try to move rectangle to negative position
      const currentPoint = { x: 50, y: 50 }; // Move -100px, -100px from start

      const localUpdates = rectangleInteraction.move(currentPoint);

      expect(rectangleInteraction.clampRectToCanvas).toHaveBeenCalled();
      expect(localUpdates['rect-1']).toMatchObject({
        x: 0, // Clamped to 0 instead of negative
        y: 0
      });
    });

    it('should apply boundary constraints for circles', () => {
      // Create interaction with only a circle
      const circleOnly = [mockShapes[1]]; // Just the circle
      const circleInteraction = new MoveInteraction(circleOnly, startPoint, mockOnUpdate, {
        ...mockOptions,
        clampCircleToCanvas: vi.fn((obj) => ({
          ...obj,
          x: Math.min(obj.x, 500), // Max x position
          y: Math.min(obj.y, 400)  // Max y position
        }))
      });

      const currentPoint = { x: 350, y: 350 }; // Large movement

      const localUpdates = circleInteraction.move(currentPoint);

      expect(circleInteraction.clampCircleToCanvas).toHaveBeenCalled();
      expect(localUpdates['circle-1']).toMatchObject({
        x: 500, // Clamped to max
        y: 400  // Clamped to max
      });
    });

    it('should send RTDB updates for editable objects', () => {
      const currentPoint = { x: 200, y: 180 };

      interaction.move(currentPoint);

      // Should update all 3 objects
      expect(canvasService.updateActiveObjectPosition).toHaveBeenCalledTimes(3);
      
      expect(canvasService.updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas-id',
        'rect-1',
        expect.objectContaining({
          x: 150,
          y: 130,
          width: 150,
          height: 100
        })
      );

      expect(canvasService.updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas-id',
        'circle-1',
        expect.objectContaining({
          x: 350,
          y: 230,
          radius: 75
        })
      );

      expect(canvasService.updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas-id',
        'star-1',
        expect.objectContaining({
          x: 550,
          y: 180,
          innerRadius: 30,
          outerRadius: 60,
          numPoints: 5
        })
      );
    });

    it('should not send RTDB updates for non-editable objects', () => {
      // Create new interaction with non-editable circle
      const nonEditableInteraction = new MoveInteraction(mockShapes, startPoint, mockOnUpdate, {
        ...mockOptions,
        canEditObject: vi.fn((id) => id !== 'circle-1')
      });

      const currentPoint = { x: 200, y: 180 };
      nonEditableInteraction.move(currentPoint);

      // Should only update rect and star, not circle
      expect(canvasService.updateActiveObjectPosition).toHaveBeenCalledTimes(2);
      expect(canvasService.updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas-id',
        'rect-1',
        expect.anything()
      );
      expect(canvasService.updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas-id',
        'star-1',
        expect.anything()
      );
    });

    it('should prevent position accumulation by using start positions', () => {
      // First move
      interaction.move({ x: 170, y: 170 });
      let localUpdates = interaction.getLocalUpdates();
      expect(localUpdates['rect-1']).toMatchObject({ x: 120, y: 120 });

      // Second move (should calculate from start position, not accumulated)
      interaction.move({ x: 200, y: 200 });
      localUpdates = interaction.getLocalUpdates();
      expect(localUpdates['rect-1']).toMatchObject({ x: 150, y: 150 }); // Not 170, 170
    });
  });

  describe('end', () => {
    let interaction;
    const startPoint = { x: 150, y: 150 };
    let mockRecordAction;

    beforeEach(() => {
      interaction = new MoveInteraction(mockShapes, startPoint, mockOnUpdate, mockOptions);
      mockRecordAction = vi.fn();
      
      // Simulate some movement first
      interaction.move({ x: 200, y: 180 });
    });

    it('should finalize all moved objects to Firestore', async () => {
      await interaction.end(mockRecordAction);

      expect(canvasService.clearActiveObject).toHaveBeenCalledTimes(3);
      expect(canvasService.updateObject).toHaveBeenCalledTimes(3);

      // Check rectangle update
      expect(canvasService.updateObject).toHaveBeenCalledWith(
        'rect-1',
        { x: 150, y: 130 },
        mockRecordAction,
        expect.objectContaining({
          actionType: 'MOVE_OBJECT',
          before: { x: 100, y: 100 },
          objectType: 'Rectangle'
        })
      );

      // Check circle update
      expect(canvasService.updateObject).toHaveBeenCalledWith(
        'circle-1',
        { x: 350, y: 230 },
        mockRecordAction,
        expect.objectContaining({
          actionType: 'MOVE_OBJECT',
          before: { x: 300, y: 200 },
          objectType: 'Circle'
        })
      );
    });

    it('should clear RTDB active objects', async () => {
      await interaction.end(mockRecordAction);

      expect(canvasService.clearActiveObject).toHaveBeenCalledWith('test-canvas-id', 'rect-1');
      expect(canvasService.clearActiveObject).toHaveBeenCalledWith('test-canvas-id', 'circle-1');
      expect(canvasService.clearActiveObject).toHaveBeenCalledWith('test-canvas-id', 'star-1');
    });

    it('should skip objects that cannot be edited', async () => {
      // Create new interaction with non-editable circle
      const nonEditableInteraction = new MoveInteraction(mockShapes, startPoint, mockOnUpdate, {
        ...mockOptions,
        canEditObject: vi.fn((id) => id !== 'circle-1')
      });
      
      // Simulate movement
      nonEditableInteraction.move({ x: 200, y: 180 });

      await nonEditableInteraction.end(mockRecordAction);

      // Should only process rect and star (circle filtered out by canEditObject)
      expect(canvasService.updateObject).toHaveBeenCalledTimes(2);
      expect(canvasService.clearActiveObject).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully', async () => {
      canvasService.updateObject.mockRejectedValueOnce(new Error('Update failed'));

      await expect(interaction.end(mockRecordAction)).rejects.toThrow('Update failed');

      // Should still attempt to clear active objects
      expect(canvasService.clearActiveObject).toHaveBeenCalled();
    });

    it('should skip finalization if no movement occurred', async () => {
      // Create new interaction without movement
      const noMovementInteraction = new MoveInteraction(mockShapes, startPoint, mockOnUpdate, mockOptions);

      await noMovementInteraction.end(mockRecordAction);

      expect(canvasService.updateObject).not.toHaveBeenCalled();
      expect(canvasService.clearActiveObject).not.toHaveBeenCalled();
    });

    it('should add to global history manager if available', async () => {
      // Mock global history manager
      window.historyManager = {
        push: vi.fn()
      };

      await interaction.end(mockRecordAction);

      expect(window.historyManager.push).toHaveBeenCalledWith({
        type: "move",
        from: expect.arrayContaining([
          { id: 'rect-1', x: 100, y: 100 },
          { id: 'circle-1', x: 300, y: 200 },
          { id: 'star-1', x: 500, y: 150 }
        ]),
        to: expect.arrayContaining([
          { id: 'rect-1', x: 150, y: 130 },
          { id: 'circle-1', x: 350, y: 230 },
          { id: 'star-1', x: 550, y: 180 }
        ])
      });

      // Cleanup
      delete window.historyManager;
    });
  });

  describe('cancel', () => {
    it('should clear RTDB tracking and local updates', () => {
      const interaction = new MoveInteraction(mockShapes, { x: 150, y: 150 }, mockOnUpdate, mockOptions);
      
      // Simulate some movement
      interaction.move({ x: 200, y: 180 });
      
      interaction.cancel();

      expect(canvasService.clearActiveObject).toHaveBeenCalledTimes(3);
      expect(interaction.getLocalUpdates()).toEqual({});
      expect(mockOnUpdate).toHaveBeenCalledWith({});
    });
  });

  describe('getSummary', () => {
    it('should return interaction summary', () => {
      const startPoint = { x: 150, y: 150 };
      const interaction = new MoveInteraction(mockShapes, startPoint, mockOnUpdate, mockOptions);

      const summary = interaction.getSummary();

      expect(summary).toEqual({
        objectCount: 3,
        startPoint: { x: 150, y: 150 },
        objectTypes: ['rectangle', 'circle', 'star'],
        objectIds: ['rect-1', 'circle-1', 'star-1'],
        hasLocalUpdates: false
      });
    });

    it('should reflect local updates status', () => {
      const interaction = new MoveInteraction(mockShapes, { x: 150, y: 150 }, mockOnUpdate, mockOptions);
      
      expect(interaction.getSummary().hasLocalUpdates).toBe(false);
      
      // Make a move
      interaction.move({ x: 200, y: 180 });
      
      expect(interaction.getSummary().hasLocalUpdates).toBe(true);
    });
  });

  describe('Multi-object Relative Positioning', () => {
    it('should maintain relative positions between objects during movement', () => {
      const interaction = new MoveInteraction(mockShapes, { x: 150, y: 150 }, mockOnUpdate, mockOptions);
      
      // Calculate initial relative positions
      const initialRelativePositions = {
        'circle-to-rect': { 
          dx: mockShapes[1].x - mockShapes[0].x, // 300 - 100 = 200
          dy: mockShapes[1].y - mockShapes[0].y  // 200 - 100 = 100
        },
        'star-to-rect': {
          dx: mockShapes[2].x - mockShapes[0].x, // 500 - 100 = 400
          dy: mockShapes[2].y - mockShapes[0].y  // 150 - 100 = 50
        }
      };

      // Move all objects
      const localUpdates = interaction.move({ x: 250, y: 250 }); // +100, +100 delta

      // Check that relative positions are maintained
      const newRelativePositions = {
        'circle-to-rect': {
          dx: localUpdates['circle-1'].x - localUpdates['rect-1'].x,
          dy: localUpdates['circle-1'].y - localUpdates['rect-1'].y
        },
        'star-to-rect': {
          dx: localUpdates['star-1'].x - localUpdates['rect-1'].x,
          dy: localUpdates['star-1'].y - localUpdates['rect-1'].y
        }
      };

      expect(newRelativePositions).toEqual(initialRelativePositions);
    });
  });
});
