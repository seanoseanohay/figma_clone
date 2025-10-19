import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        bgcolor: 'background.default',
        textAlign: 'center',
        px: 3,
      }}
    >
      <Box sx={{ fontSize: '120px', mb: 2 }}>
        🦖💀
      </Box>
      <Typography
        variant="h2"
        sx={{
          fontWeight: 'bold',
          color: 'text.primary',
          mb: 2,
        }}
      >
        RAWR! This page went extinct
      </Typography>
      <Typography
        variant="h6"
        sx={{
          color: 'text.secondary',
          mb: 4,
        }}
      >
        Sorry, the page you're looking for doesn't exist.
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={() => navigate('/canvas')}
        sx={{
          px: 4,
          py: 1.5,
          fontSize: '1.1rem',
        }}
      >
        Return to Canvas
      </Button>
    </Box>
  );
};

export default NotFound;

