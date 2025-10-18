import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock the presence service
vi.mock('../../services/presence.service.js', () => ({
  subscribeToCanvasPresence: vi.fn(),
  getOnlineUserCount: vi.fn(),
  isUserRecentlyActive: vi.fn()
}))

// Mock the useCanvas hook
vi.mock('../useCanvas.js', () => ({
  useCanvas: vi.fn()
}))

// Import after mocking
import { subscribeToCanvasPresence, getOnlineUserCount, isUserRecentlyActive } from '../../services/presence.service.js'
import { useCanvas } from '../useCanvas.js'
import { usePresence } from '../usePresence.js'

describe('usePresence Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock useCanvas to provide test canvasId
    useCanvas.mockReturnValue({
      canvasId: 'test-canvas-id'
    })
  })

  it('initializes with empty users array', () => {
    // Mock subscription to return no-op unsubscribe
    subscribeToCanvasPresence.mockReturnValue(() => {})
    
    const { result } = renderHook(() => usePresence())
    
    expect(result.current.users).toEqual([])
    expect(result.current.onlineCount).toBe(0)
    expect(result.current.isLoading).toBe(true)
  })

  it('subscribes to presence updates on mount', () => {
    subscribeToCanvasPresence.mockReturnValue(() => {})
    
    renderHook(() => usePresence())
    
    expect(subscribeToCanvasPresence).toHaveBeenCalledWith('test-canvas-id', expect.any(Function))
  })

  it('unsubscribes on unmount', () => {
    const mockUnsubscribe = vi.fn()
    subscribeToCanvasPresence.mockReturnValue(mockUnsubscribe)
    
    const { unmount } = renderHook(() => usePresence())
    
    act(() => {
      unmount()
    })
    
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })

  it('updates users when presence data changes', () => {
    let presenceCallback
    
    subscribeToCanvasPresence.mockImplementation((canvasId, callback) => {
      presenceCallback = callback
      return () => {}
    })
    
    const { result } = renderHook(() => usePresence())
    
    // Simulate presence update (canvas-scoped presence data structure)
    const mockUsers = [
      { userId: 'user1', displayName: 'User One', lastActive: Date.now(), connectedAt: Date.now() },
      { userId: 'user2', displayName: 'User Two', lastActive: Date.now() - 5000, connectedAt: Date.now() - 5000 }
    ]
    
    act(() => {
      presenceCallback(mockUsers)
    })
    
    expect(result.current.users).toEqual(mockUsers)
    expect(result.current.isLoading).toBe(false)
  })

  it('calculates online count correctly', () => {
    let presenceCallback
    
    subscribeToCanvasPresence.mockImplementation((canvasId, callback) => {
      presenceCallback = callback
      return () => {}
    })
    
    getOnlineUserCount.mockReturnValue(3)
    
    const { result } = renderHook(() => usePresence())
    
    const mockUsers = [
      { userId: 'user1', lastActive: Date.now() },
      { userId: 'user2', lastActive: Date.now() },
      { userId: 'user3', lastActive: Date.now() }
    ]
    
    act(() => {
      presenceCallback(mockUsers)
    })
    
    expect(getOnlineUserCount).toHaveBeenCalledWith(mockUsers)
    expect(result.current.onlineCount).toBe(3)
  })

  it('provides utility functions', () => {
    subscribeToCanvasPresence.mockReturnValue(() => {})
    
    const { result } = renderHook(() => usePresence())
    
    expect(result.current.getUserById).toBeDefined()
    expect(result.current.isUserActive).toBeDefined()
    expect(typeof result.current.getUserById).toBe('function')
    expect(typeof result.current.isUserActive).toBe('function')
  })

  it('finds user by ID correctly', () => {
    let presenceCallback
    
    subscribeToCanvasPresence.mockImplementation((canvasId, callback) => {
      presenceCallback = callback
      return () => {}
    })
    
    const { result } = renderHook(() => usePresence())
    
    const mockUsers = [
      { userId: 'user1', displayName: 'User One' },
      { userId: 'user2', displayName: 'User Two' }
    ]
    
    act(() => {
      presenceCallback(mockUsers)
    })
    
    const foundUser = result.current.getUserById('user1')
    expect(foundUser).toEqual({ userId: 'user1', displayName: 'User One' })
    
    const notFoundUser = result.current.getUserById('user999')
    expect(notFoundUser).toBeNull()
  })

  it('checks user activity correctly', () => {
    subscribeToCanvasPresence.mockReturnValue(() => {})
    isUserRecentlyActive.mockReturnValue(true)
    
    const { result } = renderHook(() => usePresence())
    
    const mockUser = { userId: 'user1', lastActive: Date.now() - 10000 }
    
    const isActive = result.current.isUserActive(mockUser)
    
    expect(isUserRecentlyActive).toHaveBeenCalledWith(mockUser)
    expect(isActive).toBe(true)
  })

  it('handles subscription errors gracefully', () => {
    subscribeToCanvasPresence.mockImplementation(() => {
      throw new Error('Subscription failed')
    })
    
    const { result } = renderHook(() => usePresence())
    
    expect(result.current.users).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeDefined()
  })

  it('filters and sorts users correctly', () => {
    let presenceCallback
    
    subscribeToCanvasPresence.mockImplementation((canvasId, callback) => {
      presenceCallback = callback
      return () => {}
    })
    
    const { result } = renderHook(() => usePresence())
    
    const mockUsers = [
      { userId: 'user2', displayName: 'Beta User', connectedAt: Date.now() - 1000 },
      { userId: 'user1', displayName: 'Alpha User', connectedAt: Date.now() },
      { userId: 'user3', displayName: 'Gamma User', connectedAt: Date.now() - 2000 }
    ]
    
    act(() => {
      presenceCallback(mockUsers)
    })
    
    // Should be sorted by connectedAt (most recent first)
    expect(result.current.users[0].userId).toBe('user1')
    expect(result.current.users[1].userId).toBe('user2')
    expect(result.current.users[2].userId).toBe('user3')
  })
})
