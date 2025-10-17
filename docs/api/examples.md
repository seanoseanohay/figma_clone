# CollabCanvas API - Code Examples

Comprehensive code examples for common use cases.

---

## Table of Contents

- [JavaScript Examples](#javascript-examples)
- [Python Examples](#python-examples)
- [AI Agent Integration](#ai-agent-integration)
- [Batch Operations](#batch-operations)
- [Error Handling](#error-handling)

---

## JavaScript Examples

### Complete API Client

```javascript
class CollabCanvasClient {
  constructor(apiToken, baseUrl = 'https://your-project.web.app/api') {
    this.apiToken = apiToken;
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }

  // Canvas operations
  async listCanvases() {
    return await this.request('/canvases');
  }

  async getCanvas(canvasId) {
    return await this.request(`/canvases/${canvasId}`);
  }

  async getCanvasSnapshot(canvasId) {
    return await this.request(`/canvases/${canvasId}/snapshot`);
  }

  async createCanvas(name, description = '') {
    return await this.request('/canvases', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
  }

  // Object operations
  async listObjects(canvasId) {
    return await this.request(`/objects?canvasId=${canvasId}`);
  }

  async createObject(objectData) {
    return await this.request('/objects', {
      method: 'POST',
      body: JSON.stringify(objectData)
    });
  }

  async updateObject(objectId, updates) {
    return await this.request(`/objects/${objectId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteObject(objectId) {
    return await this.request(`/objects/${objectId}`, {
      method: 'DELETE'
    });
  }

  // Batch operations
  async createObjectsBatch(canvasId, objects) {
    return await this.request('/objects/batch', {
      method: 'POST',
      body: JSON.stringify({ canvasId, objects })
    });
  }

  async updateObjectsBatch(updates) {
    return await this.request('/objects/batch', {
      method: 'PUT',
      body: JSON.stringify({ updates })
    });
  }

  async deleteObjectsBatch(ids) {
    return await this.request('/objects/batch', {
      method: 'DELETE',
      body: JSON.stringify({ ids })
    });
  }
}

// Usage
const client = new CollabCanvasClient('your_api_token_here');

// Get canvas snapshot
const snapshot = await client.getCanvasSnapshot('canvas_id');
console.log(`Canvas has ${snapshot.objectCount} objects`);

// Create a rectangle
const rect = await client.createObject({
  canvasId: 'canvas_id',
  type: 'rectangle',
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  fill: '#3B82F6'
});
```

### Create Multiple Objects

```javascript
// Create a grid of rectangles
async function createGrid(canvasId, rows, cols) {
  const client = new CollabCanvasClient('your_api_token_here');
  const objects = [];
  const spacing = 120;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      objects.push({
        type: 'rectangle',
        x: col * spacing + 50,
        y: row * spacing + 50,
        width: 100,
        height: 100,
        fill: `hsl(${(row * cols + col) * 30}, 70%, 60%)`
      });
    }
  }

  const result = await client.createObjectsBatch(canvasId, objects);
  console.log(`Created ${result.count} objects`);
  return result.objects;
}

// Usage
await createGrid('canvas_id', 5, 5); // 5x5 grid = 25 rectangles
```

---

## Python Examples

### Complete API Client

```python
import requests
from typing import List, Dict, Optional

class CollabCanvasClient:
    def __init__(self, api_token: str, base_url: str = 'https://your-project.web.app/api'):
        self.api_token = api_token
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json'
        })

    def _request(self, method: str, endpoint: str, **kwargs) -> Optional[Dict]:
        url = f'{self.base_url}{endpoint}'
        response = self.session.request(method, url, **kwargs)
        
        if not response.ok:
            error_data = response.json()
            raise Exception(error_data.get('error', {}).get('message', 'API request failed'))
        
        if response.status_code == 204:
            return None
        
        return response.json()

    # Canvas operations
    def list_canvases(self) -> Dict:
        return self._request('GET', '/canvases')

    def get_canvas(self, canvas_id: str) -> Dict:
        return self._request('GET', f'/canvases/{canvas_id}')

    def get_canvas_snapshot(self, canvas_id: str) -> Dict:
        return self._request('GET', f'/canvases/{canvas_id}/snapshot')

    def create_canvas(self, name: str, description: str = '') -> Dict:
        return self._request('POST', '/canvases', json={
            'name': name,
            'description': description
        })

    # Object operations
    def list_objects(self, canvas_id: str) -> Dict:
        return self._request('GET', f'/objects?canvasId={canvas_id}')

    def create_object(self, object_data: Dict) -> Dict:
        return self._request('POST', '/objects', json=object_data)

    def update_object(self, object_id: str, updates: Dict) -> Dict:
        return self._request('PUT', f'/objects/{object_id}', json=updates)

    def delete_object(self, object_id: str) -> None:
        return self._request('DELETE', f'/objects/{object_id}')

    # Batch operations
    def create_objects_batch(self, canvas_id: str, objects: List[Dict]) -> Dict:
        return self._request('POST', '/objects/batch', json={
            'canvasId': canvas_id,
            'objects': objects
        })

    def update_objects_batch(self, updates: List[Dict]) -> Dict:
        return self._request('PUT', '/objects/batch', json={'updates': updates})

    def delete_objects_batch(self, ids: List[str]) -> Dict:
        return self._request('DELETE', '/objects/batch', json={'ids': ids})


# Usage
client = CollabCanvasClient('your_api_token_here')

# Get canvas snapshot
snapshot = client.get_canvas_snapshot('canvas_id')
print(f"Canvas has {snapshot['objectCount']} objects")

# Create a rectangle
rect = client.create_object({
    'canvasId': 'canvas_id',
    'type': 'rectangle',
    'x': 100,
    'y': 100,
    'width': 200,
    'height': 150,
    'fill': '#3B82F6'
})
```

### Data Visualization Example

```python
def create_bar_chart(canvas_id: str, data: List[float], labels: List[str]):
    """Create a simple bar chart on the canvas"""
    client = CollabCanvasClient('your_api_token_here')
    
    max_value = max(data)
    bar_width = 60
    spacing = 80
    max_height = 300
    
    objects = []
    
    for i, (value, label) in enumerate(zip(data, labels)):
        height = (value / max_value) * max_height
        
        # Bar
        objects.append({
            'type': 'rectangle',
            'x': i * spacing + 50,
            'y': 350 - height,
            'width': bar_width,
            'height': height,
            'fill': '#3B82F6'
        })
    
    result = client.create_objects_batch(canvas_id, objects)
    print(f"Created bar chart with {result['count']} bars")
    return result

# Usage
data = [23, 45, 12, 67, 34, 89, 56]
labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
create_bar_chart('canvas_id', data, labels)
```

---

## AI Agent Integration

### OpenAI Function Calling Example

```javascript
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const client = new CollabCanvasClient(process.env.COLLABCANVAS_TOKEN);
const CANVAS_ID = 'your_canvas_id';

// Define functions for OpenAI
const functions = [
  {
    name: 'create_rectangle',
    description: 'Create a rectangle on the canvas',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X coordinate' },
        y: { type: 'number', description: 'Y coordinate' },
        width: { type: 'number', description: 'Width' },
        height: { type: 'number', description: 'Height' },
        color: { type: 'string', description: 'Fill color (hex)' }
      },
      required: ['x', 'y', 'width', 'height']
    }
  },
  {
    name: 'list_objects',
    description: 'Get all objects on the canvas',
    parameters: { type: 'object', properties: {} }
  }
];

// Function handlers
const functionHandlers = {
  create_rectangle: async (args) => {
    return await client.createObject({
      canvasId: CANVAS_ID,
      type: 'rectangle',
      x: args.x,
      y: args.y,
      width: args.width,
      height: args.height,
      fill: args.color || '#808080'
    });
  },
  
  list_objects: async () => {
    return await client.listObjects(CANVAS_ID);
  }
};

// Chat with AI
async function chatWithAI(userMessage) {
  const messages = [
    {
      role: 'system',
      content: 'You are an AI assistant that helps users create designs on a canvas.'
    },
    {
      role: 'user',
      content: userMessage
    }
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages,
    functions,
    function_call: 'auto'
  });

  const choice = response.choices[0];
  
  if (choice.finish_reason === 'function_call') {
    const functionName = choice.message.function_call.name;
    const functionArgs = JSON.parse(choice.message.function_call.arguments);
    
    // Execute function
    const result = await functionHandlers[functionName](functionArgs);
    
    console.log(`AI called ${functionName}:`, result);
    return result;
  }

  return choice.message.content;
}

// Usage
await chatWithAI('Create a blue rectangle at position 100, 100 with size 200x150');
```

---

## Batch Operations

### Efficient Bulk Updates

```javascript
// Update positions of many objects at once
async function arrangeObjectsInCircle(canvasId, objectIds, centerX, centerY, radius) {
  const client = new CollabCanvasClient('your_api_token_here');
  
  const updates = objectIds.map((id, index) => {
    const angle = (index / objectIds.length) * 2 * Math.PI;
    return {
      id,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
  });

  const result = await client.updateObjectsBatch(updates);
  console.log(`Updated ${result.count} objects`);
  return result.objects;
}

// Usage
const objectIds = ['id1', 'id2', 'id3', 'id4', 'id5'];
await arrangeObjectsInCircle('canvas_id', objectIds, 400, 300, 150);
```

### Smart Batch Processing

```python
# Process objects in chunks to respect rate limits
def process_large_batch(client, canvas_id, objects, batch_size=100):
    """Process a large number of objects in manageable batches"""
    results = []
    
    for i in range(0, len(objects), batch_size):
        batch = objects[i:i + batch_size]
        result = client.create_objects_batch(canvas_id, batch)
        results.extend(result['objects'])
        print(f"Processed {len(results)}/{len(objects)} objects")
        
        # Rate limit: max 50 writes/min, so wait if needed
        if i + batch_size < len(objects):
            time.sleep(1.2)  # Conservative rate limiting
    
    return results

# Usage
large_dataset = [
    {'type': 'rectangle', 'x': i * 10, 'y': i * 10, 'width': 50, 'height': 50}
    for i in range(500)
]
process_large_batch(client, 'canvas_id', large_dataset)
```

---

## Error Handling

### Retry with Exponential Backoff

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on 4xx errors (except 429)
      if (error.message.includes('401') || 
          error.message.includes('403') ||
          error.message.includes('404')) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, i) * 1000;
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Usage
const result = await retryWithBackoff(async () => {
  return await client.createObject({
    canvasId: 'canvas_id',
    type: 'rectangle',
    x: 100,
    y: 100,
    width: 200,
    height: 150
  });
});
```

### Comprehensive Error Handling

```python
from requests.exceptions import RequestException
import time

def safe_api_call(func, *args, **kwargs):
    """Wrapper for safe API calls with error handling"""
    try:
        return func(*args, **kwargs)
    except RequestException as e:
        if e.response is not None:
            status_code = e.response.status_code
            
            if status_code == 401:
                print("Error: Invalid or expired token")
            elif status_code == 403:
                print("Error: Permission denied")
            elif status_code == 404:
                print("Error: Resource not found")
            elif status_code == 429:
                print("Error: Rate limit exceeded, waiting 60 seconds...")
                time.sleep(60)
                return safe_api_call(func, *args, **kwargs)  # Retry
            else:
                print(f"Error: API request failed with status {status_code}")
        else:
            print("Error: Network error or timeout")
        
        raise

# Usage
try:
    result = safe_api_call(
        client.create_object,
        {
            'canvasId': 'canvas_id',
            'type': 'rectangle',
            'x': 100,
            'y': 100,
            'width': 200,
            'height': 150
        }
    )
except Exception as e:
    print(f"Failed after retries: {e}")
```

---

## More Examples

For more examples and use cases:
- Check the [Getting Started Guide](./getting-started.md)
- Explore the [Interactive API Documentation](https://your-project.web.app/api/docs)
- Review the [Rate Limits Guide](./rate-limits.md)

---

Happy coding! 🚀

