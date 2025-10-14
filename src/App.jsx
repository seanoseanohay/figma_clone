import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider.jsx';
import LoginForm from './components/auth/LoginForm.jsx';
import RegisterForm from './components/auth/RegisterForm.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import Header from './components/layout/Header.jsx';
import Toolbar, { TOOLS } from './components/canvas/Toolbar.jsx';
import Canvas from './components/canvas/Canvas.jsx';

// Canvas page component with Toolbar and Canvas
const CanvasPage = () => {
  const [selectedTool, setSelectedTool] = useState(TOOLS.MOVE);

  const handleToolChange = (tool) => {
    setSelectedTool(tool);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <Toolbar 
        selectedTool={selectedTool}
        onToolChange={handleToolChange}
      />
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
            {/* Redirect root to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Auth routes */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            
            {/* Protected canvas route */}
            <Route 
              path="/canvas" 
              element={
                <ProtectedRoute>
                  <CanvasPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch all - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
