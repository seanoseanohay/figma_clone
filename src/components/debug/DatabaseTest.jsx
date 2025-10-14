import React, { useState, useEffect } from 'react'
import { rtdb, auth } from '../../services/firebase.js'
import { ref, set, onValue } from 'firebase/database'

/**
 * Database Test Component
 * Simple test to verify Realtime Database connection and rules
 */
const DatabaseTest = () => {
  const [status, setStatus] = useState('Testing...')
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser)
    return unsubscribe
  }, [])

  const testDatabase = async () => {
    if (!user) {
      setStatus('❌ Not authenticated')
      return
    }

    try {
      setStatus('🔄 Testing database connection...')
      setError(null)

      // Test simple write
      const testRef = ref(rtdb, `globalCanvas/users/${user.uid}/test`)
      await set(testRef, {
        timestamp: Date.now(),
        message: 'test connection'
      })

      setStatus('✅ Database connection successful!')
      
      // Test read
      const unsubscribe = onValue(testRef, (snapshot) => {
        const data = snapshot.val()
        if (data) {
          setStatus(`✅ Read/Write test passed! Timestamp: ${data.timestamp}`)
        }
      })

      return unsubscribe
    } catch (error) {
      setError(error)
      if (error.code === 'PERMISSION_DENIED') {
        setStatus('❌ Permission denied - Check database rules')
      } else {
        setStatus(`❌ Database error: ${error.message}`)
      }
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Database Test</h3>
        <button 
          onClick={testDatabase}
          disabled={!user}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Test Connection
        </button>
      </div>

      <div className="text-sm">
        <div className="space-y-1">
          <div>Status: {status}</div>
          {user && <div>User: {user.email}</div>}
          {error && (
            <div className="text-red-600 text-xs font-mono bg-red-50 p-2 rounded">
              Error: {error.code}<br/>
              {error.message}
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <div><strong>Path:</strong> /globalCanvas/users/{user?.uid || 'USER_ID'}</div>
        <div><strong>Rules:</strong> Authenticated users can read/write their own data</div>
      </div>

      {error?.code === 'PERMISSION_DENIED' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
          <div><strong>Fix steps:</strong></div>
          <div>1. Ensure Realtime Database is created in Firebase Console</div>
          <div>2. Run: <code className="bg-yellow-100 px-1 rounded">firebase deploy --only database</code></div>
          <div>3. Check that your .env has the correct VITE_FIREBASE_DATABASE_URL</div>
        </div>
      )}
    </div>
  )
}

export default DatabaseTest
