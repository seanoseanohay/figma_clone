import { useState, useRef, useEffect } from 'react';
import { SketchPicker } from 'react-color';

// Tool constants - separated by type for better organization
export const TOOLS = {
  PAN: 'pan',
  SELECT: 'select',
  MOVE: 'move', 
  RESIZE: 'resize',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  STAR: 'star'
};

// Selection tools (navigation and selection)
const SELECTION_TOOLS = [TOOLS.PAN, TOOLS.SELECT];

// Modification tools (work on existing shapes)
const MODIFICATION_TOOLS = [TOOLS.MOVE, TOOLS.RESIZE];

// Shape tools (create new shapes)
const SHAPE_TOOLS = [TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.STAR];

/**
 * ColorSquare - Inline colored square that opens color picker
 * Replaces text-based color display with a visual indicator
 */
const ColorSquare = ({ color, onChange, disabled = false }) => {
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
    <span className="relative inline-flex items-center" ref={pickerRef}>
      {/* Colored Square Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setShowPicker(!showPicker);
        }}
        disabled={disabled}
        className={`
          w-5 h-5 rounded border-2 border-gray-600 shadow-sm
          transition-all duration-150
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-gray-800 cursor-pointer'}
        `}
        style={{ backgroundColor: color }}
        title={`Color: ${color.toUpperCase()} - Click to change`}
      />

      {/* Color Picker Popover */}
      {showPicker && (
        <div 
          className="absolute z-50"
          style={{ 
            top: '100%', 
            left: '50%', 
            transform: 'translateX(-50%)',
            marginTop: '8px'
          }}
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
    </span>
  );
};

// Tool configurations with icons, labels, and cursors
const TOOL_CONFIG = {
  [TOOLS.PAN]: {
    icon: '🤚',
    label: 'Pan Tool',
    shortLabel: 'Pan',
    cursor: 'grab',
    shortcut: 'Hold Space'
  },
  [TOOLS.SELECT]: {
    icon: '➡️',
    label: 'Select Tool',
    shortLabel: 'Select',
    cursor: 'default',
    shortcut: 'Press V'
  },
  [TOOLS.MOVE]: {
    icon: '👆',
    label: 'Move Tool',
    shortLabel: 'Move',
    cursor: 'default',
    shortcut: 'Press M',
    requiresSelection: true
  },
  [TOOLS.RESIZE]: {
    icon: '↔️',
    label: 'Resize Tool',
    shortLabel: 'Resize',
    cursor: 'default',
    shortcut: 'Press R',
    requiresSelection: true
  },
  [TOOLS.RECTANGLE]: {
    icon: '⬜',
    label: 'Rectangle Tool',
    shortLabel: 'Rectangle',
    cursor: 'crosshair',
    shortcut: ''
  },
  [TOOLS.CIRCLE]: {
    icon: '⭕',
    label: 'Circle Tool',
    shortLabel: 'Circle',
    cursor: 'crosshair',
    shortcut: ''
  },
  [TOOLS.STAR]: {
    icon: '⭐',
    label: 'Star Tool',
    shortLabel: 'Star',
    cursor: 'crosshair',
    shortcut: ''
  }
};

const Toolbar = ({ 
  onToolChange, 
  selectedTool = TOOLS.PAN, 
  hasSelection = false,
  selectedObject = null,
  cursorPosition = null,
  zoomLevel = 100,
  selectedColor = '#808080',
  onColorChange = () => {},
  onZIndexChange = () => {}
}) => {
  const handleToolSelect = (tool) => {
    onToolChange(tool);
  };

  const handleBringToFront = () => {
    if (hasSelection && selectedObject) {
      onZIndexChange('front');
    }
  };

  const handleSendToBack = () => {
    if (hasSelection && selectedObject) {
      onZIndexChange('back');
    }
  };

  const handleMoveForward = () => {
    if (hasSelection && selectedObject) {
      onZIndexChange('forward');
    }
  };

  const handleMoveBackward = () => {
    if (hasSelection && selectedObject) {
      onZIndexChange('backward');
    }
  };

  // Format numbers with commas as thousands separators
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(Math.round(num));
  };

  // Format object properties for display (without color - color shown via ColorSquare)
  const formatObjectProperties = (obj) => {
    if (!obj) return null;
    
    const x = formatNumber(obj.x);
    const y = formatNumber(obj.y);
    const zIndex = obj.zIndex !== undefined ? obj.zIndex : 0;
    const rotation = obj.rotation ? Math.round(obj.rotation) : 0;
    
    if (obj.type === 'rectangle') {
      const width = formatNumber(obj.width);
      const height = formatNumber(obj.height);
      return `Rectangle: ${width}×${height} at (${x}, ${y}, ${zIndex}) • ${rotation}°`;
    } else if (obj.type === 'circle') {
      const radius = formatNumber(obj.radius);
      return `Circle: r=${radius} at (${x}, ${y}, ${zIndex}) • ${rotation}°`;
    } else if (obj.type === 'star') {
      const numPoints = obj.numPoints || 5;
      return `Star: ${numPoints} points at (${x}, ${y}, ${zIndex}) • ${rotation}°`;
    }
    
    return null;
  };

  const renderToolButton = (toolKey) => {
    const config = TOOL_CONFIG[toolKey];
    const isSelected = selectedTool === toolKey;
    const isDisabled = config.requiresSelection && !hasSelection;
    
    // Build tooltip text with hotkey
    const tooltipText = isDisabled 
      ? 'Select an object first' 
      : config.shortcut 
        ? `${config.label} (${config.shortcut})`
        : config.label;
    
    return (
      <button
        key={toolKey}
        onClick={() => !isDisabled && handleToolSelect(toolKey)}
        disabled={isDisabled}
        style={{
          backgroundColor: isSelected ? '#2563eb' : '#ffffff',
          borderColor: isSelected ? '#1d4ed8' : '#d1d5db',
          color: isSelected ? '#ffffff' : '#374151',
          boxShadow: isSelected ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none',
          opacity: isDisabled ? 0.4 : 1,
          cursor: isDisabled ? 'not-allowed' : 'pointer'
        }}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg border font-medium transition-all duration-150 hover:bg-blue-50 disabled:hover:bg-white"
        title={tooltipText}
        aria-disabled={isDisabled}
      >
        <span className="text-lg" role="img" aria-label={config.label}>
          {config.icon}
        </span>
        <span className="text-sm font-medium hidden sm:inline">
          {config.shortLabel}
        </span>
      </button>
    );
  };

  // Build Line 1: Object properties or tool name
  const line1Text = selectedObject 
    ? formatObjectProperties(selectedObject)
    : TOOL_CONFIG[selectedTool]?.label || 'Select a tool';

  // Build Line 2: Tool name (if object selected) • Cursor • Zoom • Color (if creating)
  const line2Parts = [];
  
  // Add tool name if object is selected (Option C)
  if (selectedObject) {
    line2Parts.push(TOOL_CONFIG[selectedTool]?.label || '');
  }
  
  // Add cursor position (with formatted numbers)
  if (cursorPosition) {
    const x = formatNumber(cursorPosition.x);
    const y = formatNumber(cursorPosition.y);
    line2Parts.push(`Cursor: (${x}, ${y})`);
  }
  
  // Add zoom level
  line2Parts.push(`Zoom: ${Math.round(zoomLevel)}%`);
  
  const line2Text = line2Parts.join(' • ');

  // Determine if we should show color (when object selected OR drawing tool active)
  const showColor = hasSelection || SHAPE_TOOLS.includes(selectedTool);

  return (
    <div className="w-full flex justify-center" style={{ width: '100%' }}>
      <div className="bg-white shadow-lg rounded-lg" style={{ maxWidth: '900px', width: 'auto' }}>
        {/* Tool Icons and Color Picker */}
        <div className="flex items-center justify-center px-6 py-3">
          {/* Selection Tools (Left) */}
          <div className="flex items-center space-x-1">
            {SELECTION_TOOLS.map(toolKey => renderToolButton(toolKey))}
          </div>
          
          {/* Vertical Divider */}
          <div className="mx-4 h-10 border-l-2 border-gray-300"></div>
          
          {/* Modification Tools (Middle) */}
          <div className="flex items-center space-x-1">
            {MODIFICATION_TOOLS.map(toolKey => renderToolButton(toolKey))}
            
            {/* Z-Index Controls (inline with modification tools, only show when object is selected) */}
            {hasSelection && (
              <>
                {/* Mini divider */}
                <div className="mx-2 h-6 border-l border-gray-300"></div>
                
                <button
                  onClick={handleBringToFront}
                  className="flex items-center px-2 py-2 rounded-lg border border-gray-300 font-medium transition-all duration-150 hover:bg-blue-50"
                  title="Bring to Front (Ctrl+Shift+])"
                >
                  <span className="text-base">⬆️</span>
                </button>
                <button
                  onClick={handleMoveForward}
                  className="flex items-center px-2 py-2 rounded-lg border border-gray-300 font-medium transition-all duration-150 hover:bg-blue-50"
                  title="Move Forward (Ctrl+])"
                >
                  <span className="text-base">🔼</span>
                </button>
                <button
                  onClick={handleMoveBackward}
                  className="flex items-center px-2 py-2 rounded-lg border border-gray-300 font-medium transition-all duration-150 hover:bg-blue-50"
                  title="Move Backward (Ctrl+[)"
                >
                  <span className="text-base">🔽</span>
                </button>
                <button
                  onClick={handleSendToBack}
                  className="flex items-center px-2 py-2 rounded-lg border border-gray-300 font-medium transition-all duration-150 hover:bg-blue-50"
                  title="Send to Back (Ctrl+Shift+[)"
                >
                  <span className="text-base">⬇️</span>
                </button>
              </>
            )}
          </div>
          
          {/* Vertical Divider */}
          <div className="mx-4 h-10 border-l-2 border-gray-300"></div>
          
          {/* Shape Tools (Right) */}
          <div className="flex items-center space-x-1">
            {SHAPE_TOOLS.map(toolKey => renderToolButton(toolKey))}
          </div>
        </div>
        
        {/* Two-line description area with object properties and canvas info */}
        <div className="px-6 pb-3 text-center">
          {/* Line 1: Object properties or tool name with color square */}
          <p className="text-xs font-medium text-gray-700 flex items-center justify-center gap-2">
            <span>{line1Text}</span>
            {selectedObject && showColor && (
              <>
                <span>•</span>
                <ColorSquare 
                  color={selectedColor}
                  onChange={onColorChange}
                />
              </>
            )}
          </p>
          
          {/* Line 2: Tool (if object selected) • Cursor • Zoom • Color (if creating) */}
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-2">
            <span>{line2Text}</span>
            {!selectedObject && showColor && (
              <>
                <span>•</span>
                <ColorSquare 
                  color={selectedColor}
                  onChange={onColorChange}
                />
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
