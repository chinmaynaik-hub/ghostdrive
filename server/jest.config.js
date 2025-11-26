/**
 * Jest Configuration for Backend Testing
 * 
 * Configures Jest for testing the blockchain file sharing backend
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  
  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/uploads/'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'utils/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    '!**/node_modules/**'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['./tests/setup.js'],
  
  // Timeout for tests (blockchain tests may take longer)
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Force exit after tests complete
  forceExit: true
};
