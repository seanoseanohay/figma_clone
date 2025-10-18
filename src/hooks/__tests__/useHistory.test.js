import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useHistory, ACTION_TYPES } from '../useHistory.js';

// Mock Firebase
vi.mock('../../services/firebase.js', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123',
      displayName: 'Test User',
      email: 'test@example.com'
    }
  }
}));

// Mock canvas service
vi.mock('../../services/canvas.service.js', () => ({
  updateObject: vi.fn().mockResolvedValue(true),
  deleteObject: vi.fn().mockResolvedValue(true),
  createObject: vi.fn().mockResolvedValue('test-object-id')
}));

// Mock object ownership
let mockCanUserEditObject;
vi.mock('../useObjectOwnership.js', () => ({
  canUserEditObject: (objectId) => mockCanUserEditObject(objectId)
}));

// Initialize the mock
mockCanUserEditObject = vi.fn().mockResolvedValue(true);

describe('useHistory Hook', () => {
  const mockCanvasId = 'test-canvas-123';
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCanUserEditObject.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty stacks', () => {
      const { result } = renderHook(() => useHistory(mockCanvasId, mockOnError));
      
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.undoDescription).toBe(null);
      expect(result.current.redoDescription).toBe(null);
      expect(result.current.stackSize).toBe(0);
    });
  });

  describe('Recording Actions', () => {
    it('should record a CREATE_OBJECT action correctly', () => {
      const { result } = renderHook(() => useHistory(mockCanvasId, mockOnError));
      
      act(() => {
        result.current.recordAction(
          ACTION_TYPES.CREATE_OBJECT,
          'obj-123',
          null,
          { x: 100, y: 200, width: 50, height: 30, type: 'rectangle' },
          { objectType: 'Rectangle' }
        );
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.undoDescription).toBe('Undo: Create Rectangle');
      expect(result.current.stackSize).toBe(1);
    });

    it('should record a MOVE_OBJECT action correctly', () => {
      const { result } = renderHook(() => useHistory(mockCanvasId, mockOnError));
      
      act(() => {
        result.current.recordAction(
          ACTION_TYPES.MOVE_OBJECT,
          'obj-123',
          { x: 100, y: 200 },
          { x: 150, y: 250 },
          { objectType: 'Rectangle' }
        );
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.undoDescription).toBe('Undo: Move Rectangle');
    });

    it('should limit undo stack to 5 actions', () => {
      const { result } = renderHook(() => useHistory(mockCanvasId, mockOnError));
      
      // Add 6 actions
      act(() => {
        for (let i = 1; i <= 6; i++) {
          result.current.recordAction(
            ACTION_TYPES.MOVE_OBJECT,
            `obj-${i}`,
            { x: i * 10, y: i * 10 },
            { x: i * 20, y: i * 20 },
            { objectType: 'Rectangle' }
          );
        }
      });

      expect(result.current.stackSize).toBe(5); // Should be limited to 5
      expect(result.current.undoStack).toHaveLength(5);
      
      // Most recent action should be obj-6
      expect(result.current.undoStack[0].objectId).toBe('obj-6');
      
      // Oldest action (obj-1) should be removed
      const objectIds = result.current.undoStack.map(cmd => cmd.objectId);
      expect(objectIds).not.toContain('obj-1');
      expect(objectIds).toContain('obj-6');
    });

    it('should clear redo stack when new action is recorded', async () => {
      const { result } = renderHook(() => useHistory(mockCanvasId, mockOnError));
      
      // Record action, then undo it
      act(() => {
        result.current.recordAction(
          ACTION_TYPES.CREATE_OBJECT,
          'obj-123',
          null,
          { x: 100, y: 200, width: 50, height: 30, type: 'rectangle' }
        );
      });

      // Mock current objects state - object exists for undo
      const currentObjects = {
        'obj-123': { 
          id: 'obj-123', 
          x: 100, 
          y: 200, 
          width: 50, 
          height: 30, 
          type: 'rectangle' 
        }
      };

      await act(async () => {
        await result.current.undo(currentObjects);
      });

      expect(result.current.canRedo).toBe(true);

      // Record new action - should clear redo stack
      act(() => {
        result.current.recordAction(
          ACTION_TYPES.CREATE_OBJECT,
          'obj-456',
          null,
          { x: 200, y: 300, width: 60, height: 40, type: 'circle' }
        );
      });

      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('Action Descriptions', () => {
    it('should generate correct descriptions for all action types', () => {
      const { result } = renderHook(() => useHistory(mockCanvasId, mockOnError));
      
      const testCases = [
        { type: ACTION_TYPES.CREATE_OBJECT, expected: 'Undo: Create Rectangle' },
        { type: ACTION_TYPES.DELETE_OBJECT, expected: 'Undo: Delete Rectangle' },
        { type: ACTION_TYPES.MOVE_OBJECT, expected: 'Undo: Move Rectangle' },
        { type: ACTION_TYPES.RESIZE_OBJECT, expected: 'Undo: Resize Rectangle' },
        { type: ACTION_TYPES.ROTATE_OBJECT, expected: 'Undo: Rotate Rectangle' },
        { type: ACTION_TYPES.UPDATE_PROPERTIES, expected: 'Undo: Update Rectangle' }
      ];

      testCases.forEach(({ type, expected }, index) => {
        act(() => {
          result.current.recordAction(
            type,
            `obj-${index}`,
            { someProperty: 'before' },
            { someProperty: 'after' },
            { objectType: 'Rectangle' }
          );
        });

        expect(result.current.undoDescription).toBe(expected);
      });
    });
  });

  describe('Clear History', () => {
    it('should clear both undo and redo stacks', () => {
      const { result } = renderHook(() => useHistory(mockCanvasId, mockOnError));
      
      // Add some actions
      act(() => {
        result.current.recordAction(
          ACTION_TYPES.CREATE_OBJECT,
          'obj-123',
          null,
          { x: 100, y: 200, type: 'rectangle' }
        );
        result.current.recordAction(
          ACTION_TYPES.MOVE_OBJECT,
          'obj-123',
          { x: 100, y: 200 },
          { x: 150, y: 250 }
        );
      });

      expect(result.current.stackSize).toBe(2);

      // Clear history
      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.stackSize).toBe(0);
    });
  });

  describe('Command Structure', () => {
    it('should create commands with all required fields', () => {
      const { result } = renderHook(() => useHistory(mockCanvasId, mockOnError));
      
      act(() => {
        result.current.recordAction(
          ACTION_TYPES.MOVE_OBJECT,
          'obj-123',
          { x: 100, y: 200 },
          { x: 150, y: 250 },
          { objectType: 'Rectangle' }
        );
      });

      const command = result.current.undoStack[0];
      
      expect(command).toMatchObject({
        id: expect.stringMatching(/^cmd_\d+_[a-z0-9]+$/),
        type: ACTION_TYPES.MOVE_OBJECT,
        userId: 'test-user-123',
        timestamp: expect.any(Number),
        objectId: 'obj-123',
        before: { x: 100, y: 200 },
        after: { x: 150, y: 250 },
        canvasId: mockCanvasId,
        description: 'Move Rectangle',
        metadata: { objectType: 'Rectangle' }
      });

      expect(command.timestamp).toBeGreaterThan(Date.now() - 1000); // Within last second
    });
  });
});
