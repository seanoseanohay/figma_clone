/**
 * Regression Test: Auto-Selection State Clearing Bug
 * 
 * Bug Report: When using the Move tool to move circle A, then switching to circle B,
 * circle B would start moving from circle A's position instead of its own position.
 * 
 * Root Cause: MoveTool was using localRectUpdates from previous object movements
 * instead of fresh Firestore data when switching between objects.
 * 
 * Fix: Always use fresh Firestore data (baseObject) for starting positions
 * instead of potentially stale localRectUpdates when auto-selecting new objects.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MoveTool } from '../../tools/MoveTool.js';

describe('MoveTool Auto-Selection State Clearing', () => {
  let moveTool;
  let mockState;
  let mockHelpers;

  beforeEach(() => {
    moveTool = new MoveTool();

    // Mock canvas objects - two circles at different positions
    const canvasObjects = [
      {
        id: 'circle-1',
        type: 'circle',
        x: 100,
        y: 100,
        radius: 50
      },
      {
        id: 'circle-2',
        type: 'circle',
        x: 300,
        y: 200,
        radius: 50
      }
    ];

    // Track actual state changes to make mocks more realistic
    let currentSelectedId = null;
    let currentLocalUpdates = {};

    // Mock state functions with actual state tracking
    const mockSetters = {
      setSelectedObjectId: vi.fn((id) => { currentSelectedId = id; }),
      setMoveSelectedId: vi.fn(),
      setIsMoving: vi.fn(),
      setMoveStartPos: vi.fn(),
      setMouseDownPos: vi.fn(),
      setIsDragThresholdExceeded: vi.fn(),
      setMoveOriginalPos: vi.fn(),
      setLocalRectUpdates: vi.fn((updater) => { 
        currentLocalUpdates = typeof updater === 'function' ? updater(currentLocalUpdates) : updater; 
      })
    };

    mockState = {
      // Dynamic state - updates when setters are called
      get selectedObjectId() { return currentSelectedId; },
      canvasObjects,
      get localRectUpdates() { return currentLocalUpdates; },
      
      // Mock functions
      findObjectAt: vi.fn(),
      canEditObject: vi.fn(() => true),
      doWeOwnObject: vi.fn(() => true),
      clampCircleToCanvas: vi.fn((obj) => obj),
      ...mockSetters
    };

    mockHelpers = {
      pos: { x: 0, y: 0 },
      canvasId: 'test-canvas'
    };

    // Mock the dynamic import for canvas service
    vi.doMock('../../services/canvas.service.js', () => ({
      lockObject: vi.fn().mockResolvedValue(undefined),
      unlockObject: vi.fn().mockResolvedValue(undefined)
    }));
  });

  it('should use fresh object position when auto-selecting different objects', async () => {
    // Test Case: Reproduce the exact bug scenario
    // 1. Move circle-1 up 10px (simulated by having localRectUpdates)
    // 2. Switch to circle-2 
    // 3. Verify circle-2 uses its own position (300, 200), not circle-1's moved position

    // Step 1: Simulate circle-1 being moved and having local updates
    const circle1MovedPosition = { x: 100, y: 90 }; // Moved up 10px
    mockState.setLocalRectUpdates({
      'circle-1': {
        ...mockState.canvasObjects[0],
        ...circle1MovedPosition
      }
    });

    // Step 2: Auto-select circle-2 (click on circle-2)
    mockState.findObjectAt.mockReturnValue(mockState.canvasObjects[1]); // Returns circle-2
    mockHelpers.pos = { x: 300, y: 200 }; // Click position on circle-2

    await moveTool.onMouseDown({}, mockState, mockHelpers);

    // Step 3: Verify the fix
    expect(mockState.setMoveOriginalPos).toHaveBeenCalledWith({
      x: 300, // Should be circle-2's original position
      y: 200  // NOT circle-1's moved position (100, 90)
    });

    // Additional verification: Should set selectedObjectId to circle-2
    expect(mockState.setSelectedObjectId).toHaveBeenCalledWith('circle-2');
  });

  it('should clear previous object state when switching selections', async () => {
    // Step 1: Start with circle-1 selected
    mockState.setSelectedObjectId('circle-1'); // Use setter to update state properly
    mockState.setLocalRectUpdates({
      'circle-1': { x: 100, y: 90, radius: 50 } // Has local updates
    });

    // Step 2: Click on circle-2 (different object)
    mockState.findObjectAt.mockReturnValue(mockState.canvasObjects[1]);
    mockHelpers.pos = { x: 300, y: 200 };

    await moveTool.onMouseDown({}, mockState, mockHelpers);

    // Verify state cleanup was called
    expect(mockState.setIsMoving).toHaveBeenCalledWith(false);
    expect(mockState.setMoveStartPos).toHaveBeenCalledWith(null);
    expect(mockState.setMouseDownPos).toHaveBeenCalledWith(null);
    expect(mockState.setIsDragThresholdExceeded).toHaveBeenCalledWith(false);
    expect(mockState.setMoveOriginalPos).toHaveBeenCalledWith(null);

    // Verify localRectUpdates cleanup
    expect(mockState.setLocalRectUpdates).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should use correct starting position for movement calculations', () => {
    // This test verifies the movement calculations use the correct base position

    // Mock moving state setup
    mockState.setSelectedObjectId('circle-2');
    const mockStateWithProperties = {
      ...mockState,
      isDragThresholdExceeded: true,
      isMoving: true,
      moveStartPos: { x: 300, y: 200 }, // Where drag started
      moveOriginalPos: { x: 300, y: 200 }, // Original object position (our fix ensures this is correct)
      mouseDownPos: { x: 300, y: 200 }
    };

    // Simulate mouse move 10px to the left
    mockHelpers.pos = { x: 290, y: 200 };

    moveTool.onMouseMove({}, mockStateWithProperties, mockHelpers);

    // Verify local update uses correct calculation
    expect(mockState.setLocalRectUpdates).toHaveBeenCalledWith(expect.any(Function));
    
    // Verify the calculation: moveOriginalPos (300, 200) + delta (-10, 0) = (290, 200)
    const updateFunction = mockState.setLocalRectUpdates.mock.calls[0][0];
    const result = updateFunction({});
    
    expect(result['circle-2']).toEqual(expect.objectContaining({
      x: 290, // 300 + (-10)
      y: 200  // 200 + (0)
    }));
  });

  it('should handle edge case where object is not found', async () => {
    // Test robustness: What if object doesn't exist in canvasObjects?
    
    mockState.setSelectedObjectId('nonexistent-object');
    mockState.findObjectAt.mockReturnValue({ id: 'nonexistent-object' });

    // Should not throw error, should return early
    await expect(moveTool.onMouseDown({}, mockState, mockHelpers)).resolves.toBeUndefined();

    // Should not set moveOriginalPos for nonexistent object
    expect(mockState.setMoveOriginalPos).not.toHaveBeenCalled();
  });

  it('should work correctly when no localRectUpdates exist', async () => {
    // Test that the fix works when there are no local updates
    
    mockState.setLocalRectUpdates({}); // Empty - no previous movements
    mockState.findObjectAt.mockReturnValue(mockState.canvasObjects[0]); // circle-1
    mockHelpers.pos = { x: 100, y: 100 };

    await moveTool.onMouseDown({}, mockState, mockHelpers);

    // Should still use correct Firestore position
    expect(mockState.setMoveOriginalPos).toHaveBeenCalledWith({
      x: 100,
      y: 100
    });
  });
});

/**
 * Integration Test: Full workflow simulation
 */
describe('MoveTool Full Workflow Integration', () => {
  it('should handle complete move-switch-move scenario', async () => {
    // This test simulates the exact user workflow that caused the bug
    
    const moveTool = new MoveTool();
    
    // Setup two circles
    const canvasObjects = [
      { id: 'circle-1', type: 'circle', x: 100, y: 100, radius: 50 },
      { id: 'circle-2', type: 'circle', x: 300, y: 200, radius: 50 }
    ];

    // Track state changes through workflow
    let currentSelectedId = null;
    let currentMoveOriginalPos = null;
    let currentLocalUpdates = {};

    const mockState = {
      get selectedObjectId() { return currentSelectedId; },
      canvasObjects,
      get localRectUpdates() { return currentLocalUpdates; },
      
      setSelectedObjectId: vi.fn((id) => { currentSelectedId = id; }),
      setMoveOriginalPos: vi.fn((pos) => { currentMoveOriginalPos = pos; }),
      setLocalRectUpdates: vi.fn((updater) => { 
        currentLocalUpdates = typeof updater === 'function' ? updater(currentLocalUpdates) : updater; 
      }),
      
      // Other required mocks
      findObjectAt: vi.fn(),
      canEditObject: vi.fn(() => true),
      doWeOwnObject: vi.fn(() => true),
      setIsMoving: vi.fn(),
      setMoveStartPos: vi.fn(),
      setMouseDownPos: vi.fn(),
      setIsDragThresholdExceeded: vi.fn()
    };

    // Mock dynamic import
    vi.doMock('../../services/canvas.service.js', () => ({
      lockObject: vi.fn().mockResolvedValue(undefined),
      unlockObject: vi.fn().mockResolvedValue(undefined)
    }));

    // Step 1: Select and "move" circle-1 (simulate local updates)
    mockState.findObjectAt.mockReturnValue(canvasObjects[0]);
    await moveTool.onMouseDown({}, mockState, { pos: { x: 100, y: 100 }, canvasId: 'test' });
    
    // Simulate movement of circle-1 up 10px
    currentLocalUpdates['circle-1'] = { ...canvasObjects[0], x: 100, y: 90 };

    // Step 2: Switch to circle-2
    mockState.findObjectAt.mockReturnValue(canvasObjects[1]);
    await moveTool.onMouseDown({}, mockState, { pos: { x: 300, y: 200 }, canvasId: 'test' });

    // Verify: circle-2 should use its own position (300, 200), not circle-1's moved position (100, 90)
    expect(currentMoveOriginalPos).toEqual({ x: 300, y: 200 });
    expect(currentSelectedId).toBe('circle-2');
    
    // The bug would have caused moveOriginalPos to be { x: 100, y: 90 } (circle-1's moved position)
    // With our fix, it should be { x: 300, y: 200 } (circle-2's actual position)
  });
});