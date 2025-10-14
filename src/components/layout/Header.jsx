import { useState } from 'react';
import { signOut } from '../../services/auth.service.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { usePresence } from '../../hooks/usePresence.js';

const Header = () => {
  const { currentUser, setAuthError } = useAuth();
  const { users, onlineCount } = usePresence();
  const [loading, setLoading] = useState(false);
  
  // Generate consistent color for each user
  const getUserColor = (userId) => {
    // Safety check for undefined userId
    if (!userId || typeof userId !== 'string') {
      return '#6b7280'; // Return gray color as fallback
    }
    
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
      '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6b7280'
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleSignOut = async () => {
    setLoading(true);
    
    try {
      const result = await signOut();
      if (!result.success) {
        setAuthError('Failed to sign out. Please try again.');
      }
    } catch (error) {
      setAuthError('Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return null; // Don't show header if not authenticated
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo/Title */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              CollabCanvas
            </h1>
            <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              MVP
            </span>
          </div>

          {/* User Info and Online Users */}
          <div className="flex items-center space-x-4">
            {/* Online Users - Compact squares */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 flex-shrink-0">Online:</span>
              <div className="flex items-center gap-1">
                {/* Current user */}
                <div 
                  className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-bold shadow-sm border border-gray-300 flex-shrink-0"
                  style={{ backgroundColor: getUserColor(currentUser.uid) }}
                  title={`${currentUser.displayName} (you)`}
                >
                  {(currentUser.displayName?.charAt(0) || 'U').toUpperCase()}
                </div>
                
                {/* Other users - limit to 9 more (10 total) */}
                {users
                  .filter(user => user && user.uid) // Filter out invalid users
                  .slice(0, 9) // Limit to first 9 other users
                  .map((user) => (
                    <div
                      key={user.uid}
                      className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-bold shadow-sm cursor-pointer hover:scale-105 transition-transform border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: getUserColor(user.uid) }}
                      title={user.displayName || 'Anonymous User'}
                    >
                      {(user.displayName?.charAt(0) || 'U').toUpperCase()}
                    </div>
                  ))}
                
                {/* Show +N if more than 9 other users */}
                {users.filter(user => user && user.uid).length > 9 && (
                  <div className="w-8 h-8 rounded-md flex items-center justify-center bg-gray-500 text-white text-xs font-bold shadow-sm border border-gray-300 flex-shrink-0" title={`+${users.filter(user => user && user.uid).length - 9} more users`}>
                    +{users.filter(user => user && user.uid).length - 9}
                  </div>
                )}
                
                {/* User count indicator */}
                <span className="ml-2 text-xs text-gray-400 flex-shrink-0">
                  {Math.min(onlineCount + 1, 10)}{onlineCount > 9 ? '+' : ''} user{onlineCount + 1 !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Current User Info */}
            <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Profile"
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {currentUser.displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <span className="text-sm font-medium text-gray-700">
                {currentUser.displayName || 'Anonymous'}
              </span>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing out...
                </>
              ) : (
                'Sign out'
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
