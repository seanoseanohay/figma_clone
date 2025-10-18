import { useState, useEffect, useCallback, useRef } from 'react'
import { useCanvas } from './useCanvas.js'

/**
 * useAgentMetrics Hook
 * 
 * Tracks and manages AI agent performance metrics including:
 * - Response times and latency
 * - Command success/failure rates  
 * - Usage statistics
 * - Error tracking
 * - Rolling performance averages
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
    recentResponses: [], // Last 10 responses
    errors: [], // Recent errors
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
          error: error.substring(0, 200), // Truncate for storage
          canvasId
        }))
        newErrors.unshift(...errorEntries)
        newErrors.splice(20) // Keep only last 20 errors
      }

      return {
        ...prev,
        totalRequests: newTotalRequests,
        successfulRequests: newSuccessful,
        failedRequests: newFailed,
        totalCommands: newTotalCommands,
        successfulCommands: newSuccessfulCommands,
        failedCommands: newFailedCommands,
        averageResponseTime: newAverageResponseTime,
        averageExecutionTime: newAverageExecutionTime,
        recentResponses: newRecentResponses,
        errors: newErrors
      }
    })

    console.log('📊 Agent metrics updated:', {
      success,
      responseTimeMs,
      executionTimeMs,
      commandsExecuted,
      commandsTotal
    })
  }, [])

  /**
   * Get performance summary statistics
   */
  const getPerformanceSummary = useCallback(() => {
    const current = metricsRef.current
    
    const successRate = current.totalRequests > 0 
      ? (current.successfulRequests / current.totalRequests) * 100 
      : 0

    const commandSuccessRate = current.totalCommands > 0
      ? (current.successfulCommands / current.totalCommands) * 100
      : 0

    const sessionDurationMs = Date.now() - current.sessionStartTime
    const sessionDurationMinutes = Math.floor(sessionDurationMs / 60000)

    return {
      successRate: Math.round(successRate * 10) / 10, // 1 decimal place
      commandSuccessRate: Math.round(commandSuccessRate * 10) / 10,
      averageResponseTime: Math.round(current.averageResponseTime),
      averageExecutionTime: Math.round(current.averageExecutionTime),
      totalRequests: current.totalRequests,
      sessionDurationMinutes,
      recentErrorCount: current.errors.length,
      performanceGrade: getPerformanceGrade(successRate, current.averageResponseTime)
    }
  }, [])

  /**
   * Get recent activity (last 10 requests)
   */
  const getRecentActivity = useCallback(() => {
    return metricsRef.current.recentResponses.map(response => ({
      ...response,
      timeAgo: getTimeAgo(response.timestamp),
      status: response.success ? 'success' : 'failed'
    }))
  }, [])

  /**
   * Get recent errors with formatted timestamps
   */
  const getRecentErrors = useCallback(() => {
    return metricsRef.current.errors.map(error => ({
      ...error,
      timeAgo: getTimeAgo(error.timestamp)
    }))
  }, [])

  /**
   * Clear all metrics (reset)
   */
  const clearMetrics = useCallback(() => {
    setMetrics({
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
    console.log('📊 Agent metrics cleared')
  }, [])

  /**
   * Check if performance is degrading
   */
  const isPerformanceDegrading = useCallback(() => {
    const current = metricsRef.current
    
    if (current.recentResponses.length < 5) {
      return false // Not enough data
    }

    const recent5 = current.recentResponses.slice(0, 5)
    const averageRecentTime = recent5.reduce((sum, r) => sum + r.responseTimeMs, 0) / 5
    
    // Check if recent average is significantly worse than overall average
    return averageRecentTime > current.averageResponseTime * 1.5 && current.averageResponseTime > 0
  }, [])

  return {
    metrics,
    recordRequest,
    getPerformanceSummary,
    getRecentActivity,
    getRecentErrors,
    clearMetrics,
    isPerformanceDegrading
  }
}

/**
 * Helper function to get performance grade
 * @param {number} successRate - Success rate percentage
 * @param {number} avgResponseTime - Average response time in ms
 * @returns {string} - Performance grade (A, B, C, D, F)
 */
const getPerformanceGrade = (successRate, avgResponseTime) => {
  if (successRate >= 95 && avgResponseTime < 2000) return 'A'
  if (successRate >= 90 && avgResponseTime < 3000) return 'B'
  if (successRate >= 80 && avgResponseTime < 5000) return 'C'
  if (successRate >= 70 && avgResponseTime < 8000) return 'D'
  return 'F'
}

/**
 * Helper function to format relative time
 * @param {number} timestamp - Timestamp in milliseconds
 * @returns {string} - Formatted time ago
 */
const getTimeAgo = (timestamp) => {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffMs / 86400000)
  return `${diffDays}d ago`
}

export default useAgentMetrics
