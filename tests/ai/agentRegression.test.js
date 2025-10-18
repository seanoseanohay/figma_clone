/**
 * AI Agent Regression Test Suite
 * 
 * Prevents breaking changes to AI agent functionality during development.
 * Maintains a gold standard of command parsing and execution behavior.
 * 
 * Tests should be added whenever:
 * - New command types are implemented
 * - Existing command parsing is modified
 * - Schema changes are made
 * - Bug fixes are applied
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { generateLocalMockResponse } from '../../src/services/agent.service.js'

// Mock canvas state for consistent testing
const mockCanvasState = {
  canvasId: 'regression-test-canvas',
  selectedObjectIds: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  objects: []
}

describe('AI Agent Regression Tests', () => {
  
  describe('Text Command Regression', () => {
    it('should correctly parse quoted text', async () => {
      const response = await generateLocalMockResponse(
        "Add a text layer that says 'hello world'", 
        mockCanvasState
      )
      
      expect(response.success).toBe(true)
      expect(response.data.commands).toHaveLength(1)
      expect(response.data.commands[0]).toMatchObject({
        type: 'createText',
        text: 'hello world',
        fontSize: 24,
        fontFamily: 'Arial',
        fill: '#000000'
      })
    })

    it('should handle complex text with commas', async () => {
      const response = await generateLocalMockResponse(
        "Add a text layer that says, Hello, Melissa, can you see this?", 
        mockCanvasState
      )
      
      expect(response.success).toBe(true)
      expect(response.data.commands[0].text).toBe('Hello, Melissa, can you see this')
    })

    it('should use default text when none specified', async () => {
      const response = await generateLocalMockResponse(
        "Create a text layer", 
        mockCanvasState
      )
      
      expect(response.success).toBe(true)
      expect(response.data.commands[0].text).toBe('Hello World')
    })
  })

  describe('Resize Command Regression', () => {
    it('should generate resizeObject command for resize requests', async () => {
      const response = await generateLocalMockResponse(
        "Resize purple rectangle to be twice as big", 
        mockCanvasState
      )
      
      expect(response.success).toBe(true)
      expect(response.data.commands[0]).toMatchObject({
        type: 'resizeObject',
        objectId: 'lastRectangle:#A855F7',
        scale: 2.0
      })
    })

    it('should handle make bigger commands', async () => {
      const response = await generateLocalMockResponse(
        "Make the red circle bigger", 
        mockCanvasState
      )
      
      expect(response.success).toBe(true)
      expect(response.data.commands[0]).toMatchObject({
        type: 'resizeObject',
        objectId: 'lastCircle:#EF4444',
        scale: 1.5
      })
    })
  })

  describe('Layout Command Regression', () => {
    it('should create grid layouts correctly', async () => {
      const response = await generateLocalMockResponse(
        "Make a 3x3 grid of yellow stars", 
        mockCanvasState
      )
      
      expect(response.success).toBe(true)
      expect(response.data.commands).toHaveLength(9) // 3x3 = 9 stars
      expect(response.data.commands[0]).toMatchObject({
        type: 'createStar',
        fill: '#EAB308'
      })
    })

    it('should create evenly spaced objects', async () => {
      const response = await generateLocalMockResponse(
        "Create 5 blue circles evenly spaced", 
        mockCanvasState
      )
      
      expect(response.success).toBe(true)
      expect(response.data.commands).toHaveLength(5)
      
      // Verify spacing is consistent
      const positions = response.data.commands.map(cmd => cmd.position.x)
      const spacing = positions[1] - positions[0]
      for (let i = 2; i < positions.length; i++) {
        expect(positions[i] - positions[i-1]).toBe(spacing)
      }
    })
  })

  describe('Color Parsing Regression', () => {
    it('should correctly identify colors in commands', async () => {
      const colorTests = [
        { prompt: "Create a red circle", expectedColor: '#EF4444' },
        { prompt: "Add blue rectangle", expectedColor: '#3B82F6' },
        { prompt: "Make green star", expectedColor: '#22C55E' },
        { prompt: "Create purple square", expectedColor: '#A855F7' }
      ]

      for (const test of colorTests) {
        const response = await generateLocalMockResponse(test.prompt, mockCanvasState)
        expect(response.success).toBe(true)
        expect(response.data.commands[0].fill).toBe(test.expectedColor)
      }
    })
  })

  describe('Command Priority Regression', () => {
    it('should prioritize manipulation over creation', async () => {
      const response = await generateLocalMockResponse(
        "Resize the rectangle to be bigger", 
        mockCanvasState
      )
      
      expect(response.success).toBe(true)
      expect(response.data.commands[0].type).toBe('resizeObject')
      // Should not create a new rectangle
      expect(response.data.commands.some(cmd => cmd.type === 'createRectangle')).toBe(false)
    })
  })

  describe('Performance Regression', () => {
    it('should complete command generation within time limits', async () => {
      const startTime = Date.now()
      
      const response = await generateLocalMockResponse(
        "Create a complex layout with 10 circles, 5 rectangles, and 3 text layers", 
        mockCanvasState
      )
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(response.success).toBe(true)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })
  })

  describe('Error Handling Regression', () => {
    it('should handle empty prompts gracefully', async () => {
      const response = await generateLocalMockResponse('', mockCanvasState)
      
      expect(response.success).toBe(true)
      expect(response.data.commands).toHaveLength(1) // Should create default fallback
    })

    it('should handle malformed prompts', async () => {
      const response = await generateLocalMockResponse(
        "!@#$%^&*()_+ invalid characters", 
        mockCanvasState
      )
      
      expect(response.success).toBe(true)
      // Should not crash, should create fallback command
      expect(response.data.commands).toHaveLength(1)
    })
  })
})

/**
 * Gold Standard Test Cases
 * 
 * These represent the expected baseline behavior that should never change
 * unless explicitly updated with new requirements.
 */
export const GOLD_STANDARD_COMMANDS = [
  {
    prompt: "Create a red circle",
    expected: {
      type: 'createCircle',
      fill: '#EF4444',
      radius: 60
    }
  },
  {
    prompt: "Add text that says 'Welcome'",
    expected: {
      type: 'createText',
      text: 'Welcome',
      fontSize: 24,
      fontFamily: 'Arial'
    }
  },
  {
    prompt: "Make a 2x3 grid of stars",
    expected: {
      commandCount: 6,
      type: 'createStar',
      layout: 'grid'
    }
  }
  // Add more gold standards as functionality grows
]
