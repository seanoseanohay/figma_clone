import { createTheme } from '@mui/material/styles';

/**
 * Material UI Theme Configuration
 * 
 * This theme replaces the Tailwind CSS configuration with MUI equivalents.
 * Color palette is based on the Tailwind default colors used throughout the app.
 */

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb', // blue-600
      light: '#3b82f6', // blue-500
      dark: '#1d4ed8', // blue-700
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6b7280', // gray-500
      light: '#9ca3af', // gray-400
      dark: '#4b5563', // gray-600
      contrastText: '#ffffff',
    },
    error: {
      main: '#ef4444', // red-500
      light: '#f87171', // red-400
      dark: '#dc2626', // red-600
      contrastText: '#ffffff',
    },
    warning: {
      main: '#f59e0b', // amber-500
      light: '#fbbf24', // amber-400
      dark: '#d97706', // amber-600
      contrastText: '#ffffff',
    },
    success: {
      main: '#10b981', // green-500
      light: '#34d399', // green-400
      dark: '#059669', // green-600
      contrastText: '#ffffff',
    },
    info: {
      main: '#06b6d4', // cyan-500
      light: '#22d3ee', // cyan-400
      dark: '#0891b2', // cyan-600
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5', // gray-100
      paper: '#ffffff',
    },
    text: {
      primary: '#111827', // gray-900
      secondary: '#6b7280', // gray-500
      disabled: '#9ca3af', // gray-400
    },
    divider: '#e5e7eb', // gray-200
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'Oxygen',
      'Ubuntu',
      'Cantarell',
      '"Fira Sans"',
      '"Droid Sans"',
      '"Helvetica Neue"',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.25rem', // text-4xl
      fontWeight: 800,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.875rem', // text-3xl
      fontWeight: 800,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: '1.5rem', // text-2xl
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.25rem', // text-xl
      fontWeight: 700,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem', // text-lg
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem', // text-base
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem', // text-base
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem', // text-sm
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem', // text-xs
      lineHeight: 1.4,
    },
    button: {
      textTransform: 'none', // Disable uppercase transformation
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8, // rounded-lg equivalent
  },
  spacing: 8, // Base spacing unit (8px)
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: '0.875rem',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
        elevation2: {
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
        elevation3: {
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 9999, // rounded-full
        },
      },
    },
  },
});

export default theme;

