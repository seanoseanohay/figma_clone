import React, { useState } from 'react'
import { 
  BarChart3, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  RefreshCw
} from 'lucide-react'
import { useAgentMetrics } from '../../hooks/useAgentMetrics.js'

/**
 * AgentMetricsPanel Component
 * 
 * Displays comprehensive AI agent performance metrics and statistics
 * including success rates, response times, recent activity, and errors.
 */
const AgentMetricsPanel = ({ isVisible, onToggle }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const { 
    metrics, 
    getPerformanceSummary, 
    getRecentActivity, 
    getRecentErrors, 
    clearMetrics,
    isPerformanceDegrading 
  } = useAgentMetrics()

  const performanceSummary = getPerformanceSummary()
  const recentActivity = getRecentActivity()
  const recentErrors = getRecentErrors()
  const degrading = isPerformanceDegrading()

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[500px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">AI Agent Metrics</h3>
          {degrading && (
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
              <TrendingDown className="w-3 h-3 text-orange-600" />
              <span className="text-xs text-orange-700">Degrading</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearMetrics}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Reset metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Close metrics"
          >
            ×
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'activity', label: 'Activity', icon: Clock },
          { id: 'errors', label: 'Errors', icon: AlertTriangle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'errors' && recentErrors.length > 0 && (
              <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                {recentErrors.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Performance Grade */}
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold ${
                performanceSummary.performanceGrade === 'A' ? 'bg-green-100 text-green-600' :
                performanceSummary.performanceGrade === 'B' ? 'bg-blue-100 text-blue-600' :
                performanceSummary.performanceGrade === 'C' ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>
                {performanceSummary.performanceGrade}
              </div>
              <p className="text-sm text-gray-600 mt-2">Performance Grade</p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                icon={CheckCircle}
                label="Success Rate"
                value={`${performanceSummary.successRate}%`}
                color="green"
              />
              <MetricCard
                icon={Clock}
                label="Avg Response"
                value={`${performanceSummary.averageResponseTime}ms`}
                color="blue"
              />
              <MetricCard
                icon={Zap}
                label="Total Requests"
                value={performanceSummary.totalRequests}
                color="purple"
              />
              <MetricCard
                icon={Activity}
                label="Session Time"
                value={`${performanceSummary.sessionDurationMinutes}m`}
                color="gray"
              />
            </div>

            {/* Command Success Rate */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Command Success Rate</span>
                <span className="text-sm text-gray-600">{performanceSummary.commandSuccessRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    performanceSummary.commandSuccessRate >= 90 ? 'bg-green-500' :
                    performanceSummary.commandSuccessRate >= 70 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${performanceSummary.commandSuccessRate}%` }}
                />
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Execution Time</span>
                <span className="font-medium">{performanceSummary.averageExecutionTime}ms</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Error Rate</span>
                <span className="font-medium text-red-600">
                  {performanceSummary.totalRequests > 0 
                    ? Math.round(((performanceSummary.totalRequests - performanceSummary.successRate/100 * performanceSummary.totalRequests) / performanceSummary.totalRequests) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Recent Activity</h4>
              <span className="text-xs text-gray-500">{recentActivity.length} requests</span>
            </div>
            
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((activity, index) => (
                  <div
                    key={`${activity.timestamp}-${index}`}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      activity.success ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {activity.explanation || 'AI command executed'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{activity.timeAgo}</span>
                        <span>•</span>
                        <span>{activity.responseTimeMs}ms</span>
                        <span>•</span>
                        <span>{activity.commandsExecuted}/{activity.commandsTotal} commands</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Recent Errors</h4>
              <span className="text-xs text-gray-500">{recentErrors.length} errors</span>
            </div>
            
            {recentErrors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent errors</p>
                <p className="text-xs">Great job! 🎉</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentErrors.map((error, index) => (
                  <div
                    key={`${error.timestamp}-${index}`}
                    className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-red-900 break-words">
                        {error.error}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        {error.timeAgo}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * MetricCard Component
 * Displays a single metric with icon and styling
 */
const MetricCard = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    green: 'text-green-600 bg-green-100',
    blue: 'text-blue-600 bg-blue-100',
    purple: 'text-purple-600 bg-purple-100',
    gray: 'text-gray-600 bg-gray-100',
    red: 'text-red-600 bg-red-100'
  }

  return (
    <div className="bg-gray-50 p-3 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${colorClasses[color]?.split(' ')[0] || 'text-gray-600'}`} />
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  )
}

export default AgentMetricsPanel
