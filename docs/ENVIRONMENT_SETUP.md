# Environment Setup for AI Agent Integration

## Required Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# AI Agent Configuration
# OpenAI API Key for AI agent functionality
OPENAI_API_KEY=sk-your-openai-api-key-here

# AI Model Configuration  
AGENT_MODEL=gpt-4o-mini
AGENT_MAX_TOKENS=1000
AGENT_TEMPERATURE=0.1

# API Rate Limiting
AGENT_RATE_LIMIT_PER_MINUTE=10
AGENT_RATE_LIMIT_PER_HOUR=100

# AI Agent Features
AGENT_ENABLED=true
AGENT_DEBUG_MODE=false
```

## Firebase Functions Environment Variables

For Firebase Functions, set these using the Firebase CLI:

```bash
# Set OpenAI API key for functions
firebase functions:config:set openai.api_key="sk-your-openai-api-key-here"

# Set AI model configuration
firebase functions:config:set agent.model="gpt-4o-mini"
firebase functions:config:set agent.max_tokens="1000"
firebase functions:config:set agent.temperature="0.1"

# Set rate limiting
firebase functions:config:set agent.rate_limit_per_minute="10"
firebase functions:config:set agent.rate_limit_per_hour="100"

# Enable/disable features
firebase functions:config:set agent.enabled="true"
firebase functions:config:set agent.debug_mode="false"
```

## Token Permissions for Testing

### API Token Requirements
- **Read access**: Canvas objects, canvas metadata
- **Write access**: Canvas objects (for AI-generated shapes)
- **Rate limits**: 10 requests/minute, 100 requests/hour per token

### Test User Setup
For testing AI agent functionality:
1. Create API token with canvas read/write permissions
2. Use test canvas ID: Create a dedicated test canvas
3. Verify token has access to test canvas via existing API endpoints

### Example Token Test
```bash
# Test token access to canvas objects API
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
     -H "Content-Type: application/json" \
     "https://your-functions-url/api/objects?canvasId=test-canvas-id"
```

## Setup Commands

```bash
# Install dependencies (already done if you ran the setup)
npm install openai zod

# For Firebase Functions
cd functions && npm install openai

# Set Firebase environment variables
firebase functions:config:set openai.api_key="your-api-key"

# Deploy functions with new config
firebase deploy --only functions

# Test environment setup
npm run test:agent-config
```

## Troubleshooting

### Common Issues
1. **Missing API Key**: Ensure OPENAI_API_KEY is set in both client and functions
2. **Rate Limiting**: Check AGENT_RATE_LIMIT_* values are appropriate
3. **Model Access**: Verify your OpenAI account has access to the specified model
4. **Firebase Config**: Run `firebase functions:config:get` to verify settings

### Debug Mode
Enable AGENT_DEBUG_MODE=true to see detailed AI request/response logging.
