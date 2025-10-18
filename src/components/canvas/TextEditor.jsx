import { useState, useEffect, useRef } from 'react';

/**
 * TextEditor - HTML overlay component for inline text editing with formatting
 * 
 * Features:
 * - Positioned absolutely over canvas at text location
 * - Multi-line text input with contenteditable div
 * - Formatting toolbar: Bold, Italic, Underline
 * - Color picker integration
 * - Save on Enter (with Shift for new line) or Cancel on Escape
 * - Auto-focus on mount
 */
const TextEditor = ({ 
  position,           // { x, y } canvas coordinates
  initialText = '',   // Initial text content
  initialFormatting = {}, // { bold, italic, underline, fontSize, fontFamily, fill }
  onSave,            // (text, formatting) => void
  onCancel,          // () => void
  stageScale = 1,    // Current canvas zoom level
  stagePos = { x: 0, y: 0 } // Current canvas pan position
}) => {
  const [text, setText] = useState(initialText);
  const [bold, setBold] = useState(initialFormatting.bold || false);
  const [italic, setItalic] = useState(initialFormatting.italic || false);
  const [underline, setUnderline] = useState(initialFormatting.underline || false);
  const [fontSize, setFontSize] = useState(initialFormatting.fontSize || 24);
  const [fontFamily, setFontFamily] = useState(initialFormatting.fontFamily || 'Arial');
  const [color, setColor] = useState(initialFormatting.fill || '#000000');
  
  const textAreaRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-focus on mount
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
      // Place cursor at end of text
      const range = document.createRange();
      const sel = window.getSelection();
      const textNode = textAreaRef.current.firstChild;
      if (textNode) {
        range.setStart(textNode, textNode.length);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setBold(!bold);
    } else if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setItalic(!italic);
    } else if (e.key === 'u' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setUnderline(!underline);
    }
  };

  const handleSave = () => {
    const finalText = textAreaRef.current?.innerText || text;
    if (finalText.trim()) {
      onSave(finalText, {
        bold,
        italic,
        underline,
        fontSize,
        fontFamily,
        fill: color
      });
    } else {
      onCancel(); // Don't create empty text
    }
  };

  const handleTextChange = () => {
    if (textAreaRef.current) {
      setText(textAreaRef.current.innerText);
    }
  };

  // Calculate screen position from canvas coordinates
  const screenX = position.x * stageScale + stagePos.x;
  const screenY = position.y * stageScale + stagePos.y;

  // Build font style for preview
  const fontStyle = `${bold ? 'bold ' : ''}${italic ? 'italic ' : ''}${fontSize}px ${fontFamily}`;
  const textDecoration = underline ? 'underline' : 'none';

  return (
    <div
      ref={containerRef}
      className="absolute z-50"
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        transform: 'translateY(-100%)', // Position above cursor
      }}
    >
      {/* Formatting Toolbar */}
      <div className="bg-white border border-gray-300 rounded-t-lg shadow-lg px-2 py-1 flex items-center gap-2">
        {/* Bold Button */}
        <button
          onClick={() => setBold(!bold)}
          className={`px-2 py-1 rounded font-bold border transition-colors ${
            bold 
              ? 'bg-blue-500 text-white border-blue-600' 
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
          }`}
          title="Bold (Ctrl+B)"
        >
          B
        </button>

        {/* Italic Button */}
        <button
          onClick={() => setItalic(!italic)}
          className={`px-2 py-1 rounded italic border transition-colors ${
            italic 
              ? 'bg-blue-500 text-white border-blue-600' 
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
          }`}
          title="Italic (Ctrl+I)"
        >
          I
        </button>

        {/* Underline Button */}
        <button
          onClick={() => setUnderline(!underline)}
          className={`px-2 py-1 rounded underline border transition-colors ${
            underline 
              ? 'bg-blue-500 text-white border-blue-600' 
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
          }`}
          title="Underline (Ctrl+U)"
        >
          U
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300 mx-1" />

        {/* Color Picker */}
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-6 rounded border border-gray-300 cursor-pointer"
          title="Text Color"
        />

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300 mx-1" />

        {/* Font Size Selector */}
        <select 
          value={fontSize} 
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="px-2 py-1 text-xs rounded border border-gray-300 cursor-pointer bg-white hover:bg-gray-50 transition-colors"
          title="Font Size"
        >
          <option value="8">8px</option>
          <option value="10">10px</option>
          <option value="12">12px</option>
          <option value="14">14px</option>
          <option value="16">16px</option>
          <option value="18">18px</option>
          <option value="24">24px</option>
          <option value="32">32px</option>
          <option value="48">48px</option>
          <option value="64">64px</option>
          <option value="72">72px</option>
        </select>

        {/* Font Family Selector */}
        <select 
          value={fontFamily} 
          onChange={(e) => setFontFamily(e.target.value)}
          className="px-2 py-1 text-xs rounded border border-gray-300 cursor-pointer bg-white hover:bg-gray-50 transition-colors"
          title="Font Family"
          style={{ fontFamily: fontFamily }}
        >
          <option value="Arial" style={{ fontFamily: 'Arial' }}>Arial</option>
          <option value="Times New Roman" style={{ fontFamily: 'Times New Roman' }}>Times New Roman</option>
          <option value="Courier New" style={{ fontFamily: 'Courier New' }}>Courier New</option>
          <option value="Georgia" style={{ fontFamily: 'Georgia' }}>Georgia</option>
          <option value="Verdana" style={{ fontFamily: 'Verdana' }}>Verdana</option>
          <option value="Comic Sans MS" style={{ fontFamily: 'Comic Sans MS' }}>Comic Sans MS</option>
          <option value="Trebuchet MS" style={{ fontFamily: 'Trebuchet MS' }}>Trebuchet MS</option>
          <option value="Impact" style={{ fontFamily: 'Impact' }}>Impact</option>
        </select>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300 mx-1" />

        {/* Save/Cancel Buttons */}
        <button
          onClick={handleSave}
          className="px-2 py-1 rounded bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors"
          title="Save (Enter)"
        >
          ✓
        </button>
        <button
          onClick={onCancel}
          className="px-2 py-1 rounded bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors"
          title="Cancel (Escape)"
        >
          ✕
        </button>
      </div>

      {/* Text Input Area */}
      <div
        ref={textAreaRef}
        contentEditable
        onInput={handleTextChange}
        onKeyDown={handleKeyDown}
        className="bg-white border border-t-0 border-gray-300 rounded-b-lg shadow-lg px-3 py-2 min-w-[200px] max-w-[500px] outline-none"
        style={{
          font: fontStyle,
          color: color,
          textDecoration: textDecoration,
          minHeight: '40px',
          maxHeight: '300px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word'
        }}
        suppressContentEditableWarning
      >
        {initialText}
      </div>

      {/* Helper Text */}
      <div className="text-xs text-gray-500 mt-1 bg-white/90 px-2 py-1 rounded">
        Enter to save • Shift+Enter for new line • Esc to cancel
      </div>
    </div>
  );
};

export default TextEditor;

