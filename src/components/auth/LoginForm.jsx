import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Container, Typography, TextField, Button, Alert, Paper, CircularProgress } from '@mui/material';
import { signInWithGoogle } from '../../services/auth.service.js';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase.js';
import { useAuth } from './AuthProvider.jsx';

const LoginForm = () => {
  const { currentUser, setAuthError, clearError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  
  // Simple email/password form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

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

  // Simple email/password login
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setEmailError('Email and password required');
      return;
    }

    setEmailLoading(true);
    setEmailError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Email login successful');
      // Success handled by AuthProvider context change
    } catch (error) {
      console.error('❌ Email login failed:', error.message);
      setEmailError('Invalid email or password');
      setEmailLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50',
        py: 6,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 400, mx: 'auto' }}>
          
          {/* TEMPORARY: Simple Email/Password Form */}
          <Paper
            sx={{
              bgcolor: '#fffbeb',
              border: 1,
              borderColor: '#fef3c7',
              p: 2,
            }}
          >
            <Typography variant="body2" fontWeight={500} color="#92400e" textAlign="center" mb={1}>
              Login
            </Typography>
            <Box component="form" onSubmit={handleEmailSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <TextField
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="small"
                fullWidth
                required
              />
              <TextField
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="small"
                fullWidth
                required
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={emailLoading}
                size="small"
              >
                {emailLoading ? 'Signing in...' : 'Login'}
              </Button>
              {emailError && (
                <Typography variant="caption" color="error">
                  {emailError}
                </Typography>
              )}
            </Box>
          </Paper>

          {/* Header */}
          <Box>
            <Typography variant="h2" textAlign="center" fontWeight={800} color="grey.900" mt={3}>
              Sign in to CollabCanvas
            </Typography>
            <Typography variant="body2" textAlign="center" color="grey.600" mt={1}>
              Collaborative design made simple
            </Typography>
          </Box>

          {/* Error Message */}
          {localError && (
            <Alert severity="error" sx={{ borderRadius: 1 }}>
              <Typography variant="body2" fontWeight={500} mb={1}>
                Authentication Error
              </Typography>
              <Typography variant="body2">
                {localError}
              </Typography>
            </Alert>
          )}

          {/* Clean Google OAuth Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              variant="outlined"
              fullWidth
              sx={{
                maxWidth: 'sm',
                py: 1.5,
                px: 3,
                color: 'grey.700',
                bgcolor: 'white',
                border: 1,
                borderColor: 'grey.300',
                '&:hover': {
                  bgcolor: 'grey.50',
                  borderColor: 'grey.300',
                },
              }}
            >
              <Box
                component="svg"
                sx={{ width: 20, height: 20, mr: 1 }}
                viewBox="0 0 24 24"
              >
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </Box>
              {loading ? 'Signing in...' : 'Sign in with Google'}
            </Button>
          </Box>

          {/* Additional Information */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="grey.500">
              Sign in to start collaborating on your canvas
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default LoginForm;
