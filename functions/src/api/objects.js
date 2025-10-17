/**
 * Objects API Endpoints
 * CRUD and batch operations for canvas objects
 */

const express = require('express');
const admin = require('firebase-admin');
const { authenticate, requirePermission } = require('../middleware/auth');
const { readLimiter, writeLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const db = admin.firestore();

/**
 * Helper: Check if user has access to canvas
 */
async function checkCanvasAccess(canvasId, userId) {
  const canvasDoc = await db.collection('canvases').doc(canvasId).get();
  
  if (!canvasDoc.exists) {
    return { hasAccess: false, error: 'Canvas not found' };
  }

  const canvasData = canvasDoc.data();
  const hasAccess = canvasData.ownerId === userId || 
                   (canvasData.collaborators && canvasData.collaborators.includes(userId));

  return { hasAccess, canvas: canvasData };
}

/**
 * GET /api/objects?canvasId=xxx
 * Get all objects for a canvas
 */
router.get('/', authenticate, readLimiter, async (req, res) => {
  try {
    const { canvasId } = req.query;
    const { userId, canvasId: tokenCanvasId } = req;

    if (!canvasId) {
      return res.status(400).json({
        error: {
          message: 'canvasId query parameter is required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    // Token must have access to this specific canvas
    if (tokenCanvasId && tokenCanvasId !== canvasId) {
      return res.status(403).json({
        error: {
          message: 'Token does not have access to this canvas',
          code: 'FORBIDDEN'
        }
      });
    }

    // Check canvas access
    const { hasAccess, error } = await checkCanvasAccess(canvasId, userId);
    if (!hasAccess) {
      return res.status(error === 'Canvas not found' ? 404 : 403).json({
        error: {
          message: error,
          code: error === 'Canvas not found' ? 'NOT_FOUND' : 'FORBIDDEN'
        }
      });
    }

    // Get all objects
    const objectsSnapshot = await db.collection('objects')
      .where('canvasId', '==', canvasId)
      .get();

    const objects = [];
    objectsSnapshot.forEach(doc => {
      objects.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      objects,
      count: objects.length
    });
  } catch (error) {
    console.error('Error fetching objects:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch objects',
        code: 'FETCH_FAILED'
      }
    });
  }
});

/**
 * GET /api/objects/:id
 * Get a specific object
 */
router.get('/:id', authenticate, readLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, canvasId: tokenCanvasId } = req;

    const objectDoc = await db.collection('objects').doc(id).get();

    if (!objectDoc.exists) {
      return res.status(404).json({
        error: {
          message: 'Object not found',
          code: 'NOT_FOUND'
        }
      });
    }

    const objectData = objectDoc.data();

    // Token must have access to this canvas
    if (tokenCanvasId && tokenCanvasId !== objectData.canvasId) {
      return res.status(403).json({
        error: {
          message: 'Token does not have access to this canvas',
          code: 'FORBIDDEN'
        }
      });
    }

    // Check canvas access
    const { hasAccess, error } = await checkCanvasAccess(objectData.canvasId, userId);
    if (!hasAccess) {
      return res.status(403).json({
        error: {
          message: error,
          code: 'FORBIDDEN'
        }
      });
    }

    res.json({
      id: objectDoc.id,
      ...objectData
    });
  } catch (error) {
    console.error('Error fetching object:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch object',
        code: 'FETCH_FAILED'
      }
    });
  }
});

/**
 * POST /api/objects
 * Create a new object
 */
router.post('/', authenticate, requirePermission('create_objects'), writeLimiter, async (req, res) => {
  try {
    const { userId, canvasId: tokenCanvasId } = req;
    const { canvasId, type, x, y, width, height, fill, ...otherProps } = req.body;

    // Validate required fields
    if (!canvasId || !type) {
      return res.status(400).json({
        error: {
          message: 'canvasId and type are required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    // Token must have access to this canvas
    if (tokenCanvasId && tokenCanvasId !== canvasId) {
      return res.status(403).json({
        error: {
          message: 'Token does not have access to this canvas',
          code: 'FORBIDDEN'
        }
      });
    }

    // Check canvas access
    const { hasAccess, error } = await checkCanvasAccess(canvasId, userId);
    if (!hasAccess) {
      return res.status(error === 'Canvas not found' ? 404 : 403).json({
        error: {
          message: error,
          code: error === 'Canvas not found' ? 'NOT_FOUND' : 'FORBIDDEN'
        }
      });
    }

    // Create object
    const objectRef = db.collection('objects').doc();
    const objectData = {
      canvasId,
      type,
      x: x || 0,
      y: y || 0,
      width: width || 100,
      height: height || 100,
      fill: fill || '#808080',
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...otherProps
    };

    await objectRef.set(objectData);

    res.status(201).json({
      id: objectRef.id,
      ...objectData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating object:', error);
    res.status(500).json({
      error: {
        message: 'Failed to create object',
        code: 'CREATE_FAILED'
      }
    });
  }
});

/**
 * PUT /api/objects/:id
 * Update an object (full update)
 */
router.put('/:id', authenticate, requirePermission('update_objects'), writeLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, canvasId: tokenCanvasId } = req;
    const updates = req.body;

    const objectRef = db.collection('objects').doc(id);
    const objectDoc = await objectRef.get();

    if (!objectDoc.exists) {
      return res.status(404).json({
        error: {
          message: 'Object not found',
          code: 'NOT_FOUND'
        }
      });
    }

    const objectData = objectDoc.data();

    // Token must have access to this canvas
    if (tokenCanvasId && tokenCanvasId !== objectData.canvasId) {
      return res.status(403).json({
        error: {
          message: 'Token does not have access to this canvas',
          code: 'FORBIDDEN'
        }
      });
    }

    // Check canvas access
    const { hasAccess, error } = await checkCanvasAccess(objectData.canvasId, userId);
    if (!hasAccess) {
      return res.status(403).json({
        error: {
          message: error,
          code: 'FORBIDDEN'
        }
      });
    }

    // Don't allow changing canvasId or createdBy
    delete updates.canvasId;
    delete updates.createdBy;
    delete updates.createdAt;

    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await objectRef.update(updates);

    res.json({
      id,
      ...objectData,
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating object:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update object',
        code: 'UPDATE_FAILED'
      }
    });
  }
});

/**
 * PATCH /api/objects/:id
 * Partially update an object
 */
router.patch('/:id', authenticate, requirePermission('update_objects'), writeLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, canvasId: tokenCanvasId } = req;
    const updates = req.body;

    const objectRef = db.collection('objects').doc(id);
    const objectDoc = await objectRef.get();

    if (!objectDoc.exists) {
      return res.status(404).json({
        error: {
          message: 'Object not found',
          code: 'NOT_FOUND'
        }
      });
    }

    const objectData = objectDoc.data();

    // Token must have access to this canvas
    if (tokenCanvasId && tokenCanvasId !== objectData.canvasId) {
      return res.status(403).json({
        error: {
          message: 'Token does not have access to this canvas',
          code: 'FORBIDDEN'
        }
      });
    }

    // Check canvas access
    const { hasAccess, error } = await checkCanvasAccess(objectData.canvasId, userId);
    if (!hasAccess) {
      return res.status(403).json({
        error: {
          message: error,
          code: 'FORBIDDEN'
        }
      });
    }

    // Don't allow changing canvasId or createdBy
    delete updates.canvasId;
    delete updates.createdBy;
    delete updates.createdAt;

    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await objectRef.update(updates);

    res.json({
      id,
      ...objectData,
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error patching object:', error);
    res.status(500).json({
      error: {
        message: 'Failed to patch object',
        code: 'UPDATE_FAILED'
      }
    });
  }
});

/**
 * DELETE /api/objects/:id
 * Delete an object
 */
router.delete('/:id', authenticate, requirePermission('delete_objects'), writeLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, canvasId: tokenCanvasId } = req;

    const objectRef = db.collection('objects').doc(id);
    const objectDoc = await objectRef.get();

    if (!objectDoc.exists) {
      return res.status(404).json({
        error: {
          message: 'Object not found',
          code: 'NOT_FOUND'
        }
      });
    }

    const objectData = objectDoc.data();

    // Token must have access to this canvas
    if (tokenCanvasId && tokenCanvasId !== objectData.canvasId) {
      return res.status(403).json({
        error: {
          message: 'Token does not have access to this canvas',
          code: 'FORBIDDEN'
        }
      });
    }

    // Check canvas access
    const { hasAccess, error } = await checkCanvasAccess(objectData.canvasId, userId);
    if (!hasAccess) {
      return res.status(403).json({
        error: {
          message: error,
          code: 'FORBIDDEN'
        }
      });
    }

    await objectRef.delete();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting object:', error);
    res.status(500).json({
      error: {
        message: 'Failed to delete object',
        code: 'DELETE_FAILED'
      }
    });
  }
});

/**
 * POST /api/objects/batch
 * Create multiple objects in one request (AI efficiency)
 */
router.post('/batch', authenticate, requirePermission('create_objects'), writeLimiter, async (req, res) => {
  try {
    const { userId, canvasId: tokenCanvasId } = req;
    const { canvasId, objects } = req.body;

    if (!canvasId || !objects || !Array.isArray(objects)) {
      return res.status(400).json({
        error: {
          message: 'canvasId and objects array are required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    if (objects.length > 100) {
      return res.status(400).json({
        error: {
          message: 'Maximum 100 objects per batch request',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    // Token must have access to this canvas
    if (tokenCanvasId && tokenCanvasId !== canvasId) {
      return res.status(403).json({
        error: {
          message: 'Token does not have access to this canvas',
          code: 'FORBIDDEN'
        }
      });
    }

    // Check canvas access
    const { hasAccess, error } = await checkCanvasAccess(canvasId, userId);
    if (!hasAccess) {
      return res.status(error === 'Canvas not found' ? 404 : 403).json({
        error: {
          message: error,
          code: error === 'Canvas not found' ? 'NOT_FOUND' : 'FORBIDDEN'
        }
      });
    }

    // Create all objects in a batch
    const batch = db.batch();
    const createdObjects = [];

    objects.forEach(obj => {
      const objectRef = db.collection('objects').doc();
      const objectData = {
        canvasId,
        type: obj.type || 'rectangle',
        x: obj.x || 0,
        y: obj.y || 0,
        width: obj.width || 100,
        height: obj.height || 100,
        fill: obj.fill || '#808080',
        createdBy: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...obj
      };

      batch.set(objectRef, objectData);
      createdObjects.push({
        id: objectRef.id,
        ...objectData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    await batch.commit();

    res.status(201).json({
      objects: createdObjects,
      count: createdObjects.length
    });
  } catch (error) {
    console.error('Error creating objects batch:', error);
    res.status(500).json({
      error: {
        message: 'Failed to create objects batch',
        code: 'CREATE_FAILED'
      }
    });
  }
});

/**
 * PUT /api/objects/batch
 * Update multiple objects in one request
 */
router.put('/batch', authenticate, requirePermission('update_objects'), writeLimiter, async (req, res) => {
  try {
    const { userId, canvasId: tokenCanvasId } = req;
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        error: {
          message: 'updates array is required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    if (updates.length > 100) {
      return res.status(400).json({
        error: {
          message: 'Maximum 100 objects per batch request',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    const batch = db.batch();
    const updatedObjects = [];

    for (const update of updates) {
      if (!update.id) continue;

      const objectRef = db.collection('objects').doc(update.id);
      const objectDoc = await objectRef.get();

      if (!objectDoc.exists) continue;

      const objectData = objectDoc.data();

      // Token must have access to this canvas
      if (tokenCanvasId && tokenCanvasId !== objectData.canvasId) continue;

      // Check canvas access
      const { hasAccess } = await checkCanvasAccess(objectData.canvasId, userId);
      if (!hasAccess) continue;

      const { id, canvasId, createdBy, createdAt, ...updateData } = update;
      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      batch.update(objectRef, updateData);
      updatedObjects.push({
        id: update.id,
        ...objectData,
        ...updateData,
        updatedAt: new Date().toISOString()
      });
    }

    await batch.commit();

    res.json({
      objects: updatedObjects,
      count: updatedObjects.length
    });
  } catch (error) {
    console.error('Error updating objects batch:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update objects batch',
        code: 'UPDATE_FAILED'
      }
    });
  }
});

/**
 * DELETE /api/objects/batch
 * Delete multiple objects in one request
 */
router.delete('/batch', authenticate, requirePermission('delete_objects'), writeLimiter, async (req, res) => {
  try {
    const { userId, canvasId: tokenCanvasId } = req;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        error: {
          message: 'ids array is required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    if (ids.length > 100) {
      return res.status(400).json({
        error: {
          message: 'Maximum 100 objects per batch request',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    const batch = db.batch();
    let deletedCount = 0;

    for (const id of ids) {
      const objectRef = db.collection('objects').doc(id);
      const objectDoc = await objectRef.get();

      if (!objectDoc.exists) continue;

      const objectData = objectDoc.data();

      // Token must have access to this canvas
      if (tokenCanvasId && tokenCanvasId !== objectData.canvasId) continue;

      // Check canvas access
      const { hasAccess } = await checkCanvasAccess(objectData.canvasId, userId);
      if (!hasAccess) continue;

      batch.delete(objectRef);
      deletedCount++;
    }

    await batch.commit();

    res.json({
      deleted: deletedCount
    });
  } catch (error) {
    console.error('Error deleting objects batch:', error);
    res.status(500).json({
      error: {
        message: 'Failed to delete objects batch',
        code: 'DELETE_FAILED'
      }
    });
  }
});

module.exports = router;

