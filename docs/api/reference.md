# CollabCanvas API Reference

Complete reference for all CollabCanvas API endpoints.

---

## Base URL

- **Production**: `https://your-project.web.app/api`
- **Local Development**: `http://localhost:5001/your-project/us-central1/api`

---

## Authentication

All endpoints (except `/health`) require authentication using Bearer tokens.

```http
Authorization: Bearer YOUR_API_TOKEN
```

See [Authentication Guide](./authentication.md) for token management details.

---

## Rate Limits

- **Read Operations**: 200 requests per minute
- **Write Operations**: 50 requests per minute
- **AI Agent Requests**: 10 requests per minute

See [Rate Limits Guide](./rate-limits.md) for details and handling strategies.

---

## Error Response Format

All errors follow a consistent format:

```json
{
  "error": {
    "message": "Human-readable error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request (invalid data)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

---

## Endpoints

### Health Check

#### `GET /health`

Check API health status. Does not require authentication.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": 1703123456789,
  "version": "1.0.0"
}
```

---

### Canvas Management

#### `GET /canvases`

List all canvases accessible to the authenticated user.

**Required Permission:** `read_canvases`

**Query Parameters:**
- `limit` (optional) - Maximum number of canvases to return (default: 50, max: 100)
- `offset` (optional) - Number of canvases to skip (default: 0)

**Response:**
```json
{
  "canvases": [
    {
      "id": "canvas_123",
      "name": "My Design",
      "description": "A collaborative design project",
      "ownerId": "user_456",
      "collaborators": ["user_789", "user_101"],
      "createdAt": "2023-12-01T10:00:00Z",
      "updatedAt": "2023-12-01T15:30:00Z",
      "objectCount": 42
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

#### `GET /canvases/{id}`

Get detailed information about a specific canvas.

**Required Permission:** `read_canvases`

**Response:**
```json
{
  "id": "canvas_123",
  "name": "My Design",
  "description": "A collaborative design project",
  "ownerId": "user_456",
  "collaborators": ["user_789", "user_101"],
  "createdAt": "2023-12-01T10:00:00Z",
  "updatedAt": "2023-12-01T15:30:00Z",
  "objectCount": 42,
  "settings": {
    "backgroundColor": "#ffffff",
    "gridVisible": true,
    "snapToGrid": true
  }
}
```

#### `POST /canvases`

Create a new canvas.

**Required Permission:** `create_canvases`

**Request Body:**
```json
{
  "name": "New Canvas",
  "description": "Optional description",
  "settings": {
    "backgroundColor": "#ffffff",
    "gridVisible": true,
    "snapToGrid": true
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "canvas_456",
  "name": "New Canvas",
  "description": "Optional description",
  "ownerId": "user_123",
  "collaborators": [],
  "createdAt": "2023-12-01T16:00:00Z",
  "updatedAt": "2023-12-01T16:00:00Z",
  "objectCount": 0,
  "settings": {
    "backgroundColor": "#ffffff",
    "gridVisible": true,
    "snapToGrid": true
  }
}
```

#### `PUT /canvases/{id}`

Update canvas metadata.

**Required Permission:** `write_canvases`

**Request Body:**
```json
{
  "name": "Updated Canvas Name",
  "description": "Updated description",
  "settings": {
    "backgroundColor": "#f0f0f0"
  }
}
```

**Response:** `200 OK` (same format as GET /canvases/{id})

#### `DELETE /canvases/{id}`

Delete a canvas and all its objects.

**Required Permission:** `delete_canvases` (owner only)

**Response:** `204 No Content`

#### `GET /canvases/{id}/snapshot`

Get a complete snapshot of canvas objects.

**Required Permission:** `read_objects`

**Response:**
```json
{
  "canvasId": "canvas_123",
  "objects": [
    {
      "id": "obj_789",
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 150,
      "fill": "#3B82F6",
      "stroke": "#000000",
      "strokeWidth": 1,
      "rotation": 0,
      "scaleX": 1,
      "scaleY": 1,
      "createdAt": "2023-12-01T10:30:00Z",
      "updatedAt": "2023-12-01T11:00:00Z",
      "ownerId": "user_456"
    }
  ],
  "objectCount": 1,
  "timestamp": "2023-12-01T16:30:00Z"
}
```

---

### Object Management

#### `GET /objects`

List objects on a canvas.

**Required Permission:** `read_objects`

**Query Parameters:**
- `canvasId` (required) - Canvas ID to query
- `limit` (optional) - Maximum objects to return (default: 100, max: 500)
- `offset` (optional) - Number of objects to skip (default: 0)
- `type` (optional) - Filter by object type (`rectangle`, `circle`, `star`, `text`)

**Response:**
```json
{
  "objects": [
    {
      "id": "obj_789",
      "type": "rectangle",
      "canvasId": "canvas_123",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 150,
      "fill": "#3B82F6",
      "stroke": "#000000",
      "strokeWidth": 1,
      "rotation": 0,
      "scaleX": 1,
      "scaleY": 1,
      "createdAt": "2023-12-01T10:30:00Z",
      "updatedAt": "2023-12-01T11:00:00Z",
      "ownerId": "user_456"
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

#### `GET /objects/{id}`

Get a specific object.

**Required Permission:** `read_objects`

**Response:**
```json
{
  "id": "obj_789",
  "type": "rectangle",
  "canvasId": "canvas_123",
  "x": 100,
  "y": 100,
  "width": 200,
  "height": 150,
  "fill": "#3B82F6",
  "stroke": "#000000",
  "strokeWidth": 1,
  "rotation": 0,
  "scaleX": 1,
  "scaleY": 1,
  "createdAt": "2023-12-01T10:30:00Z",
  "updatedAt": "2023-12-01T11:00:00Z",
  "ownerId": "user_456"
}
```

#### `POST /objects`

Create a new object on a canvas.

**Required Permission:** `write_objects`

**Request Body:**
```json
{
  "canvasId": "canvas_123",
  "type": "rectangle",
  "x": 100,
  "y": 100,
  "width": 200,
  "height": 150,
  "fill": "#3B82F6",
  "stroke": "#000000",
  "strokeWidth": 1,
  "rotation": 0,
  "scaleX": 1,
  "scaleY": 1
}
```

**Object Types and Required Properties:**

**Rectangle:**
```json
{
  "type": "rectangle",
  "x": 100,
  "y": 100,
  "width": 200,
  "height": 150,
  "fill": "#3B82F6"
}
```

**Circle:**
```json
{
  "type": "circle",
  "x": 100,
  "y": 100,
  "radius": 75,
  "fill": "#EF4444"
}
```

**Star:**
```json
{
  "type": "star",
  "x": 100,
  "y": 100,
  "innerRadius": 30,
  "outerRadius": 60,
  "numPoints": 5,
  "fill": "#F59E0B"
}
```

**Text:**
```json
{
  "type": "text",
  "x": 100,
  "y": 100,
  "text": "Hello World",
  "fontSize": 16,
  "fontFamily": "Arial",
  "fill": "#000000"
}
```

**Response:** `201 Created`
```json
{
  "id": "obj_101",
  "type": "rectangle",
  "canvasId": "canvas_123",
  "x": 100,
  "y": 100,
  "width": 200,
  "height": 150,
  "fill": "#3B82F6",
  "stroke": "#000000",
  "strokeWidth": 1,
  "rotation": 0,
  "scaleX": 1,
  "scaleY": 1,
  "createdAt": "2023-12-01T16:45:00Z",
  "updatedAt": "2023-12-01T16:45:00Z",
  "ownerId": "user_456"
}
```

#### `PUT /objects/{id}`

Update an existing object.

**Required Permission:** `write_objects`

**Request Body:** (partial update supported)
```json
{
  "x": 150,
  "y": 150,
  "fill": "#EF4444"
}
```

**Response:** `200 OK` (same format as GET /objects/{id})

#### `DELETE /objects/{id}`

Delete an object.

**Required Permission:** `write_objects`

**Response:** `204 No Content`

---

### Batch Operations

#### `POST /objects/batch`

Create multiple objects in a single request.

**Required Permission:** `write_objects`

**Request Body:**
```json
{
  "canvasId": "canvas_123",
  "objects": [
    {
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 150,
      "fill": "#3B82F6"
    },
    {
      "type": "circle",
      "x": 300,
      "y": 200,
      "radius": 50,
      "fill": "#EF4444"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "count": 2,
  "objects": [
    {
      "id": "obj_102",
      "type": "rectangle",
      "canvasId": "canvas_123",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 150,
      "fill": "#3B82F6",
      "createdAt": "2023-12-01T17:00:00Z",
      "ownerId": "user_456"
    },
    {
      "id": "obj_103",
      "type": "circle",
      "canvasId": "canvas_123",
      "x": 300,
      "y": 200,
      "radius": 50,
      "fill": "#EF4444",
      "createdAt": "2023-12-01T17:00:00Z",
      "ownerId": "user_456"
    }
  ]
}
```

#### `PUT /objects/batch`

Update multiple objects in a single request.

**Required Permission:** `write_objects`

**Request Body:**
```json
{
  "updates": [
    {
      "id": "obj_102",
      "x": 150,
      "fill": "#10B981"
    },
    {
      "id": "obj_103",
      "y": 250,
      "radius": 60
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "count": 2,
  "objects": [
    {
      "id": "obj_102",
      "type": "rectangle",
      "canvasId": "canvas_123",
      "x": 150,
      "y": 100,
      "width": 200,
      "height": 150,
      "fill": "#10B981",
      "updatedAt": "2023-12-01T17:15:00Z",
      "ownerId": "user_456"
    },
    {
      "id": "obj_103",
      "type": "circle",
      "canvasId": "canvas_123",
      "x": 300,
      "y": 250,
      "radius": 60,
      "fill": "#EF4444",
      "updatedAt": "2023-12-01T17:15:00Z",
      "ownerId": "user_456"
    }
  ]
}
```

#### `DELETE /objects/batch`

Delete multiple objects in a single request.

**Required Permission:** `write_objects`

**Request Body:**
```json
{
  "ids": ["obj_102", "obj_103"]
}
```

**Response:** `200 OK`
```json
{
  "count": 2,
  "deletedIds": ["obj_102", "obj_103"]
}
```

---

### AI Agent

#### `POST /agent`

Send a natural language request to the AI agent.

**Required Permission:** `agent_requests`

**Request Body:**
```json
{
  "canvasId": "canvas_123",
  "prompt": "Create a blue rectangle at position 100, 100 with size 200x150",
  "context": {
    "includeObjects": true,
    "maxObjects": 10
  }
}
```

**Response:** `200 OK`
```json
{
  "response": "I've created a blue rectangle at position (100, 100) with dimensions 200x150.",
  "actions": [
    {
      "type": "create_object",
      "object": {
        "type": "rectangle",
        "x": 100,
        "y": 100,
        "width": 200,
        "height": 150,
        "fill": "#3B82F6"
      },
      "result": {
        "id": "obj_104",
        "success": true
      }
    }
  ],
  "usage": {
    "inputTokens": 45,
    "outputTokens": 23,
    "totalTokens": 68
  }
}
```

#### `GET /agent/health`

Check AI agent status.

**Required Permission:** `agent_requests`

**Response:**
```json
{
  "status": "healthy",
  "enabled": true,
  "configured": true,
  "model": "gpt-4o-mini",
  "timestamp": 1703123456789
}
```

---

### Token Management

#### `GET /tokens`

List API tokens for the authenticated user.

**Required Permission:** None (own tokens only)

**Response:**
```json
{
  "tokens": [
    {
      "id": "token_123",
      "name": "My App Token",
      "scopes": ["read_objects", "write_objects"],
      "canvasId": "canvas_123",
      "createdAt": "2023-12-01T10:00:00Z",
      "expiresAt": "2024-03-01T10:00:00Z",
      "lastUsedAt": "2023-12-01T16:30:00Z",
      "usageCount": 42,
      "isActive": true
    }
  ]
}
```

#### `POST /tokens`

Create a new API token.

**Required Permission:** None (creates token for authenticated user)

**Request Body:**
```json
{
  "name": "My New Token",
  "scopes": ["read_objects", "write_objects", "agent_requests"],
  "canvasId": "canvas_123",
  "expiresIn": "90d"
}
```

**Available Scopes:**
- `read_canvases` - List and read canvas metadata
- `write_canvases` - Create and update canvases
- `delete_canvases` - Delete canvases (owner only)
- `read_objects` - Read canvas objects
- `write_objects` - Create, update, delete objects
- `agent_requests` - Use AI agent
- `canvas_access` - Access specific canvas (when canvasId specified)

**Expiration Options:**
- `1h`, `1d`, `7d`, `30d`, `90d`, `1y`, `never`

**Response:** `201 Created`
```json
{
  "id": "token_456",
  "name": "My New Token",
  "token": "ct_1234567890abcdef...", 
  "scopes": ["read_objects", "write_objects", "agent_requests"],
  "canvasId": "canvas_123",
  "createdAt": "2023-12-01T17:30:00Z",
  "expiresAt": "2024-03-01T17:30:00Z",
  "isActive": true
}
```

> ⚠️ **Important**: The `token` field is only returned once when creating the token. Store it securely!

#### `PUT /tokens/{id}`

Update a token (name, scopes, or revoke).

**Required Permission:** None (own tokens only)

**Request Body:**
```json
{
  "name": "Updated Token Name",
  "isActive": false
}
```

**Response:** `200 OK` (same format as GET /tokens)

#### `DELETE /tokens/{id}`

Delete/revoke a token.

**Required Permission:** None (own tokens only)

**Response:** `204 No Content`

---

## Validation Rules

### Object Validation

**Position and Size:**
- `x`, `y` - Must be numbers, can be negative
- `width`, `height` - Must be positive numbers > 0
- `radius` - Must be positive number > 0
- `rotation` - Number in degrees (0-360)
- `scaleX`, `scaleY` - Must be positive numbers > 0

**Colors:**
- `fill`, `stroke` - Valid hex colors (#RRGGBB or #RGB) or CSS color names
- `strokeWidth` - Must be non-negative number

**Text Objects:**
- `text` - String, max 1000 characters
- `fontSize` - Number between 8 and 200
- `fontFamily` - String, max 100 characters

**Star Objects:**
- `numPoints` - Integer between 3 and 20
- `innerRadius`, `outerRadius` - Positive numbers, outerRadius > innerRadius

---

## SDK Examples

### JavaScript/Node.js

```javascript
const CollabCanvas = require('collabcanvas-sdk');
const client = new CollabCanvas('your_api_token');

// Get canvas snapshot
const snapshot = await client.canvases.getSnapshot('canvas_123');

// Create object
const rectangle = await client.objects.create({
  canvasId: 'canvas_123',
  type: 'rectangle',
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  fill: '#3B82F6'
});
```

### Python

```python
from collabcanvas import CollabCanvas
client = CollabCanvas('your_api_token')

# Get canvas snapshot
snapshot = client.canvases.get_snapshot('canvas_123')

# Create object
rectangle = client.objects.create({
    'canvasId': 'canvas_123',
    'type': 'rectangle',
    'x': 100,
    'y': 100,
    'width': 200,
    'height': 150,
    'fill': '#3B82F6'
})
```

---

## Interactive Documentation

For interactive API exploration, visit:
- **Swagger UI**: `https://your-project.web.app/api/docs`
- **Postman Collection**: [Download Collection](./postman-collection.json)

---

## See Also

- [Getting Started Guide](./getting-started.md) - Quick 5-minute setup
- [Code Examples](./examples.md) - Comprehensive usage examples
- [Authentication Guide](./authentication.md) - Token management
- [Rate Limits Guide](./rate-limits.md) - Rate limiting details
- [Workflows Guide](./workflows.md) - API + AI integration patterns
