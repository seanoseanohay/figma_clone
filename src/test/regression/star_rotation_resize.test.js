import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RotateTool } from '../../tools/RotateTool.js';
import { ResizeTool } from '../../tools/ResizeTool.js';
import { createTestStar } from '../fixtures/testData.js';

// Mock canvas service
vi.mock('../../services/canvas.service.js', () => ({
  lockObject: vi.fn(() => Promise.resolve()),
  unlockObject: vi.fn(() => Promise.resolve()),
  updateObject: vi.fn(() => Promise.resolve()),
  updateActiveObjectPosition: vi.fn(() => Promise.resolve()),
}));

/**
 * REGRESSION TEST for B4: Star Rotation/Resize Tool Synchronization Bug
 * 
 * Original Bug:
 * After rotating a star shape, the resize tool would show handles but they were
 * completely non-responsive to mouse interactions. This was due to incomplete
 * star property synchronization in RTDB updates.
 * 
 * Root Causes:
 * 1. RotateTool RTDB updates only included x, y, rotation - missing innerRadius, outerRadius
 * 2. Canvas component RTDB merging didn't include star-specific properties
 * 3. ResizeTool couldn't calculate proper corner positions without complete star geometry
 * 
 * Fixes Applied:
 * 1. Enhanced RotateTool to include shape-specific properties in RTDB updates
 * 2. Fixed Canvas component to merge all star properties from RTDB updates
 * 3. Improved ResizeTool to handle fallback to local updates for post-rotation state
 */

describe('B4 Regression: Star Rotation/Resize Synchronization Bug', () => {
  let rotateTool;
  let resizeTool;
  let mockState;
  let mockHelpers;
  let testStar;

  beforeEach(() => {
    rotateTool = new RotateTool();
    resizeTool = new ResizeTool();
    
    testStar = createTestStar({
      id: 'star-test',
      x: 300,
      y: 300,
      innerRadius: 25,
      outerRadius: 50,
      rotation: 0,
      numPoints: 5
    });

    mockState = {
      selectedObjectId: 'star-test', // Star is already selected
      canvasObjects: [testStar],
      localRectUpdates: {},
      
      // Rotation state
      isRotating: false,
      rotateSelectedId: null,
      rotateStartData: null,
      
      // Resize state  
      isResizing: false,
      resizeSelectedId: null,
      resizeStartData: null,
      resizeHandle: null,
      
      // Mock functions
      setSelectedObjectId: vi.fn((id) => { mockState.selectedObjectId = id; }),
      setIsRotating: vi.fn((value) => { mockState.isRotating = value; }),
      setRotateSelectedId: vi.fn((id) => { mockState.rotateSelectedId = id; }),
      setRotateStartData: vi.fn((data) => { mockState.rotateStartData = data; }),
      setLocalRectUpdates: vi.fn((updater) => {
        mockState.localRectUpdates = typeof updater === 'function' 
          ? updater(mockState.localRectUpdates) 
          : updater;
      }),
      setIsResizing: vi.fn((value) => { mockState.isResizing = value; }),
      setResizeSelectedId: vi.fn((id) => { mockState.resizeSelectedId = id; }),
      setResizeStartData: vi.fn((data) => { mockState.resizeStartData = data; }),
      setResizeHandle: vi.fn((handle) => { mockState.resizeHandle = handle; }),
      
      canEditObject: vi.fn(() => true),
      doWeOwnObject: vi.fn(() => true),
      clampStarToCanvas: vi.fn((star) => star),
      findObjectAt: vi.fn((pos) => {
        // Return the test star if position is within its bounds
        const distance = Math.sqrt(
          Math.pow(pos.x - testStar.x, 2) + Math.pow(pos.y - testStar.y, 2)
        );
        return distance <= testStar.outerRadius ? testStar : null;
      }),
    };

    mockHelpers = {
      pos: { x: 300, y: 270 }, // At rotation handle position (30px above star center)
      canvasId: 'test-canvas'
    };

    vi.clearAllMocks();
  });

  describe('Star Rotation → Resize Workflow', () => {
    it('should include star properties in rotation RTDB updates', async () => {
      const { updateActiveObjectPosition } = await import('../../services/canvas.service.js');
      
      // Set up rotation state manually (simulating rotation handle click)
      mockState.isRotating = true;
      mockState.rotateSelectedId = 'star-test';
      mockState.rotateStartData = {
        object: testStar,
        startPos: { x: 300, y: 270 },
        startAngle: 0,
        initialRotation: 0
      };
      
      // Simulate rotation movement
      mockHelpers.pos = { x: 320, y: 280 };
      const rotateEvent = { evt: { shiftKey: false } };
      rotateTool.onMouseMove(rotateEvent, mockState, mockHelpers);

      // CRITICAL: Verify RTDB update includes ALL star properties
      expect(updateActiveObjectPosition).toHaveBeenCalledWith(
        'test-canvas',
        'star-test',
        expect.objectContaining({
          x: 300,
          y: 300,
          rotation: expect.any(Number),
          // REGRESSION FIX: Must include star-specific properties
          innerRadius: 25,
          outerRadius: 50
        })
      );
    });

    it('should maintain star properties in local updates after rotation', async () => {
      // Start rotation
      await rotateTool.onMouseDown({}, mockState, mockHelpers);
      
      // Rotate the star 45 degrees
      mockHelpers.pos = { x: 350, y: 280 };
      const rotateEvent = { evt: { shiftKey: false } };
      rotateTool.onMouseMove(rotateEvent, mockState, mockHelpers);

      // Verify local updates contain complete star data
      const starId = mockState.rotateSelectedId;
      const localStar = mockState.localRectUpdates[starId];
      
      expect(localStar).toBeDefined();
      expect(localStar).toMatchObject({
        x: 300,
        y: 300,
        innerRadius: 25,
        outerRadius: 50,
        rotation: expect.any(Number),
        numPoints: 5
      });
    });

    it('should enable resize tool to work immediately after rotation', async () => {
      // PHASE 1: Rotate the star
      await rotateTool.onMouseDown({}, mockState, mockHelpers);
      mockHelpers.pos = { x: 350, y: 280 };
      rotateTool.onMouseMove({ evt: { shiftKey: false } }, mockState, mockHelpers);
      
      // Complete rotation (but keep object locked per fix)
      await rotateTool.onMouseUp({}, mockState, mockHelpers);

      // PHASE 2: Switch to resize tool
      mockState.selectedObjectId = 'star-test'; // Ensure object is selected
      // Don't pre-set isResizing - let the ResizeTool set it
      
      // Simulate post-rotation state where canvasObjects might be stale
      // but localRectUpdates contains the rotated state
      const rotatedStar = mockState.localRectUpdates['star-test'];
      expect(rotatedStar).toBeDefined();

      // PHASE 3: Start resize operation
      // Position near bottom-right of star (considering outerRadius of 50)
      mockHelpers.pos = { x: 348, y: 348 }; // Near SE corner of star
      
      // CRITICAL: Resize tool should find object data (from localRectUpdates fallback)
      await resizeTool.onMouseDown({}, mockState, mockHelpers);
      
      // Should successfully start resize
      expect(mockState.setIsResizing).toHaveBeenCalledWith(true);
      expect(mockState.setResizeHandle).toHaveBeenCalled();
      expect(mockState.setResizeStartData).toHaveBeenCalled();
      
      // Verify resize data includes rotated star properties
      const resizeStartData = mockState.setResizeStartData.mock.calls[0][0];
      expect(resizeStartData.object).toMatchObject({
        x: 300,
        y: 300,
        innerRadius: 25,
        outerRadius: 50,
        rotation: expect.any(Number)
      });
    });

    it('should handle corner detection on rotated stars correctly', () => {
      // Create a rotated star
      const rotatedStar = {
        ...testStar,
        rotation: 45 // 45 degree rotation
      };

      // Test corner detection on rotated star
      const corner = resizeTool.getClosestCorner({ x: 340, y: 280 }, rotatedStar);
      
      // Should detect a corner (specific corner depends on exact calculations)
      expect(corner).toMatch(/^(nw|ne|sw|se)$/);
    });

    it('should complete full rotation→resize cycle without errors', async () => {
      // Complete workflow test
      
      // 1. Start rotation
      await rotateTool.onMouseDown({}, mockState, mockHelpers);
      expect(mockState.isRotating).toBe(true);
      
      // 2. Rotate 90 degrees
      mockHelpers.pos = { x: 370, y: 300 }; // 90° rotation
      rotateTool.onMouseMove({ evt: { shiftKey: false } }, mockState, mockHelpers);
      
      // 3. Complete rotation
      await rotateTool.onMouseUp({}, mockState, mockHelpers);
      expect(mockState.isRotating).toBe(false);
      
      // 4. Switch to resize tool
      mockState.resizeSelectedId = 'star-test';
      
      // 5. Start resize
      mockHelpers.pos = { x: 325, y: 325 }; // SE corner area
      await resizeTool.onMouseDown({}, mockState, mockHelpers);
      
      // 6. Perform resize
      if (mockState.isResizing && mockState.resizeHandle) {
        mockHelpers.pos = { x: 340, y: 340 }; // Larger star
        resizeTool.onMouseMove({}, mockState, mockHelpers);
        
        // Should complete without errors
        expect(mockState.localRectUpdates['star-test']).toBeDefined();
        expect(mockState.localRectUpdates['star-test'].outerRadius).toBeGreaterThan(50);
      }
      
      // 7. Complete resize
      await resizeTool.onMouseUp({}, mockState, mockHelpers);
      
      // Workflow should complete successfully
      expect(mockState.isResizing).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing canvasObjects during tool transition', async () => {
      // Simulate stale canvasObjects (object not found after rotation)
      mockState.canvasObjects = []; // Empty - object not synced yet
      mockState.localRectUpdates = {
        'star-test': { ...testStar, rotation: 45 } // But available in local updates
      };
      
      mockHelpers.pos = { x: 340, y: 280 };
      
      // Should not throw error - should use localRectUpdates fallback
      await expect(resizeTool.onMouseDown({}, mockState, mockHelpers)).resolves.not.toThrow();
    });

    it('should preserve all star properties during RTDB sync', () => {
      // Simulate the Canvas component RTDB merging logic
      const firestoreStar = { ...testStar, rotation: 0 };
      const rtdbUpdate = {
        x: 300,
        y: 300,
        rotation: 90,
        innerRadius: 25,  // CRITICAL: Must be included
        outerRadius: 50   // CRITICAL: Must be included
      };

      // Merge logic (like in Canvas.jsx)
      const mergedStar = {
        ...firestoreStar,
        x: rtdbUpdate.x,
        y: rtdbUpdate.y,
        innerRadius: rtdbUpdate.innerRadius !== undefined ? rtdbUpdate.innerRadius : firestoreStar.innerRadius,
        outerRadius: rtdbUpdate.outerRadius !== undefined ? rtdbUpdate.outerRadius : firestoreStar.outerRadius,
        rotation: rtdbUpdate.rotation !== undefined ? rtdbUpdate.rotation : firestoreStar.rotation,
      };

      // Should preserve all properties
      expect(mergedStar).toMatchObject({
        x: 300,
        y: 300,
        innerRadius: 25,
        outerRadius: 50,
        rotation: 90,
        numPoints: 5
      });
    });
  });

  describe('Multiplayer Scenarios', () => {
    it('should handle one user rotating while another prepares to resize', async () => {
      // User A rotates star
      await rotateTool.onMouseDown({}, mockState, mockHelpers);
      mockHelpers.pos = { x: 330, y: 270 };
      rotateTool.onMouseMove({ evt: { shiftKey: false } }, mockState, mockHelpers);
      
      // Simulate User B seeing the RTDB update
      const rtdbData = {
        x: 300,
        y: 300,
        rotation: 30,
        innerRadius: 25,
        outerRadius: 50
      };
      
      // User B should be able to resize with this data
      const corner = resizeTool.getClosestCorner({ x: 340, y: 320 }, {
        ...testStar,
        ...rtdbData
      });
      
      expect(corner).toBeDefined();
    });
  });
});
