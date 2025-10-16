import React from 'react'
import { usePresence } from '../../hooks/usePresence.js'
import { useCanvas } from '../../hooks/useCanvas.js'

/**
 * OnlineUsers Component
 * Displays list of connected users on the CURRENT canvas with status indicators
 * 
 * CANVAS-SCOPED: Only shows users who are on the same project+canvas
 */
const OnlineUsers = ({ className = "" }) => {
  const { projectId, canvasId } = useCanvas()
  const { users, onlineCount, isLoading, error, getSummary } = usePresence()

  // Show waiting state if no canvas selected
  if (!projectId || !canvasId) {
    return (
      <div className={`${className} bg-white border border-gray-200 rounded-lg shadow-sm p-3`}>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span className="text-sm text-gray-600">No canvas selected</span>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`${className} bg-white border border-gray-200 rounded-lg shadow-sm p-3`}>
        <div className="flex items-center space-x-2">
          <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Connecting...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className} bg-white border border-red-200 rounded-lg shadow-sm p-3`}>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-sm text-red-600">Connection Error</span>
        </div>
      </div>
    )
  }

  const summary = getSummary()

  return (
    <div className={`${className} bg-white border border-gray-200 rounded-lg shadow-sm`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Online Users</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-500">
              {summary.totalUsers === 0 ? 'Just you' : `${summary.totalUsers + 1} users`}
            </span>
          </div>
        </div>
      </div>

      {/* Users list */}
      <div className="p-3">
        {/* Current user (always first) */}
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-900 font-medium">You</span>
          <span className="text-xs text-gray-500">(on this canvas)</span>
        </div>

        {/* Other users on this canvas */}
        {users.length === 0 ? (
          <div className="text-sm text-gray-500 italic">
            No other users on this canvas
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => {
              const isActive = user.lastActive > Date.now() - 30000 // Active within 30 seconds
              const statusColor = isActive ? 'bg-green-500' : 'bg-gray-400'
              const displayName = user.displayName || 'Anonymous User'
              
              return (
                <div key={user.userId} className="flex items-center space-x-2">
                  <div className={`w-2 h-2 ${statusColor} rounded-full`}></div>
                  <span className="text-sm text-gray-700">
                    {displayName.length > 25 ? `${displayName.substring(0, 22)}...` : displayName}
                  </span>
                  {user.cursorX !== null && user.cursorY !== null && (
                    <span className="text-xs text-green-600">●</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Debug info (only in development) */}
        {import.meta.env.DEV && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-400 space-y-1">
              <div>Canvas: {canvasId?.substring(0, 8)}...</div>
              <div>Total: {summary.totalUsers}</div>
              <div>With cursors: {summary.usersWithCursors}</div>
              <div>Active: {summary.activeUsers}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Compact version for header/toolbar use
 * CANVAS-SCOPED: Shows user count for current canvas only
 */
export const OnlineUsersCount = ({ className = "" }) => {
  const { projectId, canvasId } = useCanvas()
  const { onlineCount, isLoading } = usePresence()

  if (!projectId || !canvasId) {
    return (
      <div className={`${className} flex items-center space-x-1`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-sm text-gray-600">No canvas</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`${className} flex items-center space-x-1`}>
        <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
        <span className="text-sm text-gray-600">...</span>
      </div>
    )
  }

  const totalUsers = onlineCount + 1 // Include current user

  return (
    <div className={`${className} flex items-center space-x-1`}>
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      <span className="text-sm text-gray-700">
        {totalUsers === 1 ? 'Just you' : `${totalUsers} users`}
      </span>
    </div>
  )
}

export default OnlineUsers
