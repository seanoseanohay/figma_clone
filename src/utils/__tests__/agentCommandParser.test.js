import { describe, it, expect } from 'vitest';
import { batchCommands } from '../agentCommandParser.js';

describe('agentCommandParser', () => {
  describe('batchCommands', () => {
    describe('Batch size optimization', () => {
      it('should batch creation commands into groups of 50', () => {
        // Create 100 star creation commands
        const commands = Array.from({ length: 100 }, (_, i) => ({
          type: 'createStar',
          position: { x: i * 30, y: i * 30 },
          numPoints: 5,
          innerRadius: 15,
          outerRadius: 30,
          fill: '#ffd700',
        }));

        const batches = batchCommands(commands);

        // Should create 2 batches of 50 each
        expect(batches).toHaveLength(2);
        expect(batches[0]).toHaveLength(50);
        expect(batches[1]).toHaveLength(50);
      });

      it('should batch creation commands into groups of 50 with remainder', () => {
        // Create 125 rectangle commands (like the original performance issue)
        const commands = Array.from({ length: 125 }, (_, i) => ({
          type: 'createRectangle',
          position: { x: i * 20, y: i * 20, width: 100, height: 50 },
          fill: '#3b82f6',
        }));

        const batches = batchCommands(commands);

        // Should create 3 batches: 50 + 50 + 25
        expect(batches).toHaveLength(3);
        expect(batches[0]).toHaveLength(50);
        expect(batches[1]).toHaveLength(50);
        expect(batches[2]).toHaveLength(25);
      });

      it('should handle exactly 50 commands in single batch', () => {
        const commands = Array.from({ length: 50 }, (_, i) => ({
          type: 'createCircle',
          position: { x: i * 40, y: 100 },
          radius: 20,
          fill: '#ef4444',
        }));

        const batches = batchCommands(commands);

        expect(batches).toHaveLength(1);
        expect(batches[0]).toHaveLength(50);
      });

      it('should handle commands less than batch size', () => {
        const commands = [
          { type: 'createStar', position: { x: 100, y: 100 } },
          { type: 'createRectangle', position: { x: 200, y: 200 } },
          { type: 'createCircle', position: { x: 300, y: 300 } },
        ];

        const batches = batchCommands(commands);

        expect(batches).toHaveLength(1);
        expect(batches[0]).toHaveLength(3);
      });
    });

    describe('Individual command handling', () => {
      it('should execute clearCanvas commands individually', () => {
        const commands = [
          { type: 'createStar', position: { x: 100, y: 100 } },
          { type: 'clearCanvas' },
          { type: 'createRectangle', position: { x: 200, y: 200 } },
        ];

        const batches = batchCommands(commands);

        // Should create 3 batches: [createStar], [clearCanvas], [createRectangle]
        expect(batches).toHaveLength(3);
        expect(batches[0]).toHaveLength(1);
        expect(batches[0][0].type).toBe('createStar');
        expect(batches[1]).toHaveLength(1);
        expect(batches[1][0].type).toBe('clearCanvas');
        expect(batches[2]).toHaveLength(1);
        expect(batches[2][0].type).toBe('createRectangle');
      });

      it('should execute setCanvasBackground commands individually', () => {
        const commands = [
          { type: 'createStar', position: { x: 100, y: 100 } },
          { type: 'setCanvasBackground', color: '#ffffff' },
          { type: 'createRectangle', position: { x: 200, y: 200 } },
        ];

        const batches = batchCommands(commands);

        expect(batches).toHaveLength(3);
        expect(batches[1]).toHaveLength(1);
        expect(batches[1][0].type).toBe('setCanvasBackground');
      });

      it('should handle multiple individual commands', () => {
        const commands = [
          { type: 'clearCanvas' },
          { type: 'setCanvasBackground', color: '#f0f0f0' },
          { type: 'clearCanvas' },
        ];

        const batches = batchCommands(commands);

        // Each should be its own batch
        expect(batches).toHaveLength(3);
        batches.forEach(batch => {
          expect(batch).toHaveLength(1);
        });
      });
    });

    describe('Mixed command scenarios', () => {
      it('should handle mix of batchable and individual commands', () => {
        const commands = [
          ...Array.from({ length: 75 }, (_, i) => ({
            type: 'createStar',
            position: { x: i * 10, y: i * 10 },
          })),
          { type: 'clearCanvas' },
          ...Array.from({ length: 30 }, (_, i) => ({
            type: 'createRectangle',
            position: { x: i * 15, y: i * 15 },
          })),
        ];

        const batches = batchCommands(commands);

        // Should create: [50 stars], [25 stars], [clearCanvas], [30 rectangles]
        expect(batches).toHaveLength(4);
        expect(batches[0]).toHaveLength(50);
        expect(batches[1]).toHaveLength(25);
        expect(batches[2]).toHaveLength(1);
        expect(batches[2][0].type).toBe('clearCanvas');
        expect(batches[3]).toHaveLength(30);
      });

      it('should break batch when individual command is encountered', () => {
        const commands = [
          ...Array.from({ length: 25 }, () => ({ type: 'createStar' })),
          { type: 'clearCanvas' },
          ...Array.from({ length: 25 }, () => ({ type: 'createStar' })),
        ];

        const batches = batchCommands(commands);

        expect(batches).toHaveLength(3);
        expect(batches[0]).toHaveLength(25); // First batch of stars
        expect(batches[1]).toHaveLength(1);  // clearCanvas
        expect(batches[2]).toHaveLength(25); // Second batch of stars
      });
    });

    describe('Performance regression test', () => {
      it('should create 25x25 grid (625 stars) in 13 batches instead of 125', () => {
        // This is the exact regression test for the original performance issue
        const gridSize = 25;
        const totalStars = gridSize * gridSize; // 625 stars

        const commands = Array.from({ length: totalStars }, (_, i) => {
          const row = Math.floor(i / gridSize);
          const col = i % gridSize;
          return {
            type: 'createStar',
            position: { x: col * 30 + 100, y: row * 30 + 100 },
            numPoints: 5,
            innerRadius: 15,
            outerRadius: 30,
            fill: '#ffd700',
          };
        });

        const batches = batchCommands(commands);

        // With old batch size (5): 625 ÷ 5 = 125 batches
        // With new batch size (50): 625 ÷ 50 = 12.5 → 13 batches
        expect(batches).toHaveLength(13);
        
        // Verify batch sizes
        for (let i = 0; i < 12; i++) {
          expect(batches[i]).toHaveLength(50);
        }
        expect(batches[12]).toHaveLength(25); // Last batch with remainder

        // Verify total commands are preserved
        const totalCommands = batches.reduce((sum, batch) => sum + batch.length, 0);
        expect(totalCommands).toBe(totalStars);
      });

      it('should be 10x faster than old batch size for large grids', () => {
        const commands = Array.from({ length: 1000 }, (_, i) => ({
          type: 'createStar',
          position: { x: i, y: i },
        }));

        const startTime = Date.now();
        const batches = batchCommands(commands);
        const endTime = Date.now();

        // New implementation: 1000 ÷ 50 = 20 batches
        expect(batches).toHaveLength(20);
        
        // Old implementation would have been: 1000 ÷ 5 = 200 batches
        // New implementation should create 10x fewer batches
        const expectedOldBatches = Math.ceil(1000 / 5);
        const actualNewBatches = batches.length;
        const improvementFactor = expectedOldBatches / actualNewBatches;
        
        expect(improvementFactor).toBe(10);
        
        // Performance should be very fast (batching is just array operations)
        expect(endTime - startTime).toBeLessThan(10);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty command array', () => {
        const batches = batchCommands([]);
        expect(batches).toEqual([]);
      });

      it('should handle single command', () => {
        const commands = [{ type: 'createStar', position: { x: 100, y: 100 } }];
        const batches = batchCommands(commands);

        expect(batches).toHaveLength(1);
        expect(batches[0]).toHaveLength(1);
      });

      it('should preserve command properties in batches', () => {
        const originalCommand = {
          type: 'createStar',
          position: { x: 100, y: 200 },
          numPoints: 7,
          innerRadius: 20,
          outerRadius: 40,
          fill: '#ff6b6b',
          stroke: '#000000',
          strokeWidth: 2,
        };

        const batches = batchCommands([originalCommand]);
        const batchedCommand = batches[0][0];

        expect(batchedCommand).toEqual(originalCommand);
      });
    });
  });
});
