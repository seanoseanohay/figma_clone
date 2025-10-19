import { ref, set, remove, onValue, serverTimestamp } from 'firebase/database'
import { rtdb, auth } from './firebase.js'

/**
 * Agent Presence Service
 * 
 * Manages real-time synchronization of AI agent actions across multiple users.
 * Features:
 * - AI action broadcasting to all canvas users
 * - Agent status indicators ("AI is working...")
 * - Conflict prevention during AI operations
 * - Real-time agent activity notifications
 */

/**
 * Broadcast AI agent action to all users on the canvas
 * @param {string} canvasId - Canvas ID
 * @param {Object} actionData - AI action details
 * @returns {Promise<void>}
 */
export const broadcastAgentAction = async (canvasId, actionData) => {
  try {
    if (!canvasId || !auth.currentUser) {
      return
    }

    const actionRef = ref(rtdb, `/canvases/${canvasId}/agentActions/${Date.now()}`)
    
    const broadcastData = {
      ...actionData,
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || auth.currentUser.email,
      timestamp: Date.now(),
      serverTimestamp: serverTimestamp()
    }

    await set(actionRef, broadcastData)
    
    console.log('🔊 Agent action broadcasted:', actionData.type)
    
    // Auto-cleanup after 30 seconds
    setTimeout(async () => {
      try {
        await remove(actionRef)
      } catch (error) {
        // Ignore cleanup errors
      }
    }, 30000)

  } catch (error) {
    console.error('❌ Failed to broadcast agent action:', error)
  }
}

/**
 * Set AI agent status (e.g., "AI is working...")
 * @param {string} canvasId - Canvas ID
 * @param {Object} statusData - Status information
 * @returns {Promise<void>}
 */
export const setAgentStatus = async (canvasId, statusData) => {
  try {
    if (!canvasId || !auth.currentUser) {
      return
    }

    const statusRef = ref(rtdb, `/canvases/${canvasId}/agentStatus/${auth.currentUser.uid}`)
    
    const status = {
      ...statusData,
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || auth.currentUser.email,
      timestamp: Date.now(),
      serverTimestamp: serverTimestamp()
    }

    await set(statusRef, status)
    console.log('🤖 Agent status set:', statusData.status)

  } catch (error) {
    console.error('❌ Failed to set agent status:', error)
  }
}

/**
 * Clear AI agent status
 * @param {string} canvasId - Canvas ID
 * @returns {Promise<void>}
 */
export const clearAgentStatus = async (canvasId) => {
  try {
    if (!canvasId || !auth.currentUser) {
      return
    }

    const statusRef = ref(rtdb, `/canvases/${canvasId}/agentStatus/${auth.currentUser.uid}`)
    await remove(statusRef)
    console.log('🤖 Agent status cleared')

  } catch (error) {
    console.error('❌ Failed to clear agent status:', error)
  }
}

/**
 * Subscribe to AI agent actions on a canvas
 * @param {string} canvasId - Canvas ID
 * @param {Function} callback - Callback for agent actions
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToAgentActions = (canvasId, callback) => {
  try {
    if (!canvasId) {
      console.warn('Cannot subscribe to agent actions: missing canvasId')
      callback([])
      return () => {}
    }

    const actionsRef = ref(rtdb, `/canvases/${canvasId}/agentActions`)
    
    const handleAgentActions = (snapshot) => {
      const actionsData = snapshot.val() || {}
      const actions = Object.entries(actionsData)
        .map(([key, data]) => ({ id: key, ...data }))
        .filter(action => {
          // Filter out actions from current user (to avoid duplicate handling)
          return action.userId !== auth.currentUser?.uid
        })
        .sort((a, b) => a.timestamp - b.timestamp)
      
      callback(actions)
    }

    const unsubscribe = onValue(actionsRef, handleAgentActions, (error) => {
      console.error('Error subscribing to agent actions:', error)
      callback([])
    })
    
    // Subscribed to agent actions (canvas: ${canvasId})
    return unsubscribe

  } catch (error) {
    console.error('Error subscribing to agent actions:', error)
    return () => {}
  }
}

/**
 * Subscribe to AI agent status updates
 * @param {string} canvasId - Canvas ID
 * @param {Function} callback - Callback for status updates
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToAgentStatus = (canvasId, callback) => {
  try {
    if (!canvasId) {
      console.warn('Cannot subscribe to agent status: missing canvasId')
      callback({})
      return () => {}
    }

    const statusRef = ref(rtdb, `/canvases/${canvasId}/agentStatus`)
    
    const handleAgentStatus = (snapshot) => {
      const statusData = snapshot.val() || {}
      
      // Filter out status from current user
      const filteredStatus = {}
      for (const [userId, status] of Object.entries(statusData)) {
        if (userId !== auth.currentUser?.uid) {
          filteredStatus[userId] = status
        }
      }
      
      callback(filteredStatus)
    }

    const unsubscribe = onValue(statusRef, handleAgentStatus, (error) => {
      console.error('Error subscribing to agent status:', error)
      callback({})
    })
    
    // Subscribed to agent status (canvas: ${canvasId})
    return unsubscribe

  } catch (error) {
    console.error('Error subscribing to agent status:', error)
    return () => {}
  }
}

/**
 * Check if AI agent is currently active on canvas (conflict prevention)
 * @param {string} canvasId - Canvas ID
 * @returns {Promise<Object>} - { isActive: boolean, activeUsers: Array }
 */
export const checkAgentActivity = async (canvasId) => {
  try {
    if (!canvasId) {
      return { isActive: false, activeUsers: [] }
    }

    return new Promise((resolve) => {
      const statusRef = ref(rtdb, `/canvases/${canvasId}/agentStatus`)
      
      onValue(statusRef, (snapshot) => {
        const statusData = snapshot.val() || {}
        const activeUsers = []
        
        const now = Date.now()
        const staleThreshold = 60000 // 1 minute
        
        for (const [userId, status] of Object.entries(statusData)) {
          // Check if status is recent (not stale)
          if (status.timestamp && (now - status.timestamp) < staleThreshold) {
            activeUsers.push({
              userId,
              userName: status.userName,
              status: status.status,
              timestamp: status.timestamp
            })
          }
        }
        
        resolve({
          isActive: activeUsers.length > 0,
          activeUsers
        })
      }, { once: true })
    })

  } catch (error) {
    console.error('Error checking agent activity:', error)
    return { isActive: false, activeUsers: [] }
  }
}

/**
 * Create agent action notification for real-time updates
 * @param {Object} executionResult - Command execution result
 * @param {string} explanation - AI explanation
 * @returns {Object} - Action notification data
 */
export const createAgentActionNotification = (executionResult, explanation) => {
  return {
    type: 'agent_execution',
    status: executionResult.success ? 'completed' : 'failed',
    explanation: explanation || 'AI performed an action',
    commandsExecuted: executionResult.commandsExecuted,
    commandsTotal: executionResult.commandsTotal,
    executionTimeMs: executionResult.executionTimeMs,
    objectsCreated: executionResult.createdObjects?.length || 0,
    objectsModified: executionResult.modifiedObjects?.length || 0,
    objectsDeleted: executionResult.deletedObjects?.length || 0,
    errors: executionResult.errors || []
  }
}

export default {
  broadcastAgentAction,
  setAgentStatus,
  clearAgentStatus,
  subscribeToAgentActions,
  subscribeToAgentStatus,
  checkAgentActivity,
  createAgentActionNotification
}
