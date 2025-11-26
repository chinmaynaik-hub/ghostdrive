/**
 * Comprehensive Error Handling Middleware
 * 
 * Provides consistent error response format, handles different error types,
 * and logs errors for debugging.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

// Custom error classes for different error types
class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, code = 'VALIDATION_ERROR') {
    super(message, 400, code);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

class GoneError extends AppError {
  constructor(message = 'Resource no longer available', code = 'GONE') {
    super(message, 410, code);
  }
}

class BlockchainError extends AppError {
  constructor(message, code = 'BLOCKCHAIN_ERROR', retryable = true) {
    super(message, 503, code);
    this.retryable = retryable;
  }
}

class NetworkError extends AppError {
  constructor(message = 'Network connectivity error', code = 'NETWORK_ERROR') {
    super(message, 503, code);
    this.retryable = true;
  }
}

class InsufficientFundsError extends AppError {
  constructor(message = 'Insufficient funds for gas fees', code = 'INSUFFICIENT_FUNDS') {
    super(message, 402, code);
  }
}

// Error codes mapping for consistent responses
const ERROR_CODES = {
  // Validation errors (400)
  VALIDATION_ERROR: { status: 400, message: 'Validation error' },
  INVALID_WALLET_ADDRESS: { status: 400, message: 'Invalid wallet address format' },
  INVALID_ACCESS_TOKEN: { status: 400, message: 'Invalid access token format' },
  INVALID_FILE_HASH: { status: 400, message: 'Invalid file hash format' },
  FILE_HASH_REQUIRED: { status: 400, message: 'File hash is required' },
  WALLET_ADDRESS_REQUIRED: { status: 400, message: 'Wallet address is required' },
  FILE_REQUIRED: { status: 400, message: 'No file uploaded' },
  FILE_TOO_LARGE: { status: 413, message: 'File size exceeds maximum limit' },
  
  // Authentication errors (401)
  MISSING_AUTH_HEADERS: { status: 401, message: 'Missing authentication headers' },
  INVALID_SIGNATURE: { status: 401, message: 'Invalid signature' },
  
  // Authorization errors (403)
  UNAUTHORIZED: { status: 403, message: 'You do not have permission to perform this action' },
  SIGNATURE_VERIFICATION_FAILED: { status: 403, message: 'Signature verification failed' },
  
  // Not found errors (404)
  FILE_NOT_FOUND: { status: 404, message: 'File not found' },
  FILE_NOT_FOUND_ON_DISK: { status: 404, message: 'File not found on server' },
  
  // Gone errors (410)
  FILE_EXPIRED: { status: 410, message: 'File has expired' },
  VIEW_LIMIT_REACHED: { status: 410, message: 'View limit reached' },
  FILE_NOT_ACTIVE: { status: 410, message: 'File no longer available' },
  ALREADY_DELETED: { status: 410, message: 'File has already been deleted' },
  
  // Payment required (402)
  INSUFFICIENT_FUNDS: { status: 402, message: 'Insufficient funds for gas fees' },
  
  // Server errors (500)
  INTERNAL_ERROR: { status: 500, message: 'Internal server error' },
  DATABASE_ERROR: { status: 500, message: 'Database error' },
  FILE_SYSTEM_ERROR: { status: 500, message: 'File system error' },
  
  // Service unavailable (503)
  BLOCKCHAIN_UNAVAILABLE: { status: 503, message: 'Blockchain service is not available' },
  BLOCKCHAIN_ERROR: { status: 503, message: 'Blockchain transaction failed' },
  NETWORK_ERROR: { status: 503, message: 'Network connectivity error' },
};

/**
 * Format error response consistently
 */
function formatErrorResponse(error, includeStack = false) {
  const response = {
    success: false,
    message: error.message || 'An unexpected error occurred',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  };

  // Add retry information for retryable errors
  if (error.retryable !== undefined) {
    response.retryable = error.retryable;
  }

  // Include stack trace in development mode
  if (includeStack && error.stack) {
    response.stack = error.stack;
  }

  return response;
}

/**
 * Log error with appropriate level and context
 */
function logError(error, req) {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    errorCode: error.code || 'UNKNOWN',
    errorMessage: error.message,
    statusCode: error.statusCode || 500
  };

  // Add wallet address if available
  if (req.verifiedWalletAddress) {
    logData.walletAddress = req.verifiedWalletAddress;
  } else if (req.headers['x-wallet-address']) {
    logData.walletAddress = req.headers['x-wallet-address'];
  }

  // Log based on error severity
  if (error.statusCode >= 500 || !error.isOperational) {
    console.error('ERROR:', JSON.stringify(logData, null, 2));
    console.error('Stack:', error.stack);
  } else if (error.statusCode >= 400) {
    console.warn('WARN:', JSON.stringify(logData));
  } else {
    console.log('INFO:', JSON.stringify(logData));
  }
}

/**
 * Detect and categorize blockchain-specific errors
 */
function categorizeBlockchainError(error) {
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('insufficient funds') || message.includes('gas')) {
    return new InsufficientFundsError('Insufficient funds for gas fees');
  }
  
  if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
    return new NetworkError('Cannot connect to blockchain network');
  }
  
  if (message.includes('rejected') || message.includes('denied')) {
    return new BlockchainError('Transaction rejected by user', 'TRANSACTION_REJECTED', false);
  }
  
  if (message.includes('nonce') || message.includes('replacement')) {
    return new BlockchainError('Transaction nonce error. Please try again.', 'NONCE_ERROR', true);
  }
  
  return new BlockchainError(
    error.message || 'Blockchain transaction failed',
    'BLOCKCHAIN_ERROR',
    true
  );
}

/**
 * Main error handling middleware
 */
function errorHandler(err, req, res, next) {
  // Log the error
  logError(err, req);

  // Determine if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Handle specific error types
  let error = err;

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map(e => e.message).join(', ');
    error = new ValidationError(messages, 'VALIDATION_ERROR');
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    error = new ValidationError('Duplicate entry', 'DUPLICATE_ENTRY');
  }

  // Sequelize database errors
  if (err.name === 'SequelizeDatabaseError') {
    error = new AppError('Database error', 500, 'DATABASE_ERROR');
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ValidationError('File size exceeds maximum limit', 'FILE_TOO_LARGE');
  }

  // JSON parsing errors
  if (err.type === 'entity.parse.failed') {
    error = new ValidationError('Invalid JSON in request body', 'INVALID_JSON');
  }

  // Blockchain-related errors
  if (err.message?.includes('blockchain') || 
      err.message?.includes('web3') || 
      err.message?.includes('contract') ||
      err.message?.includes('gas') ||
      err.message?.includes('transaction')) {
    error = categorizeBlockchainError(err);
  }

  // Get status code
  const statusCode = error.statusCode || 500;

  // Format and send response
  const response = formatErrorResponse(error, isDevelopment);
  
  res.status(statusCode).json(response);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler for undefined routes
 */
function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
}

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  GoneError,
  BlockchainError,
  NetworkError,
  InsufficientFundsError,
  
  // Error codes
  ERROR_CODES,
  
  // Middleware
  errorHandler,
  asyncHandler,
  notFoundHandler,
  
  // Utilities
  formatErrorResponse,
  logError,
  categorizeBlockchainError
};
