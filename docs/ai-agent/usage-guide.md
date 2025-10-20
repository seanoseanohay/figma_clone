# AI Agent Usage Guide

Complete guide to using the CollabCanvas AI Agent for automated canvas manipulation.

---

## Overview

The CollabCanvas AI Agent allows you to create, modify, and organize canvas objects using natural language commands. It's powered by OpenAI's GPT models and provides intelligent canvas manipulation capabilities.

### What the AI Agent Can Do

- **Create Objects**: Generate rectangles, circles, stars, and text based on descriptions
- **Modify Objects**: Update colors, positions, sizes, and other properties
- **Organize Content**: Arrange objects in patterns, align elements, create layouts
- **Batch Operations**: Perform multiple actions in a single request
- **Context-Aware**: Understands existing canvas content and maintains design consistency

---

## Getting Started

### Prerequisites

1. **API Token** with `agent_requests` permission
2. **Canvas Access** - Token must have access to target canvas
3. **OpenAI Integration** - Server must be configured with OpenAI API key

See [AI Agent Setup Guide](./setup.md) for configuration details.

### Basic Usage

```javascript
const response = await fetch('https://your-project.web.app/api/agent', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_api_token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    canvasId: 'your_canvas_id',
    prompt: 'Create a blue rectangle at position 100, 100'
  })
});

const result = await response.json();
console.log(result.response); // AI's text response
console.log(result.actions);  // Actions performed
```

---

## Prompt Engineering

### Effective Prompt Structure

**Best Practice Format:**
```
[Action] [Object Type] [Properties] [Location/Context]
```

**Examples:**
- ✅ "Create a blue rectangle at position 100, 100 with size 200x150"
- ✅ "Add a red circle with radius 50 in the center of the canvas"
- ✅ "Make a yellow star with 6 points at coordinates (300, 200)"

### Action Verbs

**Creation Commands:**
- `create`, `add`, `make`, `draw`, `place`
- `generate`, `build`, `insert`

**Modification Commands:**
- `change`, `update`, `modify`, `edit`
- `move`, `resize`, `rotate`, `scale`
- `color`, `paint`, `fill`

**Organization Commands:**
- `arrange`, `align`, `organize`, `layout`
- `group`, `distribute`, `space`

### Object Types

**Shapes:**
- `rectangle`, `square`, `box`
- `circle`, `oval`, `ellipse`
- `star`, `polygon`

**Text:**
- `text`, `label`, `title`, `heading`

**Collections:**
- `grid`, `row`, `column`, `pattern`
- `layout`, `design`, `composition`

---

## Command Examples

### Basic Object Creation

#### Rectangles
```javascript
// Simple rectangle
{
  "prompt": "Create a blue rectangle"
}

// Positioned rectangle
{
  "prompt": "Add a red rectangle at 100, 100 with size 200x150"
}

// Styled rectangle
{
  "prompt": "Make a green rectangle with black border, 300 pixels wide"
}
```

#### Circles
```javascript
// Simple circle
{
  "prompt": "Create a yellow circle"
}

// Positioned circle
{
  "prompt": "Add a purple circle with radius 75 at coordinates (200, 200)"
}

// Multiple circles
{
  "prompt": "Create 3 blue circles in a row, spaced 100 pixels apart"
}
```

#### Stars
```javascript
// Basic star
{
  "prompt": "Create a gold star"
}

// Custom star
{
  "prompt": "Make a 6-pointed red star at position 300, 150"
}

// Star pattern
{
  "prompt": "Create 5 small stars arranged in a circle"
}
```

#### Text Objects
```javascript
// Simple text
{
  "prompt": "Add the text 'Hello World'"
}

// Styled text
{
  "prompt": "Create large blue text saying 'Welcome' at the top center"
}

// Multiple text elements
{
  "prompt": "Add a title 'My Design' and subtitle 'Version 1.0' below it"
}
```

### Layout and Arrangement

#### Grids and Patterns
```javascript
// Grid layout
{
  "prompt": "Create a 3x3 grid of small squares, different colors"
}

// Linear arrangement
{
  "prompt": "Arrange 5 circles in a horizontal line with equal spacing"
}

// Pattern creation
{
  "prompt": "Make a checkerboard pattern with alternating red and black squares"
}
```

#### Alignment and Organization
```javascript
// Center alignment
{
  "prompt": "Create a large rectangle in the center of the canvas"
}

// Relative positioning
{
  "prompt": "Add a small circle above the existing rectangle"
}

// Symmetrical layout
{
  "prompt": "Create matching blue rectangles on the left and right sides"
}
```

### Modifications

#### Color Changes
```javascript
// Single object
{
  "prompt": "Change the blue rectangle to green"
}

// Multiple objects
{
  "prompt": "Make all circles red"
}

// Color schemes
{
  "prompt": "Use a warm color palette for all objects"
}
```

#### Size and Position
```javascript
// Resize
{
  "prompt": "Make the largest rectangle twice as big"
}

// Reposition
{
  "prompt": "Move all stars to the right side of the canvas"
}

// Transform
{
  "prompt": "Rotate the text 45 degrees"
}
```

### Complex Operations

#### Data Visualization
```javascript
{
  "prompt": "Create a bar chart with 5 bars representing values 10, 25, 15, 30, 20"
}

{
  "prompt": "Make a pie chart showing 3 segments: 50% blue, 30% red, 20% green"
}
```

#### UI Mockups
```javascript
{
  "prompt": "Create a button layout with 3 blue buttons labeled 'Save', 'Cancel', 'OK'"
}

{
  "prompt": "Design a simple card with a title, image placeholder, and description area"
}
```

#### Artistic Compositions
```javascript
{
  "prompt": "Create an abstract composition with overlapping colorful circles"
}

{
  "prompt": "Design a geometric pattern using triangles and hexagons"
}
```

---

## Context and Intelligence

### Canvas Awareness

The AI agent understands existing canvas content:

```javascript
// Context-aware creation
{
  "prompt": "Add a matching circle next to the existing rectangle",
  "context": {
    "includeObjects": true,
    "maxObjects": 10
  }
}

// Relative operations
{
  "prompt": "Create a border around all existing objects"
}

// Style consistency
{
  "prompt": "Add a new shape that matches the color scheme of existing objects"
}
```

### Context Options

```javascript
{
  "canvasId": "canvas_123",
  "prompt": "Your command here",
  "context": {
    "includeObjects": true,    // Include existing objects in context
    "maxObjects": 10,          // Limit objects for context (performance)
    "includeCanvas": true,     // Include canvas metadata
    "preserveStyle": true      // Maintain existing visual style
  }
}
```

---

## Advanced Techniques

### Multi-Step Operations

```javascript
// Complex scene creation
{
  "prompt": "Create a simple landscape: blue sky rectangle at top, green grass at bottom, yellow sun circle in sky, brown tree rectangles on grass"
}

// UI wireframe
{
  "prompt": "Design a login form: header text 'Login', two input rectangles labeled 'Username' and 'Password', blue 'Submit' button below"
}
```

### Conditional Logic

```javascript
// Conditional creation
{
  "prompt": "If there are no red objects, create a red circle. Otherwise, create a blue square"
}

// Adaptive sizing
{
  "prompt": "Create a rectangle that fits in the remaining empty space"
}
```

### Style Inheritance

```javascript
// Match existing styles
{
  "prompt": "Create a new object with the same style as the blue rectangle"
}

// Style variations
{
  "prompt": "Make 3 variations of the existing star with different colors"
}
```

---

## Response Format

### Successful Response

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
        "id": "obj_123",
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

### Action Types

- **`create_object`** - Created new object
- **`update_object`** - Modified existing object
- **`delete_object`** - Removed object
- **`create_objects_batch`** - Created multiple objects
- **`update_objects_batch`** - Modified multiple objects
- **`no_action`** - Responded without making changes

### Error Handling

```json
{
  "response": "I couldn't complete that action because the canvas doesn't exist.",
  "actions": [],
  "error": {
    "message": "Canvas not found",
    "code": "CANVAS_NOT_FOUND"
  },
  "usage": {
    "inputTokens": 20,
    "outputTokens": 15,
    "totalTokens": 35
  }
}
```

---

## Best Practices

### 1. Be Specific

❌ **Vague:** "Add some shapes"
✅ **Specific:** "Create 3 blue circles, each with radius 50, arranged horizontally"

### 2. Provide Context

❌ **No context:** "Make it bigger"
✅ **With context:** "Make the red rectangle twice as wide"

### 3. Use Clear Object References

❌ **Ambiguous:** "Change the thing"
✅ **Clear:** "Change the blue circle to green"

### 4. Break Down Complex Requests

❌ **Too complex:** "Create a complete dashboard with charts, buttons, text, navigation, sidebar, and footer"
✅ **Broken down:** Start with "Create a header section with title 'Dashboard'" then add components step by step

### 5. Specify Measurements

❌ **Vague:** "Make a big rectangle"
✅ **Specific:** "Create a rectangle 300 pixels wide and 200 pixels tall"

---

## Limitations

### Current Limitations

1. **Object Types**: Limited to rectangles, circles, stars, and text
2. **Complex Shapes**: Cannot create custom paths or complex geometries
3. **Images**: Cannot handle image uploads or manipulations
4. **Animations**: No support for animations or transitions
5. **Advanced Text**: Limited text formatting options

### Performance Considerations

- **Token Limits**: Keep prompts under 1000 characters for best performance
- **Context Limits**: Including too many objects in context may slow responses
- **Rate Limits**: 10 AI agent requests per minute
- **Canvas Size**: Very large canvases (1000+ objects) may affect performance

---

## Troubleshooting

### Common Issues

**"I don't understand that command"**
- Make the command more specific
- Use standard shape names (rectangle, circle, star)
- Check spelling and grammar

**"I can't find that object"**
- Use more specific object descriptions
- Include colors or positions in references
- Ensure the object exists on the canvas

**"That operation isn't supported"**
- Check the limitations section
- Break complex requests into simpler steps
- Use supported object types and properties

**Rate limit exceeded**
- Wait 60 seconds between requests
- Consider batching multiple operations in one prompt
- Use the API directly for high-frequency operations

---

## Integration Examples

### With Existing Applications

```javascript
// Integrate with your app
class CanvasAI {
  constructor(apiToken, canvasId) {
    this.apiToken = apiToken;
    this.canvasId = canvasId;
    this.baseUrl = 'https://your-project.web.app/api';
  }

  async createObjects(description) {
    const response = await fetch(`${this.baseUrl}/agent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        canvasId: this.canvasId,
        prompt: description,
        context: { includeObjects: true }
      })
    });

    return await response.json();
  }

  async generateLayout(requirements) {
    return this.createObjects(`Create a layout with: ${requirements}`);
  }

  async modifyDesign(changes) {
    return this.createObjects(`Make these changes: ${changes}`);
  }
}

// Usage
const ai = new CanvasAI('your_token', 'canvas_123');
await ai.generateLayout('header, main content area, sidebar, footer');
await ai.modifyDesign('make the header blue and add a logo placeholder');
```

---

## See Also

- [AI Agent Setup Guide](./setup.md) - Configuration and installation
- [API Reference](../api/reference.md) - Complete API documentation
- [Workflows Guide](../api/workflows.md) - API + AI integration patterns
- [Code Examples](../api/examples.md) - Implementation examples
