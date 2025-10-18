/**
 * Test data fixtures for consistent test data across test suites
 */

/**
 * Create a test user
 */
export const createTestUser = (overrides = {}) => ({
  uid: 'test-user-id',
  email: 'bobtester@test.com',
  displayName: 'Bob Tester',
  photoURL: null,
  ...overrides,
});

/**
 * Create a second test user for multi-user scenarios
 */
export const createSecondTestUser = (overrides = {}) => ({
  uid: 'test-user-2-id',
  email: 'alice@test.com',
  displayName: 'Alice Test',
  photoURL: null,
  ...overrides,
});

/**
 * Create a test canvas
 */
export const createTestCanvas = (overrides = {}) => ({
  id: 'test-canvas-id',
  name: 'Test Canvas',
  ownerId: 'test-user-id',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * Create a test rectangle object
 */
export const createTestRectangle = (overrides = {}) => ({
  id: 'rect-1',
  type: 'rectangle',
  x: 100,
  y: 100,
  width: 150,
  height: 100,
  fill: '#3b82f6',
  rotation: 0,
  ownerId: 'test-user-id',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  zIndex: 0,
  ...overrides,
});

/**
 * Create a test circle object
 */
export const createTestCircle = (overrides = {}) => ({
  id: 'circle-1',
  type: 'circle',
  x: 300,
  y: 200,
  radius: 75,
  fill: '#ef4444',
  rotation: 0,
  ownerId: 'test-user-id',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  zIndex: 1,
  ...overrides,
});

/**
 * Create a test star object
 */
export const createTestStar = (overrides = {}) => ({
  id: 'star-1',
  type: 'star',
  x: 500,
  y: 250,
  numPoints: 5,
  innerRadius: 30,
  outerRadius: 60,
  fill: '#fbbf24',
  rotation: 0,
  ownerId: 'test-user-id',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  zIndex: 2,
  ...overrides,
});

/**
 * Create a test text object
 */
export const createTestText = (overrides = {}) => ({
  id: 'text-1',
  type: 'text',
  x: 150,
  y: 350,
  text: 'Hello World',
  fontSize: 24,
  fontFamily: 'Arial',
  fill: '#000000',
  bold: false,
  italic: false,
  underline: false,
  rotation: 0,
  ownerId: 'test-user-id',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  zIndex: 3,
  ...overrides,
});

/**
 * Create a test canvas state with multiple objects
 */
export const createTestCanvasState = () => ({
  canvas: createTestCanvas(),
  objects: [
    createTestRectangle(),
    createTestCircle(),
    createTestStar(),
    createTestText(),
  ],
  users: [createTestUser()],
  selectedObjectId: null,
  activeTool: 'select',
});

/**
 * Create a multi-user canvas state
 */
export const createMultiUserCanvasState = () => ({
  canvas: createTestCanvas(),
  objects: [
    createTestRectangle({ ownerId: 'test-user-id' }),
    createTestCircle({ ownerId: 'test-user-2-id' }),
  ],
  users: [createTestUser(), createSecondTestUser()],
  selectedObjectId: null,
  activeTool: 'select',
});

/**
 * Create a rotated rectangle (for testing rotation-aware operations)
 */
export const createRotatedRectangle = (rotation = 45, overrides = {}) =>
  createTestRectangle({
    rotation,
    ...overrides,
  });

/**
 * Create cursor position data
 */
export const createCursorPosition = (x = 100, y = 100, userId = 'test-user-id') => ({
  x,
  y,
  userId,
  userName: 'Bob Tester',
  timestamp: Date.now(),
});

/**
 * Create object ownership/lock data
 */
export const createObjectLock = (objectId = 'rect-1', userId = 'test-user-id') => ({
  objectId,
  userId,
  userName: 'Bob Tester',
  lockedAt: Date.now(),
});

/**
 * Create tool context (helpers object for tool handlers)
 */
export const createToolContext = (overrides = {}) => ({
  pos: { x: 100, y: 100 },
  canvasId: 'test-canvas-id',
  ...overrides,
});

/**
 * Create a mock mouse event
 */
export const createMouseEvent = (overrides = {}) => ({
  evt: {
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    preventDefault: () => {},
    stopPropagation: () => {},
    ...overrides,
  },
});
