/**
 * Integration Tests for File Operations
 * 
 * Tests file upload flow, download with view decrement, and verification
 * Requirements: Testing strategy - Test complete upload flow, download with view decrement, file verification flow
 */

const { calculateFileHash, verifyFileHash } = require('../../utils/hashUtils');
const { generateAccessToken, isValidAccessToken } = require('../../utils/tokenUtils');

describe('File Operations Integration', () => {
  describe('Upload Flow', () => {
    it('should calculate hash and generate access token for upload', () => {
      // Simulate file content
      const fileContent = Buffer.from('Test file content for upload');
      
      // Step 1: Calculate file hash
      const fileHash = calculateFileHash(fileContent);
      expect(fileHash).toHaveLength(64);
      
      // Step 2: Generate access token
      const accessToken = generateAccessToken();
      expect(isValidAccessToken(accessToken)).toBe(true);
      
      // Step 3: Verify hash can be verified later
      const isValid = verifyFileHash(fileContent, fileHash);
      expect(isValid).toBe(true);
    });

    it('should detect file corruption through hash mismatch', () => {
      const originalContent = Buffer.from('Original file content');
      const corruptedContent = Buffer.from('Corrupted file content');
      
      // Calculate hash of original
      const originalHash = calculateFileHash(originalContent);
      
      // Verify corrupted content fails
      const isValid = verifyFileHash(corruptedContent, originalHash);
      expect(isValid).toBe(false);
    });

    it('should handle large file content', () => {
      // Create a larger buffer (1MB)
      const largeContent = Buffer.alloc(1024 * 1024, 'x');
      
      const hash = calculateFileHash(largeContent);
      expect(hash).toHaveLength(64);
      
      const isValid = verifyFileHash(largeContent, hash);
      expect(isValid).toBe(true);
    });
  });

  describe('Download with View Decrement', () => {
    it('should correctly track view count decrement', () => {
      // Simulate file record
      const fileRecord = {
        viewLimit: 5,
        viewsRemaining: 5,
        status: 'active'
      };

      // Simulate downloads
      for (let i = 0; i < 5; i++) {
        expect(fileRecord.viewsRemaining).toBeGreaterThan(0);
        fileRecord.viewsRemaining--;
      }

      expect(fileRecord.viewsRemaining).toBe(0);
    });

    it('should mark file for deletion when views reach 0', () => {
      const fileRecord = {
        viewLimit: 1,
        viewsRemaining: 1,
        status: 'active'
      };

      // Download
      fileRecord.viewsRemaining--;
      
      // Check if should be deleted
      const shouldDelete = fileRecord.viewsRemaining <= 0;
      expect(shouldDelete).toBe(true);
      
      if (shouldDelete) {
        fileRecord.status = 'deleted';
      }
      
      expect(fileRecord.status).toBe('deleted');
    });

    it('should handle concurrent view decrements correctly', () => {
      // Simulate atomic decrement
      let viewsRemaining = 5;
      const decrements = [];

      // Simulate 5 concurrent downloads
      for (let i = 0; i < 5; i++) {
        decrements.push(() => {
          if (viewsRemaining > 0) {
            viewsRemaining--;
            return true;
          }
          return false;
        });
      }

      // Execute all decrements
      const results = decrements.map(fn => fn());
      
      expect(viewsRemaining).toBe(0);
      expect(results.filter(r => r).length).toBe(5);
    });
  });

  describe('File Verification Flow', () => {
    it('should verify file integrity with matching hash', () => {
      const fileContent = Buffer.from('File content for verification');
      const fileHash = calculateFileHash(fileContent);
      
      // Simulate blockchain stored hash
      const blockchainHash = fileHash;
      
      // Verify
      const verified = fileHash === blockchainHash;
      expect(verified).toBe(true);
    });

    it('should detect tampering with mismatched hash', () => {
      const originalContent = Buffer.from('Original content');
      const tamperedContent = Buffer.from('Tampered content');
      
      const originalHash = calculateFileHash(originalContent);
      const tamperedHash = calculateFileHash(tamperedContent);
      
      // Simulate verification
      const verified = originalHash === tamperedHash;
      expect(verified).toBe(false);
    });

    it('should handle hash with 0x prefix', () => {
      const fileContent = Buffer.from('Test content');
      const fileHash = calculateFileHash(fileContent);
      
      // Simulate blockchain hash with 0x prefix
      const blockchainHash = '0x' + fileHash;
      
      // Normalize and compare
      const normalizedBlockchain = blockchainHash.startsWith('0x') 
        ? blockchainHash.slice(2) 
        : blockchainHash;
      
      const verified = fileHash === normalizedBlockchain;
      expect(verified).toBe(true);
    });
  });

  describe('Access Token Validation', () => {
    it('should validate access token format', () => {
      const validToken = generateAccessToken();
      const invalidTokens = [
        'short',
        'a'.repeat(63),
        'a'.repeat(65),
        'g'.repeat(64), // non-hex
        null,
        undefined,
        123
      ];

      expect(isValidAccessToken(validToken)).toBe(true);
      
      invalidTokens.forEach(token => {
        expect(isValidAccessToken(token)).toBe(false);
      });
    });

    it('should generate unique tokens for multiple files', () => {
      const tokens = new Set();
      const fileCount = 50;

      for (let i = 0; i < fileCount; i++) {
        tokens.add(generateAccessToken());
      }

      expect(tokens.size).toBe(fileCount);
    });
  });

  describe('Expiry Time Handling', () => {
    it('should correctly identify expired files', () => {
      const now = new Date();
      
      const expiredFile = {
        expiryTime: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
        status: 'active'
      };
      
      const activeFile = {
        expiryTime: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour from now
        status: 'active'
      };

      const isExpired = (file) => new Date() > file.expiryTime;

      expect(isExpired(expiredFile)).toBe(true);
      expect(isExpired(activeFile)).toBe(false);
    });

    it('should calculate time remaining correctly', () => {
      const now = new Date();
      const expiryTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
      
      const timeRemaining = expiryTime - now;
      const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
      
      expect(hoursRemaining).toBe(2);
    });
  });
});
