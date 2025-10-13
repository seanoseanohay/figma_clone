import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange } from '../../services/auth.service.js';

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
