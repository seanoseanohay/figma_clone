/**
 * AI Agent Mock Testing
 * 
 * Pre-flight tests for Stage 6 AI Agent functionality
 * Tests mock agent responses and command validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getMockAgentResponse, validateAgentOutput } from '../services/agent.service.js';
import { validateAgentResponse, validateCommand } from '../utils/agentSchemas.js';

describe('AI Agent Mock Service', () => {
  let mockCanvasState;

  beforeEach(() => {
    mockCanvasState = {
      canvasId: 'test-canvas-123',
      objects: [
        {
          id: 'obj-1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 150,
          height: 100,
          fill: '#ff0000'
        },
        {
          id: 'obj-2', 
          type: 'circle',
          x: 300,
          y: 200,
          radius: 50,
          fill: '#00ff00'
        }
      ],
      selectedObjectIds: []
    };
  });

  describe('getMockAgentResponse', () => {
    it('should return valid response structure', async () => {
      const prompt = 'Create a blue rectangle';
      const response = await getMockAgentResponse(prompt, mockCanvasState);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('commands');
      expect(response.data).toHaveProperty('explanation');
      expect(response.data).toHaveProperty('metadata');
      expect(response.data.metadata.isMock).toBe(true);
    });

    it('should generate rectangle command for rectangle prompt', async () => {
      const prompt = 'Create a blue rectangle';
      const response = await getMockAgentResponse(prompt, mockCanvasState);

      expect(response.success).toBe(true);
      expect(response.data.commands).toHaveLength(1);
      expect(response.data.commands[0].type).toBe('createRectangle');
      expect(response.data.commands[0]).toHaveProperty('position');
      expect(response.data.commands[0]).toHaveProperty('size');
      expect(response.data.commands[0]).toHaveProperty('fill');
    });

    it('should generate circle command for circle prompt', async () => {
      const prompt = 'Add a red circle';
      const response = await getMockAgentResponse(prompt, mockCanvasState);

      expect(response.success).toBe(true);
      expect(response.data.commands).toHaveLength(1);
      expect(response.data.commands[0].type).toBe('createCircle');
      expect(response.data.commands[0]).toHaveProperty('position');
      expect(response.data.commands[0]).toHaveProperty('radius');
      expect(response.data.commands[0]).toHaveProperty('fill');
    });

    it('should generate star command for star prompt', async () => {
      const prompt = 'Make a yellow star';
      const response = await getMockAgentResponse(prompt, mockCanvasState);

      expect(response.success).toBe(true);
      expect(response.data.commands).toHaveLength(1);
      expect(response.data.commands[0].type).toBe('createStar');
      expect(response.data.commands[0]).toHaveProperty('position');
      expect(response.data.commands[0]).toHaveProperty('radius');
      expect(response.data.commands[0]).toHaveProperty('fill');
    });

    it('should generate default rectangle for generic prompt', async () => {
      const prompt = 'Do something creative';
      const response = await getMockAgentResponse(prompt, mockCanvasState);

      expect(response.success).toBe(true);
      expect(response.data.commands).toHaveLength(1);
      expect(response.data.commands[0].type).toBe('createRectangle');
    });

    it('should include processing time metadata', async () => {
      const startTime = Date.now();
      const response = await getMockAgentResponse('test', mockCanvasState);
      const endTime = Date.now();

      expect(response.success).toBe(true);
      expect(response.data.metadata.processingTimeMs).toBeGreaterThan(0);
      expect(response.data.metadata.processingTimeMs).toBeLessThan(endTime - startTime + 100);
    });

    it('should simulate realistic processing delay', async () => {
      const startTime = Date.now();
      await getMockAgentResponse('test', mockCanvasState);
      const processingTime = Date.now() - startTime;

      // Should take at least 400ms (we simulate 500ms delay)
      expect(processingTime).toBeGreaterThan(400);
    });
  });

  describe('Command Validation', () => {
    it('should validate createRectangle command', () => {
      const command = {
        type: 'createRectangle',
        position: { x: 100, y: 100 },
        size: { width: 150, height: 100 },
        fill: '#3b82f6'
      };

      const result = validateCommand(command);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining(command));
    });

    it('should validate createCircle command', () => {
      const command = {
        type: 'createCircle',
        position: { x: 300, y: 150 },
        radius: 60,
        fill: '#ef4444'
      };

      const result = validateCommand(command);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining(command));
    });

    it('should reject invalid position coordinates', () => {
      const command = {
        type: 'createRectangle',
        position: { x: -100, y: 6000 }, // Invalid: x < 0, y > 5000
        size: { width: 150, height: 100 },
        fill: '#3b82f6'
      };

      const result = validateCommand(command);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('position.x: Too small'),
        expect.stringContaining('position.y: Too big')
      ]));
    });

    it('should reject invalid color format', () => {
      const command = {
        type: 'createRectangle',
        position: { x: 100, y: 100 },
        size: { width: 150, height: 100 },
        fill: 'invalid-color' // Should be hex format
      };

      const result = validateCommand(command);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Must be valid hex color')
      ]));
    });

    it('should apply default values for optional fields', () => {
      const command = {
        type: 'createRectangle',
        position: { x: 100, y: 100 },
        size: { width: 150, height: 100 }
        // No fill, stroke, strokeWidth, rotation
      };

      const result = validateCommand(command);
      expect(result.success).toBe(true);
      expect(result.data.fill).toBe('#808080'); // Default gray
      expect(result.data.strokeWidth).toBe(0);
      expect(result.data.rotation).toBe(0);
    });
  });

  describe('Response Validation', () => {
    it('should validate complete agent response', () => {
      const response = {
        commands: [
          {
            type: 'createRectangle',
            position: { x: 100, y: 100 },
            size: { width: 150, height: 100 },
            fill: '#3b82f6'
          }
        ],
        explanation: 'Created a blue rectangle as requested',
        metadata: {
          model: 'mock-model',
          timestamp: Date.now(),
          processingTimeMs: 500,
          isMock: true
        }
      };

      const result = validateAgentResponse(response);
      expect(result.success).toBe(true);
    });

    it('should reject response with no commands', () => {
      const response = {
        commands: [],
        explanation: 'No commands'
      };

      const result = validateAgentResponse(response);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('commands')
      ]));
    });

    it('should reject response with too many commands', () => {
      const commands = Array(15).fill({
        type: 'createRectangle',
        position: { x: 100, y: 100 },
        size: { width: 150, height: 100 },
        fill: '#3b82f6'
      });

      const response = {
        commands,
        explanation: 'Too many commands'
      };

      const result = validateAgentResponse(response);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('commands')
      ]));
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid canvas state gracefully', async () => {
      const invalidCanvasState = {
        // Missing required fields
      };

      // This should not throw, but may produce less useful mock responses
      const response = await getMockAgentResponse('test', invalidCanvasState);
      expect(response.success).toBe(true);
    });
  });
});

describe('Agent Output Validation Utility', () => {
  it('should export validateAgentOutput function', () => {
    expect(typeof validateAgentOutput).toBe('function');
  });

  it('should validate agent output same as validateAgentResponse', () => {
    const response = {
      commands: [{
        type: 'createRectangle',
        position: { x: 100, y: 100 },
        size: { width: 150, height: 100 },
        fill: '#3b82f6'
      }],
      explanation: 'Test response'
    };

    const result1 = validateAgentOutput(response);
    const result2 = validateAgentResponse(response);

    expect(result1).toEqual(result2);
  });
});
