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
 * Get or create default agent token for current user
 * @param {string} canvasId - Canvas ID for the token
 * @returns {Promise<string>} Agent token string
 */
export async function getAgentToken(canvasId) {
  try {
    // For development mode, return mock token immediately
    if (import.meta.env.VITE_AGENT_MOCK_MODE === 'true' || import.meta.env.VITE_BYPASS_AUTH === 'true') {
      console.log('🤖 Development mode: returning mock token');
      return 'dev-mock-agent-token';
    }

    // Wait for auth to be ready if needed
    let user = auth.currentUser;
    if (!user) {
      console.log('⏳ Waiting for Firebase Auth to initialize...');
      await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((authUser) => {
          if (authUser) {
            user = authUser;
            unsubscribe();
            resolve();
          } else {
            // Give it a moment to initialize
            setTimeout(() => {
              user = auth.currentUser;
              unsubscribe();
              resolve();
            }, 1000);
          }
        });
      });
    }

    if (!user) {
      console.warn('⚠️ User not authenticated after waiting, using mock token for agent requests');
      return 'unauthenticated-mock-token';
    }

    // Log authentication status for debugging
    console.log('🔐 User authenticated:', {
      uid: user.uid,
      email: user.email,
      canvasId: canvasId
    });

    // First try to get existing agent token
    console.log('🔍 Querying for existing agent tokens...');
    
    // REQUIRED COMPOSITE INDEX: 
    // Collection Group: apiTokens
    // Fields: name (ASC), canvasId (ASC), revoked (ASC), createdAt (DESC)
    // If you see "requires an index" error, the composite index will be auto-created
    // or can be manually created in Firebase Console
    const tokensQuery = query(
      collection(db, 'users', user.uid, 'apiTokens'),
      where('name', '==', 'AI Agent Token'),
      where('canvasId', '==', canvasId),
      where('revoked', '==', false),
      orderBy('createdAt', 'desc')
    );

    console.log('📊 Executing Firestore query for user:', user.uid);
    
    let tokenDocs;
    try {
      tokenDocs = await getDocs(tokensQuery);
      console.log('📋 Query results:', { 
        empty: tokenDocs.empty, 
        size: tokenDocs.size,
        path: `users/${user.uid}/apiTokens`
      });
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message.includes('index')) {
        console.warn('⚠️ Firestore composite index is still building. This may take a few minutes.');
        // Monitor index status: https://console.firebase.google.com/project/collabcanvas-c91ec/firestore/indexes
        console.log('🔄 Falling back to creating new token...');
        
        // Skip query and go directly to token creation
        // The index will be ready for future requests
        const newToken = 'agent-token-fallback-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        return newToken;
      }
      throw error; // Re-throw if it's a different error
    }
    
    // If we have a valid token, return it
    if (!tokenDocs.empty) {
      const tokenData = tokenDocs.docs[0].data();
      
      // Check if token is not expired
      if (!tokenData.expiresAt || tokenData.expiresAt.toDate() > new Date()) {
        return tokenData.token;
      }
    }

    // No valid token found, create a new one directly in Firestore
    // Creating new agent token directly in Firestore for canvas: ${canvasId}
    
    // Generate a simple token for development/testing
    const newToken = 'agent-token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year from now
    
    const tokenData = {
      name: 'AI Agent Token',
      canvasId: canvasId,
      token: newToken,
      permissions: ['read', 'create_objects', 'update_objects', 'delete_objects', 'agent_requests'],
      revoked: false,
      createdAt: serverTimestamp(),
      expiresAt: expiresAt,
      createdBy: user.uid
    };
    
    // Create token document in Firestore
    const newTokenRef = doc(db, 'users', user.uid, 'apiTokens', `agent-token-${Date.now()}`);
    await setDoc(newTokenRef, tokenData);
    
    console.log('✅ Agent token created successfully in Firestore');
    return newToken;

  } catch (error) {
    console.error('❌ Error getting agent token:', error);
    
    // Always return a mock token in case of error to prevent blocking
    console.log('🤖 Fallback: returning mock token due to error');
    return 'fallback-mock-agent-token';
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

