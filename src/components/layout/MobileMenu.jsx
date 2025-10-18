import { useEffect } from 'react';
import { Box, Drawer, Typography, IconButton, Button, Avatar, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShareIcon from '@mui/icons-material/Share';
import LogoutIcon from '@mui/icons-material/Logout';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { signOut } from '../../services/auth.service.js';
import { useAuth } from '../auth/AuthProvider.jsx';

const MobileMenu = ({ isOpen, onClose, users, currentUser, getUserColor }) => {
  const { setAuthError } = useAuth();

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    try {
      const result = await signOut();
      if (!result.success) {
        setAuthError('Failed to sign out. Please try again.');
      }
    } catch (error) {
      setAuthError('Failed to sign out. Please try again.');
    }
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      sx={{
        display: { xs: 'block', md: 'none' },
        '& .MuiDrawer-paper': {
          width: 320,
          maxWidth: '100%',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: 1, borderColor: 'grey.200' }}>
          <Typography variant="h6" fontWeight={600}>
            Menu
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'grey.400',
              '&:hover': {
                color: 'grey.500',
                bgcolor: 'grey.100',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          
          {/* Project/Canvas Selector */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'grey.200' }}>
            <Typography variant="body2" fontWeight={500} color="grey.700" mb={1.5}>
              Project & Canvas
            </Typography>
            <Button
              fullWidth
              variant="outlined"
              endIcon={<KeyboardArrowDownIcon />}
              sx={{
                justifyContent: 'space-between',
                textAlign: 'left',
                color: 'grey.700',
                borderColor: 'grey.300',
                bgcolor: 'grey.50',
                '&:hover': {
                  bgcolor: 'grey.100',
                  borderColor: 'grey.300',
                },
              }}
            >
              Select Project &gt; Canvas
            </Button>
          </Box>

          {/* Online Users */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'grey.200' }}>
            <Typography variant="body2" fontWeight={500} color="grey.700" mb={1.5}>
              Online Users ({users.filter(user => user && user.uid).length + 1})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              
              {/* Current User */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1,
                  bgcolor: 'primary.light',
                  opacity: 0.1,
                  borderRadius: 1,
                }}
              >
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: getUserColor(currentUser.uid),
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    border: 2,
                    borderColor: 'primary.main',
                  }}
                >
                  {(currentUser.displayName?.charAt(0) || 'U').toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={500} color="grey.900" noWrap>
                    {currentUser.displayName || 'Anonymous'}
                  </Typography>
                  <Typography variant="caption" color="primary.main">
                    You
                  </Typography>
                </Box>
              </Box>

              {/* Other Users */}
              {users
                .filter(user => user && user.uid)
                .map((user) => (
                  <Box
                    key={user.uid}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1,
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: 'grey.50',
                      },
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: getUserColor(user.uid),
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {(user.displayName?.charAt(0) || 'U').toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500} color="grey.900" noWrap>
                        {user.displayName || 'Anonymous User'}
                      </Typography>
                      <Typography variant="caption" color="grey.500">
                        Online
                      </Typography>
                    </Box>
                  </Box>
                ))}
            </Box>
          </Box>

          {/* Actions */}
          <Box sx={{ p: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ShareIcon />}
              sx={{
                justifyContent: 'flex-start',
                color: 'grey.700',
                borderColor: 'grey.300',
                '&:hover': {
                  bgcolor: 'grey.50',
                  borderColor: 'grey.300',
                },
              }}
            >
              Share Canvas
            </Button>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'grey.200' }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleSignOut}
            sx={{
              color: 'error.main',
              borderColor: 'error.light',
              bgcolor: 'error.light',
              opacity: 0.1,
              '&:hover': {
                bgcolor: 'error.light',
                opacity: 0.2,
                borderColor: 'error.light',
              },
            }}
          >
            Sign Out
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default MobileMenu;
