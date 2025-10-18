import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TextTool } from './TextTool.js';
import {
  createObject,
  lockObject,
  unlockObject,
} from '../services/canvas.service.js';
import {
  createTestText,
  createTestRectangle,
} from '../test/fixtures/testData.js';

// Mock canvas service
vi.mock('../services/canvas.service.js', () => ({
  createObject: vi.fn(() => Promise.resolve('new-text-id')),
  lockObject: vi.fn(() => Promise.resolve()),
  unlockObject: vi.fn(() => Promise.resolve()),
}));

describe('TextTool', () => {
  let tool;
  let mockState;
  let mockHelpers;
  let testText;

  beforeEach(() => {
    tool = new TextTool();

    // Create test text object
    testText = createTestText({
      id: 'text-1',
      x: 300,
      y: 200,
      text: 'Hello World',
      fontSize: 24,
      fontFamily: 'Arial',
      width: 200,
    });

    // Mock state
    mockState = {
      canvasObjects: [testText],
      setSelectedObjectId: vi.fn(),
      setTextSelectedId: vi.fn(),
      setIsEditingText: vi.fn(),
      setTextEditData: vi.fn(),
      canEditObject: vi.fn(() => true),
    };

    // Mock helpers
    mockHelpers = {
      pos: { x: 350, y: 210 }, // Inside text bounds
      canvasId: 'test-canvas',
    };

    // Clear mocks
    createObject.mockClear();
    lockObject.mockClear();
    unlockObject.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool Constants', () => {
    it('should have correct default font size', () => {
      expect(tool.DEFAULT_FONT_SIZE).toBe(24);
    });

    it('should have correct default font family', () => {
      expect(tool.DEFAULT_FONT_FAMILY).toBe('Arial');
    });

    it('should have correct default text color', () => {
      expect(tool.DEFAULT_TEXT_COLOR).toBe('#000000');
    });

    it('should have correct minimum text width', () => {
      expect(tool.MIN_TEXT_WIDTH).toBe(100);
    });
  });

  describe('isPointInText', () => {
    it('should detect point inside text bounds', () => {
      const point = { x: 350, y: 210 };
      const isInside = tool.isPointInText(point, testText);
      
      expect(isInside).toBe(true);
    });

    it('should detect point at text top-left corner', () => {
      const point = { x: 300, y: 200 };
      const isInside = tool.isPointInText(point, testText);
      
      expect(isInside).toBe(true);
    });

    it('should detect point at text bottom-right corner', () => {
      // Text bounds: x:300, y:200, width:200, height:24*1.2=28.8
      // Bottom-right corner: (500, 228.8)
      const point = { x: 499, y: 228 }; // Just inside bottom-right
      const isInside = tool.isPointInText(point, testText);
      
      expect(isInside).toBe(true);
    });

    it('should return false for point outside text bounds (left)', () => {
      const point = { x: 200, y: 210 };
      const isInside = tool.isPointInText(point, testText);
      
      expect(isInside).toBe(false);
    });

    it('should return false for point outside text bounds (right)', () => {
      const point = { x: 600, y: 210 };
      const isInside = tool.isPointInText(point, testText);
      
      expect(isInside).toBe(false);
    });

    it('should return false for point outside text bounds (above)', () => {
      const point = { x: 350, y: 150 };
      const isInside = tool.isPointInText(point, testText);
      
      expect(isInside).toBe(false);
    });

    it('should return false for point outside text bounds (below)', () => {
      const point = { x: 350, y: 250 };
      const isInside = tool.isPointInText(point, testText);
      
      expect(isInside).toBe(false);
    });

    it('should estimate width based on text length when width not provided', () => {
      const textWithoutWidth = { ...testText };
      delete textWithoutWidth.width;
      
      const point = { x: 310, y: 210 };
      const isInside = tool.isPointInText(point, textWithoutWidth);
      
      expect(isInside).toBe(true);
    });

    it('should use default font size when fontSize not provided', () => {
      const textWithoutFontSize = { ...testText, fontSize: undefined };
      
      const point = { x: 350, y: 210 };
      const isInside = tool.isPointInText(point, textWithoutFontSize);
      
      expect(isInside).toBe(true);
    });

    it('should handle text with no text content', () => {
      const emptyText = { ...testText, text: '' };
      
      const point = { x: 310, y: 210 };
      const isInside = tool.isPointInText(point, emptyText);
      
      expect(isInside).toBeDefined();
    });
  });

  describe('onMouseDown - Create New Text', () => {
    beforeEach(() => {
      mockHelpers.pos = { x: 100, y: 100 }; // Empty space
      mockState.canvasObjects = [testText];
    });

    it('should start text editor for new text when clicking empty space', async () => {
      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setIsEditingText).toHaveBeenCalledWith(true);
      expect(mockState.setTextEditData).toHaveBeenCalledWith({
        newTextPosition: { x: 100, y: 100 },
        originalText: '',
      });
    });

    it('should not lock any object when creating new text', async () => {
      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(lockObject).not.toHaveBeenCalled();
    });

    it('should pass correct position for new text', async () => {
      mockHelpers.pos = { x: 500, y: 300 };
      
      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setTextEditData).toHaveBeenCalledWith({
        newTextPosition: { x: 500, y: 300 },
        originalText: '',
      });
    });
  });

  describe('onMouseDown - Edit Existing Text', () => {
    beforeEach(() => {
      mockHelpers.pos = { x: 350, y: 210 }; // Inside text bounds
    });

    it('should lock and edit existing text when clicked', async () => {
      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(lockObject).toHaveBeenCalledWith('text-1');
      expect(mockState.setSelectedObjectId).toHaveBeenCalledWith('text-1');
      expect(mockState.setTextSelectedId).toHaveBeenCalledWith('text-1');
      expect(mockState.setIsEditingText).toHaveBeenCalledWith(true);
    });

    it('should pass existing text data to text editor', async () => {
      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setTextEditData).toHaveBeenCalledWith({
        object: testText,
        originalText: 'Hello World',
      });
    });

    it('should handle text with empty content', async () => {
      const emptyText = { ...testText, text: '' };
      mockState.canvasObjects = [emptyText];

      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setTextEditData).toHaveBeenCalledWith({
        object: emptyText,
        originalText: '',
      });
    });

    it('should handle text with undefined text property', async () => {
      const noTextProp = { ...testText };
      delete noTextProp.text;
      mockState.canvasObjects = [noTextProp];

      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(mockState.setTextEditData).toHaveBeenCalledWith({
        object: noTextProp,
        originalText: '',
      });
    });

    it('should not edit text that cannot be edited', async () => {
      mockState.canEditObject.mockReturnValue(false);

      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(lockObject).not.toHaveBeenCalled();
      expect(mockState.setIsEditingText).not.toHaveBeenCalled();
    });

    it('should handle lock errors gracefully', async () => {
      lockObject.mockRejectedValueOnce(new Error('Lock failed'));

      await expect(tool.onMouseDown({}, mockState, mockHelpers)).resolves.not.toThrow();
      
      expect(mockState.setIsEditingText).not.toHaveBeenCalled();
    });

    it('should only edit text objects (not other shapes)', async () => {
      const rectangle = createTestRectangle({ id: 'rect-1', x: 350, y: 210 });
      mockState.canvasObjects = [rectangle];

      await tool.onMouseDown({}, mockState, mockHelpers);

      // Should try to create new text instead of editing rectangle
      expect(lockObject).not.toHaveBeenCalled();
      expect(mockState.setIsEditingText).toHaveBeenCalledWith(true);
      expect(mockState.setTextEditData).toHaveBeenCalledWith(
        expect.objectContaining({ newTextPosition: mockHelpers.pos })
      );
    });
  });

  describe('onMouseMove', () => {
    it('should do nothing on mouse move', () => {
      expect(() => tool.onMouseMove({}, mockState, mockHelpers)).not.toThrow();
      
      // Verify no state changes
      expect(mockState.setIsEditingText).not.toHaveBeenCalled();
      expect(mockState.setTextEditData).not.toHaveBeenCalled();
    });
  });

  describe('onMouseUp', () => {
    it('should do nothing on mouse up', async () => {
      await expect(tool.onMouseUp({}, mockState, mockHelpers)).resolves.not.toThrow();
      
      // Verify no state changes
      expect(mockState.setIsEditingText).not.toHaveBeenCalled();
      expect(mockState.setTextEditData).not.toHaveBeenCalled();
    });
  });

  describe('createTextObject', () => {
    const testPos = { x: 100, y: 200 };
    const testCanvasId = 'test-canvas';

    it('should create text object with default formatting', async () => {
      const textId = await tool.createTextObject(testCanvasId, testPos, 'Test Text');

      expect(createObject).toHaveBeenCalledWith(
        'text',
        { x: 100, y: 200 },
        testCanvasId,
        expect.objectContaining({
          text: 'Test Text',
          fontSize: 24,
          fontFamily: 'Arial',
          bold: false,
          italic: false,
          underline: false,
          fill: '#000000',
          width: 100,
          align: 'left',
          rotation: 0,
          zIndex: 0,
        })
      );

      expect(textId).toBe('new-text-id');
    });

    it('should create text object with custom formatting', async () => {
      const formatting = {
        bold: true,
        italic: true,
        underline: true,
        fontSize: 32,
        fontFamily: 'Georgia',
        fill: '#FF0000',
      };

      await tool.createTextObject(testCanvasId, testPos, 'Formatted Text', formatting);

      expect(createObject).toHaveBeenCalledWith(
        'text',
        testPos,
        testCanvasId,
        expect.objectContaining({
          text: 'Formatted Text',
          fontSize: 32,
          fontFamily: 'Georgia',
          bold: true,
          italic: true,
          underline: true,
          fill: '#FF0000',
        })
      );
    });

    it('should build correct font style for bold text', async () => {
      const formatting = { bold: true };
      
      await tool.createTextObject(testCanvasId, testPos, 'Bold Text', formatting);

      const callArgs = createObject.mock.calls[0][3];
      expect(callArgs.fontStyle).toContain('bold');
      expect(callArgs.fontStyle).toMatch(/^bold \d+px \w+/);
    });

    it('should build correct font style for italic text', async () => {
      const formatting = { italic: true };
      
      await tool.createTextObject(testCanvasId, testPos, 'Italic Text', formatting);

      const callArgs = createObject.mock.calls[0][3];
      expect(callArgs.fontStyle).toContain('italic');
      expect(callArgs.fontStyle).toMatch(/^italic \d+px \w+/);
    });

    it('should build correct font style for bold italic text', async () => {
      const formatting = { bold: true, italic: true };
      
      await tool.createTextObject(testCanvasId, testPos, 'Bold Italic', formatting);

      const callArgs = createObject.mock.calls[0][3];
      expect(callArgs.fontStyle).toContain('bold');
      expect(callArgs.fontStyle).toContain('italic');
      expect(callArgs.fontStyle).toMatch(/^bold italic \d+px \w+/);
    });

    it('should use default text if none provided', async () => {
      await tool.createTextObject(testCanvasId, testPos, '');

      expect(createObject).toHaveBeenCalledWith(
        'text',
        testPos,
        testCanvasId,
        expect.objectContaining({ text: 'Text' })
      );
    });

    it('should use default text if null provided', async () => {
      await tool.createTextObject(testCanvasId, testPos, null);

      expect(createObject).toHaveBeenCalledWith(
        'text',
        testPos,
        testCanvasId,
        expect.objectContaining({ text: 'Text' })
      );
    });

    it('should handle partial formatting options', async () => {
      const formatting = { bold: true }; // Only bold, others use defaults
      
      await tool.createTextObject(testCanvasId, testPos, 'Test', formatting);

      expect(createObject).toHaveBeenCalledWith(
        'text',
        testPos,
        testCanvasId,
        expect.objectContaining({
          bold: true,
          italic: false,
          underline: false,
          fontSize: 24,
          fontFamily: 'Arial',
          fill: '#000000',
        })
      );
    });

    it('should handle all font sizes', async () => {
      const sizes = [8, 12, 16, 24, 32, 48, 64, 72];
      
      for (const size of sizes) {
        createObject.mockClear();
        const formatting = { fontSize: size };
        
        await tool.createTextObject(testCanvasId, testPos, 'Test', formatting);

        const callArgs = createObject.mock.calls[0][3];
        expect(callArgs.fontSize).toBe(size);
        expect(callArgs.fontStyle).toContain(`${size}px`);
      }
    });

    it('should handle all supported font families', async () => {
      const fonts = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
      
      for (const font of fonts) {
        createObject.mockClear();
        const formatting = { fontFamily: font };
        
        await tool.createTextObject(testCanvasId, testPos, 'Test', formatting);

        const callArgs = createObject.mock.calls[0][3];
        expect(callArgs.fontFamily).toBe(font);
        expect(callArgs.fontStyle).toContain(font);
      }
    });

    it('should handle createObject errors', async () => {
      createObject.mockRejectedValueOnce(new Error('Create failed'));

      await expect(
        tool.createTextObject(testCanvasId, testPos, 'Test')
      ).rejects.toThrow('Create failed');
    });

    it('should return created text ID', async () => {
      createObject.mockResolvedValueOnce('custom-text-id');

      const result = await tool.createTextObject(testCanvasId, testPos, 'Test');

      expect(result).toBe('custom-text-id');
    });

    it('should include all required properties', async () => {
      await tool.createTextObject(testCanvasId, testPos, 'Test');

      const callArgs = createObject.mock.calls[0][3];
      
      // Verify all expected properties are present
      expect(callArgs).toHaveProperty('text');
      expect(callArgs).toHaveProperty('fontSize');
      expect(callArgs).toHaveProperty('fontFamily');
      expect(callArgs).toHaveProperty('fontStyle');
      expect(callArgs).toHaveProperty('bold');
      expect(callArgs).toHaveProperty('italic');
      expect(callArgs).toHaveProperty('underline');
      expect(callArgs).toHaveProperty('fill');
      expect(callArgs).toHaveProperty('width');
      expect(callArgs).toHaveProperty('align');
      expect(callArgs).toHaveProperty('rotation');
      expect(callArgs).toHaveProperty('zIndex');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple text objects on canvas', async () => {
      const text2 = createTestText({ id: 'text-2', x: 600, y: 400 });
      mockState.canvasObjects = [testText, text2];
      
      // Click on first text
      mockHelpers.pos = { x: 350, y: 210 };
      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(lockObject).toHaveBeenCalledWith('text-1');
      expect(mockState.setTextEditData).toHaveBeenCalledWith(
        expect.objectContaining({ object: testText })
      );
    });

    it('should handle overlapping text objects', async () => {
      const text2 = createTestText({ id: 'text-2', x: 300, y: 200 }); // Same position
      mockState.canvasObjects = [testText, text2];
      
      mockHelpers.pos = { x: 350, y: 210 };
      await tool.onMouseDown({}, mockState, mockHelpers);

      // Should select first matching text
      expect(lockObject).toHaveBeenCalledTimes(1);
      expect(lockObject).toHaveBeenCalledWith('text-1');
    });

    it('should handle text with very large font size', async () => {
      const largeText = { ...testText, fontSize: 128 };
      mockState.canvasObjects = [largeText];
      
      const point = { x: 350, y: 250 };
      const isInside = tool.isPointInText(point, largeText);
      
      expect(isInside).toBeDefined();
    });

    it('should handle text with very small font size', async () => {
      const smallText = { ...testText, fontSize: 8 };
      mockState.canvasObjects = [smallText];
      
      const point = { x: 310, y: 205 };
      const isInside = tool.isPointInText(point, smallText);
      
      expect(isInside).toBeDefined();
    });

    it('should handle text at canvas origin (0, 0)', async () => {
      const originText = createTestText({ id: 'origin', x: 0, y: 0 });
      mockState.canvasObjects = [originText];
      
      mockHelpers.pos = { x: 10, y: 10 };
      await tool.onMouseDown({}, mockState, mockHelpers);

      expect(lockObject).toHaveBeenCalledWith('origin');
    });

    it('should handle very long text strings', async () => {
      const longText = 'A'.repeat(1000);
      await tool.createTextObject('canvas', { x: 0, y: 0 }, longText);

      expect(createObject).toHaveBeenCalledWith(
        'text',
        expect.any(Object),
        'canvas',
        expect.objectContaining({ text: longText })
      );
    });

    it('should handle unicode and special characters', async () => {
      const specialText = '🔥 Hello 世界 €£¥ 🎨';
      await tool.createTextObject('canvas', { x: 0, y: 0 }, specialText);

      expect(createObject).toHaveBeenCalledWith(
        'text',
        expect.any(Object),
        'canvas',
        expect.objectContaining({ text: specialText })
      );
    });
  });
});

