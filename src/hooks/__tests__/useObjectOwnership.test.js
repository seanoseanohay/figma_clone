import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useObjectOwnership } from '../useObjectOwnership'
import * as canvasService from '../../services/canvas.service'
import { auth } from '../../services/firebase'

// Mock Firebase auth
vi.mock('../../services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123',
      displayName: 'Test User',
      email: 'test@test.com'
    }
  }
}))

// Mock canvas service
vi.mock('../../services/canvas.service', () => ({
  lockObject: vi.fn(),
  unlockObject: vi.fn()
}))

describe('useObjectOwnership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('claimOwnership', () => {
    it('should successfully claim ownership of an object', async () => {
      canvasService.lockObject.mockResolvedValueOnce()
      
      const { result } = renderHook(() => useObjectOwnership('canvas-1'))

      await act(async () => {
        const success = await result.current.claimOwnership('object-1')
        expect(success).toBe(true)
      })

      expect(canvasService.lockObject).toHaveBeenCalledWith('object-1')
      expect(result.current.ownedObjects).toContain('object-1')
    })

    it('should return false if lock fails', async () => {
      canvasService.lockObject.mockRejectedValueOnce(new Error('Lock failed'))
      
      const { result } = renderHook(() => useObjectOwnership('canvas-1'))

      await act(async () => {
        const success = await result.current.claimOwnership('object-1')
        expect(success).toBe(false)
      })

      expect(result.current.ownedObjects).not.toContain('object-1')
    })

    it('should start auto-release timer after claiming ownership', async () => {
      canvasService.lockObject.mockResolvedValueOnce()
      canvasService.unlockObject.mockResolvedValueOnce()
      
      const { result, unmount } = renderHook(() => useObjectOwnership('canvas-1'))

      await act(async () => {
        await result.current.claimOwnership('object-1')
      })

      expect(result.current.ownedObjects).toContain('object-1')

      // Fast-forward 10 seconds and allow timer to fire
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000)
      })

      expect(canvasService.unlockObject).toHaveBeenCalledWith('object-1')
      expect(result.current.ownedObjects).not.toContain('object-1')
      
      unmount() // Clean up
    })
  })

  describe('releaseOwnership', () => {
    it('should successfully release ownership', async () => {
      canvasService.lockObject.mockResolvedValueOnce()
      canvasService.unlockObject.mockResolvedValueOnce()
      
      const { result } = renderHook(() => useObjectOwnership('canvas-1'))

      await act(async () => {
        await result.current.claimOwnership('object-1')
      })

      expect(result.current.ownedObjects).toContain('object-1')

      await act(async () => {
        const success = await result.current.releaseOwnership('object-1')
        expect(success).toBe(true)
      })

      expect(canvasService.unlockObject).toHaveBeenCalledWith('object-1')
      expect(result.current.ownedObjects).not.toContain('object-1')
    })

    it('should cancel auto-release timer when manually releasing', async () => {
      canvasService.lockObject.mockResolvedValueOnce()
      canvasService.unlockObject.mockResolvedValueOnce()
      
      const { result } = renderHook(() => useObjectOwnership('canvas-1'))

      await act(async () => {
        await result.current.claimOwnership('object-1')
        await result.current.releaseOwnership('object-1')
      })

      // Fast-forward 10 seconds - should not trigger auto-release
      await act(async () => {
        vi.advanceTimersByTime(10000)
      })

      // unlockObject should only be called once (manual release)
      expect(canvasService.unlockObject).toHaveBeenCalledTimes(1)
    })
  })

  describe('extendOwnership', () => {
    it('should reset the auto-release timer', async () => {
      canvasService.lockObject.mockResolvedValueOnce()
      canvasService.unlockObject.mockResolvedValueOnce()
      
      const { result } = renderHook(() => useObjectOwnership('canvas-1'))

      await act(async () => {
        await result.current.claimOwnership('object-1')
      })

      // Fast-forward 8 seconds
      await act(async () => {
        vi.advanceTimersByTime(8000)
      })

      // Extend ownership (reset timer)
      act(() => {
        result.current.extendOwnership('object-1')
      })

      // Fast-forward another 8 seconds (16 total, but timer was reset at 8)
      await act(async () => {
        vi.advanceTimersByTime(8000)
      })

      // Should still be owned (timer reset at 8s, so now at 8s after reset)
      expect(result.current.ownedObjects).toContain('object-1')

      // Fast-forward 2 more seconds (10s after reset)
      await act(async () => {
        vi.advanceTimersByTime(2000)
        await Promise.resolve()
      })

      await waitFor(() => {
        expect(canvasService.unlockObject).toHaveBeenCalledWith('object-1')
      })
    })

    it('should not extend ownership for objects not owned', () => {
      const { result } = renderHook(() => useObjectOwnership('canvas-1'))

      // Try to extend object we don't own
      act(() => {
        result.current.extendOwnership('object-999')
      })

      // Should not affect anything
      expect(result.current.ownedObjects).not.toContain('object-999')
    })
  })

  describe('isOwnedByMe', () => {
    it('should return true for owned objects', async () => {
      canvasService.lockObject.mockResolvedValueOnce()
      
      const { result } = renderHook(() => useObjectOwnership('canvas-1'))

      await act(async () => {
        await result.current.claimOwnership('object-1')
      })

      expect(result.current.isOwnedByMe('object-1')).toBe(true)
    })

    it('should return false for non-owned objects', () => {
      const { result } = renderHook(() => useObjectOwnership('canvas-1'))

      expect(result.current.isOwnedByMe('object-999')).toBe(false)
    })
  })

  describe('getOwnershipColor', () => {
    it('should return consistent color for same user ID', () => {
      const { result } = renderHook(() => useObjectOwnership('canvas-1'))

      const color1 = result.current.getOwnershipColor('user-123')
      const color2 = result.current.getOwnershipColor('user-123')

      expect(color1).toBe(color2)
      expect(color1).toMatch(/^hsl\(\d+, 70%, 50%\)$/)
    })

    it('should return different colors for different user IDs', () => {
      const { result } = renderHook(() => useObjectOwnership('canvas-1'))

      const color1 = result.current.getOwnershipColor('user-123')
      const color2 = result.current.getOwnershipColor('user-456')

      // Note: There's a chance they could be the same if hash collision occurs
      // but highly unlikely with 360 hue values
      expect(color1).not.toBe(color2)
    })
  })

  describe('releaseAllOwnership', () => {
    it('should release all owned objects', async () => {
      canvasService.lockObject.mockResolvedValue()
      canvasService.unlockObject.mockResolvedValue()
      
      const { result } = renderHook(() => useObjectOwnership('canvas-1'))

      await act(async () => {
        await result.current.claimOwnership('object-1')
        await result.current.claimOwnership('object-2')
        await result.current.claimOwnership('object-3')
      })

      expect(result.current.ownedObjects).toHaveLength(3)

      await act(async () => {
        await result.current.releaseAllOwnership()
      })

      expect(canvasService.unlockObject).toHaveBeenCalledTimes(3)
      expect(canvasService.unlockObject).toHaveBeenCalledWith('object-1')
      expect(canvasService.unlockObject).toHaveBeenCalledWith('object-2')
      expect(canvasService.unlockObject).toHaveBeenCalledWith('object-3')
      expect(result.current.ownedObjects).toHaveLength(0)
    })
  })

  describe('cleanup on unmount', () => {
    it('should release all ownership when component unmounts', async () => {
      canvasService.lockObject.mockResolvedValue()
      canvasService.unlockObject.mockResolvedValue()
      
      const { result, unmount } = renderHook(() => useObjectOwnership('canvas-1'))

      await act(async () => {
        await result.current.claimOwnership('object-1')
        await result.current.claimOwnership('object-2')
      })

      expect(result.current.ownedObjects).toHaveLength(2)

      // Unmount the component
      unmount()

      // Should have called unlockObject for all owned objects
      await waitFor(() => {
        expect(canvasService.unlockObject).toHaveBeenCalledTimes(2)
      })
    })

    it('should cancel all timers on unmount', async () => {
      canvasService.lockObject.mockResolvedValue()
      canvasService.unlockObject.mockResolvedValue()
      
      const { result, unmount } = renderHook(() => useObjectOwnership('canvas-1'))

      await act(async () => {
        await result.current.claimOwnership('object-1')
      })

      // Unmount before timer expires
      unmount()

      // Fast-forward past timer expiration
      await act(async () => {
        vi.advanceTimersByTime(15000)
      })

      // Should only unlock once (from unmount cleanup), not from timer
      await waitFor(() => {
        expect(canvasService.unlockObject).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('multiple objects ownership', () => {
    it('should handle multiple objects independently', async () => {
      canvasService.lockObject.mockResolvedValue()
      canvasService.unlockObject.mockResolvedValue()
      
      const { result } = renderHook(() => useObjectOwnership('canvas-1'))

      await act(async () => {
        await result.current.claimOwnership('object-1')
        await result.current.claimOwnership('object-2')
      })

      expect(result.current.ownedObjects).toHaveLength(2)

      // Release only object-1
      await act(async () => {
        await result.current.releaseOwnership('object-1')
      })

      expect(result.current.ownedObjects).toHaveLength(1)
      expect(result.current.ownedObjects).toContain('object-2')
      expect(result.current.ownedObjects).not.toContain('object-1')
    })

    it('should handle timer expiration for individual objects', async () => {
      canvasService.lockObject.mockResolvedValue()
      canvasService.unlockObject.mockResolvedValue()
      
      const { result } = renderHook(() => useObjectOwnership('canvas-1'))

      await act(async () => {
        await result.current.claimOwnership('object-1')
      })

      // Wait 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      await act(async () => {
        await result.current.claimOwnership('object-2')
      })

      // Fast-forward 6 more seconds (11 total)
      await act(async () => {
        vi.advanceTimersByTime(6000)
        await Promise.resolve()
      })

      // object-1 should be released (11s > 10s)
      // object-2 should still be owned (6s < 10s)
      await waitFor(() => {
        expect(result.current.ownedObjects).toHaveLength(1)
        expect(result.current.ownedObjects).toContain('object-2')
        expect(result.current.ownedObjects).not.toContain('object-1')
      })
    })
  })
})

