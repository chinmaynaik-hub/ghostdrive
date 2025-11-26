/**
 * Secure Access Token Generation Utilities
 * 
 * Provides cryptographically secure token generation for share links:
 * - Uses crypto.randomBytes with sufficient entropy (32 bytes = 256 bits)
 * - Ensures token uniqueness through database constraints
 * - Provides token validation functions
 * 
 * Requirements: 2.4
 */

const crypto = require('crypto');

// Configuration constants
const TOKEN_BYTES = 32; // 256 bits of entropy
const TOKEN_LENGTH = TOKEN_BYTES * 2; // 64 hex characters
const MAX_GENERATION_ATTEMPTS = 5;

/**
 * Generates a cryptographically secure access token
 * Uses crypto.randomBytes which is cryptographically strong
 * 
 * @returns {string} - 64 character hex string (256 bits of entropy)
 */
function generateAccessToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

/**
 * Generates a unique access token, checking against existing tokens
 * Retries if collision detected (extremely unlikely with 256 bits)
 * 
 * @param {function} checkExists - Async function that returns true if token exists
 * @returns {Promise<string>} - Unique 64 character hex string
 * @throws {Error} - If unable to generate unique token after max attempts
 */
async function generateUniqueAccessToken(checkExists) {
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const token = generateAccessToken();
    
    // Check if token already exists
    const exists = await checkExists(token);
    
    if (!exists) {
      return token;
    }
    
    // Log collision (should be extremely rare)
    console.warn(`Access token collision detected (attempt ${attempt}/${MAX_GENERATION_ATTEMPTS})`);
  }
  
  throw new Error('Unable to generate unique access token after maximum attempts');
}

/**
 * Validates access token format
 * 
 * @param {string} token - The token to validate
 * @returns {boolean} - True if token format is valid
 */
function isValidAccessToken(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Must be exactly 64 hex characters
  return /^[a-f0-9]{64}$/i.test(token);
}

/**
 * Validates access token format and returns detailed result
 * 
 * @param {string} token - The token to validate
 * @returns {object} - { valid: boolean, message: string }
 */
function validateAccessToken(token) {
  if (!token) {
    return {
      valid: false,
      message: 'Access token is required'
    };
  }
  
  if (typeof token !== 'string') {
    return {
      valid: false,
      message: 'Access token must be a string'
    };
  }
  
  if (token.length !== TOKEN_LENGTH) {
    return {
      valid: false,
      message: `Access token must be ${TOKEN_LENGTH} characters`
    };
  }
  
  if (!/^[a-f0-9]+$/i.test(token)) {
    return {
      valid: false,
      message: 'Access token must contain only hexadecimal characters'
    };
  }
  
  return {
    valid: true,
    message: 'Access token is valid'
  };
}

/**
 * Generates a secure random string of specified length
 * Useful for other security purposes
 * 
 * @param {number} length - Desired length of the string
 * @param {string} encoding - Output encoding ('hex', 'base64', 'base64url')
 * @returns {string} - Random string
 */
function generateSecureRandom(length = 32, encoding = 'hex') {
  const bytesNeeded = Math.ceil(length / 2);
  const randomBytes = crypto.randomBytes(bytesNeeded);
  
  let result;
  switch (encoding) {
    case 'base64':
      result = randomBytes.toString('base64');
      break;
    case 'base64url':
      result = randomBytes.toString('base64url');
      break;
    case 'hex':
    default:
      result = randomBytes.toString('hex');
  }
  
  return result.substring(0, length);
}

/**
 * Compares two tokens in constant time to prevent timing attacks
 * 
 * @param {string} token1 - First token
 * @param {string} token2 - Second token
 * @returns {boolean} - True if tokens are equal
 */
function secureCompare(token1, token2) {
  if (!token1 || !token2) {
    return false;
  }
  
  if (token1.length !== token2.length) {
    return false;
  }
  
  const buf1 = Buffer.from(token1);
  const buf2 = Buffer.from(token2);
  
  return crypto.timingSafeEqual(buf1, buf2);
}

module.exports = {
  // Token generation
  generateAccessToken,
  generateUniqueAccessToken,
  
  // Validation
  isValidAccessToken,
  validateAccessToken,
  
  // Utilities
  generateSecureRandom,
  secureCompare,
  
  // Constants
  TOKEN_BYTES,
  TOKEN_LENGTH,
  MAX_GENERATION_ATTEMPTS
};
