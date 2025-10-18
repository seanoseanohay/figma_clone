/**
 * CollabCanvas REST API
 * Firebase Cloud Functions with Express.js
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin
admin.initializeApp();

// Create Express app
const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177', // Current dev port
    'https://figma-clone-default.web.app', // Production domain
    'https://figma-clone-default.firebaseapp.com' // Firebase hosting domain
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions)); // Enable CORS with specific origins
app.use(express.json()); // Parse JSON bodies

// Handle preflight requests
app.options('*', cors(corsOptions));

// Import route handlers
const canvasesRoutes = require('./src/api/canvases');
const objectsRoutes = require('./src/api/objects');
const tokensRoutes = require('./src/api/tokens');
const docsRoutes = require('./src/api/docs');
const agentRoutes = require('./src/api/agent');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mount API routes
app.use('/api/canvases', canvasesRoutes);
app.use('/api/objects', objectsRoutes);
app.use('/api/tokens', tokensRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/agent', agentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  
  // Send appropriate error response
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      code: 'NOT_FOUND'
    }
  });
});

// Export the Express app as a Firebase Cloud Function
exports.api = functions.https.onRequest(app);

// Export admin for use in other modules
module.exports.admin = admin;

