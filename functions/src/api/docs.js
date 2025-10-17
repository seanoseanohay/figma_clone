/**
 * API Documentation Endpoints
 * Serves Swagger UI and API documentation
 */

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const router = express.Router();

// Load OpenAPI specification
let swaggerDocument;
try {
  swaggerDocument = YAML.load(path.join(__dirname, '../../docs/openapi.yaml'));
} catch (error) {
  console.error('Failed to load OpenAPI spec:', error);
  swaggerDocument = {
    openapi: '3.0.0',
    info: {
      title: 'CollabCanvas API',
      version: '1.0.0',
      description: 'REST API for CollabCanvas - Documentation coming soon'
    },
    paths: {}
  };
}

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CollabCanvas API Documentation'
}));

module.exports = router;

