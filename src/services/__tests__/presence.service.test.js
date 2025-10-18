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
  off: vi.fn(),
  onValue: vi.fn(() => vi.fn()) // Returns unsubscribe function
}))

// Import the service after mocking
import {
  updateCursorPosition,
  setUserOnline,
  setUserOffline,
  subscribeToCanvasPresence,
  getOnlineUserCount,
  isUserRecentlyActive
} from '../presence.service.js'

import { rtdb, auth } from '../../services/firebase.js'
import { ref, set, update, remove, onDisconnect, on, off, onValue } from 'firebase/database'

describe('Presence Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('updateCursorPosition', () => {
    it('updates user cursor position in realtime database', async () => {
      const canvasId = 'test-canvas-123'
      const x = 100
      const y = 200
      
      await updateCursorPosition(canvasId, x, y)
      
      expect(ref).toHaveBeenCalledWith(rtdb, '/canvases/test-canvas-123/presence/test-user-123')
      expect(update).toHaveBeenCalledWith(
        expect.anything(),
        {
          cursorX: x,
          cursorY: y,
          lastActive: expect.any(Number)
        }
      )
    })

    it('handles missing current user gracefully', async () => {
      const originalUser = auth.currentUser
      auth.currentUser = null
      
      const canvasId = 'test-canvas-123'
      
      await expect(updateCursorPosition(canvasId, 100, 200)).resolves.not.toThrow()
      
      auth.currentUser = originalUser
    })
  })

  describe('setUserOnline', () => {
    it('sets user online status with profile info', async () => {
      const canvasId = 'test-canvas-123'
      
      await setUserOnline(canvasId)
      
      expect(ref).toHaveBeenCalledWith(rtdb, '/canvases/test-canvas-123/presence/test-user-123')
      expect(set).toHaveBeenCalledWith(
        expect.anything(),
        {
          userId: 'test-user-123',
          displayName: 'Test User',
          email: 'test@example.com',
          cursorColor: expect.any(String),
          cursorX: null,
          cursorY: null,
          lastActive: expect.any(Number),
          connectedAt: expect.any(Number)
        }
      )
    })

    it('sets up disconnect cleanup', async () => {
      const canvasId = 'test-canvas-123'
      
      await setUserOnline(canvasId)
      
      expect(onDisconnect).toHaveBeenCalled()
    })
  })

  describe('setUserOffline', () => {
    it('removes user from presence', async () => {
      const canvasId = 'test-canvas-123'
      
      await setUserOffline(canvasId)
      
      expect(ref).toHaveBeenCalledWith(rtdb, '/canvases/test-canvas-123/presence/test-user-123')
      expect(remove).toHaveBeenCalled()
    })
  })

  describe('subscribeToCanvasPresence', () => {
    it('subscribes to presence updates', () => {
      const canvasId = 'test-canvas-123'
      const callback = vi.fn()
      
      subscribeToCanvasPresence(canvasId, callback)
      
      expect(ref).toHaveBeenCalledWith(rtdb, '/canvases/test-canvas-123/presence')
      expect(onValue).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Function),
        expect.any(Function) // Error handler
      )
    })

    it('returns unsubscribe function', () => {
      const canvasId = 'test-canvas-123'
      const callback = vi.fn()
      const mockUnsubscribe = vi.fn()
      onValue.mockReturnValueOnce(mockUnsubscribe)
      
      const unsubscribe = subscribeToCanvasPresence(canvasId, callback)
      
      expect(typeof unsubscribe).toBe('function')
      
      unsubscribe()
      
      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('Performance and Throttling', () => {
    it('should handle high frequency cursor updates', async () => {
      const canvasId = 'test-canvas-123'
      // Test multiple rapid cursor updates
      const positions = [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 }
      ]
      
      for (const position of positions) {
        await updateCursorPosition(canvasId, position.x, position.y)
      }
      
      expect(update).toHaveBeenCalledTimes(3)
    })
  })

  describe('Utility Functions', () => {
    describe('getOnlineUserCount', () => {
      it('counts online users correctly', () => {
        // In canvas-scoped presence, all users in the array are considered online
        const users = [
          { userId: '1', lastActive: Date.now() },
          { userId: '2', lastActive: Date.now() - 10000 },
          { userId: '3', lastActive: Date.now() - 20000 }
        ]
        
        expect(getOnlineUserCount(users)).toBe(3)
      })

      it('returns 0 for empty array', () => {
        expect(getOnlineUserCount([])).toBe(0)
      })
    })

    describe('isUserRecentlyActive', () => {
      it('returns true for recently active user', () => {
        const user = { lastActive: Date.now() - 10000 } // 10 seconds ago
        expect(isUserRecentlyActive(user)).toBe(true)
      })

      it('returns false for inactive user', () => {
        const user = { lastActive: Date.now() - 60000 } // 60 seconds ago (beyond 30s threshold)
        expect(isUserRecentlyActive(user)).toBe(false)
      })
    })
  })

  describe('Error Handling', () => {
    it('handles database errors gracefully in updateCursorPosition', async () => {
      update.mockRejectedValueOnce(new Error('Database error'))
      
      const canvasId = 'test-canvas-123'
      
      await expect(updateCursorPosition(canvasId, 100, 200)).resolves.not.toThrow()
    })

    it('handles database errors gracefully in setUserOnline', async () => {
      set.mockRejectedValueOnce(new Error('Database error'))
      
      const canvasId = 'test-canvas-123'
      
      await expect(setUserOnline(canvasId)).resolves.not.toThrow()
    })
  })
})
