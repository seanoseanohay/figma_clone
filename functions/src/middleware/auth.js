/**
 * Authentication Middleware
 * Validates API tokens and enforces permissions
 */

const admin = require('firebase-admin');
const { validateToken } = require('../utils/tokenValidator');

/**
 * Authenticate API requests using Bearer tokens
 * Expected header: Authorization: Bearer <token>
 */
async function authenticate(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: 'Missing or invalid authorization header',
          code: 'UNAUTHORIZED'
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate token and get token data
    const tokenData = await validateToken(token);

    if (!tokenData) {
      return res.status(401).json({
        error: {
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        }
      });
    }

    // Check if token is revoked
    if (tokenData.isRevoked) {
      return res.status(401).json({
        error: {
          message: 'Token has been revoked',
          code: 'TOKEN_REVOKED'
        }
      });
    }

    // Check if token has expired
    if (tokenData.expiresAt && tokenData.expiresAt.toDate() < new Date()) {
      return res.status(401).json({
        error: {
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        }
      });
    }

    // Attach token data and user info to request
    req.tokenData = tokenData;
    req.userId = tokenData.createdBy;
    req.canvasId = tokenData.canvasId;
    req.permissions = tokenData.permissions || [];

    // Update last used timestamp (async, don't wait)
    updateTokenUsage(tokenData.tokenId, tokenData.userId).catch(console.error);

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      error: {
        message: 'Authentication failed',
        code: 'AUTH_FAILED'
      }
    });
  }
}

/**
 * Check if user has specific permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.permissions || !req.permissions.includes(permission)) {
      return res.status(403).json({
        error: {
          message: `Permission denied: ${permission} required`,
          code: 'FORBIDDEN'
        }
      });
    }
    next();
  };
}

/**
 * Update token usage statistics
 */
async function updateTokenUsage(tokenId, userId) {
  const db = admin.firestore();
  const tokenRef = db.collection('users').doc(userId).collection('apiTokens').doc(tokenId);
  
  await tokenRef.update({
    lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    usageCount: admin.firestore.FieldValue.increment(1)
  });
}

module.exports = {
  authenticate,
  requirePermission
};

