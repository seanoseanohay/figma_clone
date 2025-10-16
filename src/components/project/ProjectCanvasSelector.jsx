import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProjects } from '../../hooks/useProjects.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import CreateProjectModal from './CreateProjectModal.jsx';
import CreateCanvasModal from './CreateCanvasModal.jsx';

/**
 * ProjectCanvasSelector - A comprehensive dropdown for project and canvas management
 * Features: hierarchical display, creation modals, search, keyboard nav, extensible design
 */
const ProjectCanvasSelector = ({ className = '' }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Project management
  const {
    projects,
    isLoading,
    error,
    stats,
    searchTerm,
    setSearchTerm,
    createNewProject,
    createNewCanvas,
    refresh,
    findProjectCanvas
  } = useProjects(currentUser?.uid);

  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateCanvas, setShowCreateCanvas] = useState(false);
  const [currentProjectCanvas, setCurrentProjectCanvas] = useState(null);
  
  // Refs for dropdown management
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const buttonRef = useRef(null);

  /**
   * Detect current project/canvas from URL
   */
  useEffect(() => {
    // Don't run if projects haven't loaded yet
    if (!projects.length) {
      setCurrentProjectCanvas(null);
      return;
    }

    // Support both /canvas/{id} and /project/{projId}/canvas/{canvasId} formats
    const canvasMatch = location.pathname.match(/\/canvas\/([^/]+)/);
    const projectCanvasMatch = location.pathname.match(/\/project\/([^/]+)\/canvas\/([^/]+)/);
    
    if (projectCanvasMatch) {
      const [, projectId, canvasId] = projectCanvasMatch;
      const project = projects.find(p => p.id === projectId);
      const canvas = project?.canvases.find(c => c.id === canvasId);
      
      if (project && canvas) {
        setCurrentProjectCanvas({
          projectId: project.id,
          projectName: project.name,
          canvasId: canvas.id,
          canvasName: canvas.name
        });
        return;
      }
    }
    
    if (canvasMatch) {
      const canvasId = canvasMatch[1];
      // Find canvas across all projects without using findProjectCanvas callback
      for (const project of projects) {
        const canvas = project.canvases.find(c => c.id === canvasId);
        if (canvas) {
          setCurrentProjectCanvas({
            projectId: project.id,
            projectName: project.name,
            canvasId: canvas.id,
            canvasName: canvas.name
          });
          return;
        }
      }
    }
    
    setCurrentProjectCanvas(null);
  }, [location.pathname, projects]); // Remove findProjectCanvas dependency

  /**
   * Handle outside clicks to close dropdown
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('focusin', handleClickOutside);
      
      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('focusin', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  /**
   * Navigate to selected canvas
   */
  const handleCanvasSelect = (project, canvas) => {
    setIsOpen(false);
    setSearchTerm(''); // Clear search when navigating
    
    // Use the new URL structure for future-proofing
    navigate(`/project/${project.id}/canvas/${canvas.id}`);
  };

  /**
   * Handle project creation
   */
  const handleProjectCreate = async (projectName) => {
    const result = await createNewProject(projectName);
    if (result.success) {
      setShowCreateProject(false);
      // Optionally navigate to create first canvas in new project
      setSelectedProjectId(result.project.id);
      setShowCreateCanvas(true);
    }
    return result;
  };

  /**
   * Handle canvas creation
   */
  const handleCanvasCreate = async (canvasName) => {
    if (!selectedProjectId) return { success: false, error: 'No project selected' };
    
    const result = await createNewCanvas(selectedProjectId, canvasName);
    if (result.success) {
      setShowCreateCanvas(false);
      setSelectedProjectId(null);
      
      // Navigate to the new canvas
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        navigate(`/project/${project.id}/canvas/${result.canvas.id}`);
      }
    }
    return result;
  };

  /**
   * Filter projects/canvases based on search term
   */
  const getFilteredData = () => {
    if (!searchTerm.trim()) return projects;
    
    const term = searchTerm.toLowerCase();
    return projects.map(project => {
      const matchesProject = project.name.toLowerCase().includes(term);
      const filteredCanvases = project.canvases.filter(canvas =>
        canvas.name.toLowerCase().includes(term)
      );
      
      if (matchesProject || filteredCanvases.length > 0) {
        return {
          ...project,
          canvases: matchesProject ? project.canvases : filteredCanvases,
          _searchMatch: matchesProject ? 'project' : 'canvas'
        };
      }
      return null;
    }).filter(Boolean);
  };

  const filteredProjects = getFilteredData();

  /**
   * Get display text for the selector button
   */
  const getDisplayText = () => {
    if (isLoading) return 'Loading...';
    
    if (currentProjectCanvas) {
      return `${currentProjectCanvas.projectName} > ${currentProjectCanvas.canvasName}`;
    }
    
    if (stats.isEmpty) {
      return 'Create your first project';
    }
    
    return 'Select Project > Canvas';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selector Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[200px]"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate">
          {getDisplayText()}
        </span>
        
        {isLoading ? (
          <svg className="animate-spin w-4 h-4 ml-2 text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg 
            className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl z-50 max-h-[500px] overflow-hidden min-w-[350px] max-w-[500px]"
          onKeyDown={handleKeyDown}
        >
          {/* Search Header */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <svg 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search projects and canvases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="max-h-[400px] overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-50 border-b border-red-200">
                <div className="text-sm text-red-600 flex items-center">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                  <button onClick={refresh} className="ml-2 text-blue-600 hover:text-blue-800 underline">
                    Retry
                  </button>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="p-6 text-center">
                <div className="inline-flex items-center text-gray-500">
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading projects...
                </div>
              </div>
            ) : stats.isEmpty ? (
              <div className="p-6 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-gray-500 text-sm mb-3">No projects yet</p>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowCreateProject(true);
                  }}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create your first project
                </button>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No matches found for "{searchTerm}"
              </div>
            ) : (
              <>
                {/* Project/Canvas List */}
                {filteredProjects.map((project) => (
                  <div key={project.id} className="border-b border-gray-100 last:border-b-0">
                    {/* Project Header */}
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center">
                        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          {project.name}
                        </h3>
                        {project._searchMatch === 'project' && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                            Match
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          setShowCreateCanvas(true);
                          setIsOpen(false);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded"
                        title="Add canvas to this project"
                      >
                        + Canvas
                      </button>
                    </div>

                    {/* Canvas List */}
                    {project.canvases.length === 0 ? (
                      <div className="px-6 py-3 text-xs text-gray-400 italic">
                        No canvases in this project
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {project.canvases.map((canvas) => {
                          const isCurrentCanvas = currentProjectCanvas?.canvasId === canvas.id;
                          return (
                            <button
                              key={canvas.id}
                              onClick={() => handleCanvasSelect(project, canvas)}
                              className={`w-full text-left px-6 py-3 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between group ${
                                isCurrentCanvas 
                                  ? 'bg-blue-100 font-medium text-blue-900' 
                                  : 'text-gray-700'
                              }`}
                            >
                              <span className="truncate">
                                {project.name} <span className="text-gray-400">›</span> {canvas.name}
                              </span>
                              {isCurrentCanvas && (
                                <span className="text-xs text-blue-600 font-medium">Current</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {/* Actions Footer */}
                <div className="p-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {stats.totalProjects} projects • {stats.totalCanvases} canvases
                    </span>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setShowCreateProject(true);
                      }}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                    >
                      <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      New Project
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onCreate={handleProjectCreate}
      />

      {/* Create Canvas Modal */}
      <CreateCanvasModal
        isOpen={showCreateCanvas}
        onClose={() => {
          setShowCreateCanvas(false);
          setSelectedProjectId(null);
        }}
        onCreate={handleCanvasCreate}
        projectName={projects.find(p => p.id === selectedProjectId)?.name}
      />
    </div>
  );
};

export default ProjectCanvasSelector;
