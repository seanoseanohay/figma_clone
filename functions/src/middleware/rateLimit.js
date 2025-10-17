/**
 * Rate Limiting Middleware
 * Prevents API abuse with configurable rate limits
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for read operations
 * Default: 200 requests per minute
 */
const readLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    // Use custom rate limit from token if available
    return req.tokenData?.rateLimit?.read || 200;
  },
  message: {
    error: {
      message: 'Too many read requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    }
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Use token ID as key for rate limiting
  keyGenerator: (req) => {
    return req.tokenData?.tokenId || req.ip;
  }
});

/**
 * Rate limiter for write operations
 * Default: 50 requests per minute
 */
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    // Use custom rate limit from token if available
    return req.tokenData?.rateLimit?.write || 50;
  },
  message: {
    error: {
      message: 'Too many write requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.tokenData?.tokenId || req.ip;
  }
});

/**
 * General API rate limiter
 * Default: 300 requests per minute
 */
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  message: {
    error: {
      message: 'Too many API requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.tokenData?.tokenId || req.ip;
  }
});

module.exports = {
  readLimiter,
  writeLimiter,
  generalLimiter
};

