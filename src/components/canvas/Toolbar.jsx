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
    label: 'Pan Tool (Navigate Canvas) - Hold Space',
    shortLabel: 'Pan',
    cursor: 'grab',
    shortcut: 'Space'
  },
  [TOOLS.SELECT]: {
    icon: '➡️',
    label: 'Select Tool (Select Objects) - Press V',
    shortLabel: 'Select',
    cursor: 'default',
    shortcut: 'V'
  },
  [TOOLS.MOVE]: {
    icon: '👆',
    label: 'Move Tool (Move Selected Objects) - Press M',
    shortLabel: 'Move',
    cursor: 'default',
    shortcut: 'M',
    requiresSelection: true
  },
  [TOOLS.RESIZE]: {
    icon: '↔️',
    label: 'Resize Tool (Resize Selected Objects) - Press R',
    shortLabel: 'Resize',
    cursor: 'default',
    shortcut: 'R',
    requiresSelection: true
  },
  [TOOLS.RECTANGLE]: {
    icon: '⬜',
    label: 'Rectangle Tool (Create Rectangles)',
    shortLabel: 'Rectangle',
    cursor: 'crosshair'
  },
  [TOOLS.CIRCLE]: {
    icon: '⭕',
    label: 'Circle Tool (Create Circles)',
    shortLabel: 'Circle',
    cursor: 'crosshair'
  }
};

const Toolbar = ({ onToolChange, selectedTool = TOOLS.PAN, hasSelection = false }) => {
  const handleToolSelect = (tool) => {
    onToolChange(tool);
  };

  const renderToolButton = (toolKey) => {
    const config = TOOL_CONFIG[toolKey];
    const isSelected = selectedTool === toolKey;
    const isDisabled = config.requiresSelection && !hasSelection;
    
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
        title={isDisabled ? 'Select an object first' : config.label}
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
        
        {/* Tool hint - centered within toolbar */}
        <div className="px-6 pb-3 text-center">
          <p className="text-xs text-gray-500">
            {TOOL_CONFIG[selectedTool]?.label || 'Select a tool'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
