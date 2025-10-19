import { toast } from 'react-toastify';

/**
 * Dinosaur-themed toast notification utilities
 * Use these for consistent, fun messaging throughout the app
 */

export const showSuccess = (message = 'RAWR-some!') => {
  toast.success(message);
};

export const showError = (message) => {
  toast.error(message);
};

export const showInfo = (message) => {
  toast.info(message);
};

export const showWarning = (message) => {
  toast.warning(message);
};

/**
 * Pre-defined dinosaur-themed success messages
 */
export const DinoMessages = {
  SUCCESS: 'RAWR-some!',
  SAVED: 'RAWR-some! Changes saved!',
  CREATED: 'RAWR-some! Created successfully!',
  DELETED: 'Gone extinct! Deleted successfully.',
  COPIED: 'RAWR-some! Copied to clipboard!',
  INVITED: 'RAWR-some! Invitation sent!',
  ADDED: 'RAWR-some! Added successfully!',
  UPDATED: 'RAWR-some! Updated successfully!',
  TOKEN_GENERATED: 'RAWR-some! Token generated!',
  TOKEN_REVOKED: 'Token sent to extinction!',
};

/**
 * Quick access functions for common actions
 */
export const showRAWRsome = () => showSuccess(DinoMessages.SUCCESS);
export const showSaved = () => showSuccess(DinoMessages.SAVED);
export const showCreated = () => showSuccess(DinoMessages.CREATED);
export const showDeleted = () => showSuccess(DinoMessages.DELETED);
export const showCopied = () => showSuccess(DinoMessages.COPIED);
export const showInvited = () => showSuccess(DinoMessages.INVITED);
export const showAdded = () => showSuccess(DinoMessages.ADDED);
export const showUpdated = () => showSuccess(DinoMessages.UPDATED);

