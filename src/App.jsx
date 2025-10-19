import { useState, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './components/auth/AuthProvider.jsx';
import { CanvasProvider } from './contexts/CanvasContext.jsx';
import LoginForm from './components/auth/LoginForm.jsx';
import RegisterForm from './components/auth/RegisterForm.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import Header from './components/layout/Header.jsx';
import Toolbar, { TOOLS } from './components/canvas/Toolbar.jsx';
import Canvas from './components/canvas/Canvas.jsx';
import NotFound from './components/common/NotFound.jsx';
import { CANVAS_TOP_OFFSET, HEADER_HEIGHT, Z_INDEX } from './constants/layout.constants.js';

// TEMPORARY: Set to true to bypass authentication and go directly to canvas
// This should match the BYPASS_AUTH flag in AuthProvider.jsx
const BYPASS_AUTH = false;

// Layout wrapper for all logged-in pages with persistent header and toolbar
const LoggedInLayout = ({ children }) => {
  const [selectedTool, setSelectedTool] = useState(TOOLS.PAN);
  const [hasSelection, setHasSelection] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [multiSelectionCount, setMultiSelectionCount] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedColor, setSelectedColor] = useState('#808080');
  const zIndexHandlerRef = useRef(null);
  const userColorChangeRef = useRef(null);

  const handleToolChange = (tool) => {
    setSelectedTool(tool);
  };

  const handleSelectionChange = (selected, count = 0) => {
    setHasSelection(!!selected);
    setMultiSelectionCount(count);
  };

  const handleObjectUpdate = (objectData) => {
    setSelectedObject(objectData);
    if (objectData && objectData.fill) {
      setSelectedColor(objectData.fill);
    }
  };

  const handleCursorUpdate = (position) => {
    setCursorPosition(position);
  };

  const handleZoomUpdate = (zoom) => {
    setZoomLevel(zoom * 100);
  };

  const handleColorChange = (newColor) => {
    setSelectedColor(newColor);
    if (userColorChangeRef.current && hasSelection) {
      userColorChangeRef.current(newColor);
    }
  };

  const handleZIndexChange = useCallback((action) => {
    if (zIndexHandlerRef.current) {
      zIndexHandlerRef.current(action);
    }
  }, []);

  const rotationHandlerRef = useRef(null);
  
  const handleRotationChange = useCallback((newRotation) => {
    if (rotationHandlerRef.current) {
      rotationHandlerRef.current(newRotation);
    }
  }, []);

  // Undo/Redo handlers - populated by Canvas component
  const undoHandlerRef = useRef(null);
  const redoHandlerRef = useRef(null);
  const canUndoRef = useRef(false);
  const canRedoRef = useRef(false);
  const undoDescriptionRef = useRef(null);
  const redoDescriptionRef = useRef(null);
  
  // State variables for undo/redo UI (these trigger re-renders)
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoDescription, setUndoDescription] = useState(null);
  const [redoDescription, setRedoDescription] = useState(null);
  
  const handleUndo = useCallback(async () => {
    if (undoHandlerRef.current) {
      await undoHandlerRef.current();
    }
  }, []);
  
  const handleRedo = useCallback(async () => {
    if (redoHandlerRef.current) {
      await redoHandlerRef.current();
    }
  }, []);
  
  // Callback functions for Canvas to update undo/redo state
  const updateUndoRedoState = useCallback((newCanUndo, newCanRedo, newUndoDescription, newRedoDescription) => {
    setCanUndo(newCanUndo);
    setCanRedo(newCanRedo);
    setUndoDescription(newUndoDescription);
    setRedoDescription(newRedoDescription);
  }, []);

  const handleDeleteObject = useCallback(async (objectId) => {
    try {
      const { deleteObject } = await import('./services/canvas.service.js');
      
      await deleteObject(objectId);
      console.log('✅ Object deleted successfully from App.jsx');
      
      setHasSelection(false);
      setSelectedObject(null);
      
    } catch (error) {
      console.error('❌ Failed to delete object from App.jsx:', error);
    }
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      {/* Fixed Header */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          width: '100%',
          zIndex: Z_INDEX.HEADER,
          bgcolor: 'white',
        }}
      >
        <Header />
      </Box>
      
      {/* Fixed Toolbar */}
      <Box
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          top: `${HEADER_HEIGHT}px`,
          width: '100%',
          zIndex: Z_INDEX.TOOLBAR,
        }}
      >
        <Toolbar 
          selectedTool={selectedTool}
          onToolChange={handleToolChange}
          hasSelection={hasSelection}
          selectedObject={selectedObject}
          multiSelectionCount={multiSelectionCount}
          cursorPosition={cursorPosition}
          zoomLevel={zoomLevel}
          selectedColor={selectedColor}
          onColorChange={handleColorChange}
          onZIndexChange={handleZIndexChange}
          onRotationChange={handleRotationChange}
          onDeleteObject={handleDeleteObject}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          undoDescription={undoDescription}
          redoDescription={redoDescription}
        />
      </Box>
      
      {/* Pointer-events blocking overlay */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: `${CANVAS_TOP_OFFSET}px`,
          zIndex: Z_INDEX.CANVAS_OVERLAY,
          pointerEvents: 'auto',
          bgcolor: 'transparent',
        }}
        aria-hidden="true"
      />
      
      {/* Main content area */}
      <Box sx={{ position: 'relative', paddingTop: `${CANVAS_TOP_OFFSET}px` }}>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {children({ 
            selectedTool, 
            onToolChange: handleToolChange, 
            onSelectionChange: handleSelectionChange,
            onObjectUpdate: handleObjectUpdate,
            onCursorUpdate: handleCursorUpdate,
            onZoomUpdate: handleZoomUpdate,
            selectedColor,
            onColorChange: handleColorChange,
            onZIndexChange: handleZIndexChange,
            zIndexHandlerRef,
            rotationHandlerRef,
            undoHandlerRef,
            redoHandlerRef,
            canUndoRef,
            canRedoRef,
            undoDescriptionRef,
            redoDescriptionRef,
            userColorChangeRef,
            updateUndoRedoState
          })}
        </Box>
      </Box>
    </Box>
  );
};

// Canvas page component
const CanvasPage = ({ selectedTool, onToolChange, onSelectionChange, onObjectUpdate, onCursorUpdate, onZoomUpdate, selectedColor, onColorChange, onZIndexChange, zIndexHandlerRef, rotationHandlerRef, undoHandlerRef, redoHandlerRef, canUndoRef, canRedoRef, undoDescriptionRef, redoDescriptionRef, userColorChangeRef, updateUndoRedoState }) => {
  return (
    <Canvas 
      selectedTool={selectedTool}
      onToolChange={onToolChange}
      onSelectionChange={onSelectionChange}
      onObjectUpdate={onObjectUpdate}
      onCursorUpdate={onCursorUpdate}
      onZoomUpdate={onZoomUpdate}
      selectedColor={selectedColor}
      onColorChange={onColorChange}
      onZIndexChange={onZIndexChange}
      zIndexHandlerRef={zIndexHandlerRef}
      rotationHandlerRef={rotationHandlerRef}
      undoHandlerRef={undoHandlerRef}
      redoHandlerRef={redoHandlerRef}
      canUndoRef={canUndoRef}
      canRedoRef={canRedoRef}
      undoDescriptionRef={undoDescriptionRef}
      redoDescriptionRef={redoDescriptionRef}
      onUserColorChange={userColorChangeRef}
      updateUndoRedoState={updateUndoRedoState}
    />
  );
};

// Redirect component for legacy project routes
const RedirectToCanvas = () => {
  const { canvasId } = useParams();
  return <Navigate to={`/canvas/${canvasId}`} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <CanvasProvider>
          <Box className="App">
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
            <Routes>
            {/* TEMPORARY: When bypass is enabled, redirect to canvas directly */}
            {BYPASS_AUTH ? (
              <>
                <Route path="/" element={<Navigate to="/canvas" replace />} />
                <Route 
                  path="/canvas" 
                  element={
                    <LoggedInLayout>
                      {({ selectedTool, onToolChange, onSelectionChange, onObjectUpdate, onCursorUpdate, onZoomUpdate, selectedColor, onColorChange, onZIndexChange, zIndexHandlerRef, rotationHandlerRef, undoHandlerRef, redoHandlerRef, canUndoRef, canRedoRef, undoDescriptionRef, redoDescriptionRef, userColorChangeRef, updateUndoRedoState }) => (
                        <CanvasPage 
                          selectedTool={selectedTool} 
                          onToolChange={onToolChange}
                          onSelectionChange={onSelectionChange}
                          onObjectUpdate={onObjectUpdate}
                          onCursorUpdate={onCursorUpdate}
                          onZoomUpdate={onZoomUpdate}
                          selectedColor={selectedColor}
                          onColorChange={onColorChange}
                          onZIndexChange={onZIndexChange}
                          zIndexHandlerRef={zIndexHandlerRef}
                          rotationHandlerRef={rotationHandlerRef}
                          undoHandlerRef={undoHandlerRef}
                          redoHandlerRef={redoHandlerRef}
                          canUndoRef={canUndoRef}
                          canRedoRef={canRedoRef}
                          undoDescriptionRef={undoDescriptionRef}
                          redoDescriptionRef={redoDescriptionRef}
                          userColorChangeRef={userColorChangeRef}
                          updateUndoRedoState={updateUndoRedoState}
                        />
                      )}
                    </LoggedInLayout>
                  } 
                />
                {/* 404 Page */}
                <Route path="*" element={<NotFound />} />
              </>
            ) : (
              <>
                {/* Normal auth flow when bypass is disabled */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                
                {/* Auth routes */}
                <Route path="/login" element={<LoginForm />} />
                <Route path="/register" element={<RegisterForm />} />
                
                {/* Default canvas route */}
                <Route 
                  path="/canvas" 
                  element={
                    <ProtectedRoute>
                      <LoggedInLayout>
                        {({ selectedTool, onToolChange, onSelectionChange, onObjectUpdate, onCursorUpdate, onZoomUpdate, selectedColor, onColorChange, onZIndexChange, zIndexHandlerRef, rotationHandlerRef, undoHandlerRef, redoHandlerRef, canUndoRef, canRedoRef, undoDescriptionRef, redoDescriptionRef, userColorChangeRef, updateUndoRedoState }) => (
                          <CanvasPage 
                            selectedTool={selectedTool} 
                            onToolChange={onToolChange}
                            onSelectionChange={onSelectionChange}
                            onObjectUpdate={onObjectUpdate}
                            onCursorUpdate={onCursorUpdate}
                            onZoomUpdate={onZoomUpdate}
                            selectedColor={selectedColor}
                            onColorChange={onColorChange}
                            onZIndexChange={onZIndexChange}
                            zIndexHandlerRef={zIndexHandlerRef}
                            rotationHandlerRef={rotationHandlerRef}
                            undoHandlerRef={undoHandlerRef}
                            redoHandlerRef={redoHandlerRef}
                            canUndoRef={canUndoRef}
                            canRedoRef={canRedoRef}
                            undoDescriptionRef={undoDescriptionRef}
                            redoDescriptionRef={redoDescriptionRef}
                            userColorChangeRef={userColorChangeRef}
                            updateUndoRedoState={updateUndoRedoState}
                          />
                        )}
                      </LoggedInLayout>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Protected canvas routes */}
                <Route 
                  path="/canvas/:canvasId" 
                  element={
                    <ProtectedRoute>
                      <LoggedInLayout>
                        {({ selectedTool, onToolChange, onSelectionChange, onObjectUpdate, onCursorUpdate, onZoomUpdate, selectedColor, onColorChange, onZIndexChange, zIndexHandlerRef, rotationHandlerRef, undoHandlerRef, redoHandlerRef, canUndoRef, canRedoRef, undoDescriptionRef, redoDescriptionRef, userColorChangeRef, updateUndoRedoState }) => (
                          <CanvasPage 
                            selectedTool={selectedTool} 
                            onToolChange={onToolChange}
                            onSelectionChange={onSelectionChange}
                            onObjectUpdate={onObjectUpdate}
                            onCursorUpdate={onCursorUpdate}
                            onZoomUpdate={onZoomUpdate}
                            selectedColor={selectedColor}
                            onColorChange={onColorChange}
                            onZIndexChange={onZIndexChange}
                            zIndexHandlerRef={zIndexHandlerRef}
                            rotationHandlerRef={rotationHandlerRef}
                            undoHandlerRef={undoHandlerRef}
                            redoHandlerRef={redoHandlerRef}
                            canUndoRef={canUndoRef}
                            canRedoRef={canRedoRef}
                            undoDescriptionRef={undoDescriptionRef}
                            redoDescriptionRef={redoDescriptionRef}
                            userColorChangeRef={userColorChangeRef}
                            updateUndoRedoState={updateUndoRedoState}
                          />
                        )}
                      </LoggedInLayout>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Legacy route - redirect to new format */}
                <Route 
                  path="/project/:projectId/canvas/:canvasId" 
                  element={<RedirectToCanvas />} 
                />
                
                {/* 404 Page */}
                <Route path="*" element={<NotFound />} />
              </>
            )}
            </Routes>
          </Box>
        </CanvasProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
