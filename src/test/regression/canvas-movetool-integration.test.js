/**
 * Integration Test: Canvas + MoveTool State Synchronization Bug
 * 
 * This test reproduces the exact user scenario:
 * 1. Create two circles side by side
 * 2. Move Circle 1 up 10px 
 * 3. Move Circle 2 left 10px
 * 
 * BUG: Circle 2 starts moving from Circle 1's position instead of its own
 * 
 * This integration test simulates the actual Canvas <-> MoveTool interaction
 * to identify React state timing issues.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MoveTool } from '../../tools/MoveTool.js';

describe('Canvas MoveTool Integration Bug', () => {
  let moveTool;
  let canvasState;

  beforeEach(() => {
    moveTool = new MoveTool();

    // Simulate Canvas component state - this mirrors Canvas.jsx state structure
    canvasState = {
      // Objects as they exist in Firestore (original positions)
      canvasObjects: [
        { id: 'circle-1', type: 'circle', x: 100, y: 100, radius: 50 },
        { id: 'circle-2', type: 'circle', x: 300, y: 200, radius: 50 }
      ],

      // Canvas state variables (these get updated by React setState calls)
      selectedObjectId: null,
      moveSelectedId: null,
      isMoving: false,
      moveStartPos: null,
      mouseDownPos: null,
      isDragThresholdExceeded: false,
      moveOriginalPos: null, // THIS IS THE KEY STATE THAT'S BUGGY
      
      // Local updates (this simulates intermediate movement positions)
      localRectUpdates: {},

      // Mock functions that simulate Canvas behavior
      findObjectAt: vi.fn(),
      canEditObject: vi.fn(() => true),
      doWeOwnObject: vi.fn(() => true),
      clampCircleToCanvas: vi.fn((obj) => obj),
      clampStarToCanvas: vi.fn((obj) => obj),
      clampRectToCanvas: vi.fn((obj) => obj),
      
      // State setters (these simulate React setState calls)
      setSelectedObjectId: vi.fn((id) => { canvasState.selectedObjectId = id; }),
      setMoveOriginalPos: vi.fn((pos) => { 
        console.log('🎯 SETTING moveOriginalPos to:', pos);
        canvasState.moveOriginalPos = pos; 
      }),
      setLocalRectUpdates: vi.fn((updater) => { 
        const newUpdates = typeof updater === 'function' ? updater(canvasState.localRectUpdates) : updater;
        canvasState.localRectUpdates = newUpdates;
        console.log('📝 SETTING localRectUpdates to:', newUpdates);
      }),
      setMouseDownPos: vi.fn((pos) => { canvasState.mouseDownPos = pos; }),
      setIsDragThresholdExceeded: vi.fn((val) => { canvasState.isDragThresholdExceeded = val; }),
      setIsMoving: vi.fn((val) => { canvasState.isMoving = val; }),
      setMoveStartPos: vi.fn((pos) => { canvasState.moveStartPos = pos; })
    };

    // Mock dynamic imports for canvas service
    vi.doMock('../../services/canvas.service.js', () => ({
      lockObject: vi.fn().mockResolvedValue(undefined),
      unlockObject: vi.fn().mockResolvedValue(undefined),
      updateActiveObjectPosition: vi.fn(),
      clearActiveObject: vi.fn(),
      updateObject: vi.fn()
    }));
  });

  it('should reproduce the bug: second circle uses first circles moveOriginalPos', async () => {
    console.log('\n🔄 STEP 1: Move Circle 1 up 10px');
    console.log('Initial Circle 1 position:', canvasState.canvasObjects[0]);
    console.log('Initial Circle 2 position:', canvasState.canvasObjects[1]);

    // Step 1: Auto-select Circle 1 and prepare to move it
    canvasState.findObjectAt.mockReturnValue(canvasState.canvasObjects[0]); // Returns circle-1
    
    await moveTool.onMouseDown({}, canvasState, { 
      pos: { x: 100, y: 100 }, 
      canvasId: 'test-canvas' 
    });

    console.log('After Circle 1 mouseDown:');
    console.log('  selectedObjectId:', canvasState.selectedObjectId);
    console.log('  moveOriginalPos:', canvasState.moveOriginalPos);

    // Simulate Circle 1 movement (up 10px)
    canvasState.isMoving = true;
    canvasState.isDragThresholdExceeded = true;
    canvasState.moveStartPos = { x: 100, y: 100 };
    canvasState.mouseDownPos = { x: 100, y: 100 };

    // Simulate drag up 10px
    moveTool.onMouseMove({}, canvasState, { 
      pos: { x: 100, y: 90 },
      canvasId: 'test-canvas' 
    });

    console.log('After Circle 1 movement:');
    console.log('  localRectUpdates:', canvasState.localRectUpdates);

    // Simulate mouseUp to finish Circle 1 movement
    await moveTool.onMouseUp({}, canvasState, { 
      pos: { x: 100, y: 90 },
      canvasId: 'test-canvas',
      recordAction: vi.fn()
    });

    console.log('\n🔄 STEP 2: Move Circle 2 left 10px (THIS IS WHERE BUG OCCURS)');
    
    // Step 2: Auto-select Circle 2 and prepare to move it
    canvasState.findObjectAt.mockReturnValue(canvasState.canvasObjects[1]); // Returns circle-2
    
    // CRITICAL: Before calling onMouseDown, log the current state
    console.log('Before Circle 2 mouseDown:');
    console.log('  canvasObjects[1] (Circle 2):', canvasState.canvasObjects[1]);
    console.log('  localRectUpdates:', canvasState.localRectUpdates);
    console.log('  Current moveOriginalPos:', canvasState.moveOriginalPos);

    await moveTool.onMouseDown({}, canvasState, { 
      pos: { x: 300, y: 200 }, 
      canvasId: 'test-canvas' 
    });

    console.log('After Circle 2 mouseDown:');
    console.log('  selectedObjectId:', canvasState.selectedObjectId);
    console.log('  moveOriginalPos:', canvasState.moveOriginalPos);

    // THE BUG: Circle 2 should use (300, 200) but might use Circle 1's old position
    if (canvasState.moveOriginalPos) {
      if (canvasState.moveOriginalPos.x === 300 && canvasState.moveOriginalPos.y === 200) {
        console.log('✅ SUCCESS: Circle 2 uses its own position (300, 200)');
        expect(canvasState.moveOriginalPos).toEqual({ x: 300, y: 200 });
      } else if (canvasState.moveOriginalPos.x === 100 && canvasState.moveOriginalPos.y === 100) {
        console.log('❌ BUG REPRODUCED: Circle 2 uses Circle 1 position (100, 100)');
        console.log('   Should use current position (300, 200) but used Circle 1 position:', canvasState.moveOriginalPos);
        // Test should fail if fix didn't work
        expect(canvasState.moveOriginalPos).toEqual({ x: 300, y: 200 });
      } else {
        console.log('🤔 Unexpected moveOriginalPos value:', canvasState.moveOriginalPos);
        expect(canvasState.moveOriginalPos).toEqual({ x: 300, y: 200 });
      }
    } else {
      console.log('⚠️ moveOriginalPos is null - movement setup failed');
      expect(canvasState.moveOriginalPos).toEqual({ x: 300, y: 200 });
    }
  });

  it('should demonstrate the fix: React state timing issue', async () => {
    // This test demonstrates that the issue might be React state batching

    console.log('\n🔧 TESTING: React State Timing');

    // Start with Circle 1 selected and moved (simulate stale state)
    canvasState.selectedObjectId = 'circle-1';
    canvasState.moveOriginalPos = { x: 100, y: 90 }; // Stale from previous move
    canvasState.localRectUpdates = {
      'circle-1': { id: 'circle-1', type: 'circle', x: 100, y: 90, radius: 50 }
    };

    console.log('Initial state (simulating after Circle 1 move):');
    console.log('  moveOriginalPos:', canvasState.moveOriginalPos);
    console.log('  localRectUpdates:', canvasState.localRectUpdates);

    // Now try to select Circle 2
    canvasState.findObjectAt.mockReturnValue(canvasState.canvasObjects[1]);

    await moveTool.onMouseDown({}, canvasState, { 
      pos: { x: 300, y: 200 }, 
      canvasId: 'test-canvas' 
    });

    console.log('After attempting to select Circle 2:');
    console.log('  selectedObjectId:', canvasState.selectedObjectId);
    console.log('  moveOriginalPos:', canvasState.moveOriginalPos);

    // Verify the fix works
    expect(canvasState.selectedObjectId).toBe('circle-2');
    expect(canvasState.moveOriginalPos).toEqual({ x: 300, y: 200 });
  });
});