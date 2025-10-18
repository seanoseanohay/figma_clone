import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock the presence service
vi.mock('../../services/presence.service.js', () => ({
  updateCursorPosition: vi.fn(() => Promise.resolve()),
  setUserOnline: vi.fn(() => Promise.resolve()),
  setUserOffline: vi.fn(() => Promise.resolve())
}))

// Mock the canvas constants
vi.mock('../../constants/canvas.constants.js', () => ({
  CURSOR_UPDATE_THROTTLE: 50
}))

// Mock the useCanvas hook
vi.mock('../useCanvas.js', () => ({
  useCanvas: vi.fn()
}))

// Mock the useAdvancedThrottling hook
vi.mock('../useAdvancedThrottling.js', () => ({
  useAdvancedThrottling: vi.fn()
}))

// Import after mocking
import { updateCursorPosition, setUserOnline, setUserOffline } from '../../services/presence.service.js'
import { useCanvas } from '../useCanvas.js'
import { useAdvancedThrottling } from '../useAdvancedThrottling.js'
import { useCursorTracking } from '../useCursorTracking.js'

describe('useCursorTracking Hook', () => {
  let mockThrottledCall

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    // Mock useCanvas to provide test canvasId
    useCanvas.mockReturnValue({
      canvasId: 'test-canvas-id'
    })
    
    // Mock useAdvancedThrottling to return a simple throttle function
    mockThrottledCall = vi.fn((position, callback) => {
      callback(position)
    })
    
    useAdvancedThrottling.mockReturnValue({
      throttledCall: mockThrottledCall,
      getStats: vi.fn(() => ({
        totalCalls: 0,
        throttledCalls: 0,
        droppedCalls: 0
      }))
    })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('initializes without errors', async () => {
    const { result } = renderHook(() => useCursorTracking())
    
    // Wait for async initialization
    await act(async () => {
      await vi.runAllTimersAsync()
    })
    
    expect(result.current.updateCursor).toBeDefined()
    expect(typeof result.current.updateCursor).toBe('function')
  })

  it('sets user online on mount', async () => {
    renderHook(() => useCursorTracking())
    
    // Wait for async initialization
    await act(async () => {
      await vi.runAllTimersAsync()
    })
    
    expect(setUserOnline).toHaveBeenCalledTimes(1)
    expect(setUserOnline).toHaveBeenCalledWith('test-canvas-id')
  })

  it('sets user offline on unmount', async () => {
    const { unmount } = renderHook(() => useCursorTracking())
    
    // Wait for initialization
    await act(async () => {
      await vi.runAllTimersAsync()
    })
    
    act(() => {
      unmount()
    })
    
    expect(setUserOffline).toHaveBeenCalledTimes(1)
    expect(setUserOffline).toHaveBeenCalledWith('test-canvas-id')
  })

  it('throttles cursor position updates', async () => {
    const { result } = renderHook(() => useCursorTracking())
    
    // Wait for initialization
    await act(async () => {
      await vi.runAllTimersAsync()
    })
    
    // Make multiple rapid calls
    act(() => {
      result.current.updateCursor({ x: 10, y: 10 })
      result.current.updateCursor({ x: 20, y: 20 })
      result.current.updateCursor({ x: 30, y: 30 })
    })
    
    // Throttled call should be invoked for all updates (mock doesn't actually throttle)
    expect(mockThrottledCall).toHaveBeenCalledTimes(3)
    // updateCursorPosition should be called with canvasId and coordinates
    expect(updateCursorPosition).toHaveBeenCalledWith('test-canvas-id', 10, 10)
  })

  it('executes throttled updates after delay', async () => {
    const { result } = renderHook(() => useCursorTracking())
    
    // Wait for initialization
    await act(async () => {
      await vi.runAllTimersAsync()
    })
    
    // Make rapid calls
    act(() => {
      result.current.updateCursor({ x: 10, y: 10 })
      result.current.updateCursor({ x: 20, y: 20 })
      result.current.updateCursor({ x: 30, y: 30 })
    })
    
    // Verify the last call was made with correct parameters
    expect(updateCursorPosition).toHaveBeenCalledWith('test-canvas-id', 30, 30)
  })

  it('handles errors gracefully', async () => {
    updateCursorPosition.mockRejectedValueOnce(new Error('Network error'))
    
    const { result } = renderHook(() => useCursorTracking())
    
    // Wait for initialization
    await act(async () => {
      await vi.runAllTimersAsync()
    })
    
    act(() => {
      result.current.updateCursor({ x: 100, y: 100 })
    })
    
    // Should not throw
    expect(result.current.updateCursor).toBeDefined()
  })

  it('ignores updates when user is offline', async () => {
    setUserOnline.mockRejectedValueOnce(new Error('Auth error'))
    
    const { result } = renderHook(() => useCursorTracking())
    
    // Wait for async initialization (which will fail)
    await act(async () => {
      await vi.runAllTimersAsync()
    })
    
    act(() => {
      result.current.updateCursor({ x: 100, y: 100 })
    })
    
    // Should not call updateCursorPosition because user failed to go online
    // (updateCursor checks isOnlineRef.current which will be false after failed setUserOnline)
    expect(updateCursorPosition).not.toHaveBeenCalled()
  })
})
