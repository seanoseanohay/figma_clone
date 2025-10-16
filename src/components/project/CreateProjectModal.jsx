import { useState, useEffect, useRef } from 'react';

/**
 * CreateProjectModal - Modal for creating new projects
 * Features: validation, keyboard shortcuts, loading states, accessibility
 */
const CreateProjectModal = ({ isOpen, onClose, onCreate }) => {
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setProjectName('');
      setError('');
      setIsLoading(false);
      // Focus input after modal animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      handleClose();
    }
    if (event.key === 'Enter' && projectName.trim() && !isLoading) {
      handleSubmit();
    }
  };

  // Add event listener for escape key
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, projectName, isLoading]);

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleSubmit = async () => {
    const trimmedName = projectName.trim();
    
    // Validation
    if (!trimmedName) {
      setError('Project name is required');
      inputRef.current?.focus();
      return;
    }
    
    if (trimmedName.length < 2) {
      setError('Project name must be at least 2 characters');
      inputRef.current?.focus();
      return;
    }
    
    if (trimmedName.length > 100) {
      setError('Project name must be less than 100 characters');
      inputRef.current?.focus();
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await onCreate(trimmedName);
      
      if (result.success) {
        // Success - modal will be closed by parent
        setProjectName('');
      } else {
        setError(result.error || 'Failed to create project');
        setIsLoading(false);
        inputRef.current?.focus();
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleInputChange = (e) => {
    setProjectName(e.target.value);
    if (error) setError(''); // Clear error when user types
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
          aria-hidden="true"
        />

        {/* Modal positioning trick */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        {/* Modal content */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* Header */}
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Create New Project
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Create a new project to organize your canvases and collaborate with others.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="mt-5 sm:mt-4">
            <div>
              <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                ref={inputRef}
                id="project-name"
                type="text"
                value={projectName}
                onChange={handleInputChange}
                placeholder="Enter project name..."
                disabled={isLoading}
                className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  error ? 'border-red-300' : 'border-gray-300'
                }`}
                maxLength={100}
              />
              
              {/* Character count */}
              <div className="mt-1 flex justify-between items-center">
                <div>
                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {projectName.length}/100
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!projectName.trim() || isLoading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="mt-3 text-xs text-gray-400 text-center">
            Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-600">Enter</kbd> to create or <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-600">Esc</kbd> to cancel
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;


