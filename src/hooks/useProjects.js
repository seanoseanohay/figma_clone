import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getProjectsForUser, 
  createProject, 
  updateProject, 
  deleteProject, 
  canUserAccessProject 
} from '../services/project.service.js';
import { 
  getCanvasesForProject, 
  createCanvas, 
  updateCanvas, 
  deleteCanvas 
} from '../services/canvas.service.js';

/**
 * Custom hook for managing projects and canvases with caching, real-time updates, and optimistic UI
 * Built for extensibility and future features like search, filtering, and collaboration
 */
export const useProjects = (userId) => {
  // Core state
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  
  // Advanced state for future features
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt'); // 'updatedAt', 'name', 'alphabetical'
  const [filter, setFilter] = useState('all'); // 'all', 'owned', 'shared', 'recent'
  
  // Caching and performance
  const cache = useRef(new Map());
  const refreshInterval = useRef(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const REFRESH_INTERVAL = 30 * 1000; // 30 seconds for real-time feel
  
  // Removed optimistic updates for MVP simplicity
  
  /**
   * Fetch projects with caching strategy
   */
  const fetchProjects = useCallback(async (useCache = true) => {
    if (!userId) {
      setProjects([]);
      setIsLoading(false);
      return { success: false, error: 'No user ID provided' };
    }

    // Check cache first
    const cacheKey = `projects_${userId}`;
    const cached = cache.current.get(cacheKey);
    const now = Date.now();
    
    if (useCache && cached && (now - cached.timestamp < CACHE_DURATION)) {
      setProjects(cached.data);
      setIsLoading(false);
      setLastFetchTime(cached.timestamp);
      return { success: true, projects: cached.data, fromCache: true };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get projects from service
      const projectsResult = await getProjectsForUser(userId);
      
      if (!projectsResult.success) {
        throw new Error(projectsResult.error || 'Failed to fetch projects');
      }

      // Fetch canvases for each project in parallel
      const projectsWithCanvases = await Promise.all(
        projectsResult.projects.map(async (project) => {
          try {
            const canvasesResult = await getCanvasesForProject(project.id, userId);
            return {
              ...project,
              canvases: canvasesResult.success ? canvasesResult.canvases : [],
              canvasCount: canvasesResult.success ? canvasesResult.canvases.length : 0,
              lastActivity: project.updatedAt || project.createdAt,
              // Add computed fields for future sorting/filtering
              isOwned: project.ownerId === userId,
              isShared: project.collaborators?.includes(userId) || false,
            };
          } catch (error) {
            console.warn(`Failed to fetch canvases for project ${project.id}:`, error);
            return {
              ...project,
              canvases: [],
              canvasCount: 0,
              isOwned: project.ownerId === userId,
              isShared: project.collaborators?.includes(userId) || false,
              lastActivity: project.updatedAt || project.createdAt,
            };
          }
        })
      );

      // Cache the results
      cache.current.set(cacheKey, {
        data: projectsWithCanvases,
        timestamp: now
      });

      setProjects(projectsWithCanvases);
      setLastFetchTime(now);
      setIsLoading(false);

      return { success: true, projects: projectsWithCanvases };

    } catch (error) {
      console.error('Error fetching projects:', error);
      setError(error.message);
      setIsLoading(false);
      return { success: false, error: error.message };
    }
  }, [userId]); // Simplified dependencies

  // Removed applyOptimisticUpdates function for MVP simplicity

  /**
   * Create a new project (simplified for MVP)
   */
  const createNewProject = useCallback(async (name) => {
    if (!userId || !name?.trim()) {
      return { success: false, error: 'Project name is required' };
    }

    try {
      const result = await createProject(name.trim(), userId);
      
      if (result.success) {
        // Invalidate cache and refresh data
        cache.current.delete(`projects_${userId}`);
        await fetchProjects(false); // Force refresh
        
        return { success: true, project: result.project };
      } else {
        return result;
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [userId, fetchProjects]);

  /**
   * Create a new canvas within a project (simplified for MVP)
   */
  const createNewCanvas = useCallback(async (projectId, canvasName) => {
    if (!userId || !projectId || !canvasName?.trim()) {
      return { success: false, error: 'Project ID and canvas name are required' };
    }

    try {
      const result = await createCanvas(projectId, canvasName.trim(), userId);
      
      if (result.success) {
        // Invalidate cache and refresh data
        cache.current.delete(`projects_${userId}`);
        await fetchProjects(false); // Force refresh
        
        return result;
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [userId, fetchProjects]);

  /**
   * Get filtered and sorted projects based on current filters
   */
  const getFilteredProjects = useCallback(() => {
    let filtered = [...projects];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(term) ||
        project.canvases.some(canvas => 
          canvas.name.toLowerCase().includes(term)
        )
      );
    }

    // Apply type filter
    switch (filter) {
      case 'owned':
        filtered = filtered.filter(p => p.isOwned);
        break;
      case 'shared':
        filtered = filtered.filter(p => p.isShared);
        break;
      case 'recent':
        // Show projects with activity in last 7 days
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(p => 
          new Date(p.lastActivity) > weekAgo
        );
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'updatedAt':
      default:
        filtered.sort((a, b) => {
          const aTime = new Date(a.lastActivity || a.updatedAt || a.createdAt);
          const bTime = new Date(b.lastActivity || b.updatedAt || b.createdAt);
          return bTime - aTime; // Most recent first
        });
        break;
    }

    return filtered;
  }, [projects, searchTerm, filter, sortBy]);

  /**
   * Find a specific project and canvas
   */
  const findProjectCanvas = useCallback((canvasId) => {
    for (const project of projects) {
      const canvas = project.canvases.find(c => c.id === canvasId);
      if (canvas) {
        return { project, canvas };
      }
    }
    return null;
  }, [projects]); // Keep this dependency as it's needed

  /**
   * Refresh projects (force fetch)
   */
  const refresh = useCallback(() => {
    return fetchProjects(false);
  }, []); // Remove fetchProjects dependency to prevent infinite loop

  // Initial fetch and setup auto-refresh
  useEffect(() => {
    if (userId) {
      fetchProjects();
      
      // Set up periodic refresh for real-time feel
      refreshInterval.current = setInterval(() => {
        fetchProjects(true); // Use cache but check for updates
      }, REFRESH_INTERVAL);
    }
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [userId]); // Remove fetchProjects dependency to prevent infinite loop

  // Computed values
  const stats = {
    totalProjects: projects.length,
    ownedProjects: projects.filter(p => p.isOwned).length,
    sharedProjects: projects.filter(p => p.isShared).length,
    totalCanvases: projects.reduce((sum, p) => sum + p.canvasCount, 0),
    hasProjects: projects.length > 0,
    isEmpty: !isLoading && projects.length === 0
  };

  return {
    // Core data
    projects: getFilteredProjects(),
    allProjects: projects, // Unfiltered for internal use
    isLoading,
    error,
    stats,
    
    // Search and filter state
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    filter,
    setFilter,
    
    // Actions
    createNewProject,
    createNewCanvas,
    refresh,
    findProjectCanvas,
    
    // Utils for future features
    lastFetchTime,
    isStale: lastFetchTime && (Date.now() - lastFetchTime > CACHE_DURATION),
    
    // Future extensibility hooks
    clearCache: () => cache.current.clear(),
    invalidateProject: (projectId) => cache.current.delete(`project_${projectId}`),
  };
};

export default useProjects;
