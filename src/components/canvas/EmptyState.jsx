import { Box, Typography } from '@mui/material'
import { FileText } from 'lucide-react'

/**
 * EmptyState Component
 * Displays when no canvas is selected
 */
const EmptyState = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        bgcolor: 'grey.50',
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <FileText 
          style={{ 
            width: 96, 
            height: 96, 
            color: '#9ca3af', 
            margin: '0 auto 16px',
            strokeWidth: 1.5
          }} 
        />
        <Typography variant="h4" fontWeight={600} color="grey.700" mb={1}>
          No Canvas Selected
        </Typography>
        <Typography variant="body1" color="grey.500" sx={{ maxWidth: 448 }}>
          Select a canvas from the dropdown or create a new one to get started
        </Typography>
      </Box>
    </Box>
  )
}

export default EmptyState
