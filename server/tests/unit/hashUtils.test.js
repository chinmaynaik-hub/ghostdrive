/**
 * Unit Tests for Hash Utilities
 * 
 * Tests file hash calculation and verification functions
 * Requirements: Testing strategy - Test file hash calculation
 */

const { calculateFileHash, verifyFileHash } = require('../../utils/hashUtils');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

describe('Hash Utilities', () => {
  describe('calculateFileHash', () => {
    it('should generate consistent SHA-256 hash for same buffer', () => {
      const testContent = 'test file content for hashing';
      const buffer = Buffer.from(testContent);
      
      const hash1 = calculateFileHash(buffer);
      const hash2 = calculateFileHash(buffer);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should generate different hashes for different content', () => {
      const buffer1 = Buffer.from('content one');
      const buffer2 = Buffer.from('content two');
      
      const hash1 = calculateFileHash(buffer1);
      const hash2 = calculateFileHash(buffer2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty buffer', () => {
      const emptyBuffer = Buffer.from('');
      const hash = calculateFileHash(emptyBuffer);
      
      // SHA-256 of empty string is a known value
      const expectedHash = crypto.createHash('sha256').update('').digest('hex');
      expect(hash).toBe(expectedHash);
    });

    it('should handle binary content', () => {
      const binaryBuffer = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]);
      const hash = calculateFileHash(binaryBuffer);
      
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/i.test(hash)).toBe(true);
    });

    it('should throw error for invalid input', () => {
      expect(() => calculateFileHash(null)).toThrow();
      expect(() => calculateFileHash(undefined)).toThrow();
      expect(() => calculateFileHash(123)).toThrow();
    });
  });

  describe('verifyFileHash', () => {
    it('should return true for matching hash', () => {
      const content = 'test content for verification';
      const buffer = Buffer.from(content);
      const hash = calculateFileHash(buffer);
      
      const result = verifyFileHash(buffer, hash);
      
      expect(result).toBe(true);
    });

    it('should return false for non-matching hash', () => {
      const buffer = Buffer.from('original content');
      const wrongHash = 'a'.repeat(64);
      
      const result = verifyFileHash(buffer, wrongHash);
      
      expect(result).toBe(false);
    });

    it('should handle hash with 0x prefix', () => {
      const buffer = Buffer.from('test content');
      const hash = calculateFileHash(buffer);
      const hashWithPrefix = '0x' + hash;
      
      const result = verifyFileHash(buffer, hashWithPrefix);
      
      expect(result).toBe(true);
    });

    it('should compare hashes case-sensitively (lowercase expected)', () => {
      const buffer = Buffer.from('test content');
      const hash = calculateFileHash(buffer);
      
      // The function produces lowercase hashes
      expect(hash).toBe(hash.toLowerCase());
      
      // Verify with same case works
      const result = verifyFileHash(buffer, hash);
      expect(result).toBe(true);
    });
  });
});
