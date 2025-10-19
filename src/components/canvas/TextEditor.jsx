import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * TextEditor - Centered modal for text editing with professional UI
 * 
 * Features:
 * - Centered modal with overlay backdrop
 * - Clean, professional design with proper spacing
 * - Auto-focus text input with clear visual boundaries
 * - Responsive design that works on all screen sizes
 * - Keyboard shortcuts (Enter to save, Esc to cancel)
 */
const TextEditor = ({ 
  position,           // { x, y } canvas coordinates (used for positioning logic)
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
  const modalRef = useRef(null);

  // Auto-focus on mount
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
      // Place cursor at end of text
      const len = textAreaRef.current.value.length;
      textAreaRef.current.setSelectionRange(len, len);
    }
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  // Handle clicking outside modal to close
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onCancel();
    }
  };

  const handleSave = () => {
    const finalText = textAreaRef.current?.value || text;
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

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  // Build font style for preview
  const fontStyle = `${bold ? 'bold ' : ''}${italic ? 'italic ' : ''}${fontSize}px ${fontFamily}`;
  const textDecoration = underline ? 'underline' : 'none';

  // Create the modal content
  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      style={{ zIndex: 10000 }}
    >
      {/* Modal Container */}
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click when clicking inside modal
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {initialText ? '✏️ Edit Text' : '✏️ Add Text'}
            </h2>
            <button
              onClick={onCancel}
              className="text-white hover:text-blue-200 transition-colors p-1 rounded-md hover:bg-blue-800"
              title="Close (Esc)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Formatting Controls */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Text Formatting
            </label>
            <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg">
              {/* Bold/Italic/Underline */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBold(!bold)}
                  className={`px-3 py-1.5 rounded-md font-bold text-sm transition-all ${
                    bold 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                  title="Bold"
                >
                  B
                </button>
                <button
                  onClick={() => setItalic(!italic)}
                  className={`px-3 py-1.5 rounded-md italic text-sm transition-all ${
                    italic 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                  title="Italic"
                >
                  I
                </button>
                <button
                  onClick={() => setUnderline(!underline)}
                  className={`px-3 py-1.5 rounded-md underline text-sm transition-all ${
                    underline 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                  title="Underline"
                >
                  U
                </button>
              </div>

              {/* Font Size */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Size:</label>
                <select 
                  value={fontSize} 
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-200 rounded-md bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="12">12px</option>
                  <option value="14">14px</option>
                  <option value="16">16px</option>
                  <option value="18">18px</option>
                  <option value="24">24px</option>
                  <option value="32">32px</option>
                  <option value="40">40px</option>
                  <option value="48">48px</option>
                </select>
              </div>

              {/* Font Family */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Font:</label>
                <select 
                  value={fontFamily} 
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-200 rounded-md bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Courier New">Courier New</option>
                </select>
              </div>

              {/* Color */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Color:</label>
                <div className="relative">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-8 rounded-md border border-gray-200 cursor-pointer"
                    title="Text Color"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Text Input Area */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text Content
            </label>
            <textarea
              ref={textAreaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg resize-vertical focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 outline-none transition-all"
              style={{
                font: fontStyle,
                color: color,
                textDecoration: textDecoration,
                minHeight: '120px',
                maxHeight: '300px'
              }}
              placeholder="Type your text here..."
            />
            <p className="text-xs text-gray-500 mt-2">
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Ctrl+Enter</kbd> to save, 
              <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono ml-1">Esc</kbd> to cancel
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-20 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all shadow-sm"
            >
              {initialText ? 'Update Text' : 'Add Text'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render the modal using a portal to ensure it's rendered at the document body level
  return createPortal(modalContent, document.body);
};

export default TextEditor;