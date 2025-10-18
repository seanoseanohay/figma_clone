/**
 * Test fixtures for shapes, users, canvases, and other test data
 * These factories create realistic test data with defaults that can be overridden
 */

/**
 * Create a test user
 */
export function createTestUser(overrides = {}) {
  return {
    uid: 'test-user-id',
    email: 'bobtester@test.com',
    displayName: 'Bob Tester',
    photoURL: null,
    avatarColor: '#4F46E5',
    ...overrides,
  };
}

/**
 * Create multiple test users for multi-user scenarios
 */
export function createTestUsers(count = 2) {
  return Array.from({ length: count }, (_, i) => createTestUser({
    uid: `test-user-${i + 1}`,
    email: `user${i + 1}@test.com`,
    displayName: `Test User ${i + 1}`,
    avatarColor: ['#4F46E5', '#EF4444', '#10B981', '#F59E0B'][i % 4],
  }));
}

/**
 * Create a test canvas
 */
export function createTestCanvas(overrides = {}) {
  return {
    id: 'test-canvas-id',
    name: 'Test Canvas',
    ownerId: 'test-user-id',
    collaborators: [],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a test rectangle shape
 */
export function createTestRectangle(overrides = {}) {
  return {
    id: `rect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'rectangle',
    x: 100,
    y: 100,
    width: 150,
    height: 100,
    fill: '#000000',
    rotation: 0,
    zIndex: 0,
    createdBy: 'test-user-id',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a test circle shape
 */
export function createTestCircle(overrides = {}) {
  return {
    id: `circle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'circle',
    x: 200,
    y: 200,
    radius: 75,
    fill: '#FF0000',
    rotation: 0,
    zIndex: 0,
    createdBy: 'test-user-id',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a test star shape
 */
export function createTestStar(overrides = {}) {
  return {
    id: `star-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'star',
    x: 300,
    y: 300,
    numPoints: 5,
    innerRadius: 40,
    outerRadius: 80,
    fill: '#FFFF00',
    rotation: 0,
    zIndex: 0,
    createdBy: 'test-user-id',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a test text object
 */
export function createTestText(overrides = {}) {
  return {
    id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'text',
    x: 400,
    y: 400,
    text: 'Test Text',
    fontSize: 24,
    fontFamily: 'Arial',
    fill: '#000000',
    bold: false,
    italic: false,
    underline: false,
    rotation: 0,
    zIndex: 0,
    createdBy: 'test-user-id',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a rotated shape (any type)
 */
export function createRotatedShape(type = 'rectangle', rotation = 45, overrides = {}) {
  const factories = {
    rectangle: createTestRectangle,
    circle: createTestCircle,
    star: createTestStar,
    text: createTestText,
  };
  
  const factory = factories[type] || createTestRectangle;
  return factory({ rotation, ...overrides });
}

/**
 * Create overlapping shapes for z-index testing
 */
export function createOverlappingShapes() {
  return [
    createTestRectangle({ id: 'rect-1', x: 100, y: 100, zIndex: 0, fill: '#FF0000' }),
    createTestRectangle({ id: 'rect-2', x: 120, y: 120, zIndex: 1, fill: '#00FF00' }),
    createTestRectangle({ id: 'rect-3', x: 140, y: 140, zIndex: 2, fill: '#0000FF' }),
  ];
}

/**
 * Create a canvas with multiple objects
 */
export function createCanvasWithObjects(objectCount = 5) {
  const canvas = createTestCanvas();
  const objects = [];
  
  for (let i = 0; i < objectCount; i++) {
    const type = ['rectangle', 'circle', 'star', 'text'][i % 4];
    const factories = {
      rectangle: createTestRectangle,
      circle: createTestCircle,
      star: createTestStar,
      text: createTestText,
    };
    
    objects.push(factories[type]({
      id: `object-${i}`,
      x: 100 + (i * 50),
      y: 100 + (i * 50),
      zIndex: i,
    }));
  }
  
  return { canvas, objects };
}

/**
 * Create object ownership data for testing locking/unlocking
 */
export function createObjectOwnership(objectId, userId = 'test-user-id') {
  return {
    objectId,
    ownerId: userId,
    lockedAt: Date.now(),
    lockedBy: userId,
  };
}

/**
 * Create cursor position data for presence testing
 */
export function createCursorData(userId = 'test-user-id', x = 100, y = 100) {
  return {
    userId,
    x,
    y,
    timestamp: Date.now(),
  };
}

/**
 * Create presence data for a user
 */
export function createPresenceData(user = createTestUser()) {
  return {
    userId: user.uid,
    displayName: user.displayName,
    avatarColor: user.avatarColor,
    online: true,
    lastSeen: Date.now(),
  };
}

/**
 * Create mouse event data for tool testing
 */
export function createMouseEventData(x = 100, y = 100, button = 0) {
  return {
    clientX: x,
    clientY: y,
    button,
    buttons: 1,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
  };
}

/**
 * Create keyboard event data for tool testing
 */
export function createKeyboardEventData(key = 'Enter', modifiers = {}) {
  return {
    key,
    code: `Key${key.toUpperCase()}`,
    ctrlKey: modifiers.ctrl || false,
    shiftKey: modifiers.shift || false,
    altKey: modifiers.alt || false,
    metaKey: modifiers.meta || false,
    preventDefault: () => {},
    stopPropagation: () => {},
  };
}

/**
 * Create canvas state for testing
 */
export function createCanvasState(overrides = {}) {
  return {
    objects: [],
    selectedObject: null,
    currentTool: 'select',
    zoom: 1,
    pan: { x: 0, y: 0 },
    ...overrides,
  };
}

/**
 * Create tool handler context for testing
 */
export function createToolContext(overrides = {}) {
  return {
    canvas: createTestCanvas(),
    objects: [],
    currentUser: createTestUser(),
    selectedObject: null,
    setSelectedObject: () => {},
    onObjectCreate: () => {},
    onObjectUpdate: () => {},
    ...overrides,
  };
}

