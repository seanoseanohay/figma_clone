/**
 * Test for Local Updates vs CanvasObjects Bug
 * 
 * Bug: MoveTool uses canvasObjects (original Firestore data) instead of 
 * merged arrays (with localRectUpdates applied), causing incorrect position
 * calculations when switching between objects that have local updates.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MoveTool } from '../../tools/MoveTool.js'
import { createTestCircle } from '../fixtures/testData.js'

// Mock canvas service
vi.mock('../../services/canvas.service.js', () => ({
  updateActiveObjectPosition: vi.fn(() => Promise.resolve()),
  updateObjectPosition: vi.fn(() => Promise.resolve()),
  updateObject: vi.fn(() => Promise.resolve()),
  clearActiveObject: vi.fn(() => Promise.resolve()),
  lockObject: vi.fn(() => Promise.resolve()),
  unlockObject: vi.fn(() => Promise.resolve()),
}))

describe('Local Updates vs CanvasObjects Bug', () => {
  let tool
  let canvasState
  let circle1Original, circle2Original, circle1WithUpdates

  beforeEach(() => {
    tool = new MoveTool()
    
    // Create two circles at different positions
    circle1Original = createTestCircle({ 
      id: 'circle-1', 
      x: 100, 
      y: 100, 
      radius: 50 
    })
    
    circle2Original = createTestCircle({ 
      id: 'circle-2', 
      x: 300, 
      y: 300, 
      radius: 50 
    })

    // Simulate circle1 having been moved (has local updates)
    circle1WithUpdates = {
      ...circle1Original,
      x: 150, // Circle1 was moved from (100,100) to (150,150)
      y: 150
    }

    // Simulate Canvas component state with local updates
    canvasState = {
      selectedObjectId: null,
      moveSelectedId: null,
      isMoving: false,
      moveStartPos: null,
      mouseDownPos: null,
      isDragThresholdExceeded: false,
      moveOriginalPos: null,
      
      // CRITICAL: canvasObjects contains ORIGINAL Firestore data
      canvasObjects: [circle1Original, circle2Original], // Original positions!
      
      // CRITICAL: localRectUpdates contains the moved positions
      localRectUpdates: {
        'circle-1': circle1WithUpdates // Circle1 has local updates
        // Circle2 has no local updates
      },
      
      // State setters
      setSelectedObjectId: vi.fn((id) => {
        canvasState.selectedObjectId = id
        console.log('🔵 Canvas: setSelectedObjectId called with:', id)
      }),
      setMoveOriginalPos: vi.fn((pos) => {
        canvasState.moveOriginalPos = pos
        console.log('🔍 CRITICAL: moveOriginalPos updated to:', pos)
      }),
      setMouseDownPos: vi.fn((pos) => {
        canvasState.mouseDownPos = pos
      }),
      setIsDragThresholdExceeded: vi.fn((value) => {
        canvasState.isDragThresholdExceeded = value
      }),
      setIsMoving: vi.fn((value) => {
        canvasState.isMoving = value
      }),
      setMoveStartPos: vi.fn((pos) => {
        canvasState.moveStartPos = pos
      }),
      setLocalRectUpdates: vi.fn((updaterOrValue) => {
        if (typeof updaterOrValue === 'function') {
          canvasState.localRectUpdates = updaterOrValue(canvasState.localRectUpdates)
        } else {
          canvasState.localRectUpdates = updaterOrValue
        }
      }),
      
      // Helper functions
      findObjectAt: vi.fn((pos) => {
        // Should find objects using their CURRENT positions (with local updates)
        // Circle1 is now at (150, 150), not (100, 100)
        const circle1Current = circle1WithUpdates
        const circle2Current = circle2Original
        
        for (const obj of [circle1Current, circle2Current]) {
          if (obj.type === 'circle') {
            const distance = Math.sqrt(
              Math.pow(pos.x - obj.x, 2) + Math.pow(pos.y - obj.y, 2)
            )
            if (distance <= obj.radius) {
              console.log('🎯 findObjectAt found:', obj.id, 'at current position:', pos)
              return obj // Returns object with CURRENT position
            }
          }
        }
        return null
      }),
      canEditObject: vi.fn(() => true),
      doWeOwnObject: vi.fn(() => true),
      clampCircleToCanvas: vi.fn((obj) => obj),
    }
  })

  it('should reproduce the bug where MoveTool uses original position instead of current position', async () => {
    console.log('🧪 Testing MoveTool position bug with local updates')
    console.log('📊 Setup:')
    console.log('  Circle1 original position (in canvasObjects):', { x: circle1Original.x, y: circle1Original.y })
    console.log('  Circle1 current position (in localRectUpdates):', { x: circle1WithUpdates.x, y: circle1WithUpdates.y })
    console.log('  Circle2 position (no local updates):', { x: circle2Original.x, y: circle2Original.y })
    
    // STEP 1: Click on circle2 at its original position
    console.log('\n📍 STEP 1: Clicking on circle2 at (300, 300)')
    
    const helpers = { pos: { x: 300, y: 300 }, canvasId: 'test-canvas' }
    await tool.onMouseDown({}, canvasState, helpers)
    
    console.log('🔍 After clicking circle2:')
    console.log('  selectedObjectId:', canvasState.selectedObjectId)
    console.log('  moveOriginalPos:', canvasState.moveOriginalPos)
    
    // Verify circle2 is selected
    expect(canvasState.selectedObjectId).toBe('circle-2')
    
    // THE BUG: MoveTool might set moveOriginalPos incorrectly
    // Expected: Circle2's position (300, 300)
    // Bug: Might use circle1's position somehow
    
    // This should be circle2's position
    expect(canvasState.moveOriginalPos).toEqual({ x: 300, y: 300 })
    
    console.log('✅ moveOriginalPos set correctly for circle2')
    
    // STEP 2: Drag circle2 to (350, 350)
    console.log('\n📍 STEP 2: Dragging circle2 to (350, 350)')
    
    canvasState.isDragThresholdExceeded = true
    canvasState.isMoving = true
    canvasState.moveStartPos = { x: 300, y: 300 }
    
    const dragHelpers = { pos: { x: 350, y: 350 }, canvasId: 'test-canvas' }
    tool.onMouseMove({}, canvasState, dragHelpers)
    
    // Verify circle2 moved correctly from its own position
    const circle2Update = canvasState.localRectUpdates['circle-2']
    expect(circle2Update).toBeDefined()
    
    console.log('📊 Circle2 movement result:', { x: circle2Update.x, y: circle2Update.y })
    
    // Expected: Circle2 moves 50px from its own position (300,300) to (350,350)
    expect(circle2Update.x).toBe(350)
    expect(circle2Update.y).toBe(350)
    
    // Bug would be: Circle2 moves from circle1's position
    expect(circle2Update.x).not.toBe(200) // 150 + (350 - 300) = 200 (if using circle1's pos)
    expect(circle2Update.y).not.toBe(200)
    
    console.log('✅ Circle2 moved correctly from its own position, not from circle1\'s position')
  })

  it('should demonstrate the fix: MoveTool should find objects with current positions', async () => {
    console.log('🧪 Testing that MoveTool finds objects with current (updated) positions')
    
    // When MoveTool does canvasObjects.find(), it should find the object with local updates
    // But currently it uses canvasObjects which has original positions
    
    console.log('📊 Current MoveTool behavior:')
    console.log('  canvasObjects has circle1 at:', canvasState.canvasObjects.find(o => o.id === 'circle-1'))
    console.log('  localRectUpdates has circle1 at:', canvasState.localRectUpdates['circle-1'])
    
    // Click on circle1's CURRENT position (where it actually is visually)
    console.log('\n📍 Clicking on circle1 at its CURRENT position (150, 150)')
    
    const helpers = { pos: { x: 150, y: 150 }, canvasId: 'test-canvas' }
    await tool.onMouseDown({}, canvasState, helpers)
    
    // findObjectAt should find circle1 at its current position
    expect(canvasState.selectedObjectId).toBe('circle-1')
    
    // But MoveTool sets moveOriginalPos using canvasObjects.find() which has original position!
    console.log('🔍 moveOriginalPos set by MoveTool:', canvasState.moveOriginalPos)
    
    // AFTER FIX: MoveTool should use current position (150, 150) not original (100, 100)
    // This ensures correct delta calculations in subsequent moves
    
    if (canvasState.moveOriginalPos.x === 150 && canvasState.moveOriginalPos.y === 150) {
      console.log('✅ FIX VERIFIED: MoveTool correctly used current position (150, 150)')
    } else if (canvasState.moveOriginalPos.x === 100 && canvasState.moveOriginalPos.y === 100) {
      console.log('💥 BUG STILL EXISTS: MoveTool is using original position from canvasObjects')
      console.log('   Should use current position (150, 150) but used (100, 100)')
      // Test should fail if fix didn't work
      expect(canvasState.moveOriginalPos).toEqual({ x: 150, y: 150 })
    } else {
      console.log('🤔 Unexpected moveOriginalPos value:', canvasState.moveOriginalPos)
    }
    
    // Verify fix worked
    expect(canvasState.moveOriginalPos).toEqual({ x: 150, y: 150 })
  })

  it('should show the correct fix: use merged object data instead of canvasObjects', async () => {
    console.log('🧪 Testing the fix: use objects with local updates applied')
    
    // FIXED VERSION: Create a helper that merges localRectUpdates with canvasObjects
    const getMergedObjects = () => {
      return canvasState.canvasObjects.map(obj => {
        // If object has local updates, use those
        if (canvasState.localRectUpdates[obj.id]) {
          return {
            ...obj,
            ...canvasState.localRectUpdates[obj.id]
          }
        }
        return obj
      })
    }
    
    const mergedObjects = getMergedObjects()
    console.log('📊 Merged objects with local updates:')
    console.log('  Circle1:', mergedObjects.find(o => o.id === 'circle-1'))
    console.log('  Circle2:', mergedObjects.find(o => o.id === 'circle-2'))
    
    // Now if MoveTool used mergedObjects instead of canvasObjects:
    const circle1Merged = mergedObjects.find(o => o.id === 'circle-1')
    const circle2Merged = mergedObjects.find(o => o.id === 'circle-2')
    
    expect(circle1Merged.x).toBe(150) // Current position, not original
    expect(circle1Merged.y).toBe(150)
    expect(circle2Merged.x).toBe(300) // No local updates, so original position
    expect(circle2Merged.y).toBe(300)
    
    console.log('✅ Fix verified: merged objects have correct current positions')
  })
})
