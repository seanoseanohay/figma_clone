import { useState } from 'react';
import { Box, Button, Menu, MenuItem, ButtonGroup } from '@mui/material';
import { TOOLS } from './Toolbar';

/**
 * ShapeToolDropdown - Consolidated shape tool selector
 * Shows last-used shape on button face, dropdown to select others
 */
const ShapeToolDropdown = ({ 
  selectedTool, 
  onToolChange, 
  selectedColor 
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [lastUsedShape, setLastUsedShape] = useState(TOOLS.RECTANGLE);

  const shapeTools = [
    { 
      id: TOOLS.RECTANGLE, 
      icon: '⬜', 
      label: 'Rectangle',
      shortcut: 'Press R' 
    },
    { 
      id: TOOLS.CIRCLE, 
      icon: '⭕', 
      label: 'Circle',
      shortcut: 'Press C' 
    },
    { 
      id: TOOLS.STAR, 
      icon: '⭐', 
      label: 'Star',
      shortcut: 'Press S' 
    }
  ];

  // Determine which shape to show on button face
  const displayShape = shapeTools.find(
    tool => tool.id === selectedTool && [TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.STAR].includes(selectedTool)
  ) || shapeTools.find(tool => tool.id === lastUsedShape) || shapeTools[0];

  const handleButtonClick = () => {
    // Clicking the main button activates the displayed shape
    if (selectedTool !== displayShape.id) {
      onToolChange(displayShape.id);
      setLastUsedShape(displayShape.id);
    }
  };

  const handleDropdownClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleShapeSelect = (shapeId) => {
    onToolChange(shapeId);
    setLastUsedShape(shapeId);
    handleClose();
  };

  const open = Boolean(anchorEl);
  const isShapeToolSelected = [TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.STAR].includes(selectedTool);

  return (
    <>
      <ButtonGroup size="small" variant="outlined">
        {/* Main button - shows last used shape */}
        <Button
          onClick={handleButtonClick}
          variant={isShapeToolSelected ? 'contained' : 'outlined'}
          title={`${displayShape.label} Tool${displayShape.shortcut ? ` (${displayShape.shortcut})` : ''}`}
          sx={{
            minWidth: 'auto',
            px: 1.5,
            py: 1,
            fontSize: '1.25rem',
          }}
        >
          <Box component="span" role="img" aria-label={displayShape.label}>
            {displayShape.icon}
          </Box>
        </Button>

        {/* Dropdown arrow button */}
        <Button
          onClick={handleDropdownClick}
          variant={isShapeToolSelected ? 'contained' : 'outlined'}
          title="Choose shape tool"
          sx={{
            minWidth: 'auto',
            px: 0.5,
            py: 1,
            borderLeft: '1px solid',
            borderLeftColor: 'divider',
          }}
        >
          <Box component="span" sx={{ fontSize: '0.75rem' }}>
            ▼
          </Box>
        </Button>
      </ButtonGroup>

      {/* Dropdown menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{ mt: 1 }}
      >
        {shapeTools.map((shape) => (
          <MenuItem
            key={shape.id}
            onClick={() => handleShapeSelect(shape.id)}
            selected={selectedTool === shape.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              minWidth: 180,
            }}
          >
            <Box component="span" sx={{ fontSize: '1.25rem' }} role="img" aria-label={shape.label}>
              {shape.icon}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                {shape.label}
              </Box>
              {shape.shortcut && (
                <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  {shape.shortcut}
                </Box>
              )}
            </Box>
            {selectedTool === shape.id && (
              <Box component="span" sx={{ color: 'primary.main', fontSize: '0.875rem' }}>
                ✓
              </Box>
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ShapeToolDropdown;

