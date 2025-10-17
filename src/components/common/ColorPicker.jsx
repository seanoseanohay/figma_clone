import { useState, useRef, useEffect } from 'react';
import { SketchPicker } from 'react-color';

/**
 * ColorPicker Component
 * 
 * Displays a color swatch that opens a color picker popover when clicked
 * Used for selecting fill colors for shapes
 */
const ColorPicker = ({ color, onChange, disabled = false }) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  const handleChangeComplete = (newColor) => {
    onChange(newColor.hex);
  };

  return (
    <div className="relative" ref={pickerRef}>
      {/* Color Swatch Button */}
      <button
        onClick={() => !disabled && setShowPicker(!showPicker)}
        disabled={disabled}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-300
          transition-all duration-150
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}
        `}
        title="Change color"
      >
        <div 
          className="w-6 h-6 rounded border-2 border-gray-400 shadow-sm"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-medium text-gray-700 hidden sm:inline">
          {color.toUpperCase()}
        </span>
      </button>

      {/* Color Picker Popover */}
      {showPicker && (
        <div 
          className="absolute z-50 mt-2"
          style={{ top: '100%', left: 0 }}
        >
          <div className="shadow-2xl rounded-lg overflow-hidden">
            <SketchPicker
              color={color}
              onChangeComplete={handleChangeComplete}
              disableAlpha={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;

