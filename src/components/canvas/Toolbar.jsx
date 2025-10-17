// Tool constants - 4 distinct tools for clean separation
export const TOOLS = {
  PAN: 'pan',
  MOVE: 'move', 
  RESIZE: 'resize',
  RECTANGLE: 'rectangle'
};

// Tool configurations with icons, labels, and cursors
const TOOL_CONFIG = {
  [TOOLS.PAN]: {
    icon: '🤚',
    label: 'Pan Tool (Navigate Canvas)',
    shortLabel: 'Pan',
    cursor: 'grab'
  },
  [TOOLS.MOVE]: {
    icon: '👆',
    label: 'Move Tool (Select & Move Objects)',
    shortLabel: 'Move',
    cursor: 'default'
  },
  [TOOLS.RESIZE]: {
    icon: '↔️',
    label: 'Resize Tool (Select & Resize Objects)',
    shortLabel: 'Resize',
    cursor: 'default'
  },
  [TOOLS.RECTANGLE]: {
    icon: '⬜',
    label: 'Rectangle Tool (Create Rectangles)',
    shortLabel: 'Rectangle',
    cursor: 'crosshair'
  }
};

const Toolbar = ({ onToolChange, selectedTool = TOOLS.MOVE }) => {
  const handleToolSelect = (tool) => {
    onToolChange(tool);
  };

  return (
    <div className="w-full flex justify-center" style={{ width: '100%' }}>
      <div className="bg-white shadow-lg rounded-lg" style={{ maxWidth: '800px', width: 'auto' }}>
        {/* Tool Icons and Invite Button */}
        <div className="flex items-center justify-center space-x-1 px-6 py-3">
          {/* Tool Buttons */}
          {Object.entries(TOOL_CONFIG).map(([toolKey, config]) => {
            const isSelected = selectedTool === toolKey;
            
            return (
              <button
                key={toolKey}
                onClick={() => handleToolSelect(toolKey)}
                style={{
                  backgroundColor: isSelected ? '#2563eb' : '#ffffff',
                  borderColor: isSelected ? '#1d4ed8' : '#d1d5db',
                  color: isSelected ? '#ffffff' : '#374151',
                  boxShadow: isSelected ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none'
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg border font-medium transition-all duration-150 hover:bg-blue-50"
                title={config.label}
              >
                <span className="text-lg" role="img" aria-label={config.label}>
                  {config.icon}
                </span>
                <span className="text-sm font-medium hidden sm:inline">
                  {config.shortLabel}
                </span>
              </button>
            );
          })}
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
