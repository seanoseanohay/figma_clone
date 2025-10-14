// Tool constants
export const TOOLS = {
  HAND: 'hand',
  ARROW: 'arrow', 
  RECTANGLE: 'rectangle'
};

// Tool configurations with icons and labels
const TOOL_CONFIG = {
  [TOOLS.HAND]: {
    icon: '🤚',
    label: 'Hand Tool (Pan)',
    cursor: 'grab'
  },
  [TOOLS.ARROW]: {
    icon: '⬆️',
    label: 'Arrow Tool (Select)',
    cursor: 'default'
  },
  [TOOLS.RECTANGLE]: {
    icon: '⬜',
    label: 'Rectangle Tool',
    cursor: 'crosshair'
  }
};

const Toolbar = ({ onToolChange, selectedTool = TOOLS.ARROW }) => {
  const handleToolSelect = (tool) => {
    onToolChange(tool);
  };

  return (
    <div className="bg-white border-b border-gray-300 shadow-sm">
      <div className="flex items-center space-x-1 px-4 py-2">
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
                {config.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Tool hint */}
      <div className="px-4 pb-2">
        <p className="text-xs text-gray-500">
          {TOOL_CONFIG[selectedTool]?.label || 'Select a tool'}
        </p>
      </div>
    </div>
  );
};

export default Toolbar;
