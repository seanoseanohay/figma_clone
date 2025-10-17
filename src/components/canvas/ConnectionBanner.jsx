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
  let bgColor = 'bg-yellow-50 border-yellow-200'
  let textColor = 'text-yellow-800'
  let iconColor = 'text-yellow-600'
  let Icon = AlertCircle
  let message = ''

  if (!isOnline) {
    // No internet connection
    bgColor = 'bg-red-50 border-red-200'
    textColor = 'text-red-800'
    iconColor = 'text-red-600'
    Icon = WifiOff
    message = 'No internet connection - Changes will be saved when reconnected'
  } else if (!isFirebaseConnected) {
    // Firebase disconnected
    bgColor = 'bg-yellow-50 border-yellow-200'
    textColor = 'text-yellow-800'
    iconColor = 'text-yellow-600'
    Icon = Loader2
    message = 'Reconnecting to server...'
  } else if (queuedCount > 0) {
    // Processing queued operations
    bgColor = 'bg-blue-50 border-blue-200'
    textColor = 'text-blue-800'
    iconColor = 'text-blue-600'
    Icon = Loader2
    message = `Saving ${queuedCount} queued ${queuedCount === 1 ? 'change' : 'changes'}...`
  }

  return (
    <div 
      className={`fixed top-16 left-1/2 transform -translate-x-1/2 z-50 ${bgColor} border rounded-lg shadow-lg px-4 py-3 min-w-80 max-w-2xl`}
      role="alert"
    >
      <div className="flex items-center gap-3">
        <Icon 
          className={`w-5 h-5 ${iconColor} flex-shrink-0 ${Icon === Loader2 ? 'animate-spin' : ''}`} 
        />
        <div className="flex-1">
          <p className={`text-sm font-medium ${textColor}`}>
            {message}
          </p>
          {!isConnected && (
            <p className={`text-xs ${textColor} mt-1 opacity-80`}>
              Editing is temporarily disabled
            </p>
          )}
        </div>
        {isConnected && queuedCount === 0 && (
          <Wifi className={`w-5 h-5 text-green-600`} />
        )}
      </div>
    </div>
  )
}

export default ConnectionBanner




