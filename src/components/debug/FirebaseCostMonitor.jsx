import React, { useState, useEffect } from 'react'
import { useCursorTracking } from '../../hooks/useCursorTracking.js'
import { usePresence } from '../../hooks/usePresence.js'

/**
 * Firebase Cost Monitor Component
 * Tracks and displays Firebase API usage to help manage costs
 */
const FirebaseCostMonitor = ({ className = "" }) => {
  const { getThrottleInfo } = useCursorTracking()
  const { getSummary } = usePresence()
  const [stats, setStats] = useState({})
  const [sessionStats, setSessionStats] = useState({
    totalCursorUpdates: 0,
    totalPresenceReads: 0,
    sessionStart: Date.now()
  })

  // Update stats every second
  useEffect(() => {
    const updateStats = () => {
      const throttleStats = getThrottleInfo()
      const presenceStats = getSummary()
      
      setStats({
        ...throttleStats,
        ...presenceStats,
        timestamp: Date.now()
      })
    }

    updateStats()
    const interval = setInterval(updateStats, 1000)
    
    return () => clearInterval(interval)
  }, [getThrottleInfo, getSummary])

  // Track session usage
  useEffect(() => {
    if (stats.callsThisSecond > 0) {
      setSessionStats(prev => ({
        ...prev,
        totalCursorUpdates: prev.totalCursorUpdates + stats.callsThisSecond
      }))
    }
  }, [stats.callsThisSecond])

  const sessionDurationMinutes = Math.floor((Date.now() - sessionStats.sessionStart) / 60000)
  const avgCallsPerMinute = sessionDurationMinutes > 0 ? 
    Math.round(sessionStats.totalCursorUpdates / sessionDurationMinutes) : 0

  // Cost estimates (rough Firebase Realtime Database pricing)
  const estimatedMonthlyCost = (avgCallsPerMinute * 60 * 24 * 30 * 0.00001).toFixed(4)

  return (
    <div className={`${className} bg-white border border-gray-200 rounded-lg p-3`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">Firebase Usage</h4>
        <div className={`px-2 py-1 rounded text-xs ${
          stats.callsThisSecond > 10 ? 'bg-red-100 text-red-700' :
          stats.callsThisSecond > 5 ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        }`}>
          {stats.callsThisSecond || 0} calls/sec
        </div>
      </div>
      
      {/* Real-time stats */}
      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Current throttle:</span>
          <span>{stats.currentThrottleMs || 50}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span>Rate limit:</span>
          <span>{stats.callsThisSecond || 0}/{stats.maxCallsPerSecond || 15}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Online users:</span>
          <span>{(stats.totalUsers || 0) + 1}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Active cursors:</span>
          <span>{stats.usersWithCursors || 0}</span>
        </div>
      </div>

      {/* Session stats */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Session duration:</span>
            <span>{sessionDurationMinutes}m</span>
          </div>
          
          <div className="flex justify-between">
            <span>Total updates:</span>
            <span>{sessionStats.totalCursorUpdates}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Avg calls/min:</span>
            <span>{avgCallsPerMinute}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Est. monthly cost:</span>
            <span className="font-mono">${estimatedMonthlyCost}</span>
          </div>
        </div>
      </div>

      {/* Throttling status */}
      {stats.isThrottling && (
        <div className="mt-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          ⏱️ Adaptive throttling active
        </div>
      )}
      
      {/* Cost optimization tips */}
      {avgCallsPerMinute > 30 && (
        <div className="mt-2 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          💡 High usage detected - throttling will adapt automatically
        </div>
      )}
    </div>
  )
}

export default FirebaseCostMonitor
