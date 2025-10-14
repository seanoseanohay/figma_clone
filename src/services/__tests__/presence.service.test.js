import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase Realtime Database
vi.mock('../../services/firebase.js', () => {
  const mockRef = vi.fn(() => ({
    set: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    off: vi.fn(),
    onDisconnect: vi.fn(() => ({
      remove: vi.fn(() => Promise.resolve())
    }))
  }))

  return {
    rtdb: { ref: mockRef },
    auth: {
      currentUser: {
        uid: 'test-user-123',
        displayName: 'Test User',
        email: 'test@example.com'
      }
    }
  }
})

// Mock Firebase database functions
vi.mock('firebase/database', () => ({
  ref: vi.fn((db, path) => ({ path })),
  set: vi.fn(() => Promise.resolve()),
  update: vi.fn(() => Promise.resolve()),
  remove: vi.fn(() => Promise.resolve()),
  onDisconnect: vi.fn(() => ({ remove: vi.fn(() => Promise.resolve()) })),
  on: vi.fn(),
  off: vi.fn()
}))

// Import the service after mocking
import {
  updateCursorPosition,
  setUserOnline,
  setUserOffline,
  subscribeToGlobalPresence,
  getOnlineUserCount,
  isUserRecentlyActive
} from '../presence.service.js'

import { rtdb, auth } from '../../services/firebase.js'
import { ref, set, update, remove, onDisconnect, on, off } from 'firebase/database'

describe('Presence Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('updateCursorPosition', () => {
    it('updates user cursor position in realtime database', async () => {
      const position = { x: 100, y: 200 }
      
      await updateCursorPosition(position)
      
      expect(ref).toHaveBeenCalledWith(rtdb, '/globalCanvas/users/test-user-123')
      expect(update).toHaveBeenCalledWith(
        expect.anything(),
        {
          cursorPosition: position,
          lastSeen: expect.any(Number)
        }
      )
    })

    it('handles missing current user gracefully', async () => {
      const originalUser = auth.currentUser
      auth.currentUser = null
      
      const position = { x: 100, y: 200 }
      
      await expect(updateCursorPosition(position)).resolves.not.toThrow()
      
      auth.currentUser = originalUser
    })
  })

  describe('setUserOnline', () => {
    it('sets user online status with profile info', async () => {
      await setUserOnline()
      
      expect(ref).toHaveBeenCalledWith(rtdb, '/globalCanvas/users/test-user-123')
      expect(set).toHaveBeenCalledWith(
        expect.anything(),
        {
          uid: 'test-user-123',
          displayName: 'Test User',
          email: 'test@example.com',
          isOnline: true,
          joinedAt: expect.any(Number),
          lastSeen: expect.any(Number),
          cursorPosition: null
        }
      )
    })

    it('sets up disconnect cleanup', async () => {
      await setUserOnline()
      
      expect(onDisconnect).toHaveBeenCalled()
    })
  })

  describe('setUserOffline', () => {
    it('removes user from presence', async () => {
      await setUserOffline()
      
      expect(ref).toHaveBeenCalledWith(rtdb, '/globalCanvas/users/test-user-123')
      expect(remove).toHaveBeenCalled()
    })
  })

  describe('subscribeToGlobalPresence', () => {
    it('subscribes to presence updates', () => {
      const callback = vi.fn()
      
      subscribeToGlobalPresence(callback)
      
      expect(ref).toHaveBeenCalledWith(rtdb, '/globalCanvas/users')
      expect(on).toHaveBeenCalledWith(expect.anything(), 'value', expect.any(Function))
    })

    it('returns unsubscribe function', () => {
      const callback = vi.fn()
      
      const unsubscribe = subscribeToGlobalPresence(callback)
      
      expect(typeof unsubscribe).toBe('function')
      
      unsubscribe()
      
      expect(off).toHaveBeenCalled()
    })
  })

  describe('Performance and Throttling', () => {
    it('should handle high frequency cursor updates', async () => {
      // Test multiple rapid cursor updates
      const positions = [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 }
      ]
      
      for (const position of positions) {
        await updateCursorPosition(position)
      }
      
      expect(update).toHaveBeenCalledTimes(3)
    })
  })

  describe('Utility Functions', () => {
    describe('getOnlineUserCount', () => {
      it('counts online users correctly', () => {
        const users = [
          { uid: '1', isOnline: true },
          { uid: '2', isOnline: false },
          { uid: '3', isOnline: true }
        ]
        
        expect(getOnlineUserCount(users)).toBe(2)
      })

      it('returns 0 for empty array', () => {
        expect(getOnlineUserCount([])).toBe(0)
      })
    })

    describe('isUserRecentlyActive', () => {
      it('returns true for recently active user', () => {
        const user = { lastSeen: Date.now() - 10000 } // 10 seconds ago
        expect(isUserRecentlyActive(user)).toBe(true)
      })

      it('returns false for inactive user', () => {
        const user = { lastSeen: Date.now() - 60000 } // 60 seconds ago
        expect(isUserRecentlyActive(user)).toBe(false)
      })
    })
  })

  describe('Error Handling', () => {
    it('handles database errors gracefully in updateCursorPosition', async () => {
      update.mockRejectedValueOnce(new Error('Database error'))
      
      const position = { x: 100, y: 200 }
      
      await expect(updateCursorPosition(position)).resolves.not.toThrow()
    })

    it('handles database errors gracefully in setUserOnline', async () => {
      set.mockRejectedValueOnce(new Error('Database error'))
      
      await expect(setUserOnline()).resolves.not.toThrow()
    })
  })
})
