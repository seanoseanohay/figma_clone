import { Box, Paper, Typography } from '@mui/material'
import { AlertCircle, Wifi, WifiOff, Loader2 } from 'lucide-react'

/**
 * ConnectionBanner Component
 * Shows connection status and queued operations to user
 */
const ConnectionBanner = ({ 
  isConnected, 
  isOnline, 
  isFirebaseConnected,
  queuedCount 
}) => {
  // Don't show banner if everything is connected and no queue
  if (isConnected && queuedCount === 0) {
    return null
  }

  // Determine banner style and content
  let bgColor = '#fffbeb' // yellow-50
  let borderColor = '#fef3c7' // yellow-200
  let textColor = '#92400e' // yellow-800
  let iconColor = '#d97706' // yellow-600
  let Icon = AlertCircle
  let message = ''

  if (!isOnline) {
    // No internet connection
    bgColor = '#fef2f2' // red-50
    borderColor = '#fecaca' // red-200
    textColor = '#991b1b' // red-800
    iconColor = '#dc2626' // red-600
    Icon = WifiOff
    message = 'No internet connection - Changes will be saved when reconnected'
  } else if (!isFirebaseConnected) {
    // Firebase disconnected
    bgColor = '#fffbeb' // yellow-50
    borderColor = '#fef3c7' // yellow-200
    textColor = '#92400e' // yellow-800
    iconColor = '#d97706' // yellow-600
    Icon = Loader2
    message = 'Reconnecting to server...'
  } else if (queuedCount > 0) {
    // Processing queued operations
    bgColor = '#eff6ff' // blue-50
    borderColor = '#bfdbfe' // blue-200
    textColor = '#1e3a8a' // blue-800
    iconColor = '#2563eb' // blue-600
    Icon = Loader2
    message = `Saving ${queuedCount} queued ${queuedCount === 1 ? 'change' : 'changes'}...`
  }

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        top: 64,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        bgcolor: bgColor,
        border: 1,
        borderColor: borderColor,
        borderRadius: 2,
        px: 2,
        py: 1.5,
        minWidth: 320,
        maxWidth: 768,
      }}
      role="alert"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Icon 
          style={{ 
            width: 20, 
            height: 20, 
            color: iconColor, 
            flexShrink: 0,
            animation: Icon === Loader2 ? 'spin 1s linear infinite' : undefined
          }} 
        />
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight={500} sx={{ color: textColor }}>
            {message}
          </Typography>
          {!isConnected && (
            <Typography variant="caption" sx={{ color: textColor, opacity: 0.8, mt: 0.5 }}>
              Editing is temporarily disabled
            </Typography>
          )}
        </Box>
        {isConnected && queuedCount === 0 && (
          <Wifi style={{ width: 20, height: 20, color: '#10b981' }} />
        )}
      </Box>
    </Paper>
  )
}

export default ConnectionBanner
