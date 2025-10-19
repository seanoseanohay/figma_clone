import { useState, useCallback, useRef, useEffect } from 'react'
import { useCanvas } from './useCanvas.js'

/**
 * useAgentMetrics Hook
 * 
 * Manages AI agent performance metrics and statistics.
 * Tracks request success rates, response times, and errors.
 * Simplified version with UI panel removed - only keeps core recording functionality.
 */
export const useAgentMetrics = () => {
  const { canvasId } = useCanvas()
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalCommands: 0,
    successfulCommands: 0,
    failedCommands: 0,
    averageResponseTime: 0,
    averageExecutionTime: 0,
    recentResponses: [],
    errors: [],
    sessionStartTime: Date.now()
  })
  
  const metricsRef = useRef(metrics)

  // Keep ref in sync with state
  useEffect(() => {
    metricsRef.current = metrics
  }, [metrics])

  /**
   * Record a new AI agent request
   * @param {Object} requestData - Request metrics data
   */
  const recordRequest = useCallback((requestData) => {
    const {
      success,
      responseTimeMs,
      executionTimeMs,
      commandsTotal = 0,
      commandsExecuted = 0,
      errors = [],
      explanation = ''
    } = requestData

    const timestamp = Date.now()
    
    setMetrics(prev => {
      const newTotalRequests = prev.totalRequests + 1
      const newSuccessful = success ? prev.successfulRequests + 1 : prev.successfulRequests
      const newFailed = success ? prev.failedRequests : prev.failedRequests + 1
      
      const newTotalCommands = prev.totalCommands + commandsTotal
      const newSuccessfulCommands = prev.successfulCommands + commandsExecuted
      const newFailedCommands = prev.failedCommands + (commandsTotal - commandsExecuted)

      // Calculate rolling averages
      const responseTimeSum = prev.averageResponseTime * prev.totalRequests + (responseTimeMs || 0)
      const newAverageResponseTime = responseTimeSum / newTotalRequests

      const executionTimeSum = prev.averageExecutionTime * prev.totalRequests + (executionTimeMs || 0)
      const newAverageExecutionTime = executionTimeSum / newTotalRequests

      // Add to recent responses (keep last 10)
      const newResponse = {
        timestamp,
        success,
        responseTimeMs: responseTimeMs || 0,
        executionTimeMs: executionTimeMs || 0,
        commandsTotal,
        commandsExecuted,
        explanation: explanation.substring(0, 100), // Truncate for storage
        canvasId
      }
      
      const newRecentResponses = [newResponse, ...prev.recentResponses].slice(0, 10)

      // Add errors (keep last 20)
      const newErrors = [...prev.errors]
      if (errors.length > 0) {
        const errorEntries = errors.map(error => ({
          timestamp,
          message: error,
          canvasId
        }))
        newErrors.push(...errorEntries)
        if (newErrors.length > 20) {
          newErrors.splice(0, newErrors.length - 20)
        }
      }

      return {
        totalRequests: newTotalRequests,
        successfulRequests: newSuccessful,
        failedRequests: newFailed,
        totalCommands: newTotalCommands,
        successfulCommands: newSuccessfulCommands,
        failedCommands: newFailedCommands,
        averageResponseTime: newAverageResponseTime,
        averageExecutionTime: newAverageExecutionTime,
        recentResponses: newRecentResponses,
        errors: newErrors,
        sessionStartTime: prev.sessionStartTime
      }
    })
    
    // Log metrics for debugging (can be removed in production)
    // console.log('📊 Agent metrics updated:', {
    //   success,
    //   responseTimeMs,
    //   executionTimeMs,
    //   commandsTotal,
    //   commandsExecuted
    // })
  }, [canvasId])

  return {
    metrics,
    recordRequest
  }
}

export default useAgentMetrics