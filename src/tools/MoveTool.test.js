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

// Mock MoveInteraction
const mockMoveInteraction = {
  move: vi.fn(),
  end: vi.fn(() => Promise.resolve()),
  cancel: vi.fn(),
  getLocalUpdates: vi.fn(() => ({ 'rect-1': { x: 150, y: 130 } })),
  selectedShapes: [{ id: 'rect-1' }] // Mock shapes array for logging
};

vi.mock('./MoveInteraction.js', () => ({
  default: vi.fn().mockImplementation(() => mockMoveInteraction)
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

    // Mock multi-selection
    const mockMultiSelection = {
      selectionInfo: {
        count: 1,
        isSingle: true,
        isMulti: false,
        isEmpty: false,
        selectedIds: ['rect-1'],
        primaryId: 'rect-1',
        has: vi.fn((id) => id === 'rect-1'),
        all: new Set(['rect-1'])
      },
      clearSelection: vi.fn(() => Promise.resolve())
    };

    // Mock state functions
    mockState = {
      selectedObjectId: 'rect-1',
      mouseDownPos: null,
      isMoving: false,
      moveOriginalPos: null,
      canvasObjects: [mockObjects.rectangle, mockObjects.circle],
      localRectUpdates: {},
      multiSelection: mockMultiSelection,
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
      recordAction: vi.fn()
    };

    // Reset mocks
    vi.clearAllMocks();
    
    // Reset mock MoveInteraction methods
    mockMoveInteraction.move.mockClear();
    mockMoveInteraction.end.mockClear();
    mockMoveInteraction.cancel.mockClear();
    mockMoveInteraction.getLocalUpdates.mockClear();
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
    it('should create MoveInteraction when clicking selected object', async () => {
      mockHelpers.pos = { x: 150, y: 150 }; // Inside rectangle
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(tool.moveInteraction).toBeTruthy();
    });

    it('should auto-select object when no object is currently selected', async () => {
      mockState.selectedObjectId = null;
      mockState.multiSelection.selectionInfo.isEmpty = true;
      mockState.multiSelection.selectionInfo.count = 0;
      mockHelpers.pos = { x: 150, y: 150 }; // Clicking on rectangle
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // With auto-selection, it should select the object and create MoveInteraction
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith('rect-1');
      expect(canvasService.lockObject).toHaveBeenCalledWith('rect-1');
      expect(tool.moveInteraction).toBeTruthy();
    });

    it('should switch selection when clicking different object', async () => {
      mockState.selectedObjectId = 'circle-1'; // Circle is selected
      mockHelpers.pos = { x: 150, y: 150 }; // But clicking rectangle
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // Should unlock previous and lock new object
      expect(canvasService.unlockObject).toHaveBeenCalledWith('circle-1');
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith('rect-1');
      expect(canvasService.lockObject).toHaveBeenCalledWith('rect-1');
      expect(tool.moveInteraction).toBeTruthy();
    });

    it('should auto-select clicked object when current selection does not exist', async () => {
      mockState.selectedObjectId = 'non-existent-id'; // Invalid selected ID
      mockHelpers.pos = { x: 150, y: 150 }; // But clicking on valid rectangle
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // Should unlock previous (non-existent) and select the clicked object (rectangle)
      expect(canvasService.unlockObject).toHaveBeenCalledWith('non-existent-id');
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith('rect-1');
      expect(canvasService.lockObject).toHaveBeenCalledWith('rect-1');
      expect(tool.moveInteraction).toBeTruthy();
    });
  });

  describe('onMouseMove - MoveInteraction Integration', () => {
    beforeEach(async () => {
      // Setup: mouse down on rectangle to create MoveInteraction
      mockHelpers.pos = { x: 150, y: 150 };
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // Manually set the mock interaction for testing
      tool.moveInteraction = mockMoveInteraction;
      
      // Clear mocks from onMouseDown
      vi.clearAllMocks();
    });

    it('should delegate to MoveInteraction if active', () => {
      // Even tiny movement should be delegated
      mockHelpers.pos = { x: 151, y: 150 };
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      expect(mockMoveInteraction.move).toHaveBeenCalledWith({ x: 151, y: 150 });
    });

    it('should handle no active MoveInteraction gracefully', () => {
      // Clear the interaction
      tool.moveInteraction = null;
      
      mockHelpers.pos = { x: 155, y: 155 };
      
      // Should not throw error
      expect(() => tool.onMouseMove({}, mockState, mockHelpers)).not.toThrow();
    });
  });

  describe('onMouseMove - Object Movement', () => {
    beforeEach(async () => {
      // Setup: mouse down (immediate movement ready)
      mockHelpers.pos = { x: 150, y: 150 };
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // Manually set the mock interaction for testing
      tool.moveInteraction = mockMoveInteraction;
    });

    it('should delegate to MoveInteraction', () => {
      // Move 50 pixels right and 30 pixels down
      mockHelpers.pos = { x: 200, y: 180 };
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      expect(mockMoveInteraction.move).toHaveBeenCalledWith({ x: 200, y: 180 });
    });

    it('should delegate position updates to MoveInteraction', () => {
      mockHelpers.pos = { x: 200, y: 180 };
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      // The actual RTDB updates are now handled by MoveInteraction
      expect(mockMoveInteraction.move).toHaveBeenCalledWith({ x: 200, y: 180 });
    });

    it('should handle interaction delegation correctly', () => {
      mockHelpers.pos = { x: 200, y: 180 };
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      // The tool should delegate to MoveInteraction without error
      expect(mockMoveInteraction.move).toHaveBeenCalledTimes(1);
    });

    it('should delegate boundary constraints to MoveInteraction', () => {
      mockHelpers.pos = { x: 0, y: 0 }; // Move that would trigger boundary constraints
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      // MoveInteraction handles the constraints internally
      expect(mockMoveInteraction.move).toHaveBeenCalledWith({ x: 0, y: 0 });
    });

    it('should delegate all object types to MoveInteraction', () => {
      mockHelpers.pos = { x: 350, y: 250 };
      
      tool.onMouseMove({}, mockState, mockHelpers);
      
      // MoveInteraction handles all object types
      expect(mockMoveInteraction.move).toHaveBeenCalledWith({ x: 350, y: 250 });
    });
  });

  describe('onMouseUp', () => {
    beforeEach(async () => {
      // Setup: complete drag operation with MoveInteraction
      mockHelpers.pos = { x: 150, y: 150 };
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // Manually set the mock interaction and simulate actual dragging
      tool.moveInteraction = mockMoveInteraction;
      tool.isDragging = true; // simulate that actual dragging occurred
      mockState.isMoving = true;
      
      // Clear mocks from setup
      vi.clearAllMocks();
    });

    it('should finalize MoveInteraction on mouse up', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);
      
      expect(mockMoveInteraction.end).toHaveBeenCalledWith(mockHelpers.recordAction);
      expect(mockState.setIsMoving).toHaveBeenCalledWith(false);
      expect(tool.moveInteraction).toBeNull();
    });

    it('should clear local updates from MoveInteraction', async () => {
      await tool.onMouseUp({}, mockState, mockHelpers);
      
      expect(mockState.setLocalRectUpdates).toHaveBeenCalled();
    });

    it('should handle errors from MoveInteraction gracefully', async () => {
      mockMoveInteraction.end.mockRejectedValueOnce(new Error('Finalization failed'));
      
      await expect(tool.onMouseUp({}, mockState, mockHelpers)).resolves.not.toThrow();
      
      expect(tool.moveInteraction).toBeNull();
      expect(mockState.setIsMoving).toHaveBeenCalledWith(false);
    });

    it('should handle click without drag', async () => {
      mockState.isMoving = false;
      tool.isDragging = false; // simulate click without actual dragging
      
      await tool.onMouseUp({}, mockState, mockHelpers);
      
      // Should clean up but not call end
      expect(mockMoveInteraction.end).not.toHaveBeenCalled();
      expect(tool.moveInteraction).toBeNull();
    });

    it('should handle no active MoveInteraction', async () => {
      tool.moveInteraction = null;
      
      await tool.onMouseUp({}, mockState, mockHelpers);
      
      // Should not throw error
      expect(mockState.setIsMoving).not.toHaveBeenCalled();
    });
  });

  describe('getCursor', () => {
    it('should return default cursor', () => {
      expect(tool.getCursor()).toBe('default');
    });
  });

  describe('Multi-Selection Movement', () => {
    beforeEach(() => {
      // Setup multi-selection state
      mockState.multiSelection.selectionInfo = {
        count: 2,
        isSingle: false,
        isMulti: true,
        isEmpty: false,
        selectedIds: ['rect-1', 'circle-1'],
        primaryId: 'rect-1',
        has: vi.fn((id) => ['rect-1', 'circle-1'].includes(id)),
        all: new Set(['rect-1', 'circle-1'])
      };
    });

    it('should create MoveInteraction with all selected objects', async () => {
      mockHelpers.pos = { x: 150, y: 150 }; // Inside rectangle

      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(tool.moveInteraction).toBeTruthy();
      // MoveInteraction should be created with both objects
      const MoveInteraction = (await import('./MoveInteraction.js')).default;
      expect(MoveInteraction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'rect-1' }),
          expect.objectContaining({ id: 'circle-1' })
        ]),
        { x: 150, y: 150 },
        expect.any(Function),
        expect.objectContaining({
          canvasId: 'test-canvas-id'
        })
      );
    });

    it('should handle single selection from multi-selection hook', async () => {
      // Single selection through multi-selection system
      mockState.multiSelection.selectionInfo = {
        count: 1,
        isSingle: true,
        isMulti: false,
        isEmpty: false,
        selectedIds: ['rect-1'],
        primaryId: 'rect-1',
        has: vi.fn((id) => id === 'rect-1'),
        all: new Set(['rect-1'])
      };

      mockHelpers.pos = { x: 150, y: 150 };

      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(tool.moveInteraction).toBeTruthy();
      // Should create MoveInteraction with single object
      const MoveInteraction = (await import('./MoveInteraction.js')).default;
      expect(MoveInteraction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'rect-1' })
        ]),
        { x: 150, y: 150 },
        expect.any(Function),
        expect.any(Object)
      );
    });
  });
});
