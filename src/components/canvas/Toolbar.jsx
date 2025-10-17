// Tool constants - separated by type for better organization
export const TOOLS = {
  PAN: 'pan',
  SELECT: 'select',
  MOVE: 'move', 
  RESIZE: 'resize',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle'
};

// Selection tools (navigation and selection)
const SELECTION_TOOLS = [TOOLS.PAN, TOOLS.SELECT];

// Modification tools (work on existing shapes)
const MODIFICATION_TOOLS = [TOOLS.MOVE, TOOLS.RESIZE];

// Shape tools (create new shapes)
const SHAPE_TOOLS = [TOOLS.RECTANGLE, TOOLS.CIRCLE];

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
  }
};

const Toolbar = ({ 
  onToolChange, 
  selectedTool = TOOLS.PAN, 
  hasSelection = false,
  selectedObject = null,
  cursorPosition = null,
  zoomLevel = 100
}) => {
  const handleToolSelect = (tool) => {
    onToolChange(tool);
  };

  // Format object properties for display
  const formatObjectProperties = (obj) => {
    if (!obj) return null;
    
    if (obj.type === 'rectangle') {
      const width = Math.round(obj.width);
      const height = Math.round(obj.height);
      const x = Math.round(obj.x);
      const y = Math.round(obj.y);
      return `Rectangle: ${width}×${height} at (${x}, ${y})`;
    } else if (obj.type === 'circle') {
      const radius = Math.round(obj.radius);
      const x = Math.round(obj.x);
      const y = Math.round(obj.y);
      return `Circle: r=${radius} at (${x}, ${y})`;
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
  const line1 = selectedObject 
    ? formatObjectProperties(selectedObject)
    : TOOL_CONFIG[selectedTool]?.label || 'Select a tool';

  // Build Line 2: Tool name (if object selected) • Cursor • Zoom
  const line2Parts = [];
  
  // Add tool name if object is selected (Option C)
  if (selectedObject) {
    line2Parts.push(TOOL_CONFIG[selectedTool]?.label || '');
  }
  
  // Add cursor position
  if (cursorPosition) {
    const x = Math.round(cursorPosition.x);
    const y = Math.round(cursorPosition.y);
    line2Parts.push(`Cursor: (${x}, ${y})`);
  }
  
  // Add zoom level
  line2Parts.push(`Zoom: ${Math.round(zoomLevel)}%`);
  
  const line2 = line2Parts.join(' • ');

  return (
    <div className="w-full flex justify-center" style={{ width: '100%' }}>
      <div className="bg-white shadow-lg rounded-lg" style={{ maxWidth: '900px', width: 'auto' }}>
        {/* Tool Icons separated into 3 sections */}
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
          {/* Line 1: Object properties or tool name */}
          <p className="text-xs font-medium text-gray-700">
            {line1}
          </p>
          
          {/* Line 2: Tool (if object selected) • Cursor • Zoom */}
          <p className="text-xs text-gray-500 mt-1">
            {line2}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
