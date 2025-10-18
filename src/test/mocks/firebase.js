import { vi } from 'vitest';

/**
 * Comprehensive Firebase mocks for testing
 * Mocks Firestore, RTDB, Auth, and Storage
 */

// Mock Firestore document
export function createMockDoc(data = {}, exists = true) {
  return {
    id: data.id || 'mock-doc-id',
    exists: () => exists,
    data: () => (exists ? data : undefined),
    ref: {
      id: data.id || 'mock-doc-id',
      path: 'mock/path',
    },
  };
}

// Mock Firestore document reference
export function createMockDocRef(data = {}) {
  const docData = { ...data };
  
  return {
    id: data.id || 'mock-doc-id',
    path: 'mock/path',
    get: vi.fn(() => Promise.resolve(createMockDoc(docData))),
    set: vi.fn((newData) => {
      Object.assign(docData, newData);
      return Promise.resolve();
    }),
    update: vi.fn((updates) => {
      Object.assign(docData, updates);
      return Promise.resolve();
    }),
    delete: vi.fn(() => Promise.resolve()),
    onSnapshot: vi.fn((callback) => {
      callback(createMockDoc(docData));
      return vi.fn(); // Unsubscribe function
    }),
  };
}

// Mock Firestore collection reference
export function createMockCollectionRef(docs = []) {
  const collectionDocs = [...docs];
  
  return {
    doc: vi.fn((id) => {
      const doc = collectionDocs.find(d => d.id === id);
      return createMockDocRef(doc || { id });
    }),
    add: vi.fn((data) => {
      const newDoc = { id: `mock-id-${Date.now()}`, ...data };
      collectionDocs.push(newDoc);
      return Promise.resolve(createMockDocRef(newDoc));
    }),
    where: vi.fn(() => createMockQuery(collectionDocs)),
    orderBy: vi.fn(() => createMockQuery(collectionDocs)),
    limit: vi.fn(() => createMockQuery(collectionDocs)),
    get: vi.fn(() => Promise.resolve(createMockQuerySnapshot(collectionDocs))),
    onSnapshot: vi.fn((callback) => {
      callback(createMockQuerySnapshot(collectionDocs));
      return vi.fn(); // Unsubscribe function
    }),
  };
}

// Mock Firestore query
function createMockQuery(docs = []) {
  const queryDocs = [...docs];
  
  return {
    where: vi.fn(() => createMockQuery(queryDocs)),
    orderBy: vi.fn(() => createMockQuery(queryDocs)),
    limit: vi.fn((limitCount) => createMockQuery(queryDocs.slice(0, limitCount))),
    get: vi.fn(() => Promise.resolve(createMockQuerySnapshot(queryDocs))),
    onSnapshot: vi.fn((callback) => {
      callback(createMockQuerySnapshot(queryDocs));
      return vi.fn(); // Unsubscribe function
    }),
  };
}

// Mock Firestore query snapshot
function createMockQuerySnapshot(docs = []) {
  return {
    docs: docs.map(createMockDoc),
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback) => docs.forEach((doc) => callback(createMockDoc(doc))),
  };
}

// Mock Firestore
export function createMockFirestore() {
  return {
    collection: vi.fn((path) => createMockCollectionRef()),
    doc: vi.fn((path) => createMockDocRef()),
  };
}

// Mock RTDB reference
export function createMockRTDBRef(initialData = null) {
  let data = initialData;
  const listeners = new Map();
  
  return {
    set: vi.fn((value) => {
      data = value;
      // Trigger 'value' listeners
      if (listeners.has('value')) {
        listeners.get('value').forEach(callback => {
          callback(createMockRTDBSnapshot(data));
        });
      }
      return Promise.resolve();
    }),
    update: vi.fn((updates) => {
      data = { ...data, ...updates };
      // Trigger 'value' listeners
      if (listeners.has('value')) {
        listeners.get('value').forEach(callback => {
          callback(createMockRTDBSnapshot(data));
        });
      }
      return Promise.resolve();
    }),
    remove: vi.fn(() => {
      data = null;
      // Trigger 'value' listeners
      if (listeners.has('value')) {
        listeners.get('value').forEach(callback => {
          callback(createMockRTDBSnapshot(null));
        });
      }
      return Promise.resolve();
    }),
    on: vi.fn((eventType, callback) => {
      if (!listeners.has(eventType)) {
        listeners.set(eventType, []);
      }
      listeners.get(eventType).push(callback);
      // Immediately call callback with current data
      callback(createMockRTDBSnapshot(data));
    }),
    off: vi.fn((eventType, callback) => {
      if (listeners.has(eventType)) {
        const callbacks = listeners.get(eventType);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }),
    once: vi.fn((eventType) => {
      return Promise.resolve(createMockRTDBSnapshot(data));
    }),
    child: vi.fn((path) => createMockRTDBRef(data?.[path])),
  };
}

// Mock RTDB snapshot
function createMockRTDBSnapshot(value) {
  return {
    val: () => value,
    exists: () => value !== null && value !== undefined,
    key: 'mock-key',
    ref: createMockRTDBRef(value),
  };
}

// Mock RTDB
export function createMockRTDB() {
  return {
    ref: vi.fn((path) => createMockRTDBRef()),
  };
}

// Mock Firebase Auth User
export function createMockAuthUser(overrides = {}) {
  return {
    uid: 'test-user-id',
    email: 'bobtester@test.com',
    displayName: 'Bob Tester',
    photoURL: null,
    emailVerified: true,
    ...overrides,
  };
}

// Mock Firebase Auth
export function createMockAuth() {
  let currentUser = createMockAuthUser();
  const authStateListeners = [];
  
  return {
    currentUser,
    signInWithEmailAndPassword: vi.fn((email, password) => {
      currentUser = createMockAuthUser({ email });
      authStateListeners.forEach(callback => callback(currentUser));
      return Promise.resolve({ user: currentUser });
    }),
    signOut: vi.fn(() => {
      currentUser = null;
      authStateListeners.forEach(callback => callback(null));
      return Promise.resolve();
    }),
    onAuthStateChanged: vi.fn((callback) => {
      authStateListeners.push(callback);
      callback(currentUser);
      return vi.fn(() => {
        const index = authStateListeners.indexOf(callback);
        if (index > -1) authStateListeners.splice(index, 1);
      });
    }),
  };
}

// Mock Firebase Storage
export function createMockStorage() {
  return {
    ref: vi.fn((path) => ({
      put: vi.fn(() => Promise.resolve({ ref: { getDownloadURL: () => Promise.resolve('mock-url') } })),
      putString: vi.fn(() => Promise.resolve({ ref: { getDownloadURL: () => Promise.resolve('mock-url') } })),
      getDownloadURL: vi.fn(() => Promise.resolve('mock-url')),
      delete: vi.fn(() => Promise.resolve()),
    })),
  };
}

// Export default mock Firebase app
export const mockFirebaseApp = {
  firestore: createMockFirestore(),
  rtdb: createMockRTDB(),
  auth: createMockAuth(),
  storage: createMockStorage(),
};

