// Canvas dimensions and configuration
export const CANVAS_WIDTH = 5000;
export const CANVAS_HEIGHT = 5000;

// Initial view settings
export const INITIAL_ZOOM = 1;
export const INITIAL_X = CANVAS_WIDTH / 2;  // Center at (2500, 2500)
export const INITIAL_Y = CANVAS_HEIGHT / 2;

// Shape default sizes and properties
export const SHAPE_DEFAULTS = {
  rectangle: {
    width: 200,
    height: 100,
    fill: '#808080'  // Fixed gray color for MVP
  },
  circle: {
    radius: 50,      // 100px diameter
    fill: '#808080'  // Fixed gray color for MVP
  },
  text: {
    fontSize: 16,
    fontFamily: 'Arial, sans-serif',
    fill: '#808080'  // Fixed gray color for MVP
  }
};

// Performance settings
export const CURSOR_UPDATE_THROTTLE = 50; // 50ms for cursor updates
export const OBJECT_UPDATE_THROTTLE = 100; // 100ms for object updates

// Canvas background colors
export const CANVAS_BACKGROUND = '#ffffff';
export const BOUNDARY_BACKGROUND = '#f0f0f0';

// Boundary validation
export const BOUNDARY_PADDING = 0; // No padding for MVP - shapes snap exactly to edges

// Shape types
export const SHAPE_TYPES = {
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  TEXT: 'text'
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
