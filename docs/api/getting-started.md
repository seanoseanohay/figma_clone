# Getting Started with CollabCanvas API

## Quick Start: 5 Minutes to Your First API Call

This guide will have you making your first API call in just 5 minutes!

---

## Step 1: Generate an API Token (2 minutes)

1. **Log in to CollabCanvas**
   - Navigate to [CollabCanvas](https://your-project.web.app)
   - Sign in with your account

2. **Open API Token Manager**
   - Click on your profile icon in the header
   - Select "API Tokens" from the menu

3. **Generate a New Token**
   - Click "Generate New Token"
   - Fill in the form:
     - **Name**: `My First API Token`
     - **Canvas**: Select the canvas you want to access
     - **Permissions**: Leave all checked for full access
     - **Expires In**: 90 days
   - Click "Generate Token"

4. **Copy Your Token**
   - ⚠️ **IMPORTANT**: The token will only be shown once!
   - Click the copy button to copy it to your clipboard
   - Store it securely (password manager, environment variable, etc.)

---

## Step 2: Make Your First API Call (3 minutes)

### Using cURL

```bash
# Set your token as an environment variable
export COLLABCANVAS_TOKEN="your_token_here"

# Test the API is working
curl -H "Authorization: Bearer $COLLABCANVAS_TOKEN" \
  https://your-project.web.app/api/health

# Get your canvas details
curl -H "Authorization: Bearer $COLLABCANVAS_TOKEN" \
  https://your-project.web.app/api/canvases/YOUR_CANVAS_ID
```

### Using JavaScript

```javascript
const API_TOKEN = 'your_token_here';
const API_BASE = 'https://your-project.web.app/api';

// Test the API
const response = await fetch(`${API_BASE}/health`);
const health = await response.json();
console.log('API Status:', health);

// Get canvas snapshot
const canvasResponse = await fetch(
  `${API_BASE}/canvases/YOUR_CANVAS_ID/snapshot`,
  {
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`
    }
  }
);
const snapshot = await canvasResponse.json();
console.log('Canvas Objects:', snapshot.objects);
```

### Using Python

```python
import requests

API_TOKEN = 'your_token_here'
API_BASE = 'https://your-project.web.app/api'

headers = {
    'Authorization': f'Bearer {API_TOKEN}'
}

# Test the API
response = requests.get(f'{API_BASE}/health')
print('API Status:', response.json())

# Get canvas snapshot
canvas_response = requests.get(
    f'{API_BASE}/canvases/YOUR_CANVAS_ID/snapshot',
    headers=headers
)
snapshot = canvas_response.json()
print(f"Canvas has {snapshot['objectCount']} objects")
```

---

## Step 3: Create Your First Object

### JavaScript Example

```javascript
const API_TOKEN = 'your_token_here';
const API_BASE = 'https://your-project.web.app/api';
const CANVAS_ID = 'your_canvas_id';

async function createRectangle() {
  const response = await fetch(`${API_BASE}/objects`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      canvasId: CANVAS_ID,
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      fill: '#3B82F6' // Blue color
    })
  });

  const object = await response.json();
  console.log('Created object:', object);
  return object;
}

createRectangle();
```

### Python Example

```python
import requests

API_TOKEN = 'your_token_here'
API_BASE = 'https://your-project.web.app/api'
CANVAS_ID = 'your_canvas_id'

def create_rectangle():
    response = requests.post(
        f'{API_BASE}/objects',
        headers={
            'Authorization': f'Bearer {API_TOKEN}',
            'Content-Type': 'application/json'
        },
        json={
            'canvasId': CANVAS_ID,
            'type': 'rectangle',
            'x': 100,
            'y': 100,
            'width': 200,
            'height': 150,
            'fill': '#3B82F6'  # Blue color
        }
    )
    
    object_data = response.json()
    print('Created object:', object_data)
    return object_data

create_rectangle()
```

---

## Next Steps

### Explore More Endpoints

- **List all canvases**: `GET /api/canvases`
- **Get canvas snapshot**: `GET /api/canvases/{id}/snapshot`
- **List objects**: `GET /api/objects?canvasId={id}`
- **Update object**: `PUT /api/objects/{id}`
- **Delete object**: `DELETE /api/objects/{id}`
- **Batch operations**: `POST /api/objects/batch`

### Read Full Documentation

- [API Reference](https://your-project.web.app/api/docs) - Interactive Swagger UI
- [Code Examples](./examples.md) - More detailed examples
- [Rate Limits](./rate-limits.md) - Understanding rate limits
- [Authentication](./authentication.md) - Authentication details

### Build Something Cool!

Common use cases:
- **AI Assistants**: Generate designs programmatically
- **Automation**: Batch create/update objects
- **Integrations**: Connect with other tools
- **Data Visualization**: Create charts and diagrams
- **Monitoring**: Track canvas changes

---

## Troubleshooting

### Common Errors

**401 Unauthorized**
- Check that your token is valid and not expired
- Ensure you're including the `Authorization` header correctly
- Verify the token format: `Bearer YOUR_TOKEN`

**403 Forbidden**
- Your token doesn't have permission for this action
- Check that you're accessing the correct canvas
- Verify your token hasn't been revoked

**429 Rate Limit Exceeded**
- You've exceeded the rate limit (200 reads/min or 50 writes/min)
- Wait 60 seconds and try again
- Consider implementing exponential backoff

**404 Not Found**
- Check that the canvas/object ID is correct
- Verify you have access to the resource

### Need Help?

- Check the [API Documentation](https://your-project.web.app/api/docs)
- Review [Code Examples](./examples.md)
- Contact support: support@collabcanvas.example.com

---

## Security Best Practices

1. **Never commit tokens to version control**
   - Use environment variables
   - Use secrets management tools

2. **Store tokens securely**
   - Password managers
   - Environment variables
   - Encrypted configuration

3. **Rotate tokens regularly**
   - Generate new tokens periodically
   - Revoke old tokens when done

4. **Use minimal permissions**
   - Only grant permissions you need
   - Create separate tokens for different purposes

5. **Monitor token usage**
   - Check usage count regularly
   - Revoke if suspicious activity detected

---

Congratulations! You've made your first API call to CollabCanvas. Now go build something amazing! 🚀

