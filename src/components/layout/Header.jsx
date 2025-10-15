import { useState } from 'react';
import { signOut } from '../../services/auth.service.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { usePresence } from '../../hooks/usePresence.js';
import MobileMenu from './MobileMenu.jsx';

const Header = () => {
  const { currentUser, setAuthError } = useAuth();
  const { users, onlineCount } = usePresence();
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
        <div className="flex items-center justify-between py-3">
          
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <h1 className="text-xl font-bold text-gray-900">
              CollabCanvas
            </h1>
            <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              MVP
            </span>
          </div>

          {/* Project/Canvas Dropdown */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <button
                className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                type="button"
              >
                <span className="truncate">Select Project &gt; Canvas</span>
                <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Side: User Squares + Current User + Actions */}
          <div className="flex items-center space-x-4">
            
            {/* User Squares - Max 6 visible */}
            <div className="hidden lg:flex items-center gap-1">
              {/* Other users first - limit to 6 total squares */}
              {users
                .filter(user => user && user.uid)
                .slice(0, 5) // Max 5 other users to leave room for current user
                .map((user) => (
                  <div
                    key={user.uid}
                    className="w-8 h-8 rounded-sm flex items-center justify-center text-white text-xs font-bold shadow-sm border border-white cursor-pointer hover:scale-105 transition-transform"
                    style={{ backgroundColor: getUserColor(user.uid) }}
                    title={user.displayName || 'Anonymous User'}
                  >
                    {(user.displayName?.charAt(0) || 'U').toUpperCase()}
                  </div>
                ))}
                
              {/* Current user square */}
              <div 
                className="w-8 h-8 rounded-sm flex items-center justify-center text-white text-xs font-bold shadow-sm border-2 border-blue-400"
                style={{ backgroundColor: getUserColor(currentUser.uid) }}
                title={`${currentUser.displayName} (you)`}
              >
                {(currentUser.displayName?.charAt(0) || 'U').toUpperCase()}
              </div>
              
              {/* +N more indicator if more than 5 other users */}
              {users.filter(user => user && user.uid).length > 5 && (
                <div 
                  className="w-8 h-8 rounded-sm flex items-center justify-center bg-gray-400 text-white text-xs font-bold shadow-sm border border-white" 
                  title={`+${users.filter(user => user && user.uid).length - 5} more users`}
                >
                  +{users.filter(user => user && user.uid).length - 5}
                </div>
              )}
            </div>

            {/* Current User Info */}
            <div className="flex items-center space-x-2">
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
              <span className="hidden lg:block text-sm font-medium text-gray-700 max-w-32 truncate">
                {currentUser.displayName || 'Anonymous'}
              </span>
            </div>

            {/* Share Button - Hidden on medium screens, visible on large */}
            <button className="hidden xl:inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <span className="hidden xl:inline">Share</span>
            </button>

            {/* Share Icon Only - Visible on large, hidden on xl */}
            <button className="lg:inline-flex xl:hidden items-center p-2 border border-gray-300 shadow-sm rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>

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
                  <span className="hidden sm:inline">Signing out...</span>
                </>
              ) : (
                <span className="hidden sm:inline">Sign out</span>
              )}
              <span className="sm:hidden">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </span>
            </button>

            {/* Mobile Menu Button (for screens < 768px) */}
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden inline-flex items-center p-2 border border-gray-300 shadow-sm rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        users={users}
        currentUser={currentUser}
        getUserColor={getUserColor}
      />
    </header>
  );
};

export default Header;
