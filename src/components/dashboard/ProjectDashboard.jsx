import { useAuth } from '../auth/AuthProvider.jsx';
import { useProjects } from '../../hooks/useProjects.js';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

/**
 * ProjectDashboard - Shows when user accesses /canvas without a specific canvas ID
 * Provides project overview and quick access to create/navigate to canvases
 */
const ProjectDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const {
    projects,
    isLoading,
    error,
    stats,
    createNewProject,
    createNewCanvas
  } = useProjects(currentUser?.uid);

  const [creatingProject, setCreatingProject] = useState(false);

  const handleCreateFirstProject = async () => {
    setCreatingProject(true);
    try {
      const result = await createNewProject('My First Project');
      if (result.success) {
        // Create a default canvas in the new project
        const canvasResult = await createNewCanvas(result.project.id, 'Untitled Canvas');
        if (canvasResult.success) {
          // Navigate to the new canvas
          navigate(`/project/${result.project.id}/canvas/${canvasResult.canvas.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to create first project:', error);
    } finally {
      setCreatingProject(false);
    }
  };

  const handleNavigateToCanvas = (project, canvas) => {
    navigate(`/project/${project.id}/canvas/${canvas.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">Failed to load projects</p>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No projects yet - show welcome screen
  if (stats.isEmpty) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="mb-8">
            <svg className="h-24 w-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to CollabCanvas</h1>
            <p className="text-gray-600 mb-8">
              Start creating and collaborating on your first design project.
            </p>
          </div>

          <button
            onClick={handleCreateFirstProject}
            disabled={creatingProject}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creatingProject ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating your project...
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Your First Project
              </>
            )}
          </button>

          <div className="mt-8 text-sm text-gray-500">
            <p>You'll get a project with your first canvas ready to use.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show project overview with recent canvases
  return (
    <div className="flex-1 bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Projects</h1>
          <p className="text-gray-600">
            {stats.totalProjects} projects • {stats.totalCanvases} canvases
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                <span className="text-sm text-gray-500">
                  {project.canvasCount} canvas{project.canvasCount !== 1 ? 'es' : ''}
                </span>
              </div>

              {project.canvases.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm mb-4">No canvases yet</p>
                  <button
                    onClick={async () => {
                      const result = await createNewCanvas(project.id, 'Untitled Canvas');
                      if (result.success) {
                        navigate(`/project/${project.id}/canvas/${result.canvas.id}`);
                      }
                    }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Canvas
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {project.canvases.slice(0, 3).map((canvas) => (
                    <button
                      key={canvas.id}
                      onClick={() => handleNavigateToCanvas(project, canvas)}
                      className="inline-flex items-center justify-between px-4 py-2 rounded-md hover:bg-gray-50 transition-colors border border-gray-200 hover:border-gray-300 min-w-0 max-w-sm"
                    >
                      <span className="text-sm font-medium text-gray-900 truncate">{canvas.name}</span>
                      <svg className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                  
                  {project.canvases.length > 3 && (
                    <p className="text-xs text-gray-500 px-3 py-1">
                      +{project.canvases.length - 3} more canvases
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboard;

