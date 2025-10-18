/**
 * Layout Constants
 * 
 * Defines the heights and positions of fixed UI elements
 * to maintain consistency across components and enable
 * proper canvas clipping.
 */

// Fixed header height at top of page
export const HEADER_HEIGHT = 90; // pixels

// Toolbar container height (includes padding and content)
export const TOOLBAR_HEIGHT = 80; // pixels (reduced from 110 to fix excessive spacing)

// Total offset from top of viewport to start of interactive canvas area
export const CANVAS_TOP_OFFSET = HEADER_HEIGHT + TOOLBAR_HEIGHT; // 170px (90 + 80)

// Z-index layers for stacking
export const Z_INDEX = {
  CANVAS: 10,
  CANVAS_OVERLAY: 25,      // Blocks interaction above canvas
  TOOLBAR: 30,
  HEADER: 40,
  MODAL: 50
};

