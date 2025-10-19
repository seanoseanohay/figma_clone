import { useState, useRef, useEffect } from 'react';
import { Box, Paper, Button, ButtonGroup, Divider, TextField, Typography, Popover } from '@mui/material';
import { SketchPicker } from 'react-color';
import ShapeToolDropdown from './ShapeToolDropdown';

// Tool constants - separated by type for better organization
export const TOOLS = {
  PAN: 'pan',
  SELECT: 'select',
  DELETE: 'delete',
  MOVE: 'move', 
  RESIZE: 'resize',
  ROTATE: 'rotate',
  TEXT: 'text',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  STAR: 'star'
};

// Selection tools (navigation and selection)
const SELECTION_TOOLS = [TOOLS.PAN, TOOLS.SELECT, TOOLS.DELETE];

// Modification tools (work on existing shapes)
const MODIFICATION_TOOLS = [TOOLS.MOVE, TOOLS.RESIZE, TOOLS.ROTATE];

// Shape tools (create new shapes) - Text kept separate, geometric shapes in dropdown
const SHAPE_TOOLS = [TOOLS.TEXT];
const GEOMETRIC_SHAPES = [TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.STAR];

/**
 * ColorSquare - Inline colored square that opens color picker
 * Replaces text-based color display with a visual indicator
 */
const ColorSquare = ({ color, onChange, disabled = false }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChangeComplete = (newColor) => {
    onChange(newColor.hex);
  };

  const open = Boolean(anchorEl);

  return (
    <Box component="span" sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <Box
        onClick={handleClick}
        sx={{
          width: 20,
          height: 20,
          borderRadius: 0.5,
          border: 2,
          borderColor: 'grey.600',
          bgcolor: color,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          transition: 'all 0.15s',
          '&:hover': !disabled && {
            borderColor: 'grey.800',
          },
        }}
        title={`Color: ${color.toUpperCase()} - Click to change`}
      />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        sx={{ mt: 1 }}
      >
        <Box sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <SketchPicker
            color={color}
            onChangeComplete={handleChangeComplete}
            disableAlpha={true}
          />
        </Box>
      </Popover>
    </Box>
  );
};

// Tool configurations with icons, labels, and cursors
const TOOL_CONFIG = {
  [TOOLS.PAN]: {
    icon: '🤚',
    label: 'Pan Tool',
    cursor: 'grab',
    shortcut: 'Hold Space'
  },
  [TOOLS.SELECT]: {
    icon: '↖',
    label: 'Select Tool',
    cursor: 'default',
    shortcut: 'Press V'
  },
  [TOOLS.DELETE]: {
    icon: '🗑️',
    label: 'Delete Tool',
    cursor: 'pointer',
    shortcut: 'Press D'
  },
  [TOOLS.MOVE]: {
    icon: '✥',
    label: 'Move Tool',
    cursor: 'default',
    shortcut: 'Press M'
  },
  [TOOLS.RESIZE]: {
    icon: '⤡',
    label: 'Resize Tool',
    cursor: 'default',
    shortcut: 'Press R'
  },
  [TOOLS.ROTATE]: {
    icon: '🔄',
    label: 'Rotate Tool',
    shortLabel: 'Rotate',
    cursor: 'default',
    shortcut: 'Press T'
  },
  [TOOLS.TEXT]: {
    icon: '📝',
    label: 'Text Tool',
    shortLabel: 'Text',
    cursor: 'text',
    shortcut: ''
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
  multiSelection = null, // Multi-selection info: { count, isSingle, isMulti, isEmpty, selectedIds, etc. }
  cursorPosition = null,
  zoomLevel = 100,
  selectedColor = '#808080',
  onColorChange = () => {},
  onZIndexChange = () => {},
  onRotationChange = () => {},
  onDeleteObject = null,
  onUndo = null,
  onRedo = null,
  canUndo = false,
  canRedo = false,
  undoDescription = null,
  redoDescription = null
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

  const handleDeleteObject = () => {
    if (hasSelection && selectedObject) {
      if (onDeleteObject) {
        onDeleteObject(selectedObject.id);
      }
    }
  };

  // Format numbers with commas as thousands separators
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(Math.round(num));
  };

  // Format object properties for display
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
    } else if (obj.type === 'text') {
      const textPreview = (obj.text || 'Text').substring(0, 20);
      const displayText = obj.text && obj.text.length > 20 ? `${textPreview}...` : textPreview;
      const fontSize = obj.fontSize || 24;
      const fontFamily = obj.fontFamily || 'Arial';
      
      const formatting = [];
      if (obj.bold) formatting.push('B');
      if (obj.italic) formatting.push('I');
      if (obj.underline) formatting.push('U');
      const formatStr = formatting.length > 0 ? ` [${formatting.join('')}]` : '';
      
      return `Text: "${displayText}" • ${fontSize}px ${fontFamily}${formatStr} at (${x}, ${y}, ${zIndex}) • ${rotation}°`;
    }
    
    return null;
  };

  // Format multi-selection properties for display
  const formatMultiSelectionProperties = (selection) => {
    if (!selection || selection.isEmpty) return null;
    
    if (selection.isSingle) {
      // Single selection - use existing format
      return selectedObject ? formatObjectProperties(selectedObject) : null;
    }
    
    // Multi-selection format
    const count = selection.count;
    return `${count} objects selected`;
  };

  const renderToolButton = (toolKey) => {
    const config = TOOL_CONFIG[toolKey];
    const isSelected = selectedTool === toolKey;
    const isDisabled = config.requiresSelection && !hasSelection;
    
    const tooltipText = isDisabled 
      ? 'Select an object first' 
      : config.shortcut 
        ? `${config.label} (${config.shortcut})`
        : config.label;
    
    return (
      <Button
        key={toolKey}
        onClick={() => !isDisabled && handleToolSelect(toolKey)}
        disabled={isDisabled}
        variant={isSelected ? 'contained' : 'outlined'}
        size="small"
        title={tooltipText}
        sx={{
          minWidth: 32,
          width: 32,
          height: 32,
          px: 0.5,
          py: 0.5,
          fontSize: '1.125rem',
        }}
      >
        <Box component="span" role="img" aria-label={config.label}>
          {config.icon}
        </Box>
      </Button>
    );
  };

  // Build Line 1: Selection properties or tool name
  const line1Text = multiSelection && !multiSelection.isEmpty
    ? formatMultiSelectionProperties(multiSelection)
    : TOOL_CONFIG[selectedTool]?.label || 'Select a tool';

  // Build Line 2: Tool name (if object selected) • Cursor • Zoom
  const line2Parts = [];
  
  const hasAnySelection = (multiSelection && !multiSelection.isEmpty) || selectedObject;
  if (hasAnySelection) {
    line2Parts.push(TOOL_CONFIG[selectedTool]?.label || '');
  }
  
  if (cursorPosition) {
    const x = formatNumber(cursorPosition.x);
    const y = formatNumber(cursorPosition.y);
    line2Parts.push(`Cursor: (${x}, ${y})`);
  }
  
  line2Parts.push(`Zoom: ${Math.round(zoomLevel)}%`);
  
  const line2Text = line2Parts.join(' • ');

  const showColor = hasAnySelection || SHAPE_TOOLS.includes(selectedTool) || GEOMETRIC_SHAPES.includes(selectedTool);

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ maxWidth: 900, width: 'auto' }}>
        {/* Tool Icons and Controls - Figma-Compact Spacing */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1.5, py: 0.75, gap: 0.75 }}>
          {/* Selection Tools */}
          <ButtonGroup size="small" variant="outlined">
            {SELECTION_TOOLS.map(toolKey => renderToolButton(toolKey))}
          </ButtonGroup>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          
          {/* Modification Tools */}
          <ButtonGroup size="small" variant="outlined">
            {MODIFICATION_TOOLS.map(toolKey => renderToolButton(toolKey))}
          </ButtonGroup>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          
          {/* Undo/Redo Controls */}
          <ButtonGroup size="small" variant="outlined">
            <Button
              onClick={onUndo}
              disabled={!canUndo}
              title={undoDescription ? `${undoDescription} (Ctrl+Z)` : 'Nothing to undo (Ctrl+Z)'}
              sx={{ minWidth: 32, width: 32, height: 32, px: 0.5, py: 0.5 }}
            >
              ↶
            </Button>
            <Button
              onClick={onRedo}
              disabled={!canRedo}
              title={redoDescription ? `${redoDescription} (Ctrl+Y)` : 'Nothing to redo (Ctrl+Y)'}
              sx={{ minWidth: 32, width: 32, height: 32, px: 0.5, py: 0.5 }}
            >
              ↷
            </Button>
          </ButtonGroup>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          
          {/* Creation Tools */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Text Tool */}
            <ButtonGroup size="small" variant="outlined">
              {SHAPE_TOOLS.map(toolKey => renderToolButton(toolKey))}
            </ButtonGroup>
            
            {/* Shape Tool Dropdown */}
            <ShapeToolDropdown
              selectedTool={selectedTool}
              onToolChange={onToolChange}
              selectedColor={selectedColor}
            />
          </Box>
        </Box>
        
        {/* Description Area - Figma-Compact Spacing */}
        <Box sx={{ px: 1.5, pb: 0.5, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.25 }}>
            <Typography variant="caption" fontWeight={500} color="grey.700">
              {line1Text}
            </Typography>
            {hasAnySelection && showColor && (
              <>
                <Typography variant="caption" color="grey.500">•</Typography>
                <ColorSquare color={selectedColor} onChange={onColorChange} />
              </>
            )}
            {hasAnySelection && (
              <>
                <Typography variant="caption" color="grey.500">•</Typography>
                <ButtonGroup size="small" variant="outlined" sx={{ height: 20 }}>
                  <Button 
                    onClick={handleBringToFront} 
                    title="Bring to Front (Ctrl+Shift+])"
                    sx={{ minWidth: 20, width: 20, height: 20, px: 0.25, py: 0, fontSize: '0.75rem' }}
                  >
                    ⬆️
                  </Button>
                  <Button 
                    onClick={handleMoveForward} 
                    title="Move Forward (Ctrl+])"
                    sx={{ minWidth: 20, width: 20, height: 20, px: 0.25, py: 0, fontSize: '0.75rem' }}
                  >
                    🔼
                  </Button>
                  <Button 
                    onClick={handleMoveBackward} 
                    title="Move Backward (Ctrl+[)"
                    sx={{ minWidth: 20, width: 20, height: 20, px: 0.25, py: 0, fontSize: '0.75rem' }}
                  >
                    🔽
                  </Button>
                  <Button 
                    onClick={handleSendToBack} 
                    title="Send to Back (Ctrl+Shift+[)"
                    sx={{ minWidth: 20, width: 20, height: 20, px: 0.25, py: 0, fontSize: '0.75rem' }}
                  >
                    ⬇️
                  </Button>
                </ButtonGroup>
              </>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <Typography variant="caption" color="grey.500">
              {line2Text}
            </Typography>
            {!hasAnySelection && showColor && (
              <>
                <Typography variant="caption" color="grey.500">•</Typography>
                <ColorSquare color={selectedColor} onChange={onColorChange} />
              </>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Toolbar;
