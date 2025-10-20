# Rate Limits Guide

Comprehensive guide to understanding and handling CollabCanvas API rate limits.

---

## Overview

CollabCanvas implements rate limiting to ensure fair usage, prevent abuse, and maintain system performance. This guide explains how rate limits work and how to handle them effectively in your applications.

---

## Rate Limit Tiers

### Standard API Endpoints

| Operation Type | Limit | Window | Scope |
|---------------|-------|---------|-------|
| **Read Operations** | 200 requests | per minute | per API token |
| **Write Operations** | 50 requests | per minute | per API token |
| **AI Agent Requests** | 10 requests | per minute | per API token |
| **Authentication** | 100 requests | per minute | per IP address |

### Specific Endpoint Limits

| Endpoint | Method | Limit | Notes |
|----------|--------|-------|-------|
| `/health` | GET | Unlimited | No authentication required |
| `/canvases` | GET | 200/min | Counted as read operation |
| `/canvases` | POST | 50/min | Counted as write operation |
| `/objects` | GET | 200/min | Counted as read operation |
| `/objects` | POST | 50/min | Counted as write operation |
| `/objects/batch` | POST | 10/min | Special limit for batch operations |
| `/agent` | POST | 10/min | Separate AI agent limit |
| `/tokens` | POST | 5/min | Token creation limit |

---

## Rate Limit Headers

Every API response includes rate limit information in the headers:

```http
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 195
X-RateLimit-Reset: 1703123456
X-RateLimit-Type: read
```

### Header Descriptions

- **`X-RateLimit-Limit`**: Maximum requests allowed in the current window
- **`X-RateLimit-Remaining`**: Requests remaining in the current window
- **`X-RateLimit-Reset`**: Unix timestamp when the window resets
- **`X-RateLimit-Type`**: Type of rate limit (`read`, `write`, `agent`, `auth`)

---

## Rate Limit Responses

### 429 Too Many Requests

When you exceed a rate limit, you'll receive a `429` status code:

```json
{
  "error": {
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "code": "RATE_LIMIT_EXCEEDED",
    "details": {
      "limit": 200,
      "remaining": 0,
      "resetTime": 1703123456,
      "retryAfter": 60
    }
  }
}
```

### Rate Limit Types

Different operations may hit different rate limits:

```json
{
  "error": {
    "message": "Write operation rate limit exceeded",
    "code": "WRITE_RATE_LIMIT_EXCEEDED",
    "details": {
      "type": "write",
      "limit": 50,
      "window": "1 minute",
      "retryAfter": 45
    }
  }
}
```

---

## Handling Rate Limits

### 1. Basic Retry Logic

Simple retry with fixed delay:

```javascript
async function apiCallWithRetry(apiCall, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      if (error.message.includes('429')) {
        const retryAfter = error.details?.retryAfter || 60;
        console.log(`Rate limit hit, waiting ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      } else {
        // Non-rate-limit error, don't retry
        throw error;
      }
    }
  }
  
  throw lastError;
}

// Usage
const result = await apiCallWithRetry(async () => {
  return await client.createObject({
    canvasId: 'canvas_123',
    type: 'rectangle',
    x: 100,
    y: 100,
    width: 200,
    height: 150
  });
});
```

### 2. Exponential Backoff

More sophisticated retry strategy:

```javascript
class RateLimitHandler {
  async executeWithBackoff(apiCall, options = {}) {
    const {
      maxRetries = 5,
      baseDelay = 1000,
      maxDelay = 60000,
      backoffFactor = 2,
      jitter = true
    } = options;

    let attempt = 0;
    let delay = baseDelay;

    while (attempt < maxRetries) {
      try {
        return await apiCall();
      } catch (error) {
        attempt++;
        
        if (!this.isRateLimitError(error) || attempt >= maxRetries) {
          throw error;
        }

        // Calculate delay with exponential backoff
        delay = Math.min(delay * backoffFactor, maxDelay);
        
        // Add jitter to prevent thundering herd
        if (jitter) {
          delay += Math.random() * 1000;
        }

        console.log(`Rate limit exceeded, retry ${attempt}/${maxRetries} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  isRateLimitError(error) {
    return error.message.includes('429') || 
           error.message.includes('rate limit') ||
           error.code === 'RATE_LIMIT_EXCEEDED';
  }
}

// Usage
const handler = new RateLimitHandler();
const result = await handler.executeWithBackoff(() => 
  client.createObject(objectData)
);
```

### 3. Proactive Rate Limiting

Track and respect rate limits before they're hit:

```javascript
class RateLimiter {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async wait() {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(
      time => now - time < this.windowMs
    );

    // Check if we're at the limit
    if (this.requests.length >= this.limit) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.wait(); // Recursive call after waiting
      }
    }

    // Record this request
    this.requests.push(now);
  }
}

class ThrottledClient {
  constructor(apiToken) {
    this.client = new CollabCanvasClient(apiToken);
    this.readLimiter = new RateLimiter(200, 60000);   // 200/minute
    this.writeLimiter = new RateLimiter(50, 60000);   // 50/minute
    this.agentLimiter = new RateLimiter(10, 60000);   // 10/minute
  }

  async get(endpoint) {
    await this.readLimiter.wait();
    return this.client.request(endpoint);
  }

  async post(endpoint, data) {
    await this.writeLimiter.wait();
    return this.client.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async agentRequest(canvasId, prompt) {
    await this.agentLimiter.wait();
    return this.client.request('/agent', {
      method: 'POST',
      body: JSON.stringify({ canvasId, prompt })
    });
  }
}
```

---

## Rate Limit Strategies

### 1. Request Queuing

Queue requests to avoid exceeding limits:

```javascript
class RequestQueue {
  constructor(client, requestsPerMinute = 50) {
    this.client = client;
    this.queue = [];
    this.isProcessing = false;
    this.requestsPerMinute = requestsPerMinute;
    this.intervalMs = 60000 / requestsPerMinute; // Time between requests
  }

  async enqueue(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const { request, resolve, reject } = this.queue.shift();
      
      try {
        const result = await request();
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Wait between requests to stay under rate limit
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.intervalMs));
      }
    }

    this.isProcessing = false;
  }
}

// Usage
const queue = new RequestQueue(client, 45); // Conservative limit

// Queue multiple requests
const promises = objects.map(obj => 
  queue.enqueue(() => client.createObject(obj))
);

const results = await Promise.all(promises);
```

### 2. Batch Operations

Use batch endpoints to reduce request count:

```javascript
class BatchOptimizer {
  constructor(client, batchSize = 100) {
    this.client = client;
    this.batchSize = batchSize;
  }

  async createObjectsOptimized(canvasId, objects) {
    const results = [];
    
    // Process in batches
    for (let i = 0; i < objects.length; i += this.batchSize) {
      const batch = objects.slice(i, i + this.batchSize);
      
      try {
        const batchResult = await this.client.createObjectsBatch(canvasId, batch);
        results.push(...batchResult.objects);
      } catch (error) {
        if (error.message.includes('429')) {
          // If batch fails due to rate limit, try individual requests
          console.log('Batch rate limited, falling back to individual requests');
          
          for (const obj of batch) {
            try {
              const result = await this.client.createObject({
                canvasId,
                ...obj
              });
              results.push(result);
              
              // Small delay between individual requests
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (individualError) {
              console.error('Failed to create object:', individualError);
            }
          }
        } else {
          throw error;
        }
      }
    }

    return results;
  }
}
```

### 3. Adaptive Rate Limiting

Adjust request rate based on server responses:

```javascript
class AdaptiveRateLimiter {
  constructor(initialRate = 50) {
    this.currentRate = initialRate;
    this.minRate = 5;
    this.maxRate = 200;
    this.successCount = 0;
    this.failureCount = 0;
  }

  async execute(apiCall) {
    const startTime = Date.now();
    
    try {
      const result = await apiCall();
      this.onSuccess();
      return result;
    } catch (error) {
      if (error.message.includes('429')) {
        this.onRateLimit();
        
        // Wait and retry
        const retryAfter = error.details?.retryAfter || 60;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.execute(apiCall);
      } else {
        this.onError();
        throw error;
      }
    }
  }

  onSuccess() {
    this.successCount++;
    
    // Gradually increase rate after consecutive successes
    if (this.successCount >= 10) {
      this.currentRate = Math.min(this.currentRate * 1.1, this.maxRate);
      this.successCount = 0;
    }
  }

  onRateLimit() {
    this.failureCount++;
    
    // Decrease rate aggressively after rate limit
    this.currentRate = Math.max(this.currentRate * 0.5, this.minRate);
    this.successCount = 0;
  }

  onError() {
    // Slight decrease for other errors
    this.currentRate = Math.max(this.currentRate * 0.9, this.minRate);
  }

  getDelay() {
    return 60000 / this.currentRate; // Milliseconds between requests
  }
}
```

---

## Monitoring Rate Limits

### 1. Rate Limit Tracking

Track your rate limit usage:

```javascript
class RateLimitMonitor {
  constructor() {
    this.stats = {
      totalRequests: 0,
      rateLimitHits: 0,
      currentLimits: {},
      recentRequests: []
    };
  }

  recordRequest(response, requestType = 'unknown') {
    this.stats.totalRequests++;
    
    const now = Date.now();
    this.stats.recentRequests.push({
      timestamp: now,
      type: requestType,
      limit: response.headers['x-ratelimit-limit'],
      remaining: response.headers['x-ratelimit-remaining'],
      reset: response.headers['x-ratelimit-reset']
    });

    // Keep only last 100 requests
    if (this.stats.recentRequests.length > 100) {
      this.stats.recentRequests = this.stats.recentRequests.slice(-100);
    }

    // Update current limits
    const limitType = response.headers['x-ratelimit-type'] || 'general';
    this.stats.currentLimits[limitType] = {
      limit: parseInt(response.headers['x-ratelimit-limit']),
      remaining: parseInt(response.headers['x-ratelimit-remaining']),
      resetTime: parseInt(response.headers['x-ratelimit-reset'])
    };
  }

  recordRateLimitHit() {
    this.stats.rateLimitHits++;
  }

  getUsageReport() {
    const hitRate = (this.stats.rateLimitHits / this.stats.totalRequests) * 100;
    
    return {
      totalRequests: this.stats.totalRequests,
      rateLimitHits: this.stats.rateLimitHits,
      hitRate: `${hitRate.toFixed(2)}%`,
      currentLimits: this.stats.currentLimits,
      recentActivity: this.getRecentActivity()
    };
  }

  getRecentActivity() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recentRequests = this.stats.recentRequests.filter(
      req => req.timestamp > fiveMinutesAgo
    );

    const byType = recentRequests.reduce((acc, req) => {
      acc[req.type] = (acc[req.type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalLast5Minutes: recentRequests.length,
      byType
    };
  }
}

// Usage
const monitor = new RateLimitMonitor();

// Wrap API calls to track usage
async function monitoredApiCall(apiCall, requestType) {
  try {
    const response = await apiCall();
    monitor.recordRequest(response, requestType);
    return response;
  } catch (error) {
    if (error.message.includes('429')) {
      monitor.recordRateLimitHit();
    }
    throw error;
  }
}
```

### 2. Health Checks

Regular health checks to monitor API status:

```javascript
class ApiHealthChecker {
  constructor(client) {
    this.client = client;
    this.healthHistory = [];
  }

  async checkHealth() {
    const startTime = Date.now();
    
    try {
      const response = await this.client.request('/health');
      const duration = Date.now() - startTime;
      
      this.recordHealthCheck({
        timestamp: new Date(),
        status: 'healthy',
        responseTime: duration,
        details: response
      });

      return { healthy: true, responseTime: duration };
    } catch (error) {
      this.recordHealthCheck({
        timestamp: new Date(),
        status: 'unhealthy',
        error: error.message
      });

      return { healthy: false, error: error.message };
    }
  }

  recordHealthCheck(result) {
    this.healthHistory.push(result);
    
    // Keep only last 100 checks
    if (this.healthHistory.length > 100) {
      this.healthHistory = this.healthHistory.slice(-100);
    }
  }

  getHealthReport() {
    const recent = this.healthHistory.slice(-20); // Last 20 checks
    const healthy = recent.filter(check => check.status === 'healthy').length;
    const uptime = (healthy / recent.length) * 100;

    return {
      uptime: `${uptime.toFixed(1)}%`,
      recentChecks: recent.length,
      healthyChecks: healthy,
      averageResponseTime: this.getAverageResponseTime(recent)
    };
  }

  getAverageResponseTime(checks) {
    const withResponseTime = checks.filter(check => check.responseTime);
    if (withResponseTime.length === 0) return null;

    const total = withResponseTime.reduce((sum, check) => sum + check.responseTime, 0);
    return Math.round(total / withResponseTime.length);
  }
}
```

---

## Best Practices

### 1. Respect Rate Limits

- Always check rate limit headers in responses
- Implement proper retry logic with exponential backoff
- Use batch operations when possible
- Cache responses to reduce API calls

### 2. Optimize Request Patterns

```javascript
// ❌ Bad: Many individual requests
for (const obj of objects) {
  await client.createObject(obj);
}

// ✅ Good: Batch requests
await client.createObjectsBatch(canvasId, objects);
```

### 3. Handle Errors Gracefully

```javascript
// ❌ Bad: Fail immediately on rate limit
try {
  await client.createObject(obj);
} catch (error) {
  throw error; // Gives up immediately
}

// ✅ Good: Retry with backoff
async function resilientCreate(obj, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.createObject(obj);
    } catch (error) {
      if (error.message.includes('429') && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

### 4. Monitor and Alert

- Set up monitoring for rate limit hit rates
- Alert when hit rates exceed acceptable thresholds
- Track API usage patterns to optimize application behavior

---

## Rate Limit Troubleshooting

### Common Issues

**High Rate Limit Hit Rate**
- Implement request queuing or throttling
- Use batch operations
- Cache frequently accessed data
- Review application logic for unnecessary API calls

**Sporadic Rate Limit Errors**
- Implement exponential backoff
- Add jitter to retry delays
- Monitor for traffic spikes

**Batch Operations Rate Limited**
- Reduce batch sizes
- Add delays between batch requests
- Fall back to individual requests when batches fail

### Debugging Tools

```javascript
// Rate limit debugging utility
class RateLimitDebugger {
  static logRateLimitInfo(response) {
    const headers = response.headers;
    console.log('Rate Limit Info:', {
      limit: headers['x-ratelimit-limit'],
      remaining: headers['x-ratelimit-remaining'],
      reset: new Date(headers['x-ratelimit-reset'] * 1000),
      type: headers['x-ratelimit-type']
    });
  }

  static calculateOptimalDelay(remaining, resetTime) {
    const now = Date.now() / 1000;
    const timeToReset = resetTime - now;
    
    if (remaining <= 0) {
      return timeToReset * 1000; // Wait until reset
    }
    
    // Distribute remaining requests over time to reset
    return (timeToReset / remaining) * 1000;
  }
}
```

---

## See Also

- [API Reference](./reference.md) - Complete API documentation
- [Authentication Guide](./authentication.md) - Token management
- [Code Examples](./examples.md) - Implementation examples
- [Workflows Guide](./workflows.md) - API integration patterns
