/**
 * Vitest Test Setup
 * 
 * Configures the test environment for React component testing
 */

import '@testing-library/jest-dom';

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock window.ethereum for wallet tests
window.ethereum = {
  isMetaMask: true,
  request: async ({ method }) => {
    if (method === 'eth_requestAccounts') {
      return ['0x1234567890123456789012345678901234567890'];
    }
    if (method === 'eth_chainId') {
      return '0x1';
    }
    return null;
  },
  on: () => {},
  removeListener: () => {},
};

// Mock crypto.subtle for hash calculations
if (!window.crypto) {
  window.crypto = {};
}

if (!window.crypto.subtle) {
  window.crypto.subtle = {
    digest: async (algorithm, data) => {
      // Simple mock - return a fixed hash for testing
      const mockHash = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        mockHash[i] = i;
      }
      return mockHash.buffer;
    },
  };
}

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
   * Generate a valid access token (64 hex characters)
   */
  generateAccessToken: () => {
    const chars = '0123456789abcdef';
    let token = '';
    for (let i = 0; i < 64; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
    return token;
  },
};
