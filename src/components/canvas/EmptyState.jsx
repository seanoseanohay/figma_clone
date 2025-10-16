import { FileText } from 'lucide-react'

/**
 * EmptyState Component
 * Displays when no canvas is selected
 */
export const EmptyState = () => {
  return (
    <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <FileText className="w-24 h-24 text-gray-400 dark:text-gray-600 mx-auto mb-4" strokeWidth={1.5} />
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          No Canvas Selected
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          Select a canvas from the dropdown or create a new one to get started
        </p>
      </div>
    </div>
  )
}

