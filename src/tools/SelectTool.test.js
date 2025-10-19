import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SelectTool } from './SelectTool.js';
import * as canvasService from '../services/canvas.service.js';
import { createTestRectangle, createTestText } from '../test/fixtures/testData.js';

// Mock canvas service
vi.mock('../services/canvas.service.js', () => ({
  lockObject: vi.fn(),
  unlockObject: vi.fn(),
}));

describe('SelectTool', () => {
  let tool;
  let mockState;
  let mockHelpers;
  let mockObjects;

  beforeEach(() => {
    tool = new SelectTool();
    
    // Create test objects
    mockObjects = {
      rectangle: createTestRectangle({ id: 'rect-1', x: 100, y: 100, width: 150, height: 100 }),
      text: createTestText({ id: 'text-1', x: 300, y: 200, text: 'Hello World' }),
    };

    // Mock state functions
    mockState = {
      findObjectAt: vi.fn((pos) => {
        // Simple hit detection for tests
        const rect = mockObjects.rectangle;
        if (
          pos.x >= rect.x &&
          pos.x <= rect.x + rect.width &&
          pos.y >= rect.y &&
          pos.y <= rect.y + rect.height
        ) {
          return rect;
        }
        
        const text = mockObjects.text;
        if (pos.x >= text.x - 50 && pos.x <= text.x + 50 && pos.y >= text.y - 20 && pos.y <= text.y + 20) {
          return text;
        }
        
        return null;
      }),
      canEditObject: vi.fn(() => true),
      selectedObjectId: null,
      setSelectedObjectId: vi.fn((id) => {
        mockState.selectedObjectId = id;
      }),
      setIsEditingText: vi.fn(),
      setTextEditData: vi.fn(),
      setTextSelectedId: vi.fn(),
      multiSelection: {
        selectionInfo: new Map(),
        isSelecting: false,
        clearSelection: vi.fn(async () => {
          // Simulate unlocking previously selected object
          if (mockState.selectedObjectId) {
            try {
              await canvasService.unlockObject(mockState.selectedObjectId);
            } catch (error) {
              console.log('Unlock failed during clear selection:', error.message);
              // Continue despite unlock error
            }
          }
          return Promise.resolve();
        }),
        startDragSelection: vi.fn(),
        canSelectObject: vi.fn((objectId) => {
          // Respect the canEditObject function if it's been overridden in tests
          return mockState.canEditObject(objectId);
        }),
        selectObject: vi.fn(() => Promise.resolve()),
        selectSingle: vi.fn(async (objectId) => {
          try {
            // Simulate unlocking previous selection and locking new object
            if (mockState.selectedObjectId && mockState.selectedObjectId !== objectId) {
              await canvasService.unlockObject(mockState.selectedObjectId);
            }
            await canvasService.lockObject(objectId);
            
            // Update selection info
            mockState.multiSelection.selectionInfo.clear();
            mockState.multiSelection.selectionInfo.set(objectId, true);
            mockState.multiSelection.selectionInfo.isSingle = true;
            mockState.multiSelection.selectionInfo.primaryId = objectId;
            
            return Promise.resolve();
          } catch (error) {
            // For the error handling test, we need to actually throw the error
            // so that the SelectTool can handle it properly
            console.log('Selection failed:', error.message);
            throw error; // Re-throw the error
          }
        }),
        updateDragSelection: vi.fn(),
        endDragSelection: vi.fn()
      }
    };

    mockHelpers = {
      pos: { x: 0, y: 0 },
      canvasId: 'test-canvas-id',
    };

    // Helper function to set up selection state
    mockState.setSelection = (objectId) => {
      mockState.selectedObjectId = objectId;
      mockState.multiSelection.selectionInfo.clear();
      if (objectId) {
        mockState.multiSelection.selectionInfo.set(objectId, true);
        mockState.multiSelection.selectionInfo.isSingle = true;
        mockState.multiSelection.selectionInfo.primaryId = objectId;
      } else {
        mockState.multiSelection.selectionInfo.isSingle = false;
        mockState.multiSelection.selectionInfo.primaryId = null;
      }
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct name and properties', () => {
      expect(tool.name).toBe('select');
      expect(tool.lastClickTime).toBe(0);
      expect(tool.lastClickedObjectId).toBe(null);
      expect(tool.DOUBLE_CLICK_THRESHOLD).toBe(300);
    });
  });

  describe('onMouseDown - Object Selection', () => {
    it('should select an object when clicked', async () => {
      // Click inside rectangle
      mockHelpers.pos = { x: 150, y: 150 };
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(mockState.findObjectAt).toHaveBeenCalledWith({ x: 150, y: 150 });
      expect(canvasService.lockObject).toHaveBeenCalledWith('rect-1');
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith('rect-1');
    });

    it('should deselect when clicking empty space', async () => {
      // First select an object
      mockState.setSelection('rect-1');
      
      // Click outside any object
      mockHelpers.pos = { x: 500, y: 500 };
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(canvasService.unlockObject).toHaveBeenCalledWith('rect-1');
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith(null);
    });

    it('should not select object if user cannot edit it', async () => {
      mockState.canEditObject = vi.fn(() => false);
      
      // Click inside rectangle
      mockHelpers.pos = { x: 150, y: 150 };
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(canvasService.lockObject).not.toHaveBeenCalled();
      expect(mockState.setSelectedObjectId).not.toHaveBeenCalled();
    });

    it('should unlock previous selection when selecting new object', async () => {
      // First object is already selected
      mockState.setSelection('rect-1');
      
      // Click on text object
      mockHelpers.pos = { x: 310, y: 210 };
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(canvasService.unlockObject).toHaveBeenCalledWith('rect-1');
      expect(canvasService.lockObject).toHaveBeenCalledWith('text-1');
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith('text-1');
    });

    it('should keep object selected if clicking it again', async () => {
      // Object is already selected
      mockState.setSelection('rect-1');
      
      // Click on same object
      mockHelpers.pos = { x: 150, y: 150 };
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // Should not unlock or lock again
      expect(canvasService.unlockObject).not.toHaveBeenCalled();
      expect(canvasService.lockObject).not.toHaveBeenCalled();
    });
  });

  describe('onMouseDown - Double-Click Text Editing', () => {
    it('should enter text edit mode on double-click', async () => {
      // First click on text
      mockHelpers.pos = { x: 310, y: 210 };
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // Second click on text (within threshold)
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(mockState.setIsEditingText).toHaveBeenCalledWith(true);
      expect(mockState.setTextEditData).toHaveBeenCalledWith({
        object: mockObjects.text,
        originalText: 'Hello World',
      });
      expect(mockState.setTextSelectedId).toHaveBeenCalledWith('text-1');
    });

    it('should not enter edit mode if double-click is too slow', async () => {
      // First click on text
      mockHelpers.pos = { x: 310, y: 210 };
      tool.lastClickTime = Date.now() - 500; // 500ms ago (too slow)
      tool.lastClickedObjectId = 'text-1';
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(mockState.setIsEditingText).not.toHaveBeenCalled();
    });

    it('should not enter edit mode for double-click on non-text objects', async () => {
      // First click on rectangle
      mockHelpers.pos = { x: 150, y: 150 };
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // Second click on rectangle (within threshold)
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(mockState.setIsEditingText).not.toHaveBeenCalled();
    });

    it('should not enter edit mode if user cannot edit text', async () => {
      mockState.canEditObject = vi.fn(() => false);
      
      // First click on text
      mockHelpers.pos = { x: 310, y: 210 };
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // Second click on text (within threshold)
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(mockState.setIsEditingText).not.toHaveBeenCalled();
    });

    it('should reset double-click tracking after successful double-click', async () => {
      // First click on text
      mockHelpers.pos = { x: 310, y: 210 };
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // Second click on text (within threshold)
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(tool.lastClickTime).toBe(0);
      expect(tool.lastClickedObjectId).toBe(null);
    });
  });

  describe('onMouseDown - Error Handling', () => {
    it('should handle lock errors gracefully', async () => {
      canvasService.lockObject.mockRejectedValueOnce(new Error('Lock failed'));
      
      // Click inside rectangle
      mockHelpers.pos = { x: 150, y: 150 };
      
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      // Should not set selected object if lock fails
      expect(mockState.setSelectedObjectId).not.toHaveBeenCalled();
    });

    it('should handle unlock errors gracefully', async () => {
      canvasService.unlockObject.mockRejectedValueOnce(new Error('Unlock failed'));
      
      // First select an object
      mockState.selectedObjectId = 'rect-1';
      
      // Click outside
      mockHelpers.pos = { x: 500, y: 500 };
      
      // Should not throw error
      await expect(tool.onMouseDown({}, mockState, mockHelpers)).resolves.not.toThrow();
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith(null);
    });
  });

  describe('onMouseMove', () => {
    it('should not perform any action', () => {
      tool.onMouseMove({}, mockState, mockHelpers);
      
      // No state changes should occur
      expect(mockState.setSelectedObjectId).not.toHaveBeenCalled();
    });
  });

  describe('onMouseUp', () => {
    it('should not perform any action', () => {
      tool.onMouseUp({}, mockState, mockHelpers);
      
      // No state changes should occur
      expect(mockState.setSelectedObjectId).not.toHaveBeenCalled();
    });
  });

  describe('getCursor', () => {
    it('should return default cursor', () => {
      expect(tool.getCursor()).toBe('default');
    });
  });

  describe('Double-Click Timing', () => {
    it('should track last click time', async () => {
      const beforeClick = Date.now();
      
      mockHelpers.pos = { x: 150, y: 150 };
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      const afterClick = Date.now();
      
      expect(tool.lastClickTime).toBeGreaterThanOrEqual(beforeClick);
      expect(tool.lastClickTime).toBeLessThanOrEqual(afterClick);
      expect(tool.lastClickedObjectId).toBe('rect-1');
    });

    it('should clear last clicked object when clicking empty space', async () => {
      // First click on object
      mockHelpers.pos = { x: 150, y: 150 };
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(tool.lastClickedObjectId).toBe('rect-1');
      
      // Click on empty space
      mockHelpers.pos = { x: 500, y: 500 };
      await tool.onMouseDown({}, mockState, mockHelpers);
      
      expect(tool.lastClickedObjectId).toBe(null);
    });
  });
});
