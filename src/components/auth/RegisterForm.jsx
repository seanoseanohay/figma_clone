import { useState } from 'react';
import { Navigate, Link as RouterLink } from 'react-router-dom';
import { Box, Container, Typography, TextField, Button, Alert, Divider, Link } from '@mui/material';
import { signUpWithEmail, signInWithGoogle } from '../../services/auth.service.js';
import { useAuth } from './AuthProvider.jsx';

const RegisterForm = () => {
  const { currentUser, setAuthError, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  // Redirect if already authenticated
  if (currentUser) {
    return <Navigate to="/canvas" replace />;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (localError) setLocalError('');
    clearError();
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setLocalError('Please fill in all fields');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters long');
      return false;
    }

    return true;
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setLocalError('');
    clearError();

    try {
      const result = await signUpWithEmail(formData.email, formData.password);
      
      if (!result.success) {
        setLocalError(result.error);
        setAuthError(result.error);
      }
      // Success is handled by AuthProvider context change
    } catch (error) {
      const errorMessage = 'Sign up failed. Please try again.';
      setLocalError(errorMessage);
      setAuthError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Header */}
          <Box>
            <Typography variant="h2" textAlign="center" fontWeight={800} color="grey.900" mt={3}>
              Create your account
            </Typography>
            <Typography variant="body2" textAlign="center" color="grey.600" mt={1}>
              Join CollabCanvas and start collaborating
            </Typography>
          </Box>

          {/* Error Message */}
          {localError && (
            <Alert severity="error" sx={{ borderRadius: 1 }}>
              <Typography variant="body2" fontWeight={500} mb={1}>
                Registration Error
              </Typography>
              <Typography variant="body2">
                {localError}
              </Typography>
            </Alert>
          )}

          {/* Google Sign In Button */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            variant="outlined"
            fullWidth
            sx={{
              py: 1,
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
            {loading ? 'Signing up...' : 'Continue with Google'}
          </Button>

          {/* Divider */}
          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="grey.500" px={1}>
              Or sign up with email
            </Typography>
          </Divider>

          {/* Email/Password Form */}
          <Box component="form" onSubmit={handleEmailSignUp} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body2" fontWeight={500} color="grey.700" mb={0.5}>
                Email address
              </Typography>
              <TextField
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                disabled={loading}
                placeholder="Enter your email"
                fullWidth
                size="small"
              />
              <Typography variant="caption" color="grey.500" mt={0.5}>
                Your display name will default to the part before @ in your email
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" fontWeight={500} color="grey.700" mb={0.5}>
                Password
              </Typography>
              <TextField
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                disabled={loading}
                placeholder="Choose a password"
                fullWidth
                size="small"
              />
            </Box>
            
            <Box>
              <Typography variant="body2" fontWeight={500} color="grey.700" mb={0.5}>
                Confirm password
              </Typography>
              <TextField
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                disabled={loading}
                placeholder="Confirm your password"
                fullWidth
                size="small"
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ py: 1 }}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="grey.600">
                Already have an account?{' '}
                <Link
                  component={RouterLink}
                  to="/login"
                  sx={{ fontWeight: 500, textDecoration: 'none' }}
                >
                  Sign in
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default RegisterForm;
