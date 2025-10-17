import { useState, useEffect, useCallback, useRef } from 'react'
import { ref, onValue } from 'firebase/database'
import { rtdb } from '../services/firebase'

/**
 * useConnectionStatus Hook
 * Monitors internet connectivity and Firebase connection status
 * Provides operation queue for offline reliability
 */
export const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true)
  const [operationQueue, setOperationQueue] = useState([])
  const processingQueue = useRef(false)

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

  // Monitor Firebase connection status
  useEffect(() => {
    const connectedRef = ref(rtdb, '.info/connected')
    
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val() === true
      setIsFirebaseConnected(connected)
      
      // Process queued operations when connection is restored
      if (connected && operationQueue.length > 0 && !processingQueue.current) {
        processQueue()
      }
    })

    return unsubscribe
  }, [operationQueue])

  // Overall connection status
  const isConnected = isOnline && isFirebaseConnected

  /**
   * Add operation to queue for retry when connection restored
   * @param {Function} operation - Async function to execute
   * @param {string} description - Human-readable description
   */
  const queueOperation = useCallback((operation, description) => {
    const queuedOp = {
      id: Date.now() + Math.random(),
      operation,
      description,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3
    }
    
    setOperationQueue(prev => [...prev, queuedOp])
    
    return queuedOp.id
  }, [])

  /**
   * Process all queued operations
   */
  const processQueue = useCallback(async () => {
    if (processingQueue.current || operationQueue.length === 0) {
      return
    }

    processingQueue.current = true
    const queue = [...operationQueue]
    const successfulOps = []
    const failedOps = []

    for (const op of queue) {
      try {
        await op.operation()
        successfulOps.push(op.id)
        console.log(`✅ Queued operation succeeded: ${op.description}`)
      } catch (error) {
        console.error(`❌ Queued operation failed: ${op.description}`, error)
        
        if (op.retryCount < op.maxRetries) {
          failedOps.push({
            ...op,
            retryCount: op.retryCount + 1
          })
        } else {
          console.error(`❌ Operation exceeded max retries: ${op.description}`)
        }
      }
    }

    // Update queue: remove successful, keep failed for retry
    setOperationQueue(failedOps)
    processingQueue.current = false

    // If there are still failed operations and we're connected, retry after delay
    if (failedOps.length > 0 && isFirebaseConnected && isOnline) {
      setTimeout(() => processQueue(), 2000)
    }
  }, [operationQueue, isFirebaseConnected, isOnline])

  /**
   * Remove operation from queue
   */
  const removeFromQueue = useCallback((operationId) => {
    setOperationQueue(prev => prev.filter(op => op.id !== operationId))
  }, [])

  /**
   * Clear all queued operations
   */
  const clearQueue = useCallback(() => {
    setOperationQueue([])
  }, [])

  /**
   * Execute operation with automatic queuing if offline
   * @param {Function} operation - Async function to execute
   * @param {string} description - Human-readable description
   * @returns {Promise<boolean>} - Success status
   */
  const executeOrQueue = useCallback(async (operation, description) => {
    if (isConnected) {
      try {
        await operation()
        return true
      } catch (error) {
        console.error(`Operation failed: ${description}`, error)
        // Queue for retry
        queueOperation(operation, description)
        return false
      }
    } else {
      // Queue operation for when connection restored
      queueOperation(operation, description)
      return false
    }
  }, [isConnected, queueOperation])

  return {
    isOnline,
    isFirebaseConnected,
    isConnected,
    operationQueue,
    queuedCount: operationQueue.length,
    queueOperation,
    removeFromQueue,
    clearQueue,
    executeOrQueue,
    processQueue
  }
}

export default useConnectionStatus





