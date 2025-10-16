import { useState, useEffect, useRef } from 'react';

/**
 * CreateCanvasModal - Modal for creating new canvases within a project
 * Features: validation, keyboard shortcuts, loading states, accessibility
 */
const CreateCanvasModal = ({ isOpen, onClose, onCreate, projectName }) => {
  const [canvasName, setCanvasName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCanvasName('');
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
    if (event.key === 'Enter' && canvasName.trim() && !isLoading) {
      handleSubmit();
    }
  };

  // Add event listener for escape key
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, canvasName, isLoading]);

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleSubmit = async () => {
    const trimmedName = canvasName.trim();
    
    // Validation
    if (!trimmedName) {
      setError('Canvas name is required');
      inputRef.current?.focus();
      return;
    }
    
    if (trimmedName.length < 2) {
      setError('Canvas name must be at least 2 characters');
      inputRef.current?.focus();
      return;
    }
    
    if (trimmedName.length > 100) {
      setError('Canvas name must be less than 100 characters');
      inputRef.current?.focus();
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await onCreate(trimmedName);
      
      if (result.success) {
        // Success - modal will be closed by parent
        setCanvasName('');
      } else {
        setError(result.error || 'Failed to create canvas');
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
    setCanvasName(e.target.value);
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
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17v4a2 2 0 002 2h4M13 13h4a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4a2 2 0 012-2z" />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Create New Canvas
              </h3>
              <div className="mt-2">
                {projectName ? (
                  <p className="text-sm text-gray-500">
                    Create a new canvas in <span className="font-medium text-gray-700">"{projectName}"</span> project.
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Create a new canvas for your project.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="mt-5 sm:mt-4">
            <div>
              <label htmlFor="canvas-name" className="block text-sm font-medium text-gray-700 mb-2">
                Canvas Name
              </label>
              <input
                ref={inputRef}
                id="canvas-name"
                type="text"
                value={canvasName}
                onChange={handleInputChange}
                placeholder="Enter canvas name..."
                disabled={isLoading}
                className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed ${
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
                  {canvasName.length}/100
                </p>
              </div>
            </div>

            {/* Canvas Info */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Canvas Details</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• 5000×5000px workspace</li>
                <li>• Real-time collaboration enabled</li>
                <li>• Auto-save every change</li>
                <li>• Tools: Rectangle, Circle, Text, Pan, Move</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canvasName.trim() || isLoading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                'Create Canvas'
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

export default CreateCanvasModal;


