/**
 * Canvas API Endpoints
 * CRUD operations for canvases
 */

const express = require('express');
const admin = require('firebase-admin');
const { authenticate, requirePermission } = require('../middleware/auth');
const { readLimiter, writeLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const db = admin.firestore();

/**
 * GET /api/canvases
 * Get all canvases accessible by the authenticated user
 */
router.get('/', authenticate, readLimiter, async (req, res) => {
  try {
    const { userId } = req;

    // Get canvases owned by or shared with the user
    const ownedCanvases = await db.collection('canvases')
      .where('ownerId', '==', userId)
      .get();

    const sharedCanvases = await db.collection('canvases')
      .where('collaborators', 'array-contains', userId)
      .get();

    // Combine and deduplicate
    const canvasMap = new Map();
    
    ownedCanvases.forEach(doc => {
      canvasMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    
    sharedCanvases.forEach(doc => {
      if (!canvasMap.has(doc.id)) {
        canvasMap.set(doc.id, { id: doc.id, ...doc.data() });
      }
    });

    res.json({
      canvases: Array.from(canvasMap.values()),
      count: canvasMap.size
    });
  } catch (error) {
    console.error('Error fetching canvases:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch canvases',
        code: 'FETCH_FAILED'
      }
    });
  }
});

/**
 * GET /api/canvases/:id
 * Get a specific canvas by ID
 */
router.get('/:id', authenticate, readLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, canvasId: tokenCanvasId } = req;

    // Token must have access to this specific canvas
    if (tokenCanvasId && tokenCanvasId !== id) {
      return res.status(403).json({
        error: {
          message: 'Token does not have access to this canvas',
          code: 'FORBIDDEN'
        }
      });
    }

    const canvasDoc = await db.collection('canvases').doc(id).get();

    if (!canvasDoc.exists) {
      return res.status(404).json({
        error: {
          message: 'Canvas not found',
          code: 'NOT_FOUND'
        }
      });
    }

    const canvasData = canvasDoc.data();

    // Check if user has access
    const hasAccess = canvasData.ownerId === userId || 
                     (canvasData.collaborators && canvasData.collaborators.includes(userId));

    if (!hasAccess) {
      return res.status(403).json({
        error: {
          message: 'Access denied to this canvas',
          code: 'FORBIDDEN'
        }
      });
    }

    res.json({
      id: canvasDoc.id,
      ...canvasData
    });
  } catch (error) {
    console.error('Error fetching canvas:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch canvas',
        code: 'FETCH_FAILED'
      }
    });
  }
});

/**
 * POST /api/canvases
 * Create a new canvas
 */
router.post('/', authenticate, requirePermission('create'), writeLimiter, async (req, res) => {
  try {
    const { userId } = req;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        error: {
          message: 'Canvas name is required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    // Create canvas document
    const canvasRef = db.collection('canvases').doc();
    const canvasData = {
      name,
      description: description || '',
      ownerId: userId,
      collaborators: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await canvasRef.set(canvasData);

    res.status(201).json({
      id: canvasRef.id,
      ...canvasData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating canvas:', error);
    res.status(500).json({
      error: {
        message: 'Failed to create canvas',
        code: 'CREATE_FAILED'
      }
    });
  }
});

/**
 * PUT /api/canvases/:id
 * Update a canvas
 */
router.put('/:id', authenticate, requirePermission('update'), writeLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, canvasId: tokenCanvasId } = req;
    const { name, description } = req.body;

    // Token must have access to this specific canvas
    if (tokenCanvasId && tokenCanvasId !== id) {
      return res.status(403).json({
        error: {
          message: 'Token does not have access to this canvas',
          code: 'FORBIDDEN'
        }
      });
    }

    const canvasRef = db.collection('canvases').doc(id);
    const canvasDoc = await canvasRef.get();

    if (!canvasDoc.exists) {
      return res.status(404).json({
        error: {
          message: 'Canvas not found',
          code: 'NOT_FOUND'
        }
      });
    }

    const canvasData = canvasDoc.data();

    // Only owner can update canvas metadata
    if (canvasData.ownerId !== userId) {
      return res.status(403).json({
        error: {
          message: 'Only canvas owner can update canvas',
          code: 'FORBIDDEN'
        }
      });
    }

    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    await canvasRef.update(updates);

    res.json({
      id,
      ...canvasData,
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating canvas:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update canvas',
        code: 'UPDATE_FAILED'
      }
    });
  }
});

/**
 * DELETE /api/canvases/:id
 * Delete a canvas
 */
router.delete('/:id', authenticate, requirePermission('delete'), writeLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, canvasId: tokenCanvasId } = req;

    // Token must have access to this specific canvas
    if (tokenCanvasId && tokenCanvasId !== id) {
      return res.status(403).json({
        error: {
          message: 'Token does not have access to this canvas',
          code: 'FORBIDDEN'
        }
      });
    }

    const canvasRef = db.collection('canvases').doc(id);
    const canvasDoc = await canvasRef.get();

    if (!canvasDoc.exists) {
      return res.status(404).json({
        error: {
          message: 'Canvas not found',
          code: 'NOT_FOUND'
        }
      });
    }

    const canvasData = canvasDoc.data();

    // Only owner can delete canvas
    if (canvasData.ownerId !== userId) {
      return res.status(403).json({
        error: {
          message: 'Only canvas owner can delete canvas',
          code: 'FORBIDDEN'
        }
      });
    }

    // Delete canvas and all its objects
    await canvasRef.delete();

    // Also delete all objects in this canvas (batch delete)
    const objectsSnapshot = await db.collection('objects')
      .where('canvasId', '==', id)
      .get();

    const batch = db.batch();
    objectsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting canvas:', error);
    res.status(500).json({
      error: {
        message: 'Failed to delete canvas',
        code: 'DELETE_FAILED'
      }
    });
  }
});

/**
 * GET /api/canvases/:id/snapshot
 * Get complete canvas state with all objects
 */
router.get('/:id/snapshot', authenticate, readLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, canvasId: tokenCanvasId } = req;

    // Token must have access to this specific canvas
    if (tokenCanvasId && tokenCanvasId !== id) {
      return res.status(403).json({
        error: {
          message: 'Token does not have access to this canvas',
          code: 'FORBIDDEN'
        }
      });
    }

    // Get canvas
    const canvasDoc = await db.collection('canvases').doc(id).get();

    if (!canvasDoc.exists) {
      return res.status(404).json({
        error: {
          message: 'Canvas not found',
          code: 'NOT_FOUND'
        }
      });
    }

    const canvasData = canvasDoc.data();

    // Check access
    const hasAccess = canvasData.ownerId === userId || 
                     (canvasData.collaborators && canvasData.collaborators.includes(userId));

    if (!hasAccess) {
      return res.status(403).json({
        error: {
          message: 'Access denied to this canvas',
          code: 'FORBIDDEN'
        }
      });
    }

    // Get all objects for this canvas
    const objectsSnapshot = await db.collection('objects')
      .where('canvasId', '==', id)
      .get();

    const objects = [];
    objectsSnapshot.forEach(doc => {
      objects.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      canvas: {
        id: canvasDoc.id,
        ...canvasData
      },
      objects,
      objectCount: objects.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching canvas snapshot:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch canvas snapshot',
        code: 'FETCH_FAILED'
      }
    });
  }
});

module.exports = router;

