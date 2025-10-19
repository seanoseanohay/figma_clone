import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Divider,
  Paper,
  Fade,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  Palette as PaletteIcon,
  TextFields as TextFieldsIcon
} from '@mui/icons-material';

/**
 * TextEditor - Professional Material-UI modal for text editing
 * 
 * Features:
 * - Material-UI Dialog with proper focus management
 * - Professional design system integration
 * - Responsive layout with consistent spacing
 * - Accessible form controls with proper labeling
 * - Smooth animations and transitions
 * - Keyboard shortcuts (Ctrl+Enter to save, Esc to cancel)
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
  const [open, setOpen] = useState(true);
  const [text, setText] = useState(initialText);
  const [formatting, setFormatting] = useState([]);
  const [fontSize, setFontSize] = useState(initialFormatting.fontSize || 24);
  const [fontFamily, setFontFamily] = useState(initialFormatting.fontFamily || 'Arial');
  const [color, setColor] = useState(initialFormatting.fill || '#000000');
  
  const textFieldRef = useRef(null);

  // Initialize formatting toggles
  useEffect(() => {
    const activeFormatting = [];
    if (initialFormatting.bold) activeFormatting.push('bold');
    if (initialFormatting.italic) activeFormatting.push('italic');
    if (initialFormatting.underline) activeFormatting.push('underline');
    setFormatting(activeFormatting);
  }, [initialFormatting]);

  // Auto-focus text input when modal opens
  useEffect(() => {
    const timer = setTimeout(() => {
      if (textFieldRef.current) {
        textFieldRef.current.focus();
        // Select all text for editing
        textFieldRef.current.select();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Small delay to allow animation to complete
    setTimeout(onCancel, 200);
  };

  const handleSave = () => {
    if (text.trim()) {
      onSave(text, {
        bold: formatting.includes('bold'),
        italic: formatting.includes('italic'),
        underline: formatting.includes('underline'),
        fontSize,
        fontFamily,
        fill: color
      });
    } else {
      handleClose();
    }
  };

  const handleFormattingChange = (event, newFormatting) => {
    setFormatting(newFormatting);
  };

  // Build preview style
  const previewStyle = {
    fontWeight: formatting.includes('bold') ? 'bold' : 'normal',
    fontStyle: formatting.includes('italic') ? 'italic' : 'normal',
    textDecoration: formatting.includes('underline') ? 'underline' : 'none',
    fontSize: `${fontSize}px`,
    fontFamily: fontFamily,
    color: color,
    lineHeight: 1.2
  };

  const fontSizeOptions = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64];
  const fontFamilyOptions = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Verdana',
    'Courier New',
    'Impact',
    'Comic Sans MS'
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 300 }}
      PaperProps={{
        elevation: 8,
        sx: {
          borderRadius: 3,
          minHeight: 400,
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: (theme) => 
            `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          py: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextFieldsIcon />
          <Typography variant="h6" component="div">
            {initialText ? 'Edit Text' : 'Add Text'}
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Text Formatting Section */}
        <Paper 
          elevation={1} 
          sx={{ 
            p: 2.5, 
            mb: 3,
            backgroundColor: (theme) => theme.palette.grey[50],
            border: 1,
            borderColor: 'divider',
            borderRadius: 2
          }}
        >
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Text Formatting
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Bold, Italic, Underline Toggle Buttons */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Style
              </Typography>
              <ToggleButtonGroup
                value={formatting}
                onChange={handleFormattingChange}
                size="small"
                sx={{ 
                  '& .MuiToggleButton-root': {
                    borderRadius: 1,
                    px: 2,
                    py: 1,
                  }
                }}
              >
                <ToggleButton value="bold" aria-label="bold">
                  <BoldIcon fontSize="small" />
                  <Typography variant="body2" sx={{ ml: 0.5, fontWeight: 'bold' }}>
                    Bold
                  </Typography>
                </ToggleButton>
                <ToggleButton value="italic" aria-label="italic">
                  <ItalicIcon fontSize="small" />
                  <Typography variant="body2" sx={{ ml: 0.5, fontStyle: 'italic' }}>
                    Italic
                  </Typography>
                </ToggleButton>
                <ToggleButton value="underline" aria-label="underline">
                  <UnderlineIcon fontSize="small" />
                  <Typography variant="body2" sx={{ ml: 0.5, textDecoration: 'underline' }}>
                    Underline
                  </Typography>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Font Size and Family Row */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Size</InputLabel>
                <Select
                  value={fontSize}
                  label="Size"
                  onChange={(e) => setFontSize(e.target.value)}
                >
                  {fontSizeOptions.map((size) => (
                    <MenuItem key={size} value={size}>
                      {size}px
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Font</InputLabel>
                <Select
                  value={fontFamily}
                  label="Font"
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  {fontFamilyOptions.map((font) => (
                    <MenuItem key={font} value={font} sx={{ fontFamily: font }}>
                      {font}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Color:
                </Typography>
                <Box
                  component="input"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  sx={{
                    width: 40,
                    height: 32,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'primary.main',
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Text Input */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1.5 }}>
            Text Content
          </Typography>
          <TextField
            inputRef={textFieldRef}
            fullWidth
            multiline
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your text here..."
            variant="outlined"
            InputProps={{
              sx: {
                ...previewStyle,
                lineHeight: 1.4,
                '& textarea': {
                  resize: 'vertical',
                },
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                },
              },
            }}
          />
        </Box>

        {/* Preview */}
        {text && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
              Preview
            </Typography>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                backgroundColor: (theme) => theme.palette.grey[50],
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                minHeight: 60,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Typography style={previewStyle}>
                {text || 'Your text will appear here...'}
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Keyboard Shortcuts */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Keyboard shortcuts: 
            <Chip label="Ctrl+Enter" size="small" sx={{ mx: 0.5, height: 18 }} /> to save,
            <Chip label="Esc" size="small" sx={{ mx: 0.5, height: 18 }} /> to cancel
          </Typography>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          color="inherit"
          sx={{ minWidth: 100 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!text.trim()}
          sx={{ 
            minWidth: 100,
            background: (theme) => 
              `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          }}
        >
          {initialText ? 'Update Text' : 'Add Text'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TextEditor;