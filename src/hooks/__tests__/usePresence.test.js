import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock the presence service
vi.mock('../../services/presence.service.js', () => ({
  subscribeToGlobalPresence: vi.fn(),
  getOnlineUserCount: vi.fn(),
  isUserRecentlyActive: vi.fn()
}))

// Import after mocking
import { subscribeToGlobalPresence, getOnlineUserCount, isUserRecentlyActive } from '../../services/presence.service.js'
import { usePresence } from '../usePresence.js'

describe('usePresence Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with empty users array', () => {
    // Mock subscription to return no-op unsubscribe
    subscribeToGlobalPresence.mockReturnValue(() => {})
    
    const { result } = renderHook(() => usePresence())
    
    expect(result.current.users).toEqual([])
    expect(result.current.onlineCount).toBe(0)
    expect(result.current.isLoading).toBe(true)
  })

  it('subscribes to presence updates on mount', () => {
    subscribeToGlobalPresence.mockReturnValue(() => {})
    
    renderHook(() => usePresence())
    
    expect(subscribeToGlobalPresence).toHaveBeenCalledWith(expect.any(Function))
  })

  it('unsubscribes on unmount', () => {
    const mockUnsubscribe = vi.fn()
    subscribeToGlobalPresence.mockReturnValue(mockUnsubscribe)
    
    const { unmount } = renderHook(() => usePresence())
    
    act(() => {
      unmount()
    })
    
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })

  it('updates users when presence data changes', () => {
    let presenceCallback
    
    subscribeToGlobalPresence.mockImplementation((callback) => {
      presenceCallback = callback
      return () => {}
    })
    
    const { result } = renderHook(() => usePresence())
    
    // Simulate presence update
    const mockUsers = [
      { uid: 'user1', displayName: 'User One', isOnline: true, lastSeen: Date.now() },
      { uid: 'user2', displayName: 'User Two', isOnline: true, lastSeen: Date.now() - 5000 }
    ]
    
    act(() => {
      presenceCallback(mockUsers)
    })
    
    expect(result.current.users).toEqual(mockUsers)
    expect(result.current.isLoading).toBe(false)
  })

  it('calculates online count correctly', () => {
    let presenceCallback
    
    subscribeToGlobalPresence.mockImplementation((callback) => {
      presenceCallback = callback
      return () => {}
    })
    
    getOnlineUserCount.mockReturnValue(3)
    
    const { result } = renderHook(() => usePresence())
    
    const mockUsers = [
      { uid: 'user1', isOnline: true },
      { uid: 'user2', isOnline: true },
      { uid: 'user3', isOnline: true },
      { uid: 'user4', isOnline: false }
    ]
    
    act(() => {
      presenceCallback(mockUsers)
    })
    
    expect(getOnlineUserCount).toHaveBeenCalledWith(mockUsers)
    expect(result.current.onlineCount).toBe(3)
  })

  it('provides utility functions', () => {
    subscribeToGlobalPresence.mockReturnValue(() => {})
    
    const { result } = renderHook(() => usePresence())
    
    expect(result.current.getUserById).toBeDefined()
    expect(result.current.isUserActive).toBeDefined()
    expect(typeof result.current.getUserById).toBe('function')
    expect(typeof result.current.isUserActive).toBe('function')
  })

  it('finds user by ID correctly', () => {
    let presenceCallback
    
    subscribeToGlobalPresence.mockImplementation((callback) => {
      presenceCallback = callback
      return () => {}
    })
    
    const { result } = renderHook(() => usePresence())
    
    const mockUsers = [
      { uid: 'user1', displayName: 'User One' },
      { uid: 'user2', displayName: 'User Two' }
    ]
    
    act(() => {
      presenceCallback(mockUsers)
    })
    
    const foundUser = result.current.getUserById('user1')
    expect(foundUser).toEqual({ uid: 'user1', displayName: 'User One' })
    
    const notFoundUser = result.current.getUserById('user999')
    expect(notFoundUser).toBeNull()
  })

  it('checks user activity correctly', () => {
    subscribeToGlobalPresence.mockReturnValue(() => {})
    isUserRecentlyActive.mockReturnValue(true)
    
    const { result } = renderHook(() => usePresence())
    
    const mockUser = { uid: 'user1', lastSeen: Date.now() - 10000 }
    
    const isActive = result.current.isUserActive(mockUser)
    
    expect(isUserRecentlyActive).toHaveBeenCalledWith(mockUser)
    expect(isActive).toBe(true)
  })

  it('handles subscription errors gracefully', () => {
    subscribeToGlobalPresence.mockImplementation(() => {
      throw new Error('Subscription failed')
    })
    
    const { result } = renderHook(() => usePresence())
    
    expect(result.current.users).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeDefined()
  })

  it('filters and sorts users correctly', () => {
    let presenceCallback
    
    subscribeToGlobalPresence.mockImplementation((callback) => {
      presenceCallback = callback
      return () => {}
    })
    
    const { result } = renderHook(() => usePresence())
    
    const mockUsers = [
      { uid: 'user2', displayName: 'Beta User', joinedAt: Date.now() - 1000 },
      { uid: 'user1', displayName: 'Alpha User', joinedAt: Date.now() },
      { uid: 'user3', displayName: 'Gamma User', joinedAt: Date.now() - 2000 }
    ]
    
    act(() => {
      presenceCallback(mockUsers)
    })
    
    // Should be sorted by joinedAt (most recent first)
    expect(result.current.users[0].uid).toBe('user1')
    expect(result.current.users[1].uid).toBe('user2')
    expect(result.current.users[2].uid).toBe('user3')
  })
})
