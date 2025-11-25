/**
 * Test script for file verification endpoint
 * This tests the /api/verify endpoint functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testVerification() {
  console.log('=== Testing File Verification Endpoint ===\n');

  try {
    // Test 1: Missing file hash
    console.log('Test 1: Missing file hash');
    try {
      await axios.post(`${BASE_URL}/api/verify`, {});
      console.log('❌ Should have failed with missing file hash');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.code === 'FILE_HASH_REQUIRED') {
        console.log('✓ Correctly rejected missing file hash\n');
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message, '\n');
      }
    }

    // Test 2: Invalid hash format
    console.log('Test 2: Invalid hash format');
    try {
      await axios.post(`${BASE_URL}/api/verify`, {
        fileHash: 'invalid-hash'
      });
      console.log('❌ Should have failed with invalid hash format');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.code === 'INVALID_HASH_FORMAT') {
        console.log('✓ Correctly rejected invalid hash format\n');
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message, '\n');
      }
    }

    // Test 3: Valid hash format but file not on blockchain
    console.log('Test 3: Valid hash format but file not on blockchain');
    const nonExistentHash = 'a'.repeat(64); // Valid format but doesn't exist
    try {
      const response = await axios.post(`${BASE_URL}/api/verify`, {
        fileHash: nonExistentHash
      });
      
      if (response.data.success && !response.data.verified) {
        console.log('✓ Correctly returned not verified for non-existent file');
        console.log('  Response:', JSON.stringify(response.data, null, 2), '\n');
      } else {
        console.log('❌ Unexpected response:', response.data, '\n');
      }
    } catch (error) {
      console.log('❌ Request failed:', error.response?.data || error.message, '\n');
    }

    // Test 4: Check if we can verify an existing file
    console.log('Test 4: Verify existing file (if any)');
    try {
      // First, get list of files to find a real hash
      const filesResponse = await axios.get(`${BASE_URL}/api/files`);
      const files = filesResponse.data;
      
      if (files.length > 0) {
        const testFile = files[0];
        console.log(`  Testing with file: ${testFile.originalName}`);
        console.log(`  File hash: ${testFile.fileHash}`);
        console.log(`  Transaction hash: ${testFile.transactionHash}`);
        
        const verifyResponse = await axios.post(`${BASE_URL}/api/verify`, {
          fileHash: testFile.fileHash,
          transactionHash: testFile.transactionHash
        });
        
        console.log('  Verification result:', JSON.stringify(verifyResponse.data, null, 2));
        
        if (verifyResponse.data.verified) {
          console.log('✓ File verified successfully\n');
        } else {
          console.log('⚠ File not verified (may not be on blockchain yet)\n');
        }
      } else {
        console.log('  No files found in database to test with\n');
      }
    } catch (error) {
      console.log('❌ Error testing with existing file:', error.response?.data || error.message, '\n');
    }

    console.log('=== Verification Tests Complete ===');

  } catch (error) {
    console.error('Test suite error:', error.message);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/api/health`);
    return true;
  } catch (error) {
    return false;
  }
}

// Run tests
(async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('❌ Server is not running at', BASE_URL);
    console.error('Please start the server first: cd server && node server.js');
    process.exit(1);
  }

  await testVerification();
})();
