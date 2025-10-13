import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider.jsx';
import LoginForm from './components/auth/LoginForm.jsx';
import RegisterForm from './components/auth/RegisterForm.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import Header from './components/layout/Header.jsx';

// Temporary Canvas placeholder component
const CanvasPlaceholder = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            🎨 Canvas Coming Soon
          </h2>
          <p className="text-gray-600 mb-8">
            Authentication is working! Canvas implementation is next.
          </p>
          <div className="bg-white p-6 rounded-lg shadow-sm border-2 border-dashed border-gray-300">
            <p className="text-sm text-gray-500">
              This will be replaced with the Konva canvas in PR #3
            </p>
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
                  <CanvasPlaceholder />
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
