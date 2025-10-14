import { describe, it, expect } from 'vitest'

// These are the utility functions we'd extract from Canvas component for testing
const CANVAS_WIDTH = 5000
const CANVAS_HEIGHT = 5000

// Boundary enforcement function
const clampRectToCanvas = (rect) => {
  return {
    ...rect,
    x: Math.max(0, Math.min(rect.x, CANVAS_WIDTH - rect.width)),
    y: Math.max(0, Math.min(rect.y, CANVAS_HEIGHT - rect.height)),
    width: Math.min(rect.width, CANVAS_WIDTH - Math.max(0, rect.x)),
    height: Math.min(rect.height, CANVAS_HEIGHT - Math.max(0, rect.y))
  }
}

// Point in rectangle check
const isPointInRect = (point, rect) => {
  return point.x >= rect.x && 
         point.x <= rect.x + rect.width && 
         point.y >= rect.y && 
         point.y <= rect.y + rect.height
}

// Resize handle detection
const getResizeHandle = (pos, rect, HANDLE_SIZE = 8) => {
  const handles = [
    { name: 'nw', x: rect.x - HANDLE_SIZE/2, y: rect.y - HANDLE_SIZE/2 },
    { name: 'ne', x: rect.x + rect.width - HANDLE_SIZE/2, y: rect.y - HANDLE_SIZE/2 },
    { name: 'sw', x: rect.x - HANDLE_SIZE/2, y: rect.y + rect.height - HANDLE_SIZE/2 },
    { name: 'se', x: rect.x + rect.width - HANDLE_SIZE/2, y: rect.y + rect.height - HANDLE_SIZE/2 }
  ]
  
  for (const handle of handles) {
    if (pos.x >= handle.x && pos.x <= handle.x + HANDLE_SIZE &&
        pos.y >= handle.y && pos.y <= handle.y + HANDLE_SIZE) {
      return handle.name
    }
  }
  return null
}

describe('Canvas Utility Functions', () => {
  describe('clampRectToCanvas', () => {
    it('keeps rectangle within bounds when positioned normally', () => {
      const rect = { x: 100, y: 100, width: 200, height: 150 }
      const result = clampRectToCanvas(rect)
      
      expect(result).toEqual(rect) // Should be unchanged
    })

    it('clamps rectangle when moved beyond left edge', () => {
      const rect = { x: -50, y: 100, width: 200, height: 150 }
      const result = clampRectToCanvas(rect)
      
      expect(result.x).toBe(0)
      expect(result.y).toBe(100)
      expect(result.width).toBe(200)
      expect(result.height).toBe(150)
    })

    it('clamps rectangle when moved beyond right edge', () => {
      const rect = { x: 4900, y: 100, width: 200, height: 150 }
      const result = clampRectToCanvas(rect)
      
      expect(result.x).toBe(4800) // 5000 - 200
      expect(result.y).toBe(100)
    })

    it('clamps rectangle when moved beyond top edge', () => {
      const rect = { x: 100, y: -30, width: 200, height: 150 }
      const result = clampRectToCanvas(rect)
      
      expect(result.x).toBe(100)
      expect(result.y).toBe(0)
    })

    it('clamps rectangle when moved beyond bottom edge', () => {
      const rect = { x: 100, y: 4950, width: 200, height: 150 }
      const result = clampRectToCanvas(rect)
      
      expect(result.y).toBe(4850) // 5000 - 150
    })

    it('handles rectangle larger than canvas', () => {
      const rect = { x: 0, y: 0, width: 6000, height: 6000 }
      const result = clampRectToCanvas(rect)
      
      expect(result.width).toBe(5000)
      expect(result.height).toBe(5000)
    })
  })

  describe('isPointInRect', () => {
    const rect = { x: 100, y: 100, width: 200, height: 150 }

    it('returns true for point inside rectangle', () => {
      const point = { x: 150, y: 125 }
      expect(isPointInRect(point, rect)).toBe(true)
    })

    it('returns false for point outside rectangle', () => {
      const point = { x: 50, y: 125 }
      expect(isPointInRect(point, rect)).toBe(false)
    })

    it('returns true for point on rectangle edge', () => {
      const point = { x: 100, y: 100 } // Top-left corner
      expect(isPointInRect(point, rect)).toBe(true)
    })

    it('returns true for point on opposite rectangle edge', () => {
      const point = { x: 300, y: 250 } // Bottom-right corner
      expect(isPointInRect(point, rect)).toBe(true)
    })
  })

  describe('getResizeHandle', () => {
    const rect = { x: 100, y: 100, width: 200, height: 150 }
    const HANDLE_SIZE = 20 // Updated from 8 to 20 (2.5x bigger)

    it('detects northwest handle', () => {
      const pos = { x: 100, y: 100 } // Top-left corner
      expect(getResizeHandle(pos, rect, HANDLE_SIZE)).toBe('nw')
    })

    it('detects northeast handle', () => {
      const pos = { x: 300, y: 100 } // Top-right corner
      expect(getResizeHandle(pos, rect, HANDLE_SIZE)).toBe('ne')
    })

    it('detects southwest handle', () => {
      const pos = { x: 100, y: 250 } // Bottom-left corner
      expect(getResizeHandle(pos, rect, HANDLE_SIZE)).toBe('sw')
    })

    it('detects southeast handle', () => {
      const pos = { x: 300, y: 250 } // Bottom-right corner
      expect(getResizeHandle(pos, rect, HANDLE_SIZE)).toBe('se')
    })

    it('returns null for point not on any handle', () => {
      const pos = { x: 150, y: 175 } // Center of rectangle
      expect(getResizeHandle(pos, rect, HANDLE_SIZE)).toBe(null)
    })

    it('returns null for point slightly outside handle area', () => {
      const pos = { x: 85, y: 85 } // Just outside northwest handle (accounting for larger size)
      expect(getResizeHandle(pos, rect, HANDLE_SIZE)).toBe(null)
    })

    it('detects handle with larger hit area due to increased size', () => {
      // Test that the larger handle size provides better hit detection
      const pos = { x: 95, y: 95 } // This should now hit the northwest handle
      expect(getResizeHandle(pos, rect, HANDLE_SIZE)).toBe('nw')
    })

    it('validates handle size affects hit detection area', () => {
      // Test that positions within the handle bounds are detected
      const posInHandle = { x: 110, y: 110 } // Within enlarged handle area
      const posOutsideHandle = { x: 80, y: 80 } // Outside enlarged handle area
      
      expect(getResizeHandle(posInHandle, rect, HANDLE_SIZE)).toBe('nw')
      expect(getResizeHandle(posOutsideHandle, rect, HANDLE_SIZE)).toBe(null)
    })
  })

  describe('Rectangle validation', () => {
    it('validates minimum rectangle size', () => {
      const minWidth = 2
      const minHeight = 1
      
      const rect = { x: 100, y: 100, width: 1, height: 0.5 }
      
      // This would be the validation logic
      const isValid = rect.width >= minWidth && rect.height >= minHeight
      expect(isValid).toBe(false)
    })

    it('accepts valid rectangle size', () => {
      const minWidth = 2
      const minHeight = 1
      
      const rect = { x: 100, y: 100, width: 50, height: 30 }
      
      const isValid = rect.width >= minWidth && rect.height >= minHeight
      expect(isValid).toBe(true)
    })
  })
})
