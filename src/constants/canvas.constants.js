// Canvas dimensions and configuration
export const CANVAS_WIDTH = 5000;
export const CANVAS_HEIGHT = 5000;

// Initial view settings
export const INITIAL_ZOOM = 1;
export const INITIAL_X = CANVAS_WIDTH / 2;  // Center at (2500, 2500)
export const INITIAL_Y = CANVAS_HEIGHT / 2;

// Shape default sizes and properties (MVP - Rectangle only)
export const SHAPE_DEFAULTS = {
  rectangle: {
    minWidth: 2,         // Minimum 2px width
    minHeight: 1,        // Minimum 1px height  
    fill: '#808080'      // Fixed gray color for MVP
  }
};

// Post-MVP shape defaults
export const FUTURE_SHAPE_DEFAULTS = {
  text: {
    fontSize: 16,
    fontFamily: 'Arial, sans-serif',
    fill: '#808080',     // Fixed gray color for MVP
    minWidth: 20,        // Minimum text box width
    minHeight: 16        // Minimum text box height (1 line)
  },
  circle: {
    minRadius: 5,        // Minimum 5px radius
    fill: '#808080'      // Fixed gray color
  }
};

// Performance settings
export const CURSOR_UPDATE_THROTTLE = 50;   // 50ms for cursor updates
export const OBJECT_UPDATE_THROTTLE = 100;  // 100ms for object updates and resize operations
export const RESIZE_UPDATE_THROTTLE = 100;  // 100ms for real-time resize operations

// Canvas background colors
export const CANVAS_BACKGROUND = '#ffffff';
export const BOUNDARY_BACKGROUND = '#f0f0f0';

// Boundary validation
export const BOUNDARY_PADDING = 0; // No padding for MVP - shapes snap exactly to edges

// Shape types (MVP - Rectangle only)
export const SHAPE_TYPES = {
  RECTANGLE: 'rectangle'
};

// Post-MVP shape types
export const FUTURE_SHAPE_TYPES = {
  TEXT: 'text',           // Click-and-drag text boxes
  CIRCLE: 'circle'        // Click center, drag radius
};

// Firebase collections
export const FIREBASE_COLLECTIONS = {
  USERS: 'users',
  CANVAS_OBJECTS: 'canvasObjects',
  GLOBAL_CANVAS: 'globalCanvas'
};

// Realtime Database paths
export const REALTIME_PATHS = {
  GLOBAL_PRESENCE: '/globalCanvas/users'
};
