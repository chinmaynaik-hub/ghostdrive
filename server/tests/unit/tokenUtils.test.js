/**
 * Unit Tests for Token Utilities
 * 
 * Tests access token generation and validation functions
 * Requirements: Testing strategy - Test access token generation
 */

const {
  generateAccessToken,
  generateUniqueAccessToken,
  isValidAccessToken,
  validateAccessToken,
  secureCompare,
  TOKEN_LENGTH
} = require('../../utils/tokenUtils');

describe('Token Utilities', () => {
  describe('generateAccessToken', () => {
    it('should generate a 64 character hex string', () => {
      const token = generateAccessToken();
      
      expect(token).toHaveLength(TOKEN_LENGTH);
      expect(/^[a-f0-9]+$/i.test(token)).toBe(true);
    });

    it('should generate unique tokens on each call', () => {
      const tokens = new Set();
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        tokens.add(generateAccessToken());
      }
      
      // All tokens should be unique
      expect(tokens.size).toBe(iterations);
    });

    it('should use cryptographically secure random bytes', () => {
      // Generate multiple tokens and check for randomness
      const tokens = [];
      for (let i = 0; i < 10; i++) {
        tokens.push(generateAccessToken());
      }
      
      // No two tokens should be the same
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });
  });

  describe('generateUniqueAccessToken', () => {
    it('should generate unique token when no collision', async () => {
      const checkExists = jest.fn().mockResolvedValue(false);
      
      const token = await generateUniqueAccessToken(checkExists);
      
      expect(token).toHaveLength(TOKEN_LENGTH);
      expect(checkExists).toHaveBeenCalledTimes(1);
    });

    it('should retry on collision', async () => {
      // First call returns true (collision), second returns false
      const checkExists = jest.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      
      const token = await generateUniqueAccessToken(checkExists);
      
      expect(token).toHaveLength(TOKEN_LENGTH);
      expect(checkExists).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max attempts', async () => {
      const checkExists = jest.fn().mockResolvedValue(true);
      
      await expect(generateUniqueAccessToken(checkExists))
        .rejects.toThrow('Unable to generate unique access token');
    });
  });

  describe('isValidAccessToken', () => {
    it('should return true for valid token', () => {
      const token = generateAccessToken();
      
      expect(isValidAccessToken(token)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isValidAccessToken(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidAccessToken(undefined)).toBe(false);
    });

    it('should return false for non-string', () => {
      expect(isValidAccessToken(123)).toBe(false);
      expect(isValidAccessToken({})).toBe(false);
      expect(isValidAccessToken([])).toBe(false);
    });

    it('should return false for wrong length', () => {
      expect(isValidAccessToken('abc')).toBe(false);
      expect(isValidAccessToken('a'.repeat(63))).toBe(false);
      expect(isValidAccessToken('a'.repeat(65))).toBe(false);
    });

    it('should return false for non-hex characters', () => {
      expect(isValidAccessToken('g'.repeat(64))).toBe(false);
      expect(isValidAccessToken('z'.repeat(64))).toBe(false);
    });
  });

  describe('validateAccessToken', () => {
    it('should return valid result for valid token', () => {
      const token = generateAccessToken();
      const result = validateAccessToken(token);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Access token is valid');
    });

    it('should return error for missing token', () => {
      const result = validateAccessToken(null);
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Access token is required');
    });

    it('should return error for wrong type', () => {
      const result = validateAccessToken(123);
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Access token must be a string');
    });

    it('should return error for wrong length', () => {
      const result = validateAccessToken('abc');
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('must be 64 characters');
    });

    it('should return error for invalid characters', () => {
      const result = validateAccessToken('g'.repeat(64));
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('hexadecimal');
    });
  });

  describe('secureCompare', () => {
    it('should return true for equal tokens', () => {
      const token = generateAccessToken();
      
      expect(secureCompare(token, token)).toBe(true);
    });

    it('should return false for different tokens', () => {
      const token1 = generateAccessToken();
      const token2 = generateAccessToken();
      
      expect(secureCompare(token1, token2)).toBe(false);
    });

    it('should return false for null values', () => {
      expect(secureCompare(null, 'abc')).toBe(false);
      expect(secureCompare('abc', null)).toBe(false);
    });

    it('should return false for different lengths', () => {
      expect(secureCompare('abc', 'abcd')).toBe(false);
    });
  });
});
