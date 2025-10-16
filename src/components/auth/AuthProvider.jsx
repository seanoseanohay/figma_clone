import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange, handleGoogleRedirectResult } from '../../services/auth.service.js';

// TEMPORARY: Set to true to bypass authentication and auto-login as "bob"
// Set back to false to re-enable normal authentication
const BYPASS_AUTH = false;

// Create auth context
const AuthContext = createContext({});

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // TEMPORARY: Auto-login as "bob" when bypass is enabled
    if (BYPASS_AUTH) {
      setCurrentUser({
        uid: 'temp-bob-uid',
        email: 'bob@example.com',
        displayName: 'Bob',
        photoURL: null,
        emailVerified: true
      });
      setLoading(false);
      return () => {}; // No cleanup needed for mock user
    }

    // Check for redirect result first (for Google OAuth redirect)
    const checkRedirectResult = async () => {
      try {
        const result = await handleGoogleRedirectResult();
        if (result.success && !result.noResult) {
          console.log('✅ Google redirect auth successful');
        }
      } catch (error) {
        console.error('Error checking redirect result:', error);
      }
    };

    checkRedirectResult();

    // Normal auth flow when bypass is disabled
    // Set up auth state listener
    const unsubscribe = onAuthChange((user) => {
      if (user) {
        // User is signed in
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
          photoURL: user.photoURL,
          emailVerified: user.emailVerified
        });
      } else {
        // User is signed out
        setCurrentUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Clear any auth errors
  const clearError = () => {
    setError(null);
  };

  // Set auth error
  const setAuthError = (error) => {
    setError(error);
  };

  const value = {
    currentUser,
    loading,
    error,
    clearError,
    setAuthError,
    // Helper computed properties
    isAuthenticated: !!currentUser,
    userDisplayName: currentUser?.displayName || 'Anonymous'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
