import { 
  createObject, 
  lockObject, 
  unlockObject 
} from '../services/canvas.service.js';

/**
 * TextTool - Handles text creation and inline editing
 * 
 * Interaction Model:
 * - Click on canvas to create new text object with inline editing
 * - Click on existing text to edit it
 * - Text editing happens via HTML overlay for better editing experience
 * - Text supports basic formatting: bold, italic, underline
 * - Text can be styled with color picker
 */
export class TextTool {
  constructor() {
    this.DEFAULT_FONT_SIZE = 24
    this.DEFAULT_FONT_FAMILY = 'Arial'
    this.DEFAULT_TEXT_COLOR = '#000000'
    this.MIN_TEXT_WIDTH = 100
  }

  /**
   * Handle mouse down - Create new text or start editing existing text
   */
  async onMouseDown(e, state, helpers) {
    const { pos, canvasId } = helpers;
    const {
      canvasObjects,
      canEditObject,
      setSelectedObjectId,
      setTextSelectedId,
      setIsEditingText,
      setTextEditData
    } = state;

    console.log('🔤 Text tool: Mouse down at', pos);

    // Check if clicking on existing text object
    const clickedText = canvasObjects.find(obj => 
      obj.type === 'text' && this.isPointInText(pos, obj)
    );

    if (clickedText && canEditObject(clickedText.id)) {
      console.log('🔤 Text tool: Editing existing text', clickedText.id);
      
      // Lock the text for editing
      try {
        await lockObject(clickedText.id);
        console.log('✅ Text locked for editing');
      } catch (error) {
        console.error('Failed to lock text:', error);
        return;
      }

      setSelectedObjectId(clickedText.id);
      setTextSelectedId(clickedText.id);
      setIsEditingText(true);
      setTextEditData({
        object: clickedText,
        originalText: clickedText.text || ''
      });
    } else if (!clickedText) {
      // Create new text at click position
      console.log('🔤 Text tool: Creating new text at', pos);
      
      // Start editing mode for new text
      setIsEditingText(true);
      setTextEditData({
        newTextPosition: pos,
        originalText: ''
      });
    }
  }

  /**
   * Handle mouse move - No action needed for text tool
   */
  onMouseMove(e, state, helpers) {
    // Text tool doesn't need mouse move handling
  }

  /**
   * Handle mouse up - No action needed for text tool
   */
  async onMouseUp(e, state, helpers) {
    // Text tool completes actions via text editor, not mouse up
  }

  /**
   * Create a new text object after user finishes editing
   */
  async createTextObject(canvasId, pos, text, formatting = {}) {
    const {
      bold = false,
      italic = false,
      underline = false,
      fontSize = this.DEFAULT_FONT_SIZE,
      fontFamily = this.DEFAULT_FONT_FAMILY,
      fill = this.DEFAULT_TEXT_COLOR
    } = formatting;

    // Build font style string
    const fontStyle = `${bold ? 'bold ' : ''}${italic ? 'italic ' : ''}${fontSize}px ${fontFamily}`;

    const textObject = {
      type: 'text',
      x: pos.x,
      y: pos.y,
      text: text || 'Text',
      fontSize,
      fontFamily,
      fontStyle,
      bold,
      italic,
      underline,
      fill,
      width: this.MIN_TEXT_WIDTH,
      align: 'left',
      rotation: 0,
      zIndex: 0
    };

    try {
      const textId = await createObject(canvasId, textObject);
      console.log('✅ Text object created:', textId);
      return textId;
    } catch (error) {
      console.error('Failed to create text object:', error);
      throw error;
    }
  }

  /**
   * Helper function to check if point is inside text bounds
   */
  isPointInText(point, text) {
    // Estimate text width based on font size and text length
    const estimatedWidth = text.width || (text.text?.length || 10) * (text.fontSize || this.DEFAULT_FONT_SIZE) * 0.6;
    const height = (text.fontSize || this.DEFAULT_FONT_SIZE) * 1.2;

    return (
      point.x >= text.x &&
      point.x <= text.x + estimatedWidth &&
      point.y >= text.y &&
      point.y <= text.y + height
    );
  }
}


