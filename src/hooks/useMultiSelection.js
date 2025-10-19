import { useState, useCallback, useMemo } from 'react';

/**
 * useMultiSelection - Hook for managing multi-object selection state
 * 
 * Provides state and helpers for:
 * - Selecting multiple objects (Shift+click)
 * - Drag selection rectangle
 * - Batch operations on selected objects
 * - Visual distinction between single and multi-selection
 * 
 * Selection Rules:
 * - Single click = select one object (clear others)
 * - Shift+click = toggle object in selection
 * - Drag empty space = selection rectangle (contains mode)
 * - Escape or click empty = clear all selection
 * 
 * Integration with Ownership:
 * - Cannot select objects locked by other users
 * - Visual feedback for locked objects in selection attempts
 * - Batch operations respect individual object permissions
 */
export const useMultiSelection = () => {
  // Core state: Set of selected object IDs
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Drag selection state
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragStartPos, setDragStartPos] = useState(null);
  const [dragCurrentPos, setDragCurrentPos] = useState(null);

  /**
   * Select a single object (clear previous selection)
   */
  const selectSingle = useCallback((objectId) => {
    if (!objectId) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set([objectId]));
  }, []);

  /**
   * Toggle object in selection (for Shift+click)
   */
  const toggleSelection = useCallback((objectId) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(objectId)) {
        newSet.delete(objectId);
      } else {
        newSet.add(objectId);
      }
      return newSet;
    });
  }, []);

  /**
   * Add multiple objects to selection
   */
  const addToSelection = useCallback((objectIds) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      objectIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, []);

  /**
   * Remove objects from selection
   */
  const removeFromSelection = useCallback((objectIds) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      objectIds.forEach(id => newSet.delete(id));
      return newSet;
    });
  }, []);

  /**
   * Clear all selection
   */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  /**
   * Select all objects (filtered by ownership)
   */
  const selectAll = useCallback((allObjectIds) => {
    setSelectedIds(new Set(allObjectIds));
  }, []);

  /**
   * Start drag selection
   */
  const startDragSelection = useCallback((pos) => {
    setIsDragSelecting(true);
    setDragStartPos(pos);
    setDragCurrentPos(pos);
  }, []);

  /**
   * Update drag selection rectangle
   */
  const updateDragSelection = useCallback((pos) => {
    if (isDragSelecting) {
      setDragCurrentPos(pos);
    }
  }, [isDragSelecting]);

  /**
   * Complete drag selection and finalize selected objects
   */
  const endDragSelection = useCallback((selectedObjectIds) => {
    setIsDragSelecting(false);
    setDragStartPos(null);
    setDragCurrentPos(null);
    
    // Set the final selection based on what was in the rectangle
    if (selectedObjectIds && selectedObjectIds.length > 0) {
      setSelectedIds(new Set(selectedObjectIds));
    }
  }, []);

  /**
   * Cancel drag selection without changing selection
   */
  const cancelDragSelection = useCallback(() => {
    setIsDragSelecting(false);
    setDragStartPos(null);
    setDragCurrentPos(null);
  }, []);

  /**
   * Get selection rectangle bounds for rendering
   */
  const selectionRectangle = useMemo(() => {
    if (!isDragSelecting || !dragStartPos || !dragCurrentPos) {
      return null;
    }

    const x = Math.min(dragStartPos.x, dragCurrentPos.x);
    const y = Math.min(dragStartPos.y, dragCurrentPos.y);
    const width = Math.abs(dragCurrentPos.x - dragStartPos.x);
    const height = Math.abs(dragCurrentPos.y - dragStartPos.y);

    return { x, y, width, height };
  }, [isDragSelecting, dragStartPos, dragCurrentPos]);

  /**
   * Check if object is in selection rectangle (contains mode)
   * Object must be completely within rectangle to be selected
   */
  const isObjectInSelectionRect = useCallback((object, rect) => {
    if (!rect) return false;

    // Get object bounds based on type
    let objX, objY, objWidth, objHeight;

    if (object.type === 'circle') {
      const radius = object.radius || 50;
      objX = object.x - radius;
      objY = object.y - radius;
      objWidth = radius * 2;
      objHeight = radius * 2;
    } else if (object.type === 'star') {
      const outerRadius = object.outerRadius || 50;
      objX = object.x - outerRadius;
      objY = object.y - outerRadius;
      objWidth = outerRadius * 2;
      objHeight = outerRadius * 2;
    } else {
      // Rectangle, text, and other shapes
      objX = object.x;
      objY = object.y;
      objWidth = object.width || 100;
      objHeight = object.height || 50;
    }

    // Contains mode: object must be completely within selection rectangle
    const objectLeft = objX;
    const objectRight = objX + objWidth;
    const objectTop = objY;
    const objectBottom = objY + objHeight;

    const rectLeft = rect.x;
    const rectRight = rect.x + rect.width;
    const rectTop = rect.y;
    const rectBottom = rect.y + rect.height;

    return (
      objectLeft >= rectLeft &&
      objectRight <= rectRight &&
      objectTop >= rectTop &&
      objectBottom <= rectBottom
    );
  }, []);

  /**
   * Check if an object is selected
   */
  const isSelected = useCallback((objectId) => {
    return selectedIds.has(objectId);
  }, [selectedIds]);

  /**
   * Get count of selected objects
   */
  const selectedCount = useMemo(() => {
    return selectedIds.size;
  }, [selectedIds]);

  /**
   * Check if single object is selected
   */
  const hasSingleSelection = useMemo(() => {
    return selectedIds.size === 1;
  }, [selectedIds]);

  /**
   * Check if multiple objects are selected
   */
  const hasMultiSelection = useMemo(() => {
    return selectedIds.size > 1;
  }, [selectedIds]);

  /**
   * Get array of selected IDs
   */
  const selectedIdsArray = useMemo(() => {
    return Array.from(selectedIds);
  }, [selectedIds]);

  /**
   * Get the single selected ID (if only one selected)
   */
  const singleSelectedId = useMemo(() => {
    return hasSingleSelection ? Array.from(selectedIds)[0] : null;
  }, [hasSingleSelection, selectedIds]);

  return {
    // State
    selectedIds,
    selectedIdsArray,
    selectedCount,
    hasSingleSelection,
    hasMultiSelection,
    singleSelectedId,
    isDragSelecting,
    selectionRectangle,

    // Selection actions
    selectSingle,
    toggleSelection,
    addToSelection,
    removeFromSelection,
    clearSelection,
    selectAll,
    isSelected,

    // Drag selection actions
    startDragSelection,
    updateDragSelection,
    endDragSelection,
    cancelDragSelection,
    isObjectInSelectionRect,
  };
};

export default useMultiSelection;

