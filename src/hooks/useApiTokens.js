/**
 * useApiTokens Hook
 * Manages API tokens state and operations
 */

import { useState, useEffect } from 'react';
import { 
  listApiTokens, 
  generateApiToken, 
  revokeApiToken 
} from '../services/apiToken.service.js';
import { toast } from 'react-toastify';

export function useApiTokens() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load tokens on mount
  useEffect(() => {
    loadTokens();
  }, []);

  /**
   * Load all tokens
   */
  async function loadTokens() {
    try {
      setLoading(true);
      setError(null);
      const tokensList = await listApiTokens();
      setTokens(tokensList);
    } catch (err) {
      console.error('Error loading tokens:', err);
      setError(err.message);
      toast.error('Failed to load API tokens');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Generate a new token
   * @param {string} canvasId - Canvas ID
   * @param {string} name - Token name
   * @param {string[]} permissions - Token permissions
   * @param {number} expiresInDays - Expiration in days
   * @returns {Promise<Object>} Token data with plaintext token
   */
  async function generateToken(canvasId, name, permissions, expiresInDays) {
    try {
      const tokenData = await generateApiToken(canvasId, name, permissions, expiresInDays);
      
      // Reload tokens list
      await loadTokens();
      
      toast.success('API token generated successfully');
      return tokenData;
    } catch (err) {
      console.error('Error generating token:', err);
      toast.error(err.message || 'Failed to generate token');
      throw err;
    }
  }

  /**
   * Revoke a token
   * @param {string} tokenId - Token ID to revoke
   */
  async function revokeToken(tokenId) {
    try {
      await revokeApiToken(tokenId);
      
      // Update local state
      setTokens(prevTokens => 
        prevTokens.map(token => 
          token.id === tokenId 
            ? { ...token, isRevoked: true, revokedAt: new Date() }
            : token
        )
      );
      
      toast.success('Token revoked successfully');
    } catch (err) {
      console.error('Error revoking token:', err);
      toast.error(err.message || 'Failed to revoke token');
      throw err;
    }
  }

  /**
   * Check if a token is expired
   * @param {Object} token - Token object
   * @returns {boolean}
   */
  function isTokenExpired(token) {
    if (!token.expiresAt) return false;
    return new Date(token.expiresAt) < new Date();
  }

  /**
   * Check if a token is active (not revoked and not expired)
   * @param {Object} token - Token object
   * @returns {boolean}
   */
  function isTokenActive(token) {
    return !token.isRevoked && !isTokenExpired(token);
  }

  /**
   * Get active tokens only
   * @returns {Array}
   */
  function getActiveTokens() {
    return tokens.filter(isTokenActive);
  }

  /**
   * Get tokens for a specific canvas
   * @param {string} canvasId - Canvas ID
   * @returns {Array}
   */
  function getTokensForCanvas(canvasId) {
    return tokens.filter(token => token.canvasId === canvasId);
  }

  return {
    tokens,
    loading,
    error,
    generateToken,
    revokeToken,
    refreshTokens: loadTokens,
    isTokenExpired,
    isTokenActive,
    getActiveTokens,
    getTokensForCanvas
  };
}

