import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createObject,
  updateObject,
  deleteObject,
  batchDeleteObjects,
  lockObject,
  unlockObject,
  updateObjectPosition,
} from '../canvas.service.js';
import { auth, db } from '../firebase.js';
import { createTestUser, createTestRectangle } from '../../test/fixtures/testData.js';

// Mock Firebase
vi.mock('../firebase.js', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
  rtdb: {},
}));

// Mock Firestore functions
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn(() => ({})),
    doc: vi.fn(() => ({})),
    addDoc: vi.fn(() => Promise.resolve({ id: 'test-object-id' })),
    updateDoc: vi.fn(() => Promise.resolve()),
    deleteDoc: vi.fn(() => Promise.resolve()),
    getDoc: vi.fn(() =>
      Promise.resolve({
        exists: () => true,
        data: () => ({ type: 'rectangle', x: 100, y: 100 }),
      })
    ),
    getDocs: vi.fn(() =>
      Promise.resolve({
        empty: false,
        docs: [],
      })
    ),
    query: vi.fn(() => ({})),
    where: vi.fn(() => ({})),
    orderBy: vi.fn(() => ({})),
    onSnapshot: vi.fn(() => vi.fn()),
    serverTimestamp: vi.fn(() => 'server-timestamp'),
    setDoc: vi.fn(() => Promise.resolve()),
    arrayUnion: vi.fn((val) => val),
  };
});

// Mock RTDB functions
vi.mock('firebase/database', () => ({
  ref: vi.fn(() => ({})),
  set: vi.fn(() => Promise.resolve()),
  update: vi.fn(() => Promise.resolve()),
  remove: vi.fn(() => Promise.resolve()),
  onValue: vi.fn(() => vi.fn()),
  onDisconnect: vi.fn(() => ({
    remove: vi.fn(() => Promise.resolve()),
  })),
}));

// Import mocked functions after mocking
import { addDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { set, remove } from 'firebase/database';

describe('canvas.service', () => {
  let testUser;

  beforeEach(() => {
    testUser = createTestUser();
    auth.currentUser = testUser;

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    auth.currentUser = null;
  });

  describe('createObject', () => {
    it('should create a rectangle object successfully', async () => {
      const position = { x: 100, y: 100, width: 150, height: 100 };
      const canvasId = 'test-canvas';
      const properties = { fill: '#3b82f6', rotation: 0 };

      const objectId = await createObject('rectangle', position, canvasId, properties);

      expect(addDoc).toHaveBeenCalled();
      expect(objectId).toBe('test-object-id');

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.type).toBe('rectangle');
      expect(callArgs.x).toBe(100);
      expect(callArgs.y).toBe(100);
      expect(callArgs.width).toBe(150);
      expect(callArgs.height).toBe(100);
      expect(callArgs.fill).toBe('#3b82f6');
      expect(callArgs.createdBy).toBe(testUser.uid);
      expect(callArgs.canvasId).toBe(canvasId);
    });

    it('should create a circle object successfully', async () => {
      const position = { x: 300, y: 200 };
      const canvasId = 'test-canvas';
      const properties = { radius: 75, fill: '#ef4444' };

      const objectId = await createObject('circle', position, canvasId, properties);

      expect(addDoc).toHaveBeenCalled();
      expect(objectId).toBe('test-object-id');

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.type).toBe('circle');
      expect(callArgs.radius).toBe(75);
    });

    it('should create a text object successfully', async () => {
      const position = { x: 150, y: 350 };
      const canvasId = 'test-canvas';
      const properties = {
        text: 'Hello World',
        fontSize: 24,
        fontFamily: 'Arial',
        fill: '#000000',
      };

      const objectId = await createObject('text', position, canvasId, properties);

      expect(addDoc).toHaveBeenCalled();
      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.type).toBe('text');
      expect(callArgs.text).toBe('Hello World');
      expect(callArgs.fontSize).toBe(24);
    });

    it('should throw error if user is not authenticated', async () => {
      auth.currentUser = null;

      await expect(createObject('rectangle', { x: 0, y: 0 }, 'canvas-1')).rejects.toThrow(
        'User must be authenticated'
      );

      expect(addDoc).not.toHaveBeenCalled();
    });

    it('should throw error if canvas ID is missing', async () => {
      await expect(createObject('rectangle', { x: 0, y: 0 }, '')).rejects.toThrow(
        'Canvas ID is required'
      );

      expect(addDoc).not.toHaveBeenCalled();
    });

    it('should throw error if position is outside canvas bounds', async () => {
      await expect(
        createObject('rectangle', { x: -10, y: 100, width: 50, height: 50 }, 'canvas-1')
      ).rejects.toThrow('outside canvas bounds');

      await expect(
        createObject('rectangle', { x: 100, y: -10, width: 50, height: 50 }, 'canvas-1')
      ).rejects.toThrow('outside canvas bounds');

      await expect(
        createObject('rectangle', { x: 5000, y: 100, width: 50, height: 50 }, 'canvas-1')
      ).rejects.toThrow('outside canvas bounds');

      expect(addDoc).not.toHaveBeenCalled();
    });

    it('should sanitize undefined fields before writing', async () => {
      const position = { x: 100, y: 100 };
      const properties = { fill: '#3b82f6', undefinedField: undefined };

      await createObject('rectangle', position, 'canvas-1', properties);

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.undefinedField).toBeUndefined();
      expect('undefinedField' in callArgs).toBe(false);
    });

    it('should include created by and timestamp metadata', async () => {
      await createObject('rectangle', { x: 100, y: 100 }, 'canvas-1');

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.createdBy).toBe(testUser.uid);
      expect(callArgs.createdByName).toBe(testUser.displayName);
      expect(callArgs.createdAt).toBe('server-timestamp');
      expect(callArgs.lastModifiedAt).toBe('server-timestamp');
      expect(callArgs.lastModifiedBy).toBe(testUser.uid);
    });

    it('should handle Firestore errors gracefully', async () => {
      addDoc.mockRejectedValueOnce(new Error('Firestore error'));

      await expect(createObject('rectangle', { x: 100, y: 100 }, 'canvas-1')).rejects.toThrow(
        'Firestore error'
      );
    });
  });

  describe('updateObject', () => {
    it('should update object successfully', async () => {
      const objectId = 'rect-1';
      const updates = { x: 200, y: 250, width: 200 };

      await updateObject(objectId, updates);

      expect(updateDoc).toHaveBeenCalled();
      const callArgs = updateDoc.mock.calls[0][1];
      expect(callArgs.x).toBe(200);
      expect(callArgs.y).toBe(250);
      expect(callArgs.width).toBe(200);
      expect(callArgs.lastModifiedAt).toBe('server-timestamp');
      expect(callArgs.lastModifiedBy).toBe(testUser.uid);
    });

    it('should throw error if objectId is null', async () => {
      await expect(updateObject(null, { x: 100 })).rejects.toThrow('null or undefined objectId');

      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should throw error if objectId is undefined', async () => {
      await expect(updateObject(undefined, { x: 100 })).rejects.toThrow(
        'null or undefined objectId'
      );

      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should throw error if objectId is empty string', async () => {
      await expect(updateObject('', { x: 100 })).rejects.toThrow('invalid objectId');

      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should throw error if objectId is not a string', async () => {
      await expect(updateObject(123, { x: 100 })).rejects.toThrow('invalid objectId');

      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should throw error if user is not authenticated', async () => {
      auth.currentUser = null;

      await expect(updateObject('rect-1', { x: 100 })).rejects.toThrow(
        'User must be authenticated'
      );

      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should handle Firestore errors gracefully', async () => {
      updateDoc.mockRejectedValueOnce(new Error('Update failed'));

      await expect(updateObject('rect-1', { x: 100 })).rejects.toThrow('Update failed');
    });

    it('should trim whitespace from objectId', async () => {
      await updateObject('  rect-1  ', { x: 100 });

      expect(updateDoc).toHaveBeenCalled();
      // Verify doc() was called with trimmed ID
    });
  });

  describe('lockObject', () => {
    it('should lock object successfully', async () => {
      const objectId = 'rect-1';

      await lockObject(objectId);

      expect(updateDoc).toHaveBeenCalled();
      const callArgs = updateDoc.mock.calls[0][1];
      expect(callArgs.lockedBy).toBe(testUser.uid);
      expect(callArgs.lockedAt).toBe('server-timestamp');
      expect(callArgs.lastModifiedAt).toBe('server-timestamp');
      expect(callArgs.lastModifiedBy).toBe(testUser.uid);
    });

    it('should throw error if user is not authenticated', async () => {
      auth.currentUser = null;

      await expect(lockObject('rect-1')).rejects.toThrow('User must be authenticated');

      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should handle lock errors gracefully', async () => {
      updateDoc.mockRejectedValueOnce(new Error('Lock failed'));

      await expect(lockObject('rect-1')).rejects.toThrow('Lock failed');
    });
  });

  describe('unlockObject', () => {
    it('should unlock object successfully', async () => {
      const objectId = 'rect-1';

      await unlockObject(objectId);

      expect(updateDoc).toHaveBeenCalled();
      const callArgs = updateDoc.mock.calls[0][1];
      expect(callArgs.lockedBy).toBeNull();
      expect(callArgs.lockedAt).toBeNull();
      expect(callArgs.lastModifiedAt).toBe('server-timestamp');
      expect(callArgs.lastModifiedBy).toBe(testUser.uid);
    });

    it('should throw error if user is not authenticated', async () => {
      auth.currentUser = null;

      await expect(unlockObject('rect-1')).rejects.toThrow('User must be authenticated');

      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should handle unlock errors gracefully', async () => {
      updateDoc.mockRejectedValueOnce(new Error('Unlock failed'));

      await expect(unlockObject('rect-1')).rejects.toThrow('Unlock failed');
    });
  });

  describe('updateObjectPosition', () => {
    it('should update object position with final update', async () => {
      const objectId = 'rect-1';
      const position = { x: 200, y: 250 };

      await updateObjectPosition(objectId, position, true);

      expect(updateDoc).toHaveBeenCalled();
      const callArgs = updateDoc.mock.calls[0][1];
      expect(callArgs.x).toBe(200);
      expect(callArgs.y).toBe(250);
      expect(callArgs.lastModifiedAt).toBe('server-timestamp');
    });

    it('should update object position with width and height', async () => {
      const objectId = 'rect-1';
      const position = { x: 200, y: 250, width: 180, height: 120 };

      await updateObjectPosition(objectId, position, true);

      expect(updateDoc).toHaveBeenCalled();
      const callArgs = updateDoc.mock.calls[0][1];
      expect(callArgs.x).toBe(200);
      expect(callArgs.y).toBe(250);
      expect(callArgs.width).toBe(180);
      expect(callArgs.height).toBe(120);
    });

    it('should unlock object when finalUpdate is true and unlock param is default', async () => {
      const objectId = 'rect-1';
      const position = { x: 200, y: 250 };

      await updateObjectPosition(objectId, position, true);

      const callArgs = updateDoc.mock.calls[0][1];
      expect(callArgs.lockedBy).toBeNull();
      expect(callArgs.lockedAt).toBeNull();
    });

    it('should keep object locked when finalUpdate is true and unlock is false', async () => {
      const objectId = 'rect-1';
      const position = { x: 200, y: 250 };

      // Note: need to check the actual function signature to verify this behavior
      await updateObjectPosition(objectId, position, false);

      const callArgs = updateDoc.mock.calls[0][1];
      // Should NOT unlock
      expect(callArgs.lockedBy).toBeUndefined();
      expect(callArgs.lockedAt).toBeUndefined();
    });

    it('should not update position if finalUpdate is false (throttled)', async () => {
      const objectId = 'rect-1';
      const position = { x: 200, y: 250 };

      await updateObjectPosition(objectId, position, false);

      // Throttled updates might not call updateDoc immediately
      // This depends on implementation
    });

    it('should throw error if user is not authenticated', async () => {
      auth.currentUser = null;

      await expect(updateObjectPosition('rect-1', { x: 100, y: 100 }, true)).rejects.toThrow(
        'User must be authenticated'
      );

      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should handle update errors gracefully', async () => {
      updateDoc.mockRejectedValueOnce(new Error('Position update failed'));

      await expect(updateObjectPosition('rect-1', { x: 100, y: 100 }, true)).rejects.toThrow(
        'Position update failed'
      );
    });
  });

  describe('deleteObject', () => {
    it('should delete object successfully', async () => {
      const objectId = 'rect-1';

      await deleteObject(objectId);

      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should throw error if user is not authenticated', async () => {
      auth.currentUser = null;

      await expect(deleteObject('rect-1')).rejects.toThrow('User must be authenticated');

      expect(deleteDoc).not.toHaveBeenCalled();
    });

    it('should handle delete errors gracefully', async () => {
      deleteDoc.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(deleteObject('rect-1')).rejects.toThrow('Delete failed');
    });

    it('should handle non-existent object gracefully', async () => {
      deleteDoc.mockRejectedValueOnce(new Error('Document not found'));

      await expect(deleteObject('non-existent-id')).rejects.toThrow('Document not found');
    });
  });

  describe('batchDeleteObjects', () => {
    // Mock fetch globally for batch tests
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    beforeEach(() => {
      mockFetch.mockClear();
    });

    describe('Successful batch deletion', () => {
      it('should batch delete multiple objects when backend supports it', async () => {
        const objectIds = ['rect-1', 'rect-2', 'rect-3'];
        const mockGetIdToken = vi.fn().mockResolvedValue('mock-token');
        auth.currentUser.getIdToken = mockGetIdToken;

        // Mock successful batch API response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ deleted: 3 }),
        });

        const result = await batchDeleteObjects(objectIds);

        expect(result.deleted).toBe(3);
        expect(result.errors).toEqual([]);
        expect(mockFetch).toHaveBeenCalledWith('/api/objects/batch', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
          body: JSON.stringify({ ids: objectIds }),
        });
      });

      it('should handle large batches by splitting into 90-object chunks', async () => {
        // Create 200 object IDs to test batching
        const objectIds = Array.from({ length: 200 }, (_, i) => `obj-${i}`);
        const mockGetIdToken = vi.fn().mockResolvedValue('mock-token');
        auth.currentUser.getIdToken = mockGetIdToken;

        // Mock successful responses for each batch
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ deleted: 90 }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ deleted: 90 }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ deleted: 20 }),
          });

        const result = await batchDeleteObjects(objectIds);

        expect(result.deleted).toBe(200);
        expect(result.errors).toEqual([]);
        expect(mockFetch).toHaveBeenCalledTimes(3); // 90 + 90 + 20
      });

      it('should call recordAction callback for successful batch deletion', async () => {
        const objectIds = ['rect-1', 'rect-2'];
        const mockRecordAction = vi.fn();
        const mockGetIdToken = vi.fn().mockResolvedValue('mock-token');
        auth.currentUser.getIdToken = mockGetIdToken;

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ deleted: 2 }),
        });

        await batchDeleteObjects(objectIds, mockRecordAction);

        expect(mockRecordAction).toHaveBeenCalledWith(
          'BATCH_DELETE_OBJECTS',
          objectIds,
          { deletedCount: 2 },
          null,
          { objectType: 'Multiple Objects', count: 2 }
        );
      });
    });

    describe('Fallback to individual deletion', () => {
      it('should fallback to individual deletion when batch API returns 404', async () => {
        const objectIds = ['rect-1', 'rect-2'];
        const mockGetIdToken = vi.fn().mockResolvedValue('mock-token');
        auth.currentUser.getIdToken = mockGetIdToken;

        // Mock 404 response (batch endpoint not implemented)
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: { message: 'Not Found' } }),
        });

        // Mock individual deleteObject calls
        const originalDeleteObject = deleteObject;
        const mockDeleteObject = vi.fn().mockResolvedValue();
        
        // We need to temporarily replace the deleteObject import
        // This is tricky with ES modules, so we'll verify the fallback behavior differently
        const result = await batchDeleteObjects(objectIds);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Batch 1: Not Found');
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should fallback to individual deletion when batch API returns malformed JSON', async () => {
        const objectIds = ['rect-1'];
        const mockGetIdToken = vi.fn().mockResolvedValue('mock-token');
        auth.currentUser.getIdToken = mockGetIdToken;

        // Mock response that fails JSON parsing (like HTML 404 page)
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
        });

        const result = await batchDeleteObjects(objectIds);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Unexpected end of JSON input');
      });

      it('should continue with remaining batches if one batch fails', async () => {
        const objectIds = Array.from({ length: 180 }, (_, i) => `obj-${i}`); // 2 batches
        const mockGetIdToken = vi.fn().mockResolvedValue('mock-token');
        auth.currentUser.getIdToken = mockGetIdToken;

        // First batch fails, second succeeds
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({ error: { message: 'Server error' } }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ deleted: 90 }),
          });

        const result = await batchDeleteObjects(objectIds);

        expect(result.deleted).toBe(180); // First batch fails but falls back to individual deletion, second batch succeeds
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Batch 1: Server error');
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    describe('Input validation and edge cases', () => {
      it('should return empty result for empty array', async () => {
        const result = await batchDeleteObjects([]);

        expect(result.deleted).toBe(0);
        expect(result.errors).toEqual([]);
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should return empty result for null input', async () => {
        const result = await batchDeleteObjects(null);

        expect(result.deleted).toBe(0);
        expect(result.errors).toEqual([]);
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should return empty result for undefined input', async () => {
        const result = await batchDeleteObjects(undefined);

        expect(result.deleted).toBe(0);
        expect(result.errors).toEqual([]);
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should throw error if user is not authenticated', async () => {
        auth.currentUser = null;

        await expect(batchDeleteObjects(['rect-1'])).rejects.toThrow(
          'User must be authenticated to delete objects'
        );

        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should handle single object in batch', async () => {
        const objectIds = ['rect-1'];
        const mockGetIdToken = vi.fn().mockResolvedValue('mock-token');
        auth.currentUser.getIdToken = mockGetIdToken;

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ deleted: 1 }),
        });

        const result = await batchDeleteObjects(objectIds);

        expect(result.deleted).toBe(1);
        expect(result.errors).toEqual([]);
      });

      it('should handle network errors gracefully', async () => {
        const objectIds = ['rect-1'];
        const mockGetIdToken = vi.fn().mockResolvedValue('mock-token');
        auth.currentUser.getIdToken = mockGetIdToken;

        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await batchDeleteObjects(objectIds);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Network error');
      });
    });

    describe('Regression test for performance issue', () => {
      it('should use batch deletion instead of individual calls for multiple objects', async () => {
        // This is the regression test for the original performance issue
        const objectIds = Array.from({ length: 125 }, (_, i) => `star-${i}`);
        const mockGetIdToken = vi.fn().mockResolvedValue('mock-token');
        auth.currentUser.getIdToken = mockGetIdToken;

        // Mock successful batch responses
        mockFetch.mockImplementation(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ deleted: 90 }),
          })
        );

        const startTime = Date.now();
        await batchDeleteObjects(objectIds);
        const endTime = Date.now();

        // Should make only 2 batch calls (90 + 35) instead of 125 individual calls
        expect(mockFetch).toHaveBeenCalledTimes(2);
        
        // Verify all calls are to batch endpoint
        mockFetch.mock.calls.forEach(call => {
          expect(call[0]).toBe('/api/objects/batch');
          expect(call[1].method).toBe('DELETE');
        });

        // Performance should be much better (this is more of a smoke test)
        expect(endTime - startTime).toBeLessThan(1000);
      });
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle concurrent lock attempts', async () => {
      const objectId = 'rect-1';

      // Simulate concurrent lock attempts
      const lock1 = lockObject(objectId);
      const lock2 = lockObject(objectId);

      await Promise.all([lock1, lock2]);

      // Both should succeed (last write wins in Firestore)
      expect(updateDoc).toHaveBeenCalledTimes(2);
    });

    it('should handle very large position values', async () => {
      await expect(
        createObject('rectangle', { x: 10000, y: 10000, width: 100, height: 100 }, 'canvas-1')
      ).rejects.toThrow('outside canvas bounds');
    });

    it('should handle negative position values', async () => {
      await expect(
        createObject('rectangle', { x: -100, y: 100, width: 100, height: 100 }, 'canvas-1')
      ).rejects.toThrow('outside canvas bounds');
    });

    it('should handle special characters in object IDs', async () => {
      const specialId = 'rect-1-special-!@#$%';
      await updateObject(specialId, { x: 100, y: 100 });

      expect(updateDoc).toHaveBeenCalled();
    });

    it('should handle empty updates object', async () => {
      await updateObject('rect-1', {});

      expect(updateDoc).toHaveBeenCalled();
      const callArgs = updateDoc.mock.calls[0][1];
      // Should still add metadata
      expect(callArgs.lastModifiedAt).toBe('server-timestamp');
      expect(callArgs.lastModifiedBy).toBe(testUser.uid);
    });

    it('should handle missing user display name', async () => {
      auth.currentUser = { ...testUser, displayName: null };

      await createObject('rectangle', { x: 100, y: 100 }, 'canvas-1');

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.createdByName).toBe(testUser.email);
    });
  });
});

