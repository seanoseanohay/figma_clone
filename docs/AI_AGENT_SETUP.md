# AI Agent Setup Guide

## Environment Variables Configuration

### Required Environment Variables

Create a `.env` file in your project root with these variables:

```bash
# ===========================================
# AI Agent Configuration (Stage 6+)
# ===========================================

# OpenAI API Configuration
OPENAI_API_KEY=sk-your_openai_api_key_here
AGENT_MODEL=gpt-4o-mini
AGENT_TEMPERATURE=0.1
AGENT_MAX_TOKENS=1000

# Agent Service Configuration  
VITE_AGENT_ENABLED=true
VITE_AGENT_MOCK_MODE=false

# Firebase Functions (for API endpoints)
VITE_API_BASE_URL=http://localhost:5001/your_project/us-central1
VITE_FUNCTIONS_BASE_URL=http://localhost:5001/your_project/us-central1
```

## API Token Permissions

### Required Permissions for AI Agent

When creating API tokens for AI agent access, ensure they have these permissions:

1. **`read_objects`** - Read canvas objects for context
2. **`write_objects`** - Create/modify/delete canvas objects  
3. **`agent_requests`** - Make requests to AI agent endpoint
4. **`canvas_access`** - Access specific canvas by ID

### Example Token Configuration

```javascript
// Token scopes for AI agent
const tokenScopes = "read_objects,write_objects,agent_requests,canvas_access";

// Create token via API
const token = await createApiToken({
  name: "AI Agent Token",
  scopes: tokenScopes.split(','),
  canvasId: "specific_canvas_id", // Optional: restrict to specific canvas
  expiresIn: "7d"
});
```

## Development Setup

### 1. Install Dependencies

AI dependencies are already installed in `package.json`:
- `openai`: OpenAI API client
- `zod`: Schema validation for AI responses

### 2. Configure OpenAI API Key

Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys):

1. Sign up/login to OpenAI
2. Navigate to API Keys section
3. Create a new API key
4. Add it to your `.env` file as `OPENAI_API_KEY`

### 3. Test Configuration

Test your setup with the health endpoint:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5001/your_project/us-central1/api/agent/health
```

Expected response:
```json
{
  "status": "healthy",
  "enabled": true,
  "configured": true,
  "model": "gpt-4o-mini",
  "timestamp": 1703123456789
}
```

## Mock Mode for Development

For development without OpenAI API key, enable mock mode:

```bash
VITE_AGENT_MOCK_MODE=true
```

This will use the `/api/agent/mock` endpoint which simulates AI responses for testing.

## Rate Limits

Default rate limits for AI agent:
- **10 requests/minute** per token for `/api/agent`
- **30 requests/minute** for general API usage

Configure with:
```bash
RATE_LIMIT_AGENT_REQUESTS_PER_MINUTE=10
```

## Model Configuration

Supported models:
- `gpt-4o-mini` (default, cost-effective)
- `gpt-4o` (more capable, higher cost)
- `gpt-3.5-turbo` (legacy support)

Configure with:
```bash
AGENT_MODEL=gpt-4o-mini
AGENT_TEMPERATURE=0.1
AGENT_MAX_TOKENS=1000
```

## Security Considerations

1. **API Key Security**: Never commit API keys to version control
2. **Token Validation**: All requests validate token permissions
3. **Rate Limiting**: Prevents abuse and controls costs
4. **Canvas Access**: Tokens can be restricted to specific canvases
5. **CORS Configuration**: Configure allowed origins for production

## Troubleshooting

### Common Issues

1. **"AI service not configured"**
   - Check `OPENAI_API_KEY` in environment
   - Verify API key is valid and has credits

2. **"Permission denied"**
   - Ensure token has required scopes
   - Check canvas access permissions

3. **"Rate limit exceeded"**
   - Wait before retrying
   - Consider upgrading OpenAI plan

4. **"Context length exceeded"**
   - Reduce number of objects on canvas
   - Use shorter prompts

### Debug Mode

Enable detailed logging:
```bash
NODE_ENV=development
```

This will log all AI requests/responses to console.
