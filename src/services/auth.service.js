import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase.js';
import { FIREBASE_COLLECTIONS } from '../constants/canvas.constants.js';

/**
 * Authentication Service
 * Handles all Firebase authentication operations
 */

// Sign up with email and password
export const signUpWithEmail = async (email, password, displayName = null) => {
  try {
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Set display name (defaults to email if not provided)
    const name = displayName || email.split('@')[0];
    
    // Update user profile
    await updateProfile(user, {
      displayName: name
    });

    // Create user document in Firestore
    await createUserDocument(user, { displayName: name });

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: name,
        photoURL: user.photoURL
      }
    };
  } catch (error) {
    console.error('Error signing up with email:', error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code)
    };
  }
};

// Sign in with email and password
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update lastSeen timestamp
    await updateUserLastSeen(user.uid);

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || email.split('@')[0],
        photoURL: user.photoURL
      }
    };
  } catch (error) {
    console.error('Error signing in with email:', error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code)
    };
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    // Try popup first, fallback to redirect if blocked
    const userCredential = await signInWithPopup(auth, googleProvider);
    const user = userCredential.user;

    // Create or update user document
    await createUserDocument(user);

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      }
    };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    
    // If popup is blocked, try redirect method
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      try {
        await signInWithRedirect(auth, googleProvider);
        return { success: true, redirect: true };
      } catch (redirectError) {
        console.error('Redirect also failed:', redirectError);
        return {
          success: false,
          error: getAuthErrorMessage(redirectError.code)
        };
      }
    }
    
    return {
      success: false,
      error: getAuthErrorMessage(error.code)
    };
  }
};

// Handle redirect result after Google sign-in redirect
export const handleGoogleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const user = result.user;
      // Create or update user document
      await createUserDocument(user);
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      };
    }
    return { success: true, noResult: true };
  } catch (error) {
    console.error('Error handling redirect result:', error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code)
    };
  }
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return {
      success: false,
      error: 'Failed to sign out. Please try again.'
    };
  }
};

// Listen to auth state changes
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Create or update user document in Firestore
const createUserDocument = async (user, additionalData = {}) => {
  const userDocRef = doc(db, FIREBASE_COLLECTIONS.USERS, user.uid);
  
  try {
    // Check if user document already exists
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      // Create new user document
      const userData = {
        uid: user.uid,
        displayName: additionalData.displayName || user.displayName || user.email?.split('@')[0] || 'Anonymous',
        email: user.email,
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        ...additionalData
      };
      
      await setDoc(userDocRef, userData);
      console.log('User document created successfully');
      
      // Process any pending invites for this user
      if (user.email) {
        await processPendingInvites(user.email, user.uid);
      }
    } else {
      // Update existing user's lastSeen
      await updateUserLastSeen(user.uid);
      
      // Process pending invites on every login
      if (user.email) {
        await processPendingInvites(user.email, user.uid);
      }
    }
  } catch (error) {
    console.error('Error creating/updating user document:', error);
    throw error;
  }
};

// Update user's last seen timestamp
const updateUserLastSeen = async (userId) => {
  try {
    const userDocRef = doc(db, FIREBASE_COLLECTIONS.USERS, userId);
    await setDoc(userDocRef, {
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating lastSeen:', error);
  }
};

// Process pending invites for a user
export const processPendingInvites = async (userEmail, userId) => {
  try {
    if (!userEmail || !userId) {
      console.error('Email and user ID required to process pending invites');
      return;
    }

    // Query for pending invites matching the user's email
    const invitesQuery = query(
      collection(db, 'pendingInvites'),
      where('inviteeEmail', '==', userEmail.toLowerCase())
    );

    const invitesSnapshot = await getDocs(invitesQuery);

    if (invitesSnapshot.empty) {
      console.log('No pending invites found for:', userEmail);
      return;
    }

    console.log('Processing', invitesSnapshot.size, 'pending invites for:', userEmail);

    // Process each invite
    const processPromises = [];

    invitesSnapshot.forEach((inviteDoc) => {
      const invite = inviteDoc.data();
      
      // Add user to canvas collaborators
      const canvasRef = doc(db, 'canvases', invite.canvasId);
      const canvasPromise = updateDoc(canvasRef, {
        collaborators: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });
      processPromises.push(canvasPromise);

      // Add user to project collaborators (projectId = canvasId)
      const projectRef = doc(db, 'projects', invite.canvasId);
      const projectPromise = updateDoc(projectRef, {
        collaborators: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });
      processPromises.push(projectPromise);

      // Delete the processed invite
      processPromises.push(deleteDoc(inviteDoc.ref));
    });

    await Promise.all(processPromises);

    console.log('Successfully processed pending invites for:', userEmail);
  } catch (error) {
    if (error.code === 'permission-denied' || error.message?.includes('permission')) {
      // Silently handle permissions errors - pending invites feature requires Firestore rules to be configured
      console.log('Pending invites feature not available (Firestore rules not configured)');
    } else {
      console.error('Error processing pending invites:', error);
    }
  }
};

// Get user-friendly error messages
const getAuthErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled. Please contact support.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups and try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/cors-unsupported':
      return 'Your browser is blocking the authentication popup. Please try the hidden login form (Ctrl+Shift+L).';
    case 'auth/web-storage-unsupported':
      return 'Your browser does not support authentication. Please enable cookies and try again.';
    case 'auth/operation-not-supported-in-this-environment':
      return 'This authentication method is not supported in your current browser environment.';
    default:
      return 'An error occurred during authentication. Please try again.';
  }
};
