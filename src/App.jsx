import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider.jsx';
import LoginForm from './components/auth/LoginForm.jsx';
import RegisterForm from './components/auth/RegisterForm.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import Header from './components/layout/Header.jsx';
import Toolbar, { TOOLS } from './components/canvas/Toolbar.jsx';
import Canvas from './components/canvas/Canvas.jsx';
import OnlineUsers, { OnlineUsersCount } from './components/presence/OnlineUsers.jsx';
import ConnectionStatus from './components/presence/ConnectionStatus.jsx';
import DebugCanvas from './components/debug/DebugCanvas.jsx';
import FirebaseCostMonitor from './components/debug/FirebaseCostMonitor.jsx';
import DatabaseTest from './components/debug/DatabaseTest.jsx';

// Canvas page component with Toolbar and Canvas
const CanvasPage = () => {
  const [selectedTool, setSelectedTool] = useState(TOOLS.MOVE);

  // DEBUG: Confirm this component is mounting
  console.log('🏗️ CanvasPage component is mounting/rendering!');

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
      <div className="flex flex-1" style={{border: '3px solid green', overflow: 'visible'}}>
        {/* DEBUG: Log flex container */}
        {console.log('🔧 Flex container rendering with children')}
        
        {/* Main canvas area */}
        <div className="flex-1" style={{border: '3px solid orange', maxWidth: 'calc(100% - 320px)'}}>
          {console.log('📱 Canvas area div rendering')}
          <Canvas 
            selectedTool={selectedTool}
            onToolChange={handleToolChange}
          />
        </div>
        
        {/* DEBUG: Visible indicator that sidebar should be here */}
        <div 
          className="w-80 bg-red-100 border-l border-red-500 p-4" 
          style={{
            minWidth: '320px', 
            width: '320px',
            backgroundColor: 'red', 
            border: '5px solid blue',
            position: 'relative',
            zIndex: 9999,
            flexShrink: 0
          }}
        >
          {console.log('🔴 Sidebar div rendering')}
          <div className="bg-red-200 p-2 mb-4 rounded" style={{backgroundColor: 'yellow', border: '2px solid purple'}}>
            <strong style={{color: 'black', fontSize: '16px'}}>🔍 DEBUG: Sidebar Should Be Here</strong>
            <br />
            <span style={{color: 'black', fontSize: '14px'}}>Width: 320px, Red background, Blue border</span>
          </div>
          
          {/* Right sidebar with presence info */}
          <div className="space-y-4">
            <ConnectionStatus />
            <DatabaseTest />
            <OnlineUsers />
            
            {/* Firebase cost monitoring */}
            {import.meta.env.DEV && (
              <FirebaseCostMonitor />
            )}
            
            {/* Development info */}
            {import.meta.env.DEV && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">
                  🧪 Development Mode
                </h4>
                <p className="text-xs text-yellow-700">
                  Open multiple browser windows to test multiplayer functionality.
                  Each user's cursor will appear with a unique color and name label.
                </p>
              </div>
            )}
          </div>
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

            {/* Debug route for troubleshooting */}
            <Route 
              path="/debug" 
              element={
                <ProtectedRoute>
                  <DebugCanvas />
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
