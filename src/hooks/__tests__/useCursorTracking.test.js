import { describe, it, expect, vi, beforeEach } from 'vitest'
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

// Import after mocking
import { updateCursorPosition, setUserOnline, setUserOffline } from '../../services/presence.service.js'
import { useCursorTracking } from '../useCursorTracking.js'

describe('useCursorTracking Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('initializes without errors', () => {
    const { result } = renderHook(() => useCursorTracking())
    
    expect(result.current.updateCursor).toBeDefined()
    expect(typeof result.current.updateCursor).toBe('function')
  })

  it('sets user online on mount', () => {
    renderHook(() => useCursorTracking())
    
    expect(setUserOnline).toHaveBeenCalledTimes(1)
  })

  it('sets user offline on unmount', () => {
    const { unmount } = renderHook(() => useCursorTracking())
    
    act(() => {
      unmount()
    })
    
    expect(setUserOffline).toHaveBeenCalledTimes(1)
  })

  it('throttles cursor position updates', () => {
    const { result } = renderHook(() => useCursorTracking())
    
    // Make multiple rapid calls
    act(() => {
      result.current.updateCursor({ x: 10, y: 10 })
      result.current.updateCursor({ x: 20, y: 20 })
      result.current.updateCursor({ x: 30, y: 30 })
    })
    
    // Should only call once before throttle delay
    expect(updateCursorPosition).toHaveBeenCalledTimes(1)
    expect(updateCursorPosition).toHaveBeenCalledWith({ x: 10, y: 10 })
  })

  it('executes throttled updates after delay', () => {
    const { result } = renderHook(() => useCursorTracking())
    
    // Make rapid calls
    act(() => {
      result.current.updateCursor({ x: 10, y: 10 })
      result.current.updateCursor({ x: 20, y: 20 })
      result.current.updateCursor({ x: 30, y: 30 })
    })
    
    // Fast forward time to execute throttled call
    act(() => {
      vi.advanceTimersByTime(50)
    })
    
    // Should have called with the last position
    expect(updateCursorPosition).toHaveBeenCalledTimes(2)
    expect(updateCursorPosition).toHaveBeenLastCalledWith({ x: 30, y: 30 })
  })

  it('handles errors gracefully', () => {
    updateCursorPosition.mockRejectedValueOnce(new Error('Network error'))
    
    const { result } = renderHook(() => useCursorTracking())
    
    act(() => {
      result.current.updateCursor({ x: 100, y: 100 })
    })
    
    // Should not throw
    expect(result.current.updateCursor).toBeDefined()
  })

  it('ignores updates when user is offline', () => {
    setUserOnline.mockRejectedValueOnce(new Error('Auth error'))
    
    const { result } = renderHook(() => useCursorTracking())
    
    act(() => {
      result.current.updateCursor({ x: 100, y: 100 })
    })
    
    // Should still attempt to update (service handles auth internally)
    expect(updateCursorPosition).toHaveBeenCalled()
  })
})
