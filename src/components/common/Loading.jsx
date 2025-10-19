import { Box, Typography, keyframes } from '@mui/material';

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
`;

const roar = keyframes`
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.1) rotate(-5deg); }
  75% { transform: scale(1.1) rotate(5deg); }
`;

const Loading = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          fontSize: '64px',
          animation: `${roar} 2s ease-in-out infinite`,
          mb: 2,
        }}
      >
        🦖
      </Box>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 'bold',
          color: 'primary.main',
          animation: `${bounce} 1.5s ease-in-out infinite`,
        }}
      >
        RAWR-ing up...
      </Typography>
    </Box>
  );
};

export default Loading;

