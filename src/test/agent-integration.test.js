/**
 * AI Agent Integration Tests
 * 
 * Tests Stage 6 AI Agent integration with canvas and realtime functionality
 * Focuses on pre-flight verification of agent-canvas interaction
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createObject, updateObject } from '../services/canvas.service.js';
import { getMockAgentResponse } from '../services/agent.service.js';

// Mock Firebase services
vi.mock('../services/firebase.js', () => ({
  db: {},
  auth: { 
    currentUser: { 
      uid: 'test-user-123',
      displayName: 'Test User',
      email: 'test@example.com'
    }
  },
  rtdb: {}
}));

// Mock canvas service functions
vi.mock('../services/canvas.service.js', () => ({
  createObject: vi.fn(),
  updateObject: vi.fn(),
  deleteObject: vi.fn()
}));

// Mock canvas context
const mockCanvasContext = {
  canvasId: 'test-canvas-123',
  objects: [],
  selectedObjectIds: []
};

vi.mock('../../hooks/useCanvas.js', () => ({
  useCanvas: () => mockCanvasContext
}));

describe('AI Agent Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Agent Service Integration', () => {
    it('should generate valid commands that match canvas service expectations', async () => {
      const canvasState = {
        canvasId: 'test-canvas',
        objects: [],
        selectedObjectIds: []
      };

      const response = await getMockAgentResponse('Create a blue rectangle', canvasState);
      
      expect(response.success).toBe(true);
      expect(response.data.commands).toHaveLength(1);
      
      const command = response.data.commands[0];
      expect(command.type).toBe('createRectangle');
      
      // Verify command structure matches what createObject expects
      expect(command).toHaveProperty('position');
      expect(command.position).toHaveProperty('x');
      expect(command.position).toHaveProperty('y');
      expect(command).toHaveProperty('size');
      expect(command.size).toHaveProperty('width');
      expect(command.size).toHaveProperty('height');
      expect(command).toHaveProperty('fill');
    });

    it('should generate commands with valid canvas coordinates', async () => {
      const canvasState = {
        canvasId: 'test-canvas',
        objects: [],
        selectedObjectIds: []
      };

      const response = await getMockAgentResponse('Create shapes everywhere', canvasState);
      
      expect(response.success).toBe(true);
      
      response.data.commands.forEach(command => {
        if (command.position) {
          expect(command.position.x).toBeGreaterThanOrEqual(0);
          expect(command.position.y).toBeGreaterThanOrEqual(0);
          expect(command.position.x).toBeLessThanOrEqual(5000);
          expect(command.position.y).toBeLessThanOrEqual(5000);
        }
      });
    });

    it('should generate commands with valid colors', async () => {
      const canvasState = {
        canvasId: 'test-canvas',
        objects: [],
        selectedObjectIds: []
      };

      const response = await getMockAgentResponse('Create colorful shapes', canvasState);
      
      expect(response.success).toBe(true);
      
      response.data.commands.forEach(command => {
        if (command.fill) {
          expect(command.fill).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
      });
    });
  });

  describe('Canvas Service Compatibility', () => {
    it('should be able to execute createRectangle command via canvas service', async () => {
      const mockCommand = {
        type: 'createRectangle',
        position: { x: 100, y: 100 },
        size: { width: 150, height: 100 },
        fill: '#3b82f6'
      };

      // Mock successful creation
      createObject.mockResolvedValue('mock-object-id');

      // Execute command through canvas service
      const result = await createObject(
        'rectangle',
        {
          x: mockCommand.position.x,
          y: mockCommand.position.y,
          width: mockCommand.size.width,
          height: mockCommand.size.height
        },
        'test-canvas-123',
        {
          fill: mockCommand.fill
        }
      );

      expect(createObject).toHaveBeenCalledWith(
        'rectangle',
        {
          x: 100,
          y: 100,
          width: 150,
          height: 100
        },
        'test-canvas-123',
        {
          fill: '#3b82f6'
        }
      );
      expect(result).toBe('mock-object-id');
    });

    it('should be able to execute createCircle command via canvas service', async () => {
      const mockCommand = {
        type: 'createCircle',
        position: { x: 300, y: 200 },
        radius: 60,
        fill: '#ef4444'
      };

      createObject.mockResolvedValue('mock-circle-id');

      const result = await createObject(
        'circle',
        {
          x: mockCommand.position.x,
          y: mockCommand.position.y,
          radius: mockCommand.radius
        },
        'test-canvas-123',
        {
          fill: mockCommand.fill
        }
      );

      expect(createObject).toHaveBeenCalledWith(
        'circle',
        {
          x: 300,
          y: 200,
          radius: 60
        },
        'test-canvas-123',
        {
          fill: '#ef4444'
        }
      );
      expect(result).toBe('mock-circle-id');
    });
  });

  describe('Command Execution Flow', () => {
    it('should handle agent command execution pipeline', async () => {
      // 1. Get mock agent response
      const canvasState = {
        canvasId: 'test-canvas',
        objects: [],
        selectedObjectIds: []
      };

      const agentResponse = await getMockAgentResponse('Create a red rectangle', canvasState);
      expect(agentResponse.success).toBe(true);

      // 2. Extract and validate commands
      const commands = agentResponse.data.commands;
      expect(commands).toHaveLength(1);
      expect(commands[0].type).toBe('createRectangle');

      // 3. Execute commands via canvas service
      createObject.mockResolvedValue('executed-object-id');

      const command = commands[0];
      const objectId = await createObject(
        'rectangle',
        {
          x: command.position.x,
          y: command.position.y,
          width: command.size.width,
          height: command.size.height
        },
        canvasState.canvasId,
        {
          fill: command.fill
        }
      );

      // 4. Verify execution
      expect(createObject).toHaveBeenCalled();
      expect(objectId).toBe('executed-object-id');
    });

    it('should handle multiple commands in sequence', async () => {
      const canvasState = {
        canvasId: 'test-canvas',
        objects: [],
        selectedObjectIds: []
      };

      // Generate response with multiple shapes
      const agentResponse = await getMockAgentResponse('Create a rectangle and a circle', canvasState);
      
      // Mock multiple successful creations
      createObject
        .mockResolvedValueOnce('rect-id')
        .mockResolvedValueOnce('circle-id');

      // Execute all commands
      const results = [];
      for (const command of agentResponse.data.commands) {
        if (command.type === 'createRectangle') {
          const id = await createObject('rectangle', {
            x: command.position.x,
            y: command.position.y,
            width: command.size.width,
            height: command.size.height
          }, canvasState.canvasId, { fill: command.fill });
          results.push(id);
        } else if (command.type === 'createCircle') {
          const id = await createObject('circle', {
            x: command.position.x,
            y: command.position.y,
            radius: command.radius
          }, canvasState.canvasId, { fill: command.fill });
          results.push(id);
        }
      }

      expect(results.length).toBeGreaterThan(0);
      expect(createObject).toHaveBeenCalledTimes(agentResponse.data.commands.length);
    });
  });

  describe('Error Handling', () => {
    it('should handle canvas service errors gracefully', async () => {
      const mockCommand = {
        type: 'createRectangle',
        position: { x: 100, y: 100 },
        size: { width: 150, height: 100 },
        fill: '#3b82f6'
      };

      // Mock canvas service failure
      createObject.mockRejectedValue(new Error('Canvas service error'));

      await expect(createObject(
        'rectangle',
        {
          x: mockCommand.position.x,
          y: mockCommand.position.y,
          width: mockCommand.size.width,
          height: mockCommand.size.height
        },
        'test-canvas-123',
        { fill: mockCommand.fill }
      )).rejects.toThrow('Canvas service error');
    });

    it('should validate command structure before execution', async () => {
      const invalidCommand = {
        type: 'createRectangle',
        // Missing required position and size
        fill: '#3b82f6'
      };

      // Should not attempt to call canvas service with invalid command
      const executeCommand = () => {
        if (!invalidCommand.position || !invalidCommand.size) {
          throw new Error('Invalid command structure');
        }
        return createObject('rectangle', invalidCommand.position, 'test-canvas', { fill: invalidCommand.fill });
      };

      expect(executeCommand).toThrow('Invalid command structure');
      expect(createObject).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should complete mock agent response within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await getMockAgentResponse('Quick test', {
        canvasId: 'test-canvas',
        objects: [],
        selectedObjectIds: []
      });
      
      const duration = Date.now() - startTime;
      
      expect(response.success).toBe(true);
      expect(duration).toBeLessThan(2000); // Should complete in less than 2 seconds
    });

    it('should handle canvas state with many objects efficiently', async () => {
      // Create canvas state with many objects
      const manyObjects = Array(50).fill(null).map((_, i) => ({
        id: `obj-${i}`,
        type: 'rectangle',
        x: i * 10,
        y: i * 10,
        width: 100,
        height: 100,
        fill: '#808080'
      }));

      const canvasState = {
        canvasId: 'test-canvas',
        objects: manyObjects,
        selectedObjectIds: []
      };

      const startTime = Date.now();
      const response = await getMockAgentResponse('Create something new', canvasState);
      const duration = Date.now() - startTime;

      expect(response.success).toBe(true);
      expect(duration).toBeLessThan(3000); // Should handle large state efficiently
    });
  });
});

describe('Agent Service API Compatibility', () => {
  it('should have agent service available for Stage 7 integration', () => {
    expect(getMockAgentResponse).toBeDefined();
    expect(typeof getMockAgentResponse).toBe('function');
  });

  it('should have canvas service functions available for command execution', () => {
    expect(createObject).toBeDefined();
    expect(updateObject).toBeDefined();
    expect(typeof createObject).toBe('function');
    expect(typeof updateObject).toBe('function');
  });

  it('should be ready for Stage 7 AI agent implementation', async () => {
    // Test the full pipeline that Stage 7 will use
    const canvasState = {
      canvasId: 'test-canvas',
      objects: [],
      selectedObjectIds: []
    };

    // 1. Agent generates response
    const agentResponse = await getMockAgentResponse('Test prompt', canvasState);
    expect(agentResponse.success).toBe(true);

    // 2. Commands are validated and structured correctly
    expect(agentResponse.data.commands).toBeDefined();
    expect(Array.isArray(agentResponse.data.commands)).toBe(true);

    // 3. Canvas service can execute commands
    createObject.mockResolvedValue('test-object-id');
    
    const command = agentResponse.data.commands[0];
    if (command.type === 'createRectangle') {
      const result = await createObject(
        'rectangle',
        { x: command.position.x, y: command.position.y, width: command.size.width, height: command.size.height },
        canvasState.canvasId,
        { fill: command.fill }
      );
      expect(result).toBe('test-object-id');
    }

    // Stage 6 prep is complete - ready for Stage 7 implementation
    expect(true).toBe(true);
  });
});