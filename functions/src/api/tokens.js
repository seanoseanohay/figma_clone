/**
 * Tokens API Endpoints
 * Generate and manage API tokens
 * Note: This is primarily for internal use, main token management is in the UI (Task C8)
 */

const express = require('express');
const admin = require('firebase-admin');
const { generateToken, hashToken } = require('../utils/tokenValidator');

const router = express.Router();
const db = admin.firestore();

/**
 * POST /api/tokens/generate
 * Generate a new API token (requires Firebase Auth)
 * This endpoint uses Firebase Auth ID token, not API token
 */
router.post('/generate', async (req, res) => {
  try {
    // Verify Firebase Auth ID token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: 'Missing or invalid authorization header',
          code: 'UNAUTHORIZED'
        }
      });
    }

    const idToken = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const { name, canvasId, permissions, expiresInDays } = req.body;

    // Validate required fields
    if (!name || !canvasId) {
      return res.status(400).json({
        error: {
          message: 'name and canvasId are required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    // Verify user has access to canvas
    const canvasDoc = await db.collection('canvases').doc(canvasId).get();
    if (!canvasDoc.exists) {
      return res.status(404).json({
        error: {
          message: 'Canvas not found',
          code: 'NOT_FOUND'
        }
      });
    }

    const canvasData = canvasDoc.data();
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

    // Generate token
    const token = generateToken();
    const tokenHash = hashToken(token);

    // Calculate expiration (default 90 days)
    const expirationDays = expiresInDays || 90;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Create token document
    const tokenRef = db.collection('users').doc(userId).collection('apiTokens').doc();
    const tokenData = {
      tokenId: tokenRef.id,
      token: tokenHash, // Store hashed token
      name,
      canvasId,
      canvasName: canvasData.name,
      permissions: permissions || ['read', 'create_objects', 'update_objects', 'delete_objects'],
      rateLimit: {
        read: 200,
        write: 50
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      lastUsedAt: null,
      usageCount: 0,
      isRevoked: false,
      createdBy: userId
    };

    await tokenRef.set(tokenData);

    // Return plaintext token (ONLY TIME IT'S SHOWN)
    res.status(201).json({
      token, // Plaintext token - show only once
      tokenId: tokenRef.id,
      name,
      canvasId,
      canvasName: canvasData.name,
      permissions: tokenData.permissions,
      expiresAt: expiresAt.toISOString(),
      warning: 'This token will only be shown once. Store it securely.'
    });
  } catch (error) {
    console.error('Error generating token:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: {
          message: 'Firebase Auth token expired',
          code: 'TOKEN_EXPIRED'
        }
      });
    }

    res.status(500).json({
      error: {
        message: 'Failed to generate token',
        code: 'GENERATION_FAILED'
      }
    });
  }
});

/**
 * DELETE /api/tokens/:tokenId
 * Revoke a token (requires Firebase Auth)
 */
router.delete('/:tokenId', async (req, res) => {
  try {
    // Verify Firebase Auth ID token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: 'Missing or invalid authorization header',
          code: 'UNAUTHORIZED'
        }
      });
    }

    const idToken = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const { tokenId } = req.params;

    // Revoke token
    const tokenRef = db.collection('users').doc(userId).collection('apiTokens').doc(tokenId);
    const tokenDoc = await tokenRef.get();

    if (!tokenDoc.exists) {
      return res.status(404).json({
        error: {
          message: 'Token not found',
          code: 'NOT_FOUND'
        }
      });
    }

    await tokenRef.update({
      isRevoked: true,
      revokedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error revoking token:', error);
    res.status(500).json({
      error: {
        message: 'Failed to revoke token',
        code: 'REVOKE_FAILED'
      }
    });
  }
});

module.exports = router;

