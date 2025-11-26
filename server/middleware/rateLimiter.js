/**
 * Rate Limiting Middleware
 * 
 * Provides protection against abuse by limiting request rates:
 * - Upload endpoint: Stricter limits to prevent storage abuse
 * - Download endpoint: Moderate limits to prevent bandwidth abuse
 * - General API: Standard limits for other endpoints
 * 
 * Requirements: Security best practices
 */

const rateLimit = require('express-rate-limit');

// Configuration constants
const UPLOAD_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const UPLOAD_MAX_REQUESTS = 10; // 10 uploads per 15 minutes

const DOWNLOAD_WINDOW_MS = 1 * 60 * 1000; // 1 minute
const DOWNLOAD_MAX_REQUESTS = 30; // 30 downloads per minute

const GENERAL_WINDOW_MS = 1 * 60 * 1000; // 1 minute
const GENERAL_MAX_REQUESTS = 100; // 100 requests per minute

const VERIFY_WINDOW_MS = 1 * 60 * 1000; // 1 minute
const VERIFY_MAX_REQUESTS = 20; // 20 verifications per minute

/**
 * Custom handler for rate limit exceeded
 */
function rateLimitHandler(req, res, next, options) {
  res.status(429).json({
    success: false,
    message: options.message || 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(options.windowMs / 1000) // seconds until reset
  });
}

/**
 * Rate limiter for upload endpoint
 * Stricter limits to prevent storage abuse
 * Uses default keyGenerator (IP-based) for simplicity and IPv6 compatibility
 */
const uploadLimiter = rateLimit({
  windowMs: UPLOAD_WINDOW_MS,
  max: UPLOAD_MAX_REQUESTS,
  message: 'Too many file uploads. Please wait before uploading more files.',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  }
});

/**
 * Rate limiter for download endpoint
 * Moderate limits to prevent bandwidth abuse
 */
const downloadLimiter = rateLimit({
  windowMs: DOWNLOAD_WINDOW_MS,
  max: DOWNLOAD_MAX_REQUESTS,
  message: 'Too many download requests. Please wait before downloading more files.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  }
});

/**
 * Rate limiter for file preview endpoint
 * Same as download since it's accessing file metadata
 */
const previewLimiter = rateLimit({
  windowMs: DOWNLOAD_WINDOW_MS,
  max: DOWNLOAD_MAX_REQUESTS * 2, // Allow more previews than downloads
  message: 'Too many preview requests. Please wait before viewing more files.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  }
});

/**
 * Rate limiter for verification endpoint
 * Moderate limits for blockchain queries
 */
const verifyLimiter = rateLimit({
  windowMs: VERIFY_WINDOW_MS,
  max: VERIFY_MAX_REQUESTS,
  message: 'Too many verification requests. Please wait before verifying more files.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  }
});

/**
 * Rate limiter for delete endpoint
 * Stricter limits to prevent abuse
 */
const deleteLimiter = rateLimit({
  windowMs: UPLOAD_WINDOW_MS,
  max: UPLOAD_MAX_REQUESTS * 2, // Allow more deletes than uploads
  message: 'Too many delete requests. Please wait before deleting more files.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  }
});

/**
 * General rate limiter for all other endpoints
 */
const generalLimiter = rateLimit({
  windowMs: GENERAL_WINDOW_MS,
  max: GENERAL_MAX_REQUESTS,
  message: 'Too many requests. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  }
});

/**
 * Creates a custom rate limiter with specified options
 * @param {object} options - Rate limiter options
 * @returns {function} - Express middleware
 */
function createRateLimiter(options = {}) {
  return rateLimit({
    windowMs: options.windowMs || GENERAL_WINDOW_MS,
    max: options.max || GENERAL_MAX_REQUESTS,
    message: options.message || 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: options.handler || rateLimitHandler,
    skip: options.skip || ((req) => process.env.NODE_ENV === 'test')
  });
}

module.exports = {
  // Pre-configured limiters
  uploadLimiter,
  downloadLimiter,
  previewLimiter,
  verifyLimiter,
  deleteLimiter,
  generalLimiter,
  
  // Factory function
  createRateLimiter,
  
  // Configuration constants (for testing/customization)
  config: {
    UPLOAD_WINDOW_MS,
    UPLOAD_MAX_REQUESTS,
    DOWNLOAD_WINDOW_MS,
    DOWNLOAD_MAX_REQUESTS,
    GENERAL_WINDOW_MS,
    GENERAL_MAX_REQUESTS,
    VERIFY_WINDOW_MS,
    VERIFY_MAX_REQUESTS
  }
};
