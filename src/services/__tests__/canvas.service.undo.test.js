import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Firebase
vi.mock('../firebase.js', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123',
      displayName: 'Test User',
      email: 'test@example.com'
    }
  },
  db: {},
  rtdb: {}
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  addDoc: vi.fn(() => Promise.resolve({ id: 'test-object-id' })),
  updateDoc: vi.fn(() => Promise.resolve(true)),
  deleteDoc: vi.fn(() => Promise.resolve(true)),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({
      type: 'rectangle',
      x: 100,
      y: 200,
      width: 50,
      height: 30,
      fill: '#ff0000'
    })
  })),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => ({ seconds: Date.now() / 1000 })),
  where: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  arrayUnion: vi.fn()
}));

// Mock Real-time Database functions
vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  onValue: vi.fn(),
  onDisconnect: vi.fn()
}));

// Mock project service
vi.mock('../project.service.js', () => ({
  canUserAccessProject: vi.fn().mockResolvedValue(true)
}));

// Import after mocks
import { createObject, updateObject, deleteObject } from '../canvas.service.js';
import { addDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

describe('Canvas Service - Undo/Redo Integration', () => {
  const mockCanvasId = 'test-canvas-123';
  const mockRecordAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createObject with recordAction', () => {
    it('should call recordAction with correct CREATE_OBJECT parameters', async () => {
      const objectType = 'rectangle';
      const position = { x: 100, y: 200, width: 50, height: 30 };
      const properties = { fill: '#ff0000' };

      const objectId = await createObject(objectType, position, mockCanvasId, properties, mockRecordAction);

      expect(objectId).toBe('test-object-id');
      expect(mockRecordAction).toHaveBeenCalledOnce();
      
      const [actionType, objId, before, after, metadata] = mockRecordAction.mock.calls[0];
      
      expect(actionType).toBe('CREATE_OBJECT');
      expect(objId).toBe('test-object-id');
      expect(before).toBe(null);
      expect(after).toMatchObject({
        type: objectType,
        canvasId: mockCanvasId,
        ...position,
        ...properties
      });
      expect(metadata.objectType).toBe('Rectangle');
    });

    it('should work without recordAction callback', async () => {
      const objectType = 'circle';
      const position = { x: 50, y: 75, width: 25, height: 25 };

      const objectId = await createObject(objectType, position, mockCanvasId);

      expect(objectId).toBe('test-object-id');
      expect(mockRecordAction).not.toHaveBeenCalled();
    });

    it('should handle recordAction errors gracefully', async () => {
      const mockErrorRecordAction = vi.fn().mockImplementation(() => {
        throw new Error('Recording failed');
      });

      const objectType = 'star';
      const position = { x: 10, y: 20, width: 30, height: 30 };

      // Should not throw even if recordAction fails
      const objectId = await createObject(objectType, position, mockCanvasId, {}, mockErrorRecordAction);

      expect(objectId).toBe('test-object-id');
      expect(mockErrorRecordAction).toHaveBeenCalledOnce();
    });
  });

  describe('updateObject with recordAction', () => {
    it('should call recordAction with correct MOVE_OBJECT parameters', async () => {
      const objectId = 'test-obj-123';
      const updates = { x: 150, y: 250 };
      const actionMetadata = {
        actionType: 'MOVE_OBJECT',
        before: { x: 100, y: 200 },
        objectType: 'Rectangle'
      };

      await updateObject(objectId, updates, mockRecordAction, actionMetadata);

      expect(vi.mocked(updateDoc)).toHaveBeenCalledOnce();
      expect(mockRecordAction).toHaveBeenCalledOnce();
      
      const [actionType, objId, before, after, metadata] = mockRecordAction.mock.calls[0];
      
      expect(actionType).toBe('MOVE_OBJECT');
      expect(objId).toBe(objectId);
      expect(before).toEqual({ x: 100, y: 200 });
      expect(after).toEqual(updates);
      expect(metadata.objectType).toBe('Rectangle');
    });

    it('should call recordAction with correct RESIZE_OBJECT parameters', async () => {
      const objectId = 'test-obj-456';
      const updates = { width: 100, height: 75 };
      const actionMetadata = {
        actionType: 'RESIZE_OBJECT',
        before: { width: 50, height: 30 },
        objectType: 'Circle'
      };

      await updateObject(objectId, updates, mockRecordAction, actionMetadata);

      expect(mockRecordAction).toHaveBeenCalledOnce();
      
      const [actionType, objId, before, after, metadata] = mockRecordAction.mock.calls[0];
      
      expect(actionType).toBe('RESIZE_OBJECT');
      expect(objId).toBe(objectId);
      expect(before).toEqual({ width: 50, height: 30 });
      expect(after).toEqual(updates);
      expect(metadata.objectType).toBe('Circle');
    });

    it('should work without recordAction callback', async () => {
      const objectId = 'test-obj-789';
      const updates = { rotation: 45 };

      await updateObject(objectId, updates);

      expect(vi.mocked(updateDoc)).toHaveBeenCalledOnce();
      expect(mockRecordAction).not.toHaveBeenCalled();
    });

    it('should not call recordAction if actionType is missing', async () => {
      const objectId = 'test-obj-999';
      const updates = { fill: '#00ff00' };
      const actionMetadata = {
        before: { fill: '#ff0000' },
        objectType: 'Rectangle'
        // Missing actionType
      };

      await updateObject(objectId, updates, mockRecordAction, actionMetadata);

      expect(vi.mocked(updateDoc)).toHaveBeenCalledOnce();
      expect(mockRecordAction).not.toHaveBeenCalled();
    });
  });

  describe('deleteObject with recordAction', () => {
    it('should call recordAction with correct DELETE_OBJECT parameters', async () => {
      const objectId = 'test-obj-delete';

      await deleteObject(objectId, mockRecordAction);

      expect(vi.mocked(getDoc)).toHaveBeenCalledOnce();
      expect(vi.mocked(deleteDoc)).toHaveBeenCalledOnce();
      expect(mockRecordAction).toHaveBeenCalledOnce();
      
      const [actionType, objId, before, after, metadata] = mockRecordAction.mock.calls[0];
      
      expect(actionType).toBe('DELETE_OBJECT');
      expect(objId).toBe(objectId);
      expect(before).toMatchObject({
        id: objectId,
        type: 'rectangle',
        x: 100,
        y: 200,
        width: 50,
        height: 30,
        fill: '#ff0000'
      });
      expect(after).toBe(null);
      expect(metadata.objectType).toBe('Rectangle');
    });

    it('should work without recordAction callback', async () => {
      const objectId = 'test-obj-delete-no-record';

      await deleteObject(objectId);

      expect(vi.mocked(deleteDoc)).toHaveBeenCalledOnce();
      expect(vi.mocked(getDoc)).not.toHaveBeenCalled(); // Should not get object data if no recordAction
      expect(mockRecordAction).not.toHaveBeenCalled();
    });

    it('should handle getDoc errors gracefully', async () => {
      vi.mocked(getDoc).mockRejectedValueOnce(new Error('Document not found'));

      const objectId = 'test-obj-delete-error';

      // Should not throw even if getDoc fails
      await deleteObject(objectId, mockRecordAction);

      expect(vi.mocked(deleteDoc)).toHaveBeenCalledOnce();
      expect(mockRecordAction).not.toHaveBeenCalled(); // Should not record if we can't get object data
    });

    it('should handle objects without type gracefully', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          x: 100,
          y: 200,
          // Missing type field
        })
      });

      const objectId = 'test-obj-no-type';

      await deleteObject(objectId, mockRecordAction);

      expect(mockRecordAction).toHaveBeenCalledOnce();
      
      const [actionType, objId, before, after, metadata] = mockRecordAction.mock.calls[0];
      
      expect(actionType).toBe('DELETE_OBJECT');
      expect(metadata.objectType).toBe('Object'); // Default fallback
    });
  });
});
