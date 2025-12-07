/**
 * Test script for GET /api/files/:walletAddress endpoint
 * Tests the user files endpoint implementation
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test wallet addresses
const TEST_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';
const INVALID_WALLET = 'invalid-address';
const NON_EXISTENT_WALLET = '0x0000000000000000000000000000000000000000';

async function testUserFilesEndpoint() {
  console.log('=== Testing GET /api/files/:walletAddress Endpoint ===\n');

  // Test 1: Invalid wallet address format
  console.log('Test 1: Invalid wallet address format');
  try {
    const response = await axios.get(`${BASE_URL}/api/files/${INVALID_WALLET}`);
    console.log('❌ FAILED: Should have returned 400 for invalid wallet address');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✓ PASSED: Returns 400 for invalid wallet address');
      console.log('  Response:', error.response.data);
    } else {
      console.log('❌ FAILED: Unexpected error:', error.message);
    }
  }
  console.log('');

  // Test 2: Valid wallet address with no files
  console.log('Test 2: Valid wallet address with no files');
  try {
    const response = await axios.get(`${BASE_URL}/api/files/${NON_EXISTENT_WALLET}`);
    if (response.status === 200 && response.data.success && response.data.count === 0) {
      console.log('✓ PASSED: Returns empty array for wallet with no files');
      console.log('  Response:', response.data);
    } else {
      console.log('❌ FAILED: Unexpected response structure');
      console.log('  Response:', response.data);
    }
  } catch (error) {
    console.log('❌ FAILED: Error:', error.message);
  }
  console.log('');

  // Test 3: Valid wallet address (may have files)
  console.log('Test 3: Valid wallet address (may have files)');
  try {
    const response = await axios.get(`${BASE_URL}/api/files/${TEST_WALLET}`);
    if (response.status === 200 && response.data.success) {
      console.log('✓ PASSED: Returns success response');
      console.log(`  Found ${response.data.count} file(s)`);
      
      // Verify response structure
      if (response.data.files && Array.isArray(response.data.files)) {
        console.log('✓ PASSED: Response contains files array');
        
        if (response.data.files.length > 0) {
          const file = response.data.files[0];
          console.log('\n  Sample file structure:');
          console.log('  - id:', file.id);
          console.log('  - filename:', file.filename);
          console.log('  - uploaderAddress:', file.uploaderAddress);
          console.log('  - viewsRemaining:', file.viewsRemaining);
          console.log('  - expiryTime:', file.expiryTime);
          console.log('  - status:', file.status);
          console.log('  - derivedStatus:', file.derivedStatus);
          console.log('  - timeRemaining:', file.timeRemaining, 'ms');
          console.log('  - timeRemainingHours:', file.timeRemainingHours, 'hours');
          console.log('  - isExpired:', file.isExpired);
          console.log('  - shareLink:', file.shareLink);
          console.log('  - createdAt:', file.createdAt);
          
          // Verify derived fields exist
          const requiredFields = ['timeRemaining', 'timeRemainingHours', 'derivedStatus', 'isExpired', 'shareLink'];
          const missingFields = requiredFields.filter(field => !(field in file));
          
          if (missingFields.length === 0) {
            console.log('\n✓ PASSED: All derived fields present');
          } else {
            console.log('\n❌ FAILED: Missing derived fields:', missingFields);
          }
          
          // Verify sorting (newest first)
          if (response.data.files.length > 1) {
            const firstDate = new Date(response.data.files[0].createdAt);
            const secondDate = new Date(response.data.files[1].createdAt);
            if (firstDate >= secondDate) {
              console.log('✓ PASSED: Files sorted by upload timestamp (newest first)');
            } else {
              console.log('❌ FAILED: Files not properly sorted');
            }
          }
        } else {
          console.log('  No files found for this wallet address');
        }
      } else {
        console.log('❌ FAILED: Response missing files array');
      }
    } else {
      console.log('❌ FAILED: Unexpected response structure');
      console.log('  Response:', response.data);
    }
  } catch (error) {
    console.log('❌ FAILED: Error:', error.message);
    if (error.response) {
      console.log('  Response:', error.response.data);
    }
  }
  console.log('');

  // Test 4: Case insensitivity (lowercase vs mixed case)
  console.log('Test 4: Case insensitivity test');
  try {
    const upperResponse = await axios.get(`${BASE_URL}/api/files/${TEST_WALLET.toUpperCase()}`);
    const lowerResponse = await axios.get(`${BASE_URL}/api/files/${TEST_WALLET.toLowerCase()}`);
    
    if (upperResponse.data.count === lowerResponse.data.count) {
      console.log('✓ PASSED: Wallet address is case-insensitive');
      console.log(`  Both queries returned ${upperResponse.data.count} file(s)`);
    } else {
      console.log('❌ FAILED: Case sensitivity issue detected');
    }
  } catch (error) {
    console.log('❌ FAILED: Error:', error.message);
  }
  console.log('');

  console.log('=== Test Suite Complete ===');
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/api/health`);
    return true;
  } catch (error) {
    console.error('❌ Server is not running at', BASE_URL);
    console.error('Please start the server with: npm start');
    return false;
  }
}

// Run tests
(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testUserFilesEndpoint();
  }
})();
