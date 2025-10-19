import { useState, useCallback, useEffect } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, INITIAL_ZOOM } from '../constants/canvas.constants.js';

/**
 * useCanvasViewport Hook
 * 
 * Manages canvas viewport state including position, scale, and initialization.
 * Extracted from Canvas.jsx to reduce complexity and improve maintainability.
 */
export const useCanvasViewport = (stageRef, onZoomUpdate) => {
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);

  // Calculate initial view to center the canvas and fit it in viewport
  const initializeView = useCallback(() => {
    if (stageRef.current) {
      const stage = stageRef.current;
      const container = stage.container();
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      
      // Calculate zoom to fit the entire canvas with some padding
      const scaleX = (containerWidth * 0.8) / CANVAS_WIDTH;
      const scaleY = (containerHeight * 0.8) / CANVAS_HEIGHT;
      const scale = Math.min(scaleX, scaleY, INITIAL_ZOOM);
      
      // Center the canvas in the viewport
      const x = (containerWidth - CANVAS_WIDTH * scale) / 2;
      const y = (containerHeight - CANVAS_HEIGHT * scale) / 2;
      
      setStageScale(scale);
      setStagePos({ x, y });
      
      stage.scale({ x: scale, y: scale });
      stage.position({ x, y });
    }
  }, []);

  // Initialize view on component mount and handle window resize
  useEffect(() => {
    initializeView();
    
    // Re-initialize on window resize
    const handleResize = () => {
      setTimeout(initializeView, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initializeView]);
  
  // Notify zoom level changes
  useEffect(() => {
    if (onZoomUpdate) {
      onZoomUpdate(stageScale);
    }
  }, [stageScale, onZoomUpdate]);

  // Handle zoom functionality
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    const mousePointTo = {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY(),
    };

    // Zoom sensitivity
    const scaleBy = 1.02;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const oldScale = stage.scaleX();
    const newScale = Math.max(0.1, Math.min(oldScale * Math.pow(scaleBy, direction), 5));

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    stage.position(newPos);
    setStageScale(newScale);
    setStagePos(newPos);
    
    // Update zoom level for toolbar
    if (onZoomUpdate) {
      onZoomUpdate(newScale);
    }
  }, [onZoomUpdate]);

  // Pan viewport with arrow keys
  const panViewport = useCallback((direction, distance = 50) => {
    setStagePos(prev => {
      const newPos = { ...prev };
      
      switch (direction) {
        case 'up':
          newPos.y += distance;
          break;
        case 'down':
          newPos.y -= distance;
          break;
        case 'left':
          newPos.x += distance;
          break;
        case 'right':
          newPos.x -= distance;
          break;
        default:
          return prev;
      }
      
      // Update stage position
      if (stageRef.current) {
        const stage = stageRef.current;
        stage.position(newPos);
      }
      
      return newPos;
    });
  }, []);

  return {
    stagePos,
    setStagePos,
    stageScale,
    setStageScale,
    initializeView,
    handleWheel,
    panViewport
  };
};
