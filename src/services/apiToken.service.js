/**
 * API Token Service
 * Manages API tokens for external/AI access
 */

import { db, auth } from './firebase.js';
import { 
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

/**
 * Generate a new API token
 * @param {string} canvasId - Canvas ID
 * @param {string} name - Token name/description
 * @param {string[]} permissions - Token permissions
 * @param {number} expiresInDays - Expiration in days (default 90)
 * @returns {Promise<Object>} Token data with plaintext token
 */
export async function generateApiToken(canvasId, name, permissions = null, expiresInDays = 90) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Get Firebase Auth ID token
    const idToken = await user.getIdToken();

    // Get canvas name
    const canvasDoc = await getDoc(doc(db, 'canvases', canvasId));
    if (!canvasDoc.exists()) {
      throw new Error('Canvas not found');
    }

    const canvasData = canvasDoc.data();

    // Default permissions if not specified
    const tokenPermissions = permissions || [
      'read',
      'create_objects',
      'update_objects',
      'delete_objects'
    ];

    // Call Cloud Function to generate token
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/tokens/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        name,
        canvasId,
        permissions: tokenPermissions,
        expiresInDays
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate token');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating API token:', error);
    throw error;
  }
}

/**
 * List all API tokens for current user
 * @returns {Promise<Array>} Array of token objects
 */
export async function listApiTokens() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const tokensRef = collection(db, 'users', user.uid, 'apiTokens');
    const tokensQuery = query(tokensRef, orderBy('createdAt', 'desc'));
    const tokensSnapshot = await getDocs(tokensQuery);

    const tokens = [];
    tokensSnapshot.forEach(doc => {
      const data = doc.data();
      tokens.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || null,
        expiresAt: data.expiresAt?.toDate?.() || null,
        lastUsedAt: data.lastUsedAt?.toDate?.() || null
      });
    });

    return tokens;
  } catch (error) {
    console.error('Error listing API tokens:', error);
    throw error;
  }
}

/**
 * Revoke an API token
 * @param {string} tokenId - Token ID to revoke
 * @returns {Promise<void>}
 */
export async function revokeApiToken(tokenId) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Get Firebase Auth ID token
    const idToken = await user.getIdToken();

    // Call Cloud Function to revoke token
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/tokens/${tokenId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (!response.ok && response.status !== 204) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to revoke token');
    }
  } catch (error) {
    console.error('Error revoking API token:', error);
    throw error;
  }
}

/**
 * Get a specific API token (without plaintext token)
 * @param {string} tokenId - Token ID
 * @returns {Promise<Object>} Token data
 */
export async function getApiToken(tokenId) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const tokenDoc = await getDoc(doc(db, 'users', user.uid, 'apiTokens', tokenId));
    
    if (!tokenDoc.exists()) {
      throw new Error('Token not found');
    }

    const data = tokenDoc.data();
    return {
      id: tokenDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || null,
      expiresAt: data.expiresAt?.toDate?.() || null,
      lastUsedAt: data.lastUsedAt?.toDate?.() || null
    };
  } catch (error) {
    console.error('Error getting API token:', error);
    throw error;
  }
}

/**
 * Clean up expired tokens (run periodically)
 * @returns {Promise<number>} Number of tokens cleaned up
 */
export async function cleanupExpiredTokens() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const tokensRef = collection(db, 'users', user.uid, 'apiTokens');
    const now = Timestamp.now();
    
    const expiredQuery = query(
      tokensRef,
      where('expiresAt', '<', now),
      where('isRevoked', '==', false)
    );

    const expiredSnapshot = await getDocs(expiredQuery);
    
    // Mark as revoked (don't delete to preserve audit trail)
    const updatePromises = [];
    expiredSnapshot.forEach(doc => {
      updatePromises.push(
        updateDoc(doc.ref, {
          isRevoked: true,
          revokedAt: serverTimestamp()
        })
      );
    });

    await Promise.all(updatePromises);
    return expiredSnapshot.size;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    throw error;
  }
}

