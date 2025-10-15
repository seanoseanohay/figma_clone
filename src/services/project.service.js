import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from './firebase.js';

/**
 * Project Service
 * Handles all project-related operations including creation, management, and access control
 */

// Collection references
const projectsCollection = collection(db, 'projects');

/**
 * Creates a new project
 * @param {string} name - Project name
 * @param {string} ownerId - User ID of project owner
 * @param {boolean} isSharedProject - Whether this is a shared project
 * @param {string} originalProjectId - ID of original project if this is a shared copy
 * @returns {Object} - Result object with success status and project data
 */
export const createProject = async (name, ownerId, isSharedProject = false, originalProjectId = null) => {
  try {
    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return { success: false, error: 'Project name is required' };
    }
    
    if (!ownerId || typeof ownerId !== 'string') {
      return { success: false, error: 'Owner ID is required' };
    }

    // Sanitize project name
    const sanitizedName = name.trim().substring(0, 100); // Limit length

    const projectData = {
      name: sanitizedName,
      ownerId,
      collaborators: [], // Array of user IDs
      isSharedProject: Boolean(isSharedProject),
      originalProjectId: originalProjectId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(projectsCollection, projectData);
    
    return { 
      success: true, 
      projectId: docRef.id, 
      project: { id: docRef.id, ...projectData }
    };
  } catch (error) {
    console.error('Error creating project:', error);
    return { success: false, error: 'Failed to create project' };
  }
};

/**
 * Gets all projects accessible to a user (owned or collaborated)
 * @param {string} userId - User ID
 * @returns {Object} - Result object with success status and projects array
 */
export const getProjectsForUser = async (userId) => {
  try {
    if (!userId || typeof userId !== 'string') {
      return { success: false, error: 'User ID is required' };
    }

    // Get projects owned by user
    const ownedQuery = query(
      projectsCollection,
      where('ownerId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    // Get projects where user is collaborator
    const collaboratorQuery = query(
      projectsCollection,
      where('collaborators', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    const [ownedSnapshot, collaboratorSnapshot] = await Promise.all([
      getDocs(ownedQuery),
      getDocs(collaboratorQuery)
    ]);

    const projects = [];
    const projectIds = new Set(); // Prevent duplicates

    // Add owned projects
    ownedSnapshot.forEach((doc) => {
      const project = { id: doc.id, ...doc.data() };
      projects.push(project);
      projectIds.add(doc.id);
    });

    // Add collaborator projects (avoiding duplicates)
    collaboratorSnapshot.forEach((doc) => {
      if (!projectIds.has(doc.id)) {
        const project = { id: doc.id, ...doc.data() };
        projects.push(project);
      }
    });

    // Sort by updatedAt (most recent first)
    projects.sort((a, b) => {
      const aTime = a.updatedAt?.toDate?.() || new Date(0);
      const bTime = b.updatedAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });

    return { success: true, projects };
  } catch (error) {
    console.error('Error getting projects for user:', error);
    return { success: false, error: 'Failed to fetch projects' };
  }
};

/**
 * Gets a single project by ID
 * @param {string} projectId - Project ID
 * @returns {Object} - Result object with success status and project data
 */
export const getProject = async (projectId) => {
  try {
    if (!projectId || typeof projectId !== 'string') {
      return { success: false, error: 'Project ID is required' };
    }

    const docRef = doc(db, 'projects', projectId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Project not found' };
    }

    const project = { id: docSnap.id, ...docSnap.data() };
    return { success: true, project };
  } catch (error) {
    console.error('Error getting project:', error);
    return { success: false, error: 'Failed to fetch project' };
  }
};

/**
 * Adds a collaborator to a project
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID to add as collaborator
 * @param {string} requestingUserId - ID of user making the request (must be owner)
 * @returns {Object} - Result object with success status
 */
export const addCollaborator = async (projectId, userId, requestingUserId) => {
  try {
    if (!projectId || !userId || !requestingUserId) {
      return { success: false, error: 'Project ID, user ID, and requesting user ID are required' };
    }

    // Check if requesting user is project owner
    const hasPermission = await canUserManageProject(projectId, requestingUserId);
    if (!hasPermission.success || !hasPermission.canManage) {
      return { success: false, error: 'Only project owners can add collaborators' };
    }

    // Check if user is already a collaborator
    const isCollaborator = await isProjectCollaborator(projectId, userId);
    if (isCollaborator.success && isCollaborator.isCollaborator) {
      return { success: false, error: 'User is already a collaborator' };
    }

    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      collaborators: arrayUnion(userId),
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding collaborator:', error);
    return { success: false, error: 'Failed to add collaborator' };
  }
};

/**
 * Removes a collaborator from a project
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID to remove
 * @param {string} requestingUserId - ID of user making the request (must be owner)
 * @returns {Object} - Result object with success status
 */
export const removeCollaborator = async (projectId, userId, requestingUserId) => {
  try {
    if (!projectId || !userId || !requestingUserId) {
      return { success: false, error: 'Project ID, user ID, and requesting user ID are required' };
    }

    // Check if requesting user is project owner
    const hasPermission = await canUserManageProject(projectId, requestingUserId);
    if (!hasPermission.success || !hasPermission.canManage) {
      return { success: false, error: 'Only project owners can remove collaborators' };
    }

    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      collaborators: arrayRemove(userId),
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing collaborator:', error);
    return { success: false, error: 'Failed to remove collaborator' };
  }
};

/**
 * Updates project details
 * @param {string} projectId - Project ID
 * @param {Object} updates - Object containing fields to update
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Object} - Result object with success status
 */
export const updateProject = async (projectId, updates, requestingUserId) => {
  try {
    if (!projectId || !requestingUserId) {
      return { success: false, error: 'Project ID and requesting user ID are required' };
    }

    // Check permissions
    const hasPermission = await canUserManageProject(projectId, requestingUserId);
    if (!hasPermission.success || !hasPermission.canManage) {
      return { success: false, error: 'Only project owners can update project details' };
    }

    // Sanitize updates (only allow certain fields)
    const allowedFields = ['name'];
    const sanitizedUpdates = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'name' && value) {
          sanitizedUpdates.name = String(value).trim().substring(0, 100);
        }
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return { success: false, error: 'No valid fields to update' };
    }

    sanitizedUpdates.updatedAt = serverTimestamp();

    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, sanitizedUpdates);

    return { success: true };
  } catch (error) {
    console.error('Error updating project:', error);
    return { success: false, error: 'Failed to update project' };
  }
};

/**
 * Deletes a project (owner only)
 * @param {string} projectId - Project ID
 * @param {string} requestingUserId - ID of user making the request (must be owner)
 * @returns {Object} - Result object with success status
 */
export const deleteProject = async (projectId, requestingUserId) => {
  try {
    if (!projectId || !requestingUserId) {
      return { success: false, error: 'Project ID and requesting user ID are required' };
    }

    // Check if requesting user is project owner
    const hasPermission = await canUserManageProject(projectId, requestingUserId);
    if (!hasPermission.success || !hasPermission.canManage) {
      return { success: false, error: 'Only project owners can delete projects' };
    }

    const projectRef = doc(db, 'projects', projectId);
    await deleteDoc(projectRef);

    return { success: true };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, error: 'Failed to delete project' };
  }
};

// Permission Helper Functions

/**
 * Checks if a user can access a project (owner or collaborator)
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID
 * @returns {Object} - Result object with success status and access info
 */
export const canUserAccessProject = async (projectId, userId) => {
  try {
    if (!projectId || !userId) {
      return { success: false, error: 'Project ID and user ID are required' };
    }

    const projectResult = await getProject(projectId);
    if (!projectResult.success) {
      return projectResult;
    }

    const project = projectResult.project;
    const canAccess = project.ownerId === userId || project.collaborators.includes(userId);

    return { 
      success: true, 
      canAccess,
      isOwner: project.ownerId === userId,
      isCollaborator: project.collaborators.includes(userId)
    };
  } catch (error) {
    console.error('Error checking project access:', error);
    return { success: false, error: 'Failed to check project access' };
  }
};

/**
 * Checks if a user can manage a project (owner only)
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID
 * @returns {Object} - Result object with success status and management rights
 */
export const canUserManageProject = async (projectId, userId) => {
  try {
    if (!projectId || !userId) {
      return { success: false, error: 'Project ID and user ID are required' };
    }

    const projectResult = await getProject(projectId);
    if (!projectResult.success) {
      return projectResult;
    }

    const project = projectResult.project;
    const canManage = project.ownerId === userId;

    return { success: true, canManage };
  } catch (error) {
    console.error('Error checking project management rights:', error);
    return { success: false, error: 'Failed to check project management rights' };
  }
};

/**
 * Checks if a user is a collaborator on a project
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID
 * @returns {Object} - Result object with success status and collaborator status
 */
export const isProjectCollaborator = async (projectId, userId) => {
  try {
    if (!projectId || !userId) {
      return { success: false, error: 'Project ID and user ID are required' };
    }

    const projectResult = await getProject(projectId);
    if (!projectResult.success) {
      return projectResult;
    }

    const project = projectResult.project;
    const isCollaborator = project.collaborators.includes(userId);

    return { success: true, isCollaborator };
  } catch (error) {
    console.error('Error checking collaborator status:', error);
    return { success: false, error: 'Failed to check collaborator status' };
  }
};
