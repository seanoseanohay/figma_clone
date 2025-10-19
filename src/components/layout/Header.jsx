import { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, Button, IconButton, Chip, Avatar, Badge, Tooltip } from '@mui/material';
import { signOut } from '../../services/auth.service.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { usePresence } from '../../hooks/usePresence.js';
import { useCanvas } from '../../hooks/useCanvas.js';
import CanvasSelector from '../canvas/CanvasSelector.jsx';
import MobileMenu from './MobileMenu.jsx';
import InviteModal from '../canvas/InviteModal.jsx';
import AgentSidebar from '../agent/AgentSidebar.jsx';

const Header = () => {
  const { currentUser, setAuthError } = useAuth();
  const { users, onlineCount } = usePresence();
  const { canvasId } = useCanvas();
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [agentSidebarOpen, setAgentSidebarOpen] = useState(false);
  
  // Generate consistent color for each user
  // Now we can optionally use cursorColor from presence data if available
  const getUserColor = (userId, cursorColor = null) => {
    // If cursor color is provided from presence data, use it
    if (cursorColor) {
      return cursorColor;
    }
    
    // Safety check for undefined userId
    if (!userId || typeof userId !== 'string') {
      return '#6b7280'; // Return gray color as fallback
    }
    
    // Fallback: Generate color from userId (same algorithm as presence service)
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
    <AppBar position="static" elevation={3} sx={{ bgcolor: 'white', color: 'grey.900' }}>
      <Toolbar sx={{ px: 2, py: 2, justifyContent: 'space-between' }}>
        
        {/* Left Side: Logo + Canvas Selector */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Typography variant="h5" fontWeight="bold" color="grey.900">
              CollabCanvas
            </Typography>
            <Chip
              label="MVP"
              size="small"
              sx={{
                ml: 1,
                bgcolor: 'primary.light',
                color: 'primary.dark',
                fontWeight: 500,
                fontSize: '0.75rem',
              }}
            />
          </Box>

          {/* Canvas Selector */}
          <CanvasSelector />
        </Box>

        {/* Right Side: User Avatars + Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          
          {/* User Avatars - Max 6 visible - CANVAS-SCOPED */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Other users first - limit to 6 total squares */}
            {users
              .filter(user => user && user.userId)
              .slice(0, 5) // Max 5 other users to leave room for current user
              .map((user) => (
                <Tooltip key={user.userId} title={user.displayName || 'User'} arrow>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: getUserColor(user.userId, user.cursorColor),
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'transform 0.15s',
                      '&:hover': {
                        transform: 'scale(1.05)',
                      },
                      border: '2px solid white',
                      boxShadow: 1,
                    }}
                  >
                    {(user.displayName?.charAt(0) || 'U').toUpperCase()}
                  </Avatar>
                </Tooltip>
              ))}
              
            {/* Current user avatar */}
            <Tooltip title={currentUser.displayName || 'You'} arrow>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: getUserColor(currentUser.uid),
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'transform 0.15s',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                  border: '2px solid',
                  borderColor: 'grey.800',
                  boxShadow: 1,
                }}
              >
                {(currentUser.displayName?.charAt(0) || 'U').toUpperCase()}
              </Avatar>
            </Tooltip>
            
            {/* +N more indicator if more than 5 other users */}
            {users.filter(user => user && user.userId).length > 5 && (
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'grey.400',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  border: '2px solid white',
                  boxShadow: 1,
                }}
              >
                +{users.filter(user => user && user.userId).length - 5}
              </Avatar>
            )}
          </Box>

          {/* AI Assistant Button */}
          <Tooltip
            title={!canvasId ? "Select a canvas to use AI Assistant" : "Open AI Assistant"}
            arrow
          >
            <span>
              <Button
                onClick={() => setAgentSidebarOpen(true)}
                disabled={!canvasId}
                variant="contained"
                size="small"
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '&:disabled': {
                    bgcolor: 'grey.300',
                    color: 'grey.500',
                  },
                }}
              >
                <Box component="span" sx={{ mr: 1, fontSize: '1rem' }}>🤖</Box>
                AI Assistant
              </Button>
            </span>
          </Tooltip>

          {/* Invite Button */}
          <Tooltip
            title={!canvasId ? "Select a canvas to invite collaborators" : ""}
            arrow
          >
            <span>
              <Button
                onClick={() => setInviteModalOpen(true)}
                disabled={!canvasId}
                variant="outlined"
                size="small"
                startIcon={
                  <Box component="svg" sx={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </Box>
                }
                sx={{
                  borderColor: 'grey.300',
                  color: 'grey.700',
                  '&:hover': {
                    bgcolor: 'grey.50',
                    borderColor: 'grey.300',
                  },
                }}
              >
                Invite
              </Button>
            </span>
          </Tooltip>

          {/* Sign Out Button */}
          <Button
            onClick={handleSignOut}
            disabled={loading}
            variant="outlined"
            size="small"
            sx={{
              borderColor: 'grey.300',
              color: 'grey.700',
              '&:hover': {
                bgcolor: 'grey.50',
                borderColor: 'grey.300',
              },
            }}
          >
            {loading ? 'Signing out...' : 'Sign out'}
          </Button>

        </Box>
      </Toolbar>
      
      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        users={users}
        currentUser={currentUser}
        getUserColor={getUserColor}
      />

      {/* Invite Modal */}
      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />

      {/* AI Agent Sidebar */}
      <AgentSidebar
        isOpen={agentSidebarOpen}
        onClose={() => setAgentSidebarOpen(false)}
      />
    </AppBar>
  );
};

export default Header;
