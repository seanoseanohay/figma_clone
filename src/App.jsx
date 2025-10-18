import { useState, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
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
import { CANVAS_TOP_OFFSET, HEADER_HEIGHT, Z_INDEX } from './constants/layout.constants.js';

// TEMPORARY: Set to true to bypass authentication and go directly to canvas
// This should match the BYPASS_AUTH flag in AuthProvider.jsx
const BYPASS_AUTH = false;

// Layout wrapper for all logged-in pages with persistent header and toolbar
const LoggedInLayout = ({ children }) => {
  const [selectedTool, setSelectedTool] = useState(TOOLS.PAN);
  const [hasSelection, setHasSelection] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [cursorPosition, setCursorPosition] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedColor, setSelectedColor] = useState('#808080'); // Default gray
  // Store a ref to the Canvas's z-index handler
  const zIndexHandlerRef = useRef(null);
  // Store a ref to the Canvas's color update handler (for selected objects)
  const userColorChangeRef = useRef(null);

  const handleToolChange = (tool) => {
    setSelectedTool(tool);
  };

  const handleSelectionChange = (selected) => {
    setHasSelection(!!selected);
  };

  const handleObjectUpdate = (objectData) => {
    setSelectedObject(objectData);
    // Update color picker to match selected object's color
    if (objectData && objectData.fill) {
      setSelectedColor(objectData.fill);
    }
  };

  const handleCursorUpdate = (position) => {
    setCursorPosition(position);
  };

  const handleZoomUpdate = (zoom) => {
    setZoomLevel(zoom * 100); // Convert scale to percentage
  };

  const handleColorChange = (newColor) => {
    setSelectedColor(newColor);
    // If there's a selected object and user changed the color, update the object
    if (userColorChangeRef.current && hasSelection) {
      userColorChangeRef.current(newColor);
    }
  };

  const handleZIndexChange = useCallback((action) => {
    // Call the Canvas's z-index handler if it's available
    if (zIndexHandlerRef.current) {
      zIndexHandlerRef.current(action);
    }
  }, []);

  const rotationHandlerRef = useRef(null);
  
  const handleRotationChange = useCallback((newRotation) => {
    // Call the Canvas's rotation handler if it's available
    if (rotationHandlerRef.current) {
      rotationHandlerRef.current(newRotation);
    }
  }, []);

  const handleDeleteObject = useCallback(async (objectId) => {
    try {
      // Import deleteObject dynamically
      const { deleteObject } = await import('./services/canvas.service.js');
      
      await deleteObject(objectId);
      console.log('✅ Object deleted successfully from App.jsx');
      
      // Clear selection since object no longer exists
      setHasSelection(false);
      setSelectedObject(null);
      
    } catch (error) {
      console.error('❌ Failed to delete object from App.jsx:', error);
      // Could show toast notification here in the future
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Header - Always at top */}
      <div className="fixed top-0 left-0 right-0 bg-white" style={{ width: '100%', zIndex: Z_INDEX.HEADER }}>
        <Header />
      </div>
      
      {/* Fixed Toolbar - Below header with proper spacing */}
      <div className="fixed left-0 right-0" style={{ top: `${HEADER_HEIGHT}px`, width: '100%', zIndex: Z_INDEX.TOOLBAR }}>
        <Toolbar 
          selectedTool={selectedTool}
          onToolChange={handleToolChange}
          hasSelection={hasSelection}
          selectedObject={selectedObject}
          cursorPosition={cursorPosition}
          zoomLevel={zoomLevel}
          selectedColor={selectedColor}
          onColorChange={handleColorChange}
          onZIndexChange={handleZIndexChange}
          onRotationChange={handleRotationChange}
          onDeleteObject={handleDeleteObject}
        />
      </div>
      
      {/* Pointer-events blocking overlay - prevents canvas interaction above toolbar */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: `${CANVAS_TOP_OFFSET}px`,
          zIndex: Z_INDEX.CANVAS_OVERLAY,
          pointerEvents: 'auto',
          background: 'transparent'
        }}
        aria-hidden="true"
      />
      
      {/* Main content area with top padding to account for fixed header/toolbar */}
      <div className="relative" style={{ paddingTop: `${CANVAS_TOP_OFFSET}px` }}>
        <div className="flex-1 overflow-hidden">
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
            userColorChangeRef
          })}
        </div>
      </div>
    </div>
  );
};

// Canvas page component - now just renders Canvas
const CanvasPage = ({ selectedTool, onToolChange, onSelectionChange, onObjectUpdate, onCursorUpdate, onZoomUpdate, selectedColor, onColorChange, onZIndexChange, zIndexHandlerRef, rotationHandlerRef, userColorChangeRef }) => {
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
      onUserColorChange={userColorChangeRef}
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
          <div className="App">
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
                      {({ selectedTool, onToolChange, onSelectionChange, onObjectUpdate, onCursorUpdate, onZoomUpdate, selectedColor, onColorChange, onZIndexChange, zIndexHandlerRef, rotationHandlerRef, userColorChangeRef }) => (
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
                          userColorChangeRef={userColorChangeRef}
                        />
                      )}
                    </LoggedInLayout>
                  } 
                />
                <Route path="*" element={<Navigate to="/canvas" replace />} />
              </>
            ) : (
              <>
                {/* Normal auth flow when bypass is disabled */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                
                {/* Auth routes */}
                <Route path="/login" element={<LoginForm />} />
                <Route path="/register" element={<RegisterForm />} />
                
                {/* Default canvas route - redirect to dashboard */}
                <Route 
                  path="/canvas" 
                  element={
                    <ProtectedRoute>
                      <LoggedInLayout>
                        {({ selectedTool, onToolChange, onSelectionChange, onObjectUpdate, onCursorUpdate, onZoomUpdate, selectedColor, onColorChange, onZIndexChange, zIndexHandlerRef, userColorChangeRef }) => (
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
                            userColorChangeRef={userColorChangeRef}
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
                        {({ selectedTool, onToolChange, onSelectionChange, onObjectUpdate, onCursorUpdate, onZoomUpdate, selectedColor, onColorChange, onZIndexChange, zIndexHandlerRef, userColorChangeRef }) => (
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
                            userColorChangeRef={userColorChangeRef}
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
                
                {/* Catch all - redirect to canvas dashboard */}
                <Route path="*" element={<Navigate to="/canvas" replace />} />
              </>
            )}
            </Routes>
          </div>
        </CanvasProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
