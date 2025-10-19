import { useEffect } from 'react';
import { auth } from '../services/firebase.js';
import { lockObject, unlockObject } from '../services/canvas.service.js';
import { ACTION_TYPES } from './useHistory.js';

/**
 * useCanvasKeyboard Hook
 * 
 * Manages all keyboard shortcuts and interactions for the canvas component.
 * Extracted from Canvas.jsx to reduce complexity and improve maintainability.
 */
export const useCanvasKeyboard = ({
  selectedTool,
  selectedObjectId,
  isTemporaryPan,
  toolBeforePan,
  canvasObjects,
  canEditObject,
  undo,
  redo,
  canUndo,
  canRedo,
  multiSelection,
  onToolChange,
  setIsTemporaryPan,
  setToolBeforePan,
  setSelectedObjectId,
  setMoveSelectedId,
  setResizeSelectedId,
  setRotateSelectedId,
  setTextSelectedId,
  setIsEditingText,
  setTextEditData,
  setLocalRectUpdates,
  setActiveObjects,
  panViewport,
  TOOLS
}) => {
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Spacebar - temporary pan (hold down)
      if (e.code === 'Space' && !isTemporaryPan) {
        e.preventDefault();
        setIsTemporaryPan(true);
        setToolBeforePan(selectedTool);
        onToolChange(TOOLS.PAN);
        return;
      }

      // Arrow keys - pan viewport
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        let direction;
        switch (e.key) {
          case 'ArrowUp':
            direction = 'up';
            break;
          case 'ArrowDown':
            direction = 'down';
            break;
          case 'ArrowLeft':
            direction = 'left';
            break;
          case 'ArrowRight':
            direction = 'right';
            break;
        }
        panViewport(direction, 50);
        return;
      }

      // Enter - edit text (if text is selected)
      if (e.key === 'Enter' && selectedObjectId) {
        const selectedObject = canvasObjects.find(obj => obj.id === selectedObjectId);
        if (selectedObject && selectedObject.type === 'text' && canEditObject(selectedObjectId)) {
          e.preventDefault();
          console.log('⌨️ Enter pressed: Editing text object', selectedObjectId);
          
          // Lock the text for editing (it should already be locked)
          lockObject(selectedObjectId).then(() => {
            console.log('✅ Text locked for editing');
            
            // Trigger text editing mode
            setTextSelectedId(selectedObjectId);
            setIsEditingText(true);
            setTextEditData({
              object: selectedObject,
              originalText: selectedObject.text || ''
            });
          }).catch(error => {
            console.error('Failed to lock text:', error);
          });
          return;
        }
      }

      // Delete/Backspace - delete selected objects (supports multi-selection)
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedObjectId || multiSelection.selectionInfo.count > 0)) {
        e.preventDefault();
        
        // Get objects to delete (use multi-selection if available, otherwise single selection)
        const objectsToDelete = multiSelection.selectionInfo.count > 0 
          ? multiSelection.selectionInfo.selectedIds
          : [selectedObjectId];
        
        const deletableObjects = objectsToDelete.filter(id => {
          const obj = canvasObjects.find(o => o.id === id);
          return obj && canEditObject(id);
        });
        
        if (deletableObjects.length === 0) {
          console.log('❌ Cannot delete - no editable objects selected');
          return;
        }

        const totalObjects = objectsToDelete.length;
        const lockedCount = totalObjects - deletableObjects.length;
        
        if (lockedCount > 0) {
          console.log(`⚠️ ${lockedCount} of ${totalObjects} objects cannot be deleted (locked by other users)`);
        }

        console.log('🗑️ Delete key pressed: Deleting', deletableObjects.length, 'objects');
        
        try {
          // Import batch delete function for better performance
          import('../services/canvas.service.js').then(async ({ batchDeleteObjects, deleteObject }) => {
            let result;
            
            // Use batch deletion for multiple objects (much faster)
            if (deletableObjects.length > 1) {
              console.log('🚀 Using batch deletion for', deletableObjects.length, 'objects');
              result = await batchDeleteObjects(deletableObjects);
              
              if (result.errors.length > 0) {
                console.warn('⚠️ Some objects failed to delete:', result.errors);
              }
              
              console.log(`✅ Batch deletion completed: ${result.deleted}/${deletableObjects.length} objects deleted`);
            } else {
              // Single object - use regular deletion
              try {
                await deleteObject(deletableObjects[0]);
                console.log('✅ Single object deleted successfully:', deletableObjects[0]);
              } catch (err) {
                console.error('❌ Failed to delete single object:', deletableObjects[0], err);
              }
            }
            
            // Clear all selection since objects no longer exist
            await multiSelection.clearSelection();
            setSelectedObjectId(null);
            setMoveSelectedId(null);
            setResizeSelectedId(null);
            setRotateSelectedId(null);
            setTextSelectedId(null);
          });
        } catch (error) {
          console.error('❌ Failed to import delete functions:', error);
        }
        return;
      }

      // Escape - clear all selection
      if (e.key === 'Escape' && (selectedObjectId || multiSelection.selectionInfo.count > 0)) {
        e.preventDefault();
        
        // Clear multi-selection first (this handles unlocking)
        await multiSelection.clearSelection();
        
        // Clear legacy single selection
        setSelectedObjectId(null);
        console.log('⌨️ Escape pressed: Cleared all selection');
        return;
      }

      // Undo/Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Ctrl+Z / Cmd+Z - Undo
        e.preventDefault();
        if (canUndo) {
          // Clear local updates and active objects before undo to ensure fresh state rendering
          setLocalRectUpdates({});
          setActiveObjects({});
          await undo(canvasObjects.reduce((acc, obj) => ({ ...acc, [obj.id]: obj }), {}));
          // Clear local updates after undo to ensure Firestore data is shown
          setLocalRectUpdates({});
        }
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        // Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z - Redo
        e.preventDefault();
        if (canRedo) {
          // Clear local updates and active objects before redo to ensure fresh state rendering
          setLocalRectUpdates({});
          setActiveObjects({});
          await redo(canvasObjects.reduce((acc, obj) => ({ ...acc, [obj.id]: obj }), {}));
          // Clear local updates after redo to ensure Firestore data is shown
          setLocalRectUpdates({});
        }
        return;
      }

      // Select All - Ctrl+A / Cmd+A
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        await multiSelection.selectAll(canvasObjects);
        
        // Update legacy selection state for compatibility
        const selection = multiSelection.selectionInfo;
        setSelectedObjectId(selection.isSingle ? selection.primaryId : null);
        console.log('⌨️ Select All: Selected', selection.count, 'objects (multi-selection active:', !selection.isSingle, ')');
        return;
      }

      // Tool shortcuts (only if not already pressed)
      if (!e.repeat) {
        switch (e.key.toLowerCase()) {
          case 'v':
            e.preventDefault();
            onToolChange(TOOLS.SELECT);
            break;
          case 'd':
            e.preventDefault();
            onToolChange(TOOLS.DELETE);
            break;
          case 'm':
            e.preventDefault();
            if (selectedObjectId) onToolChange(TOOLS.MOVE);
            break;
          case 'r':
            e.preventDefault();
            if (selectedObjectId) onToolChange(TOOLS.RESIZE);
            break;
          case 't':
            e.preventDefault();
            if (selectedObjectId) onToolChange(TOOLS.ROTATE);
            break;
          default:
            break;
        }
      }
    };

    const handleKeyUp = (e) => {
      // Spacebar release - return to previous tool
      if (e.code === 'Space' && isTemporaryPan && toolBeforePan) {
        e.preventDefault();
        setIsTemporaryPan(false);
        onToolChange(toolBeforePan);
        setToolBeforePan(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    selectedTool, 
    selectedObjectId, 
    isTemporaryPan, 
    toolBeforePan, 
    onToolChange, 
    canvasObjects, 
    canEditObject, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    multiSelection,
    setIsTemporaryPan,
    setToolBeforePan,
    setSelectedObjectId,
    setMoveSelectedId,
    setResizeSelectedId,
    setRotateSelectedId,
    setTextSelectedId,
    setIsEditingText,
    setTextEditData,
    setLocalRectUpdates,
    setActiveObjects,
    panViewport,
    TOOLS
  ]);
};
