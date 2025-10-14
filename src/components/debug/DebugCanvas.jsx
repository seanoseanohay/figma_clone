import React from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';

// Simple test component to debug rendering issues
const DebugCanvas = () => {
  const { currentUser, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🎨 CollabCanvas Debug Page
        </h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2">
            <p><strong>Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
            <p><strong>User ID:</strong> {currentUser?.uid || 'Not available'}</p>
            <p><strong>Email:</strong> {currentUser?.email || 'Not available'}</p>
            <p><strong>Display Name:</strong> {currentUser?.displayName || 'Not available'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Check</h2>
          <div className="space-y-2">
            <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
            <p><strong>Current URL:</strong> {window.location.href}</p>
            <p><strong>Timestamp:</strong> {new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
          <div className="space-y-2 text-gray-600">
            <p>✅ If you see this page, React is working correctly</p>
            <p>✅ If authentication shows as working, Firebase auth is configured</p>
            <p>🔧 If this works, we can progressively enable canvas components</p>
          </div>
          
          <div className="mt-4">
            <button 
              onClick={() => window.location.href = '/canvas'}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Try Full Canvas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugCanvas;
