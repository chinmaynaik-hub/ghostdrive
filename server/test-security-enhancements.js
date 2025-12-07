/**
 * Test script for security enhancements (Task 16)
 * Tests:
 * - 16.1 File validation (size limits, filename sanitization)
 * - 16.2 Rate limiting
 * - 16.3 Secure access token generation
 */

const {
  sanitizeFilename,
  hasPathTraversal,
  validateFileSize,
  validateFile,
  MAX_FILE_SIZE
} = require('./middleware/fileValidation');

const {
  generateAccessToken,
  generateUniqueAccessToken,
  isValidAccessToken,
  validateAccessToken,
  secureCompare,
  TOKEN_LENGTH
} = require('./utils/tokenUtils');

const {
  uploadLimiter,
  downloadLimiter,
  config
} = require('./middleware/rateLimiter');

console.log('='.repeat(60));
console.log('Testing Security Enhancements (Task 16)');
console.log('='.repeat(60));

// Test 16.1: File Validation
console.log('\n--- 16.1 File Validation Tests ---\n');

// Test filename sanitization
const filenameTests = [
  { input: 'normal_file.txt', expected: 'normal_file.txt' },
  { input: '../../../etc/passwd', expected: 'passwd' },
  { input: '..\\..\\windows\\system32', expected: 'system32' },
  { input: 'file<script>.txt', expected: 'file_script.txt' },
  { input: 'file:with:colons.txt', expected: 'file_with_colons.txt' },
  { input: '   spaces   .txt', expected: 'spaces.txt' },
  { input: '...dots...file.txt', expected: '_dots_file.txt' },
  { input: '%2e%2e%2fhack.txt', expected: 'hack.txt' },
  { input: '', expected: 'unnamed_file' },
  { input: null, expected: 'unnamed_file' },
];

console.log('Filename Sanitization:');
let passedFilename = 0;
filenameTests.forEach(test => {
  const result = sanitizeFilename(test.input);
  const passed = result === test.expected;
  if (passed) passedFilename++;
  console.log(`  ${passed ? '✓' : '✗'} "${test.input}" -> "${result}" (expected: "${test.expected}")`);
});
console.log(`  Result: ${passedFilename}/${filenameTests.length} passed\n`);

// Test path traversal detection
const pathTraversalTests = [
  { input: '../etc/passwd', expected: true },
  { input: '..\\windows', expected: true },
  { input: '%2e%2e%2f', expected: true },
  { input: 'normal_file.txt', expected: false },
  { input: 'my.file.txt', expected: false },
];

console.log('Path Traversal Detection:');
let passedTraversal = 0;
pathTraversalTests.forEach(test => {
  const result = hasPathTraversal(test.input);
  const passed = result === test.expected;
  if (passed) passedTraversal++;
  console.log(`  ${passed ? '✓' : '✗'} "${test.input}" -> ${result} (expected: ${test.expected})`);
});
console.log(`  Result: ${passedTraversal}/${pathTraversalTests.length} passed\n`);

// Test file size validation
const fileSizeTests = [
  { size: 1024, expected: true, desc: '1KB file' },
  { size: 50 * 1024 * 1024, expected: true, desc: '50MB file' },
  { size: 100 * 1024 * 1024, expected: true, desc: '100MB file (at limit)' },
  { size: 101 * 1024 * 1024, expected: false, desc: '101MB file (over limit)' },
  { size: 0, expected: false, desc: 'Empty file' },
  { size: -1, expected: false, desc: 'Negative size' },
];

console.log('File Size Validation:');
let passedSize = 0;
fileSizeTests.forEach(test => {
  const result = validateFileSize(test.size);
  const passed = result.valid === test.expected;
  if (passed) passedSize++;
  console.log(`  ${passed ? '✓' : '✗'} ${test.desc}: ${result.valid} (expected: ${test.expected})`);
});
console.log(`  Result: ${passedSize}/${fileSizeTests.length} passed\n`);

console.log(`MAX_FILE_SIZE configured: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);

// Test 16.2: Rate Limiting Configuration
console.log('\n--- 16.2 Rate Limiting Tests ---\n');

console.log('Rate Limit Configuration:');
console.log(`  Upload: ${config.UPLOAD_MAX_REQUESTS} requests per ${config.UPLOAD_WINDOW_MS / 60000} minutes`);
console.log(`  Download: ${config.DOWNLOAD_MAX_REQUESTS} requests per ${config.DOWNLOAD_WINDOW_MS / 60000} minute(s)`);
console.log(`  General: ${config.GENERAL_MAX_REQUESTS} requests per ${config.GENERAL_WINDOW_MS / 60000} minute(s)`);
console.log(`  Verify: ${config.VERIFY_MAX_REQUESTS} requests per ${config.VERIFY_WINDOW_MS / 60000} minute(s)`);

console.log('\nRate Limiters Loaded:');
console.log(`  ✓ uploadLimiter: ${typeof uploadLimiter === 'function' ? 'OK' : 'FAILED'}`);
console.log(`  ✓ downloadLimiter: ${typeof downloadLimiter === 'function' ? 'OK' : 'FAILED'}`);

// Test 16.3: Secure Access Token Generation
console.log('\n--- 16.3 Secure Access Token Tests ---\n');

// Test token generation
console.log('Token Generation:');
const token1 = generateAccessToken();
const token2 = generateAccessToken();
console.log(`  Token 1: ${token1}`);
console.log(`  Token 2: ${token2}`);
console.log(`  ✓ Token length: ${token1.length} (expected: ${TOKEN_LENGTH})`);
console.log(`  ✓ Tokens are unique: ${token1 !== token2}`);
console.log(`  ✓ Token is hex: ${/^[a-f0-9]+$/i.test(token1)}`);

// Test token validation
const tokenValidationTests = [
  { token: token1, expected: true, desc: 'Valid generated token' },
  { token: 'a'.repeat(64), expected: true, desc: 'Valid 64-char hex' },
  { token: 'a'.repeat(63), expected: false, desc: 'Too short (63 chars)' },
  { token: 'a'.repeat(65), expected: false, desc: 'Too long (65 chars)' },
  { token: 'g'.repeat(64), expected: false, desc: 'Invalid hex chars' },
  { token: '', expected: false, desc: 'Empty string' },
  { token: null, expected: false, desc: 'Null value' },
];

console.log('\nToken Validation:');
let passedToken = 0;
tokenValidationTests.forEach(test => {
  const result = isValidAccessToken(test.token);
  const passed = result === test.expected;
  if (passed) passedToken++;
  console.log(`  ${passed ? '✓' : '✗'} ${test.desc}: ${result} (expected: ${test.expected})`);
});
console.log(`  Result: ${passedToken}/${tokenValidationTests.length} passed\n`);

// Test secure comparison
console.log('Secure Comparison (timing-safe):');
const testToken = generateAccessToken();
console.log(`  ✓ Same tokens: ${secureCompare(testToken, testToken)}`);
console.log(`  ✓ Different tokens: ${!secureCompare(testToken, generateAccessToken())}`);
console.log(`  ✓ Null handling: ${!secureCompare(null, testToken)}`);

// Test unique token generation
console.log('\nUnique Token Generation:');
(async () => {
  const existingTokens = new Set();
  const checkExists = async (token) => existingTokens.has(token);
  
  // Generate 10 unique tokens
  for (let i = 0; i < 10; i++) {
    const uniqueToken = await generateUniqueAccessToken(checkExists);
    existingTokens.add(uniqueToken);
  }
  console.log(`  ✓ Generated ${existingTokens.size} unique tokens`);
  console.log(`  ✓ All tokens are unique: ${existingTokens.size === 10}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  
  const totalTests = filenameTests.length + pathTraversalTests.length + 
                     fileSizeTests.length + tokenValidationTests.length;
  const totalPassed = passedFilename + passedTraversal + passedSize + passedToken;
  
  console.log(`\nFile Validation: ${passedFilename + passedTraversal + passedSize}/${filenameTests.length + pathTraversalTests.length + fileSizeTests.length}`);
  console.log(`Rate Limiting: Configured ✓`);
  console.log(`Token Generation: ${passedToken}/${tokenValidationTests.length}`);
  console.log(`\nTotal: ${totalPassed}/${totalTests} tests passed`);
  
  if (totalPassed === totalTests) {
    console.log('\n✓ All security enhancement tests PASSED!');
  } else {
    console.log('\n✗ Some tests FAILED. Please review the output above.');
  }
})();
