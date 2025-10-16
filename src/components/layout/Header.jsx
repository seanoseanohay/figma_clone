import { useState } from 'react';
import { signOut } from '../../services/auth.service.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { usePresence } from '../../hooks/usePresence.js';
import ProjectCanvasSelector from '../project/ProjectCanvasSelector.jsx';
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
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between py-4">
          
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <h1 className="text-xl font-bold text-gray-900">
              CollabCanvas
            </h1>
            <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              MVP
            </span>
          </div>

          {/* Project/Canvas Selector */}
          <ProjectCanvasSelector className="hidden sm:block" />

          {/* Right Side: User Squares + Current User + Actions */}
          <div className="flex items-center">
            
            {/* User Squares - Max 6 visible */}
            <div className="flex items-center" style={{ gap: '8px', marginRight: '16px' }}>
              {/* Other users first - limit to 6 total squares */}
              {users
                .filter(user => user && user.uid)
                .slice(0, 5) // Max 5 other users to leave room for current user
                .map((user) => (
                  <div
                    key={user.uid}
                    className="w-8 h-8 rounded-sm flex items-center justify-center text-white text-xs font-bold shadow-sm border border-white cursor-pointer hover:scale-105 transition-transform"
                    style={{ backgroundColor: getUserColor(user.uid) }}
                  >
                    {(user.displayName?.charAt(0) || 'U').toUpperCase()}
                  </div>
                ))}
                
              {/* Current user square */}
              <div 
                className="w-8 h-8 rounded-sm flex items-center justify-center text-white text-xs font-bold shadow-sm border border-white ring-2 ring-gray-800 cursor-pointer hover:scale-105 transition-transform"
                style={{ backgroundColor: getUserColor(currentUser.uid) }}
              >
                {(currentUser.displayName?.charAt(0) || 'U').toUpperCase()}
              </div>
              
              {/* +N more indicator if more than 5 other users */}
              {users.filter(user => user && user.uid).length > 5 && (
                <div 
                  className="w-8 h-8 rounded-sm flex items-center justify-center bg-gray-400 text-white text-xs font-bold shadow-sm border border-white" 
                >
                  +{users.filter(user => user && user.uid).length - 5}
                </div>
              )}
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
                  <span className="inline">Signing out...</span>
                </>
              ) : (
                <span className="inline">Sign out</span>
              )}
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
