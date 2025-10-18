import { vi } from 'vitest';

/**
 * Mock Firebase Firestore
 */
export const createMockFirestore = () => {
  const mockData = new Map();

  const mockDoc = (id) => ({
    id,
    get: vi.fn(async () => ({
      exists: mockData.has(id),
      id,
      data: () => mockData.get(id),
    })),
    set: vi.fn(async (data) => {
      mockData.set(id, data);
    }),
    update: vi.fn(async (data) => {
      const existing = mockData.get(id) || {};
      mockData.set(id, { ...existing, ...data });
    }),
    delete: vi.fn(async () => {
      mockData.delete(id);
    }),
    onSnapshot: vi.fn((callback) => {
      callback({
        exists: mockData.has(id),
        id,
        data: () => mockData.get(id),
      });
      return vi.fn(); // unsubscribe function
    }),
  });

  const mockCollection = (name) => ({
    doc: mockDoc,
    add: vi.fn(async (data) => {
      const id = `mock-${Date.now()}-${Math.random()}`;
      mockData.set(id, data);
      return mockDoc(id);
    }),
    where: vi.fn(() => ({
      get: vi.fn(async () => ({
        docs: Array.from(mockData.entries()).map(([id, data]) => ({
          id,
          data: () => data,
        })),
      })),
      onSnapshot: vi.fn((callback) => {
        const docs = Array.from(mockData.entries()).map(([id, data]) => ({
          id,
          data: () => data,
        }));
        callback({ docs });
        return vi.fn(); // unsubscribe function
      }),
    })),
    get: vi.fn(async () => ({
      docs: Array.from(mockData.entries()).map(([id, data]) => ({
        id,
        data: () => data,
      })),
    })),
    onSnapshot: vi.fn((callback) => {
      const docs = Array.from(mockData.entries()).map(([id, data]) => ({
        id,
        data: () => data,
      }));
      callback({ docs });
      return vi.fn(); // unsubscribe function
    }),
  });

  return {
    collection: mockCollection,
    doc: mockDoc,
    mockData, // Expose for test assertions
  };
};

/**
 * Mock Firebase Realtime Database
 */
export const createMockRTDB = () => {
  const mockData = new Map();

  const mockRef = (path) => ({
    set: vi.fn(async (data) => {
      mockData.set(path, data);
    }),
    update: vi.fn(async (data) => {
      const existing = mockData.get(path) || {};
      mockData.set(path, { ...existing, ...data });
    }),
    remove: vi.fn(async () => {
      mockData.delete(path);
    }),
    on: vi.fn((event, callback) => {
      callback({
        val: () => mockData.get(path),
      });
    }),
    off: vi.fn(),
    once: vi.fn(async (event) => ({
      val: () => mockData.get(path),
    })),
    child: (childPath) => mockRef(`${path}/${childPath}`),
  });

  return {
    ref: mockRef,
    mockData, // Expose for test assertions
  };
};

/**
 * Mock Firebase Auth
 */
export const createMockAuth = (user = null) => {
  const defaultUser = {
    uid: 'test-user-id',
    email: 'bobtester@test.com',
    displayName: 'Bob Tester',
  };

  const currentUser = user || defaultUser;
  const listeners = [];

  return {
    currentUser,
    onAuthStateChanged: vi.fn((callback) => {
      listeners.push(callback);
      callback(currentUser);
      return vi.fn(() => {
        const index = listeners.indexOf(callback);
        if (index > -1) listeners.splice(index, 1);
      });
    }),
    signInWithEmailAndPassword: vi.fn(async () => ({
      user: currentUser,
    })),
    signOut: vi.fn(async () => {
      listeners.forEach(listener => listener(null));
    }),
    createUserWithEmailAndPassword: vi.fn(async () => ({
      user: currentUser,
    })),
  };
};

/**
 * Mock Firebase Storage
 */
export const createMockStorage = () => {
  const mockFiles = new Map();

  const mockRef = (path) => ({
    put: vi.fn(async (file) => {
      mockFiles.set(path, file);
      return {
        ref: mockRef(path),
      };
    }),
    getDownloadURL: vi.fn(async () => `https://mock-storage.com/${path}`),
    delete: vi.fn(async () => {
      mockFiles.delete(path);
    }),
  });

  return {
    ref: mockRef,
    mockFiles, // Expose for test assertions
  };
};
