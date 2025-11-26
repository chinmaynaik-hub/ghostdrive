/**
 * Jest Test Setup
 * 
 * Configures the test environment before running tests
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for blockchain-related tests
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  /**
   * Generate a valid Ethereum wallet address for testing
   */
  generateWalletAddress: () => {
    const chars = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
  },
  
  /**
   * Generate a valid file hash (64 hex characters)
   */
  generateFileHash: () => {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  },
  
  /**
   * Generate a valid transaction hash (66 characters with 0x prefix)
   */
  generateTransactionHash: () => {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  },
  
  /**
   * Calculate expiry time from hours
   */
  calculateExpiryTime: (hours) => {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }
};

// Suppress console output during tests (optional)
// Uncomment to reduce noise in test output
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };
