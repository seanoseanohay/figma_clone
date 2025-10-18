import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SelectTool } from './SelectTool.js';
import { lockObject, unlockObject } from '../services/canvas.service.js';
import { 
  createTestRectangle, 
  createTestText, 
  createTestCircle,
  createMouseEventData 
} from '../test/fixtures/testData.js';

// Mock canvas service
vi.mock('../services/canvas.service.js', () => ({
  lockObject: vi.fn(() => Promise.resolve()),
  unlockObject: vi.fn(() => Promise.resolve()),
}));

describe('SelectTool', () => {
  let selectTool;
  let mockState;
  let mockHelpers;
  let testRectangle;
  let testText;
  let testCircle;

  beforeEach(() => {
    selectTool = new SelectTool();
    
    // Create test objects
    testRectangle = createTestRectangle({ id: 'rect-1' });
    testText = createTestText({ id: 'text-1' });
    testCircle = createTestCircle({ id: 'circle-1' });

    // Mock state
    mockState = {
      selectedObjectId: null,
      setSelectedObjectId: vi.fn((id) => { mockState.selectedObjectId = id; }),
      setIsEditingText: vi.fn(),
      setTextEditData: vi.fn(),
      setTextSelectedId: vi.fn(),
      findObjectAt: vi.fn(),
      canEditObject: vi.fn(() => true), // By default, can edit all objects
    };

    // Mock helpers
    mockHelpers = {
      pos: { x: 100, y: 100 },
      canvasId: 'test-canvas-id',
    };

    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct name', () => {
      expect(selectTool.name).toBe('select');
    });

    it('should return default cursor', () => {
      expect(selectTool.getCursor()).toBe('default');
    });

    it('should have double-click threshold of 300ms', () => {
      expect(selectTool.DOUBLE_CLICK_THRESHOLD).toBe(300);
    });
  });

  describe('Object Selection', () => {
    it('should select an object when clicked', async () => {
      mockState.findObjectAt.mockReturnValue(testRectangle);

      await selectTool.onMouseDown({}, mockState, mockHelpers);

      expect(lockObject).toHaveBeenCalledWith('rect-1');
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith('rect-1');
    });

    it('should lock selected object', async () => {
      mockState.findObjectAt.mockReturnValue(testCircle);

      await selectTool.onMouseDown({}, mockState, mockHelpers);

      expect(lockObject).toHaveBeenCalledWith('circle-1');
    });

    it('should not select locked objects owned by others', async () => {
      mockState.findObjectAt.mockReturnValue(testRectangle);
      mockState.canEditObject.mockReturnValue(false); // Object is locked

      await selectTool.onMouseDown({}, mockState, mockHelpers);

      expect(lockObject).not.toHaveBeenCalled();
      expect(mockState.setSelectedObjectId).not.toHaveBeenCalled();
    });

    it('should keep already-selected object selected on click', async () => {
      mockState.selectedObjectId = 'rect-1';
      mockState.findObjectAt.mockReturnValue(testRectangle);

      await selectTool.onMouseDown({}, mockState, mockHelpers);

      // Should not unlock/relock the same object
      expect(unlockObject).not.toHaveBeenCalled();
      expect(lockObject).not.toHaveBeenCalled();
    });
  });

  describe('Deselection', () => {
    it('should deselect when clicking empty space', async () => {
      mockState.selectedObjectId = 'rect-1';
      mockState.findObjectAt.mockReturnValue(null); // No object at click position

      await selectTool.onMouseDown({}, mockState, mockHelpers);

      expect(unlockObject).toHaveBeenCalledWith('rect-1');
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith(null);
    });

    it('should not error when deselecting with no selection', async () => {
      mockState.selectedObjectId = null;
      mockState.findObjectAt.mockReturnValue(null);

      await expect(selectTool.onMouseDown({}, mockState, mockHelpers)).resolves.not.toThrow();
      
      expect(unlockObject).not.toHaveBeenCalled();
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith(null);
    });
  });

  describe('Selection Switching', () => {
    it('should unlock previous object when selecting new object', async () => {
      mockState.selectedObjectId = 'rect-1';
      mockState.findObjectAt.mockReturnValue(testCircle);

      await selectTool.onMouseDown({}, mockState, mockHelpers);

      expect(unlockObject).toHaveBeenCalledWith('rect-1');
      expect(lockObject).toHaveBeenCalledWith('circle-1');
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith('circle-1');
    });

    it('should handle unlock errors gracefully when switching selection', async () => {
      mockState.selectedObjectId = 'rect-1';
      mockState.findObjectAt.mockReturnValue(testCircle);
      unlockObject.mockRejectedValueOnce(new Error('Unlock failed'));

      await selectTool.onMouseDown({}, mockState, mockHelpers);

      // Should still try to select new object despite unlock error
      expect(lockObject).toHaveBeenCalledWith('circle-1');
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith('circle-1');
    });
  });

  describe('Double-Click Text Editing', () => {
    it('should detect double-click on text object', async () => {
      mockState.findObjectAt.mockReturnValue(testText);

      // First click
      await selectTool.onMouseDown({}, mockState, mockHelpers);
      
      // Second click within threshold
      await selectTool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsEditingText).toHaveBeenCalledWith(true);
      expect(mockState.setTextSelectedId).toHaveBeenCalledWith('text-1');
      expect(mockState.setTextEditData).toHaveBeenCalledWith({
        object: testText,
        originalText: testText.text,
      });
    });

    it('should not trigger edit on double-click of non-text objects', async () => {
      mockState.findObjectAt.mockReturnValue(testRectangle);

      // Double-click rectangle
      await selectTool.onMouseDown({}, mockState, mockHelpers);
      await selectTool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsEditingText).not.toHaveBeenCalled();
    });

    it('should not trigger edit if clicks are too far apart', async () => {
      mockState.findObjectAt.mockReturnValue(testText);
      
      // First click
      await selectTool.onMouseDown({}, mockState, mockHelpers);
      
      // Wait longer than threshold
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Second click (should be treated as new single click)
      await selectTool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsEditingText).not.toHaveBeenCalled();
    });

    it('should not trigger edit if clicking different objects', async () => {
      mockState.findObjectAt.mockReturnValueOnce(testText);
      
      // First click on text
      await selectTool.onMouseDown({}, mockState, mockHelpers);
      
      // Second click on different object
      mockState.findObjectAt.mockReturnValueOnce(testRectangle);
      await selectTool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsEditingText).not.toHaveBeenCalled();
    });

    it('should not edit locked text objects', async () => {
      mockState.findObjectAt.mockReturnValue(testText);
      mockState.canEditObject.mockReturnValue(false); // Text is locked

      // Double-click
      await selectTool.onMouseDown({}, mockState, mockHelpers);
      await selectTool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsEditingText).not.toHaveBeenCalled();
    });

    it('should reset double-click tracking after successful edit trigger', async () => {
      mockState.findObjectAt.mockReturnValue(testText);

      // Double-click to trigger edit
      await selectTool.onMouseDown({}, mockState, mockHelpers);
      await selectTool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsEditingText).toHaveBeenCalledTimes(1);

      // Third click should not trigger another edit (tracking was reset)
      await selectTool.onMouseDown({}, mockState, mockHelpers);
      
      expect(mockState.setIsEditingText).toHaveBeenCalledTimes(1); // Still just once
    });
  });

  describe('Error Handling', () => {
    it('should handle lock errors gracefully', async () => {
      mockState.findObjectAt.mockReturnValue(testRectangle);
      lockObject.mockRejectedValueOnce(new Error('Lock failed'));

      await expect(selectTool.onMouseDown({}, mockState, mockHelpers)).resolves.not.toThrow();
      
      // Should not select if lock fails
      expect(mockState.setSelectedObjectId).not.toHaveBeenCalled();
    });

    it('should handle unlock errors gracefully on deselection', async () => {
      mockState.selectedObjectId = 'rect-1';
      mockState.findObjectAt.mockReturnValue(null);
      unlockObject.mockRejectedValueOnce(new Error('Unlock failed'));

      await expect(selectTool.onMouseDown({}, mockState, mockHelpers)).resolves.not.toThrow();
      
      // Should still deselect even if unlock fails
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith(null);
    });

    it('should handle text edit lock errors gracefully', async () => {
      mockState.findObjectAt.mockReturnValue(testText);
      // First lock succeeds (first click), second lock fails (double-click)
      lockObject.mockResolvedValueOnce().mockRejectedValueOnce(new Error('Lock failed'));

      // Double-click
      await selectTool.onMouseDown({}, mockState, mockHelpers);
      await selectTool.onMouseDown({}, mockState, mockHelpers);

      // Should not enter edit mode if lock fails on double-click
      expect(mockState.setIsEditingText).not.toHaveBeenCalled();
    });
  });

  describe('Mouse Event Handlers', () => {
    it('should do nothing on mouse move', () => {
      expect(() => selectTool.onMouseMove({}, mockState, mockHelpers)).not.toThrow();
    });

    it('should do nothing on mouse up', () => {
      expect(() => selectTool.onMouseUp({}, mockState, mockHelpers)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null findObjectAt result', async () => {
      mockState.findObjectAt.mockReturnValue(null);

      await expect(selectTool.onMouseDown({}, mockState, mockHelpers)).resolves.not.toThrow();
    });

    it('should handle undefined object properties', async () => {
      const incompleteObject = { id: 'incomplete-1' }; // Missing type
      mockState.findObjectAt.mockReturnValue(incompleteObject);

      await expect(selectTool.onMouseDown({}, mockState, mockHelpers)).resolves.not.toThrow();
    });

    it('should track last clicked object correctly', async () => {
      mockState.findObjectAt.mockReturnValue(testRectangle);
      
      await selectTool.onMouseDown({}, mockState, mockHelpers);
      
      expect(selectTool.lastClickedObjectId).toBe('rect-1');
      expect(selectTool.lastClickTime).toBeGreaterThan(0);
    });

    it('should reset last clicked object when clicking empty space', async () => {
      mockState.findObjectAt.mockReturnValueOnce(testRectangle);
      
      // Click object
      await selectTool.onMouseDown({}, mockState, mockHelpers);
      expect(selectTool.lastClickedObjectId).toBe('rect-1');
      
      // Click empty space
      mockState.findObjectAt.mockReturnValueOnce(null);
      await selectTool.onMouseDown({}, mockState, mockHelpers);
      expect(selectTool.lastClickedObjectId).toBeNull();
    });
  });
});

