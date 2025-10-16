import { useState } from 'react';
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

// TEMPORARY: Set to true to bypass authentication and go directly to canvas
// This should match the BYPASS_AUTH flag in AuthProvider.jsx
const BYPASS_AUTH = false;

// Layout wrapper for all logged-in pages with persistent header and toolbar
const LoggedInLayout = ({ children }) => {
  const [selectedTool, setSelectedTool] = useState(TOOLS.MOVE);

  const handleToolChange = (tool) => {
    setSelectedTool(tool);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Header - Always at top */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white" style={{ width: '100%' }}>
        <Header />
      </div>
      
      {/* Fixed Toolbar - Below header with proper spacing */}
      <div className="fixed left-0 right-0 z-30" style={{ top: '90px', width: '100%' }}>
        <Toolbar 
          selectedTool={selectedTool}
          onToolChange={handleToolChange}
        />
      </div>
      
      {/* Main content area with top padding to account for fixed header/toolbar */}
      <div className="relative" style={{ paddingTop: '200px' }}>
        <div className="flex-1 overflow-hidden">
          {children({ selectedTool, onToolChange: handleToolChange })}
        </div>
      </div>
    </div>
  );
};

// Canvas page component - now just renders Canvas
const CanvasPage = ({ selectedTool, onToolChange }) => {
  return (
    <Canvas 
      selectedTool={selectedTool}
      onToolChange={onToolChange}
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
                      {({ selectedTool, onToolChange }) => (
                        <CanvasPage 
                          selectedTool={selectedTool} 
                          onToolChange={onToolChange} 
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
                        {({ selectedTool, onToolChange }) => (
                          <CanvasPage 
                            selectedTool={selectedTool} 
                            onToolChange={onToolChange} 
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
                        {({ selectedTool, onToolChange }) => (
                          <CanvasPage 
                            selectedTool={selectedTool} 
                            onToolChange={onToolChange} 
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
