import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { signInWithGoogle } from '../../services/auth.service.js';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase.js';
import { useAuth } from './AuthProvider.jsx';

const LoginForm = () => {
  const { currentUser, setAuthError, clearError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  // Redirect if already authenticated
  if (currentUser) {
    return <Navigate to="/canvas" replace />;
  }

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setLocalError('');
    clearError();

    try {
      const result = await signInWithGoogle();
      
      if (!result.success) {
        setLocalError(result.error);
        setAuthError(result.error);
      }
      // Success is handled by AuthProvider context change
    } catch (error) {
      const errorMessage = 'Google sign in failed. Please try again.';
      setLocalError(errorMessage);
      setAuthError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // TEMPORARY: Hidden backdoor authentication for testing
  // Activated by Ctrl+Shift+L (or Cmd+Shift+L on Mac)
  const handleHiddenAuth = async () => {
    const testEmail = import.meta.env.VITE_TEST_EMAIL;
    const testPassword = import.meta.env.VITE_TEST_PASSWORD;
    
    // Only allow hidden auth if credentials are configured
    if (!testEmail || !testPassword) {
      console.error('❌ Test credentials not configured in .env.local');
      console.log('💡 Add VITE_TEST_EMAIL and VITE_TEST_PASSWORD to .env.local');
      return;
    }
    
    try {
      console.log('🔓 Hidden auth activated');
      await signInWithEmailAndPassword(auth, testEmail, testPassword);
      console.log('✅ Hidden auth successful');
    } catch (error) {
      console.error('❌ Hidden auth failed:', error.message);
      console.log(`💡 Make sure test user exists: ${testEmail}`);
    }
  };

  // Hidden keyboard shortcut listener
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Check for Ctrl+Shift+L (Windows/Linux) or Cmd+Shift+L (Mac)
      if (event.shiftKey && event.key.toLowerCase() === 'l' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleHiddenAuth();
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyPress);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to CollabCanvas
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Collaborative design made simple
          </p>
        </div>

        {/* Error Message */}
        {localError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Authentication Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {localError}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clean Google OAuth Button */}
        <div className="flex justify-center">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="inline-flex items-center justify-center w-full max-w-sm px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 mr-2" width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>
        </div>

        {/* Additional Information */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Sign in to start collaborating on your canvas
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
