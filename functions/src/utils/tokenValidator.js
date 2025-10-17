/**
 * Token Validation Utility
 * Validates API tokens against Firestore
 */

const admin = require('firebase-admin');
const crypto = require('crypto');

/**
 * Validate an API token
 * @param {string} token - The plaintext token to validate
 * @returns {Object|null} Token data if valid, null otherwise
 */
async function validateToken(token) {
  try {
    if (!token || token.length !== 64) {
      return null;
    }

    // Hash the token to compare with stored hash
    const tokenHash = hashToken(token);

    // Query Firestore for the token
    // We need to search across all users' tokens
    const db = admin.firestore();
    
    // This is inefficient, but we'll optimize with a separate tokens collection
    // For now, we'll use the structure from Task C8
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const tokensSnapshot = await userDoc.ref.collection('apiTokens')
        .where('token', '==', tokenHash)
        .limit(1)
        .get();
      
      if (!tokensSnapshot.empty) {
        const tokenDoc = tokensSnapshot.docs[0];
        return {
          tokenId: tokenDoc.id,
          userId: userDoc.id,
          ...tokenDoc.data()
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

/**
 * Hash a token using SHA-256
 * @param {string} token - The plaintext token
 * @returns {string} The hashed token
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a secure random token
 * @returns {string} A 64-character hexadecimal token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  validateToken,
  hashToken,
  generateToken
};

