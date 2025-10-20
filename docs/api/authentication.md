# Authentication Guide

Complete guide to CollabCanvas API authentication, token management, and security best practices.

---

## Overview

CollabCanvas uses API tokens for authentication. Tokens are scoped with specific permissions and can be restricted to individual canvases for enhanced security.

### Authentication Methods

- **API Tokens**: Primary method for API access
- **Session-based**: For web application integration
- **Service Accounts**: For server-to-server integrations (future)

---

## API Token Authentication

### Token Format

API tokens follow this format:
```
ct_1234567890abcdef1234567890abcdef12345678...
```

- **Prefix**: `ct_` (CollabCanvas Token)
- **Length**: 64 characters (after prefix)
- **Encoding**: Base64url

### Using Tokens

Include your token in the `Authorization` header:

```http
GET /api/canvases HTTP/1.1
Host: your-project.web.app
Authorization: Bearer ct_1234567890abcdef...
Content-Type: application/json
```

```javascript
const response = await fetch('https://your-project.web.app/api/canvases', {
  headers: {
    'Authorization': 'Bearer ct_1234567890abcdef...',
    'Content-Type': 'application/json'
  }
});
```

---

## Token Management

### Creating Tokens

#### Via Web Interface

1. Sign in to CollabCanvas
2. Go to Settings → API Tokens
3. Click "Generate New Token"
4. Configure token settings:
   - **Name**: Descriptive name for the token
   - **Scopes**: Permissions to grant
   - **Canvas**: Optional canvas restriction
   - **Expiration**: Token lifetime

#### Via API

```javascript
const response = await fetch('https://your-project.web.app/api/tokens', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_existing_token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My Integration Token',
    scopes: ['read_objects', 'write_objects'],
    canvasId: 'canvas_123', // Optional
    expiresIn: '90d'
  })
});

const { token, id } = await response.json();
```

> ⚠️ **Important**: The token value is only shown once. Store it securely immediately!

### Token Scopes

#### Available Scopes

| Scope | Description | Endpoints |
|-------|-------------|-----------|
| `read_canvases` | List and read canvas metadata | `GET /canvases`, `GET /canvases/{id}` |
| `write_canvases` | Create and update canvases | `POST /canvases`, `PUT /canvases/{id}` |
| `delete_canvases` | Delete canvases (owner only) | `DELETE /canvases/{id}` |
| `read_objects` | Read canvas objects | `GET /objects`, `GET /canvases/{id}/snapshot` |
| `write_objects` | Create, update, delete objects | `POST /objects`, `PUT /objects/{id}`, `DELETE /objects/{id}` |
| `agent_requests` | Use AI agent | `POST /agent`, `GET /agent/health` |
| `canvas_access` | Access specific canvas | Required when `canvasId` is specified |

#### Scope Combinations

**Read-only Access:**
```json
{
  "scopes": ["read_canvases", "read_objects"]
}
```

**Full Canvas Management:**
```json
{
  "scopes": ["read_canvases", "write_canvases", "read_objects", "write_objects"]
}
```

**AI Integration:**
```json
{
  "scopes": ["read_objects", "write_objects", "agent_requests"]
}
```

**Canvas-specific Access:**
```json
{
  "scopes": ["read_objects", "write_objects", "canvas_access"],
  "canvasId": "canvas_123"
}
```

### Token Lifecycle

#### Expiration Options

| Option | Duration | Use Case |
|--------|----------|----------|
| `1h` | 1 hour | Testing, temporary access |
| `1d` | 1 day | Short-term integrations |
| `7d` | 7 days | Development projects |
| `30d` | 30 days | Monthly integrations |
| `90d` | 90 days | Standard production use |
| `1y` | 1 year | Long-term integrations |
| `never` | No expiration | Legacy systems (not recommended) |

#### Token Status

```javascript
// Check token status
const response = await fetch('https://your-project.web.app/api/tokens', {
  headers: {
    'Authorization': 'Bearer ct_your_token'
  }
});

const { tokens } = await response.json();
const myToken = tokens.find(t => t.name === 'My Token');

console.log('Token Status:', {
  active: myToken.isActive,
  expiresAt: myToken.expiresAt,
  usageCount: myToken.usageCount,
  lastUsed: myToken.lastUsedAt
});
```

### Revoking Tokens

#### Revoke Single Token

```javascript
// Revoke via API
await fetch(`https://your-project.web.app/api/tokens/${tokenId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer your_management_token'
  }
});

// Or deactivate
await fetch(`https://your-project.web.app/api/tokens/${tokenId}`, {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer your_management_token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ isActive: false })
});
```

#### Emergency Revocation

If a token is compromised:

1. **Immediate**: Deactivate via web interface
2. **API**: Use DELETE endpoint
3. **Rotate**: Generate new token with same permissions
4. **Audit**: Check usage logs for suspicious activity

---

## Security Best Practices

### 1. Token Storage

#### ✅ Secure Storage Methods

**Environment Variables:**
```bash
# .env file (not committed to version control)
COLLABCANVAS_API_TOKEN=ct_1234567890abcdef...
```

**Cloud Secret Managers:**
```javascript
// AWS Secrets Manager
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

const secret = await secretsManager.getSecretValue({
  SecretId: 'collabcanvas/api-token'
}).promise();

const token = JSON.parse(secret.SecretString).token;
```

**Docker Secrets:**
```bash
# Create secret
echo "ct_1234567890abcdef..." | docker secret create collabcanvas_token -

# Use in container
docker service create \
  --secret collabcanvas_token \
  --env COLLABCANVAS_TOKEN_FILE=/run/secrets/collabcanvas_token \
  myapp
```

#### ❌ Insecure Storage Methods

**Never do this:**
```javascript
// ❌ Hardcoded in source code
const token = 'ct_1234567890abcdef...';

// ❌ In client-side JavaScript
localStorage.setItem('api_token', 'ct_1234567890abcdef...');

// ❌ In configuration files committed to version control
config.json: {
  "apiToken": "ct_1234567890abcdef..."
}

// ❌ In URLs or logs
console.log('Token:', token);
```

### 2. Permission Scoping

#### Principle of Least Privilege

Grant only the minimum permissions needed:

```javascript
// ❌ Too broad
{
  "scopes": ["read_canvases", "write_canvases", "delete_canvases", 
             "read_objects", "write_objects", "agent_requests"]
}

// ✅ Minimal permissions
{
  "scopes": ["read_objects"], // Only what's needed
  "canvasId": "canvas_123"   // Restricted to specific canvas
}
```

#### Role-based Token Strategy

```javascript
// Different tokens for different purposes
const tokens = {
  // Read-only analytics
  analytics: {
    scopes: ['read_canvases', 'read_objects'],
    name: 'Analytics Dashboard'
  },
  
  // AI integration
  aiAgent: {
    scopes: ['read_objects', 'write_objects', 'agent_requests'],
    name: 'AI Assistant',
    canvasId: 'ai_workspace'
  },
  
  // Admin operations
  admin: {
    scopes: ['read_canvases', 'write_canvases', 'read_objects', 'write_objects'],
    name: 'Admin Tool'
  }
};
```

### 3. Token Rotation

#### Automated Rotation

```javascript
class TokenRotator {
  constructor(currentToken, rotationIntervalDays = 30) {
    this.currentToken = currentToken;
    this.rotationInterval = rotationIntervalDays * 24 * 60 * 60 * 1000;
    this.client = new CollabCanvasClient(currentToken);
  }

  async rotateToken() {
    try {
      // Create new token with same permissions
      const tokenInfo = await this.getCurrentTokenInfo();
      const newToken = await this.createReplacementToken(tokenInfo);
      
      // Test new token
      await this.validateNewToken(newToken.token);
      
      // Update application configuration
      await this.updateTokenInConfig(newToken.token);
      
      // Revoke old token
      await this.revokeOldToken();
      
      this.currentToken = newToken.token;
      
      console.log('Token rotation completed successfully');
      return newToken;
      
    } catch (error) {
      console.error('Token rotation failed:', error);
      throw error;
    }
  }

  async scheduleRotation() {
    setInterval(async () => {
      try {
        await this.rotateToken();
      } catch (error) {
        // Alert monitoring system
        this.alertRotationFailure(error);
      }
    }, this.rotationInterval);
  }
}
```

### 4. Network Security

#### HTTPS Only

```javascript
// ✅ Always use HTTPS
const response = await fetch('https://your-project.web.app/api/canvases', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// ❌ Never use HTTP
const response = await fetch('http://your-project.web.app/api/canvases', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### Certificate Pinning

```javascript
// Node.js example with certificate pinning
const https = require('https');
const fs = require('fs');

const trustedCert = fs.readFileSync('collabcanvas-cert.pem');

const agent = new https.Agent({
  ca: trustedCert,
  checkServerIdentity: (hostname, cert) => {
    // Additional certificate validation
    return undefined; // No error = valid
  }
});

const response = await fetch('https://your-project.web.app/api/canvases', {
  agent,
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## Token Validation

### Server-side Validation

#### Token Format Validation

```javascript
function validateTokenFormat(token) {
  const tokenRegex = /^ct_[A-Za-z0-9_-]{64}$/;
  return tokenRegex.test(token);
}

function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization header format');
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer '
  
  if (!validateTokenFormat(token)) {
    throw new Error('Invalid token format');
  }
  
  return token;
}
```

#### Permission Check

```javascript
async function validateTokenPermissions(token, requiredScopes, canvasId = null) {
  const response = await fetch('https://your-project.web.app/api/tokens/validate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requiredScopes,
      canvasId
    })
  });

  if (!response.ok) {
    throw new Error('Token validation failed');
  }

  const result = await response.json();
  return result.valid;
}

// Usage
try {
  const isValid = await validateTokenPermissions(
    token, 
    ['read_objects'], 
    'canvas_123'
  );
  
  if (!isValid) {
    throw new Error('Insufficient permissions');
  }
} catch (error) {
  return res.status(403).json({ error: 'Access denied' });
}
```

---

## Error Handling

### Authentication Errors

#### 401 Unauthorized

```json
{
  "error": {
    "message": "Invalid or expired token",
    "code": "INVALID_TOKEN"
  }
}
```

**Common causes:**
- Token not provided
- Token format invalid
- Token expired
- Token revoked

#### 403 Forbidden

```json
{
  "error": {
    "message": "Insufficient permissions for this operation",
    "code": "INSUFFICIENT_PERMISSIONS",
    "details": {
      "required": ["write_objects"],
      "provided": ["read_objects"]
    }
  }
}
```

**Common causes:**
- Token lacks required scopes
- Canvas access restricted
- Operation not allowed for token type

### Error Recovery

```javascript
class AuthErrorHandler {
  constructor(tokenManager) {
    this.tokenManager = tokenManager;
  }

  async handleAuthError(error, request) {
    if (error.status === 401) {
      // Token invalid or expired
      if (error.code === 'TOKEN_EXPIRED') {
        // Attempt token refresh
        const newToken = await this.tokenManager.refreshToken();
        if (newToken) {
          // Retry request with new token
          return this.retryRequest(request, newToken);
        }
      }
      
      // Re-authentication required
      throw new Error('Authentication required');
    }
    
    if (error.status === 403) {
      // Permission denied
      console.error('Permission denied:', error.details);
      throw new Error('Insufficient permissions');
    }
    
    throw error;
  }

  async retryRequest(request, newToken) {
    request.headers['Authorization'] = `Bearer ${newToken}`;
    return fetch(request.url, request);
  }
}
```

---

## Integration Patterns

### 1. Service-to-Service Authentication

```javascript
class ServiceClient {
  constructor(serviceToken) {
    this.token = serviceToken;
    this.client = new CollabCanvasClient(serviceToken);
  }

  async authenticatedRequest(endpoint, options = {}) {
    const response = await this.client.request(endpoint, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'User-Agent': 'MyService/1.0',
        'X-Service-Name': 'analytics-service',
        ...options.headers
      }
    });

    return response;
  }
}
```

### 2. Multi-Tenant Applications

```javascript
class MultiTenantClient {
  constructor() {
    this.tenantTokens = new Map();
  }

  addTenant(tenantId, token) {
    this.tenantTokens.set(tenantId, {
      token,
      client: new CollabCanvasClient(token)
    });
  }

  async executeForTenant(tenantId, operation) {
    const tenant = this.tenantTokens.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not configured`);
    }

    return operation(tenant.client);
  }
}

// Usage
const multiClient = new MultiTenantClient();
multiClient.addTenant('tenant1', 'ct_tenant1_token...');
multiClient.addTenant('tenant2', 'ct_tenant2_token...');

const canvas = await multiClient.executeForTenant('tenant1', 
  client => client.getCanvas('canvas_123')
);
```

---

## Monitoring and Auditing

### Token Usage Monitoring

```javascript
class TokenMonitor {
  constructor(token) {
    this.token = token;
    this.usageLog = [];
  }

  logRequest(endpoint, method, response) {
    this.usageLog.push({
      timestamp: new Date(),
      endpoint,
      method,
      status: response.status,
      rateLimitRemaining: response.headers['x-ratelimit-remaining']
    });

    // Alert if rate limit is running low
    const remaining = parseInt(response.headers['x-ratelimit-remaining']);
    if (remaining < 10) {
      this.alertLowRateLimit(remaining);
    }
  }

  generateUsageReport() {
    const report = {
      totalRequests: this.usageLog.length,
      byEndpoint: {},
      byStatus: {},
      rateLimitEvents: []
    };

    this.usageLog.forEach(entry => {
      // Count by endpoint
      report.byEndpoint[entry.endpoint] = 
        (report.byEndpoint[entry.endpoint] || 0) + 1;
      
      // Count by status
      report.byStatus[entry.status] = 
        (report.byStatus[entry.status] || 0) + 1;
    });

    return report;
  }

  alertLowRateLimit(remaining) {
    console.warn(`Rate limit warning: ${remaining} requests remaining`);
    // Send to monitoring system
  }
}
```

### Security Auditing

```javascript
class SecurityAuditor {
  constructor() {
    this.securityEvents = [];
  }

  auditTokenUsage(token, request, response) {
    const event = {
      timestamp: new Date(),
      tokenId: this.hashToken(token),
      endpoint: request.url,
      method: request.method,
      userAgent: request.headers['user-agent'],
      ip: request.headers['x-forwarded-for'] || request.connection.remoteAddress,
      status: response.status
    };

    this.securityEvents.push(event);
    
    // Check for suspicious patterns
    this.detectAnomalies(event);
  }

  detectAnomalies(event) {
    // High frequency requests
    const recentEvents = this.securityEvents.filter(
      e => e.timestamp > Date.now() - 60000 // Last minute
    );
    
    if (recentEvents.length > 100) {
      this.alertSuspiciousActivity('High frequency requests', event);
    }

    // Unusual user agent
    if (!event.userAgent || event.userAgent.includes('bot')) {
      this.alertSuspiciousActivity('Suspicious user agent', event);
    }
  }

  alertSuspiciousActivity(reason, event) {
    console.warn('Security Alert:', reason, event);
    // Send to security monitoring system
  }

  hashToken(token) {
    // Hash for auditing without storing actual token
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
  }
}
```

---

## See Also

- [API Reference](./reference.md) - Complete API documentation
- [Rate Limits Guide](./rate-limits.md) - Rate limiting details
- [Getting Started Guide](./getting-started.md) - Quick setup
- [Code Examples](./examples.md) - Implementation examples
- [Workflows Guide](./workflows.md) - Integration patterns
