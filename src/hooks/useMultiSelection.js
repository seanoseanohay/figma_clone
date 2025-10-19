import { useState, useCallback, useRef, useMemo } from 'react';
import { lockObject, unlockObject, batchLockObjects, batchUnlockObjects } from '../services/canvas.service.js';

/**
 * useMultiSelection - Hook for managing multi-object selection state
 * 
 * Provides unified selection management for single and multi-selection scenarios.
 * Handles ownership checks, locking/unlocking, and state synchronization.
 * 
 * Selection Rules:
 * - Cannot select objects owned/locked by other users
 * - Drag selection uses "contains" rule (object must be completely within selection rectangle)
 * - Shift+click toggles individual object selection state
 * - Single click on object deselects all others and selects clicked object
 * - Click empty space or Escape clears all selection
 * 
 * Visual States:
 * - Single selection: Blue border (#3B82F6)
 * - Multi-selection: Purple border (#8B5CF6)
 * - Locked objects: Red border with tooltip
 */
export function useMultiSelection(canEditObject) {
  // Core selection state
  const [selectedObjectIds, setSelectedObjectIds] = useState(new Set());
  const [isSelecting, setIsSelecting] = useState(false); // Drag selection active
  const [dragStart, setDragStart] = useState(null); // { x, y } - raw start coordinates
  const [dragCurrent, setDragCurrent] = useState(null); // { x, y } - raw current coordinates
  const [previewSelectedIds, setPreviewSelectedIds] = useState(new Set()); // Real-time preview during drag
  
  // Track locked objects to manage unlocking
  const lockedObjectIds = useRef(new Set());
  
  // Calculate selection rectangle dynamically from raw coordinates
  const selectionRect = useMemo(() => {
    if (!isSelecting || !dragStart || !dragCurrent) {
      return null;
    }
    
    const left = Math.min(dragStart.x, dragCurrent.x);
    const top = Math.min(dragStart.y, dragCurrent.y);
    const width = Math.abs(dragCurrent.x - dragStart.x);
    const height = Math.abs(dragCurrent.y - dragStart.y);
    
    return { x: left, y: top, width, height };
  }, [isSelecting, dragStart, dragCurrent]);
  
  /**
   * Check if object can be selected (not locked by another user)
   */
  const canSelectObject = useCallback((objectId) => {
    return canEditObject ? canEditObject(objectId) : true;
  }, [canEditObject]);
  
  /**
   * Get selection state info - memoized to prevent infinite re-renders
   */
  const selectionInfo = useMemo(() => {
    const count = selectedObjectIds.size;
    const isSingle = count === 1;
    const isMulti = count > 1;
    const isEmpty = count === 0;
    const selectedArray = Array.from(selectedObjectIds);
    
    return {
      count,
      isSingle,
      isMulti,
      isEmpty,
      selectedIds: selectedArray,
      primaryId: selectedArray[0] || null, // First selected object for single-object operations
      has: (id) => selectedObjectIds.has(id),
      all: selectedObjectIds
    };
  }, [selectedObjectIds]);
  
  /**
   * Lock objects for editing (prevent other users from modifying) - OPTIMIZED with batched transactions
   */
  const lockSelectedObjects = useCallback(async (objectIds) => {
    const idsToLock = Array.isArray(objectIds) ? objectIds : [objectIds];
    const validIds = idsToLock.filter(id => canSelectObject(id));
    
    if (validIds.length === 0) return;
    
    try {
      // Use batched operations for performance - reduces N database writes to 1 transaction
      if (validIds.length === 1) {
        await lockObject(validIds[0]);
        console.log('🔒 Locked object for selection:', validIds[0]);
      } else {
        await batchLockObjects(validIds);
        // batchLockObjects already logs the operation
      }
      
      // Update local state once after all operations complete
      validIds.forEach(id => {
        lockedObjectIds.current.add(id);
      });
    } catch (error) {
      console.error('Failed to lock objects:', validIds, error);
      // On partial failure, still add successful locks to local state
      // The lockObject function should handle individual failures gracefully
    }
  }, [canSelectObject]);
  
  /**
   * Unlock objects (release ownership) - OPTIMIZED with batched transactions
   */
  const unlockSelectedObjects = useCallback(async (objectIds = null) => {
    const idsToUnlock = objectIds || Array.from(lockedObjectIds.current);
    const validIds = idsToUnlock.filter(id => lockedObjectIds.current.has(id));
    
    if (validIds.length === 0) return;
    
    try {
      // Use batched operations for performance - reduces N database writes to 1 transaction
      if (validIds.length === 1) {
        await unlockObject(validIds[0]);
        console.log('🔓 Unlocked object:', validIds[0]);
      } else {
        await batchUnlockObjects(validIds);
        // batchUnlockObjects already logs the operation
      }
      
      // Update local state once after all operations complete
      validIds.forEach(id => {
        lockedObjectIds.current.delete(id);
      });
    } catch (error) {
      console.error('Failed to unlock objects:', validIds, error);
      // On failure, still try to clean up local state
      validIds.forEach(id => {
        lockedObjectIds.current.delete(id);
      });
    }
  }, []);
  
  /**
   * Select single object (deselects all others)
   */
  const selectSingle = useCallback(async (objectId) => {
    if (!canSelectObject(objectId)) {
      console.log('Cannot select object - locked by another user:', objectId);
      return false;
    }
    
    // Unlock previously selected objects
    await unlockSelectedObjects();
    
    // Lock and select new object
    await lockSelectedObjects([objectId]);
    setSelectedObjectIds(new Set([objectId]));
    
    console.log('✅ Single selection:', objectId);
    return true;
  }, [canSelectObject, unlockSelectedObjects, lockSelectedObjects]);
  
  /**
   * Add object to selection (multi-select)
   */
  const addToSelection = useCallback(async (objectId) => {
    if (!canSelectObject(objectId)) {
      console.log('Cannot add to selection - object locked:', objectId);
      return false;
    }
    
    if (selectedObjectIds.has(objectId)) {
      return true; // Already selected
    }
    
    // Lock object for multi-selection
    await lockSelectedObjects([objectId]);
    
    setSelectedObjectIds(prev => new Set([...prev, objectId]));
    console.log('➕ Added to selection:', objectId);
    return true;
  }, [canSelectObject, selectedObjectIds, lockSelectedObjects]);
  
  /**
   * Remove object from selection
   */
  const removeFromSelection = useCallback(async (objectId) => {
    if (!selectedObjectIds.has(objectId)) {
      return; // Not selected
    }
    
    // Unlock object
    await unlockSelectedObjects([objectId]);
    
    setSelectedObjectIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(objectId);
      return newSet;
    });
    console.log('➖ Removed from selection:', objectId);
  }, [selectedObjectIds, unlockSelectedObjects]);
  
  /**
   * Toggle object selection state (Shift+click behavior)
   */
  const toggleSelection = useCallback(async (objectId) => {
    if (selectedObjectIds.has(objectId)) {
      await removeFromSelection(objectId);
    } else {
      await addToSelection(objectId);
    }
  }, [selectedObjectIds, removeFromSelection, addToSelection]);
  
  /**
   * Select multiple objects (from drag selection or programmatic)
   */
  const selectMultiple = useCallback(async (objectIds) => {
    // Filter out objects that can't be selected
    const selectableIds = objectIds.filter(canSelectObject);
    
    if (selectableIds.length === 0) {
      return;
    }
    
    // Unlock all previously selected
    await unlockSelectedObjects();
    
    // Lock all new objects
    await lockSelectedObjects(selectableIds);
    
    setSelectedObjectIds(new Set(selectableIds));
    console.log('🎯 Multi-selection:', selectableIds.length, 'objects');
  }, [canSelectObject, unlockSelectedObjects, lockSelectedObjects]);
  
  // Debounce rapid selection changes to prevent database churn
  const clearSelectionTimeout = useRef(null);
  
  /**
   * Clear all selection - debounced to prevent rapid clear/select cycles
   */
  const clearSelection = useCallback(async () => {
    if (selectedObjectIds.size === 0) {
      return;
    }
    
    // Clear any pending debounced clear
    if (clearSelectionTimeout.current) {
      clearTimeout(clearSelectionTimeout.current);
      clearSelectionTimeout.current = null;
    }
    
    // Unlock all selected objects
    await unlockSelectedObjects();
    
    setSelectedObjectIds(new Set());
    console.log('🧹 Cleared selection');
  }, [selectedObjectIds.size, unlockSelectedObjects]);
  
  /**
   * Start drag selection (selection rectangle)
   */
  const startDragSelection = useCallback((startPos) => {
    setIsSelecting(true);
    setDragStart({ x: startPos.x, y: startPos.y });
    setDragCurrent({ x: startPos.x, y: startPos.y });
    setPreviewSelectedIds(new Set());
  }, []);
  
  /**
   * Update drag selection rectangle and preview
   * Fixed to work correctly in all drag directions
   */
  const updateDragSelection = useCallback((currentPos, objectsInRect) => {
    if (!isSelecting || !dragStart) {
      return;
    }
    
    // Update current drag position - this will trigger selectionRect recalculation
    setDragCurrent({ x: currentPos.x, y: currentPos.y });
    
    // Update preview selection (only selectable objects)
    const selectableObjects = (objectsInRect || []).filter(obj => canSelectObject(obj.id));
    const previewIds = new Set(selectableObjects.map(obj => obj.id));
    setPreviewSelectedIds(previewIds);
  }, [isSelecting, dragStart, canSelectObject]);
  
  /**
   * Complete drag selection
   */
  const completeDragSelection = useCallback(async (shouldAddToExisting = false) => {
    if (!isSelecting) return;
    
    const objectsToSelect = Array.from(previewSelectedIds);
    
    if (shouldAddToExisting && selectedObjectIds.size > 0) {
      // Add to existing selection
      for (const objectId of objectsToSelect) {
        await addToSelection(objectId);
      }
    } else {
      // Replace selection
      await selectMultiple(objectsToSelect);
    }
    
    // Clean up drag state
    setIsSelecting(false);
    setDragStart(null);
    setDragCurrent(null);
    setPreviewSelectedIds(new Set());
    
    // Completed drag selection successfully
  }, [isSelecting, previewSelectedIds, selectedObjectIds.size, addToSelection, selectMultiple]);
  
  /**
   * Cancel drag selection
   */
  const cancelDragSelection = useCallback(() => {
    setIsSelecting(false);
    setDragStart(null);
    setDragCurrent(null);
    setPreviewSelectedIds(new Set());
    // Cancelled drag selection
  }, []);
  
  /**
   * Select all objects on canvas
   */
  const selectAll = useCallback(async (allObjects) => {
    const selectableObjects = allObjects.filter(obj => canSelectObject(obj.id));
    await selectMultiple(selectableObjects.map(obj => obj.id));
    console.log('🎯 Selected all objects:', selectableObjects.length);
  }, [canSelectObject, selectMultiple]);
  
  // Return API
  return {
    // State
    selectedObjectIds,
    isSelecting,
    selectionRect,
    previewSelectedIds,
    selectionInfo, // Now returns the memoized object directly
    
    // Single selection actions
    selectSingle,
    addToSelection,
    removeFromSelection,
    toggleSelection,
    
    // Multi-selection actions
    selectMultiple,
    clearSelection,
    selectAll,
    
    // Drag selection
    startDragSelection,
    updateDragSelection,
    completeDragSelection,
    cancelDragSelection,
    
    // Utilities
    canSelectObject,
    unlockSelectedObjects
  };
}

export default useMultiSelection;
