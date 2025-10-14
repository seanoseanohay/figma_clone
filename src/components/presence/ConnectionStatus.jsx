import React, { useState, useEffect } from 'react'
import { auth, rtdb } from '../../services/firebase.js'
import { onValue, ref } from 'firebase/database'

/**
 * ConnectionStatus Component
 * Shows online/offline status and connection quality
 */
const ConnectionStatus = ({ className = "" }) => {
  const [isConnected, setIsConnected] = useState(true)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Monitor Firebase connection status
  useEffect(() => {
    const connectedRef = ref(rtdb, '.info/connected')
    
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val() === true
      setIsConnected(connected)
    })

    return unsubscribe
  }, [])

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Determine overall status
  const getStatus = () => {
    if (!isOnline) {
      return { status: 'offline', color: 'bg-red-500', text: 'No Internet' }
    } else if (!isConnected) {
      return { status: 'disconnected', color: 'bg-yellow-500', text: 'Connecting...' }
    } else {
      return { status: 'connected', color: 'bg-green-500', text: 'Online' }
    }
  }

  const { status, color, text } = getStatus()

  return (
    <div className={`${className} flex items-center space-x-2`}>
      <div className={`w-2 h-2 ${color} rounded-full ${status === 'connected' ? 'animate-pulse' : ''}`}></div>
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  )
}

/**
 * Detailed connection status for debugging
 */
export const DetailedConnectionStatus = ({ className = "" }) => {
  const [isConnected, setIsConnected] = useState(true)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isAuth, setIsAuth] = useState(false)

  // Monitor Firebase connection
  useEffect(() => {
    const connectedRef = ref(rtdb, '.info/connected')
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      setIsConnected(snapshot.val() === true)
    })
    return unsubscribe
  }, [])

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Monitor auth status
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuth(!!user)
    })
    return unsubscribe
  }, [])

  return (
    <div className={`${className} bg-white border border-gray-200 rounded-lg p-3`}>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Connection Status</h4>
      <div className="space-y-1 text-xs">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>Network: {isOnline ? 'Online' : 'Offline'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>Firebase: {isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isAuth ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>Auth: {isAuth ? 'Authenticated' : 'Not authenticated'}</span>
        </div>
      </div>
    </div>
  )
}

export default ConnectionStatus
