import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider.jsx';
import LoginForm from './components/auth/LoginForm.jsx';
import RegisterForm from './components/auth/RegisterForm.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import Header from './components/layout/Header.jsx';
import Toolbar, { TOOLS } from './components/canvas/Toolbar.jsx';
import Canvas from './components/canvas/Canvas.jsx';

// TEMPORARY: Set to true to bypass authentication and go directly to canvas
// This should match the BYPASS_AUTH flag in AuthProvider.jsx
const BYPASS_AUTH = false;

// Canvas page component with Toolbar and Canvas
const CanvasPage = () => {
  const [selectedTool, setSelectedTool] = useState(TOOLS.MOVE);
  const { canvasId } = useParams();

  const handleToolChange = (tool) => {
    setSelectedTool(tool);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      {/* Only show toolbar when there's a specific canvas selected */}
      {canvasId && (
        <Toolbar 
          selectedTool={selectedTool}
          onToolChange={handleToolChange}
        />
      )}
      <div className="flex flex-1">
        {/* Main canvas area - now takes full width */}
        <div className="flex-1">
          <Canvas 
            selectedTool={selectedTool}
            onToolChange={handleToolChange}
          />
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* TEMPORARY: When bypass is enabled, redirect to canvas directly */}
            {BYPASS_AUTH ? (
              <>
                <Route path="/" element={<Navigate to="/canvas" replace />} />
                <Route path="/canvas" element={<CanvasPage />} />
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
                      <CanvasPage />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Protected canvas routes - support both old and new URL formats */}
                <Route 
                  path="/canvas/:canvasId" 
                  element={
                    <ProtectedRoute>
                      <CanvasPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/project/:projectId/canvas/:canvasId" 
                  element={
                    <ProtectedRoute>
                      <CanvasPage />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Catch all - redirect to canvas dashboard */}
                <Route path="*" element={<Navigate to="/canvas" replace />} />
              </>
            )}
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
