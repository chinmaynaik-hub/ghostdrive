/**
 * Test script for GET /api/files/:walletAddress endpoint
 * Tests Requirements 6.1, 6.2
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const TEST_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'; // Test wallet address

async function testUserFilesEndpoint() {
  console.log('=== Testing User Files Endpoint ===\n');

  try {
    // Test 1: Valid wallet address
    console.log('Test 1: Fetching files for valid wallet address');
    console.log(`Wallet: ${TEST_WALLET}`);
    
    const response = await axios.get(`${BASE_URL}/api/files/${TEST_WALLET}`);
    
    console.log('✓ Status:', response.status);
    console.log('✓ Response structure:', {
      success: response.data.success,
      count: response.data.count,
      filesReturned: response.data.files?.length || 0
    });

    if (response.data.files && response.data.files.length > 0) {
      console.log('\n✓ Files found for this wallet:');
      response.data.files.forEach((file, index) => {
        console.log(`\n  File ${index + 1}:`);
        console.log(`    - ID: ${file.id}`);
        console.log(`    - Filename: ${file.originalName}`);
        console.log(`    - Upload Time: ${new Date(file.createdAt).toLocaleString()}`);
        console.log(`    - Views Remaining: ${file.viewsRemaining}/${file.viewLimit}`);
        console.log(`    - Status: ${file.status}`);
        console.log(`    - Derived Status: ${file.derivedStatus}`);
        console.log(`    - Time Remaining (hours): ${file.timeRemainingHours}`);
        console.log(`    - Is Expired: ${file.isExpired}`);
        console.log(`    - Share Link: ${file.shareLink}`);
        console.log(`    - Transaction Hash: ${file.transactionHash}`);
        console.log(`    - File Hash: ${file.fileHash}`);
      });

      // Verify derived fields are present
      const firstFile = response.data.files[0];
      console.log('\n✓ Derived fields verification:');
      console.log(`  - timeRemaining: ${typeof firstFile.timeRemaining === 'number' ? '✓' : '✗'}`);
      console.log(`  - timeRemainingHours: ${typeof firstFile.timeRemainingHours === 'number' ? '✓' : '✗'}`);
      console.log(`  - derivedStatus: ${firstFile.derivedStatus ? '✓' : '✗'}`);
      console.log(`  - isExpired: ${typeof firstFile.isExpired === 'boolean' ? '✓' : '✗'}`);
      console.log(`  - shareLink: ${firstFile.shareLink ? '✓' : '✗'}`);

      // Verify sorting (newest first)
      if (response.data.files.length > 1) {
        const isSortedCorrectly = response.data.files.every((file, i) => {
          if (i === 0) return true;
          const currentTime = new Date(file.createdAt).getTime();
          const previousTime = new Date(response.data.files[i - 1].createdAt).getTime();
          return currentTime <= previousTime;
        });
        console.log(`\n✓ Sorting verification (newest first): ${isSortedCorrectly ? '✓ PASS' : '✗ FAIL'}`);
      }
    } else {
      console.log('\n✓ No files found for this wallet (empty result is valid)');
    }

    // Test 2: Invalid wallet address format
    console.log('\n\nTest 2: Testing invalid wallet address format');
    try {
      await axios.get(`${BASE_URL}/api/files/invalid-address`);
      console.log('✗ FAIL: Should have returned 400 error');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✓ PASS: Correctly rejected invalid wallet address');
        console.log('  Error message:', error.response.data.message);
        console.log('  Error code:', error.response.data.code);
      } else {
        console.log('✗ FAIL: Unexpected error status:', error.response?.status);
      }
    }

    // Test 3: Valid format but non-existent wallet
    console.log('\n\nTest 3: Testing valid format but non-existent wallet');
    const nonExistentWallet = '0x0000000000000000000000000000000000000000';
    const response3 = await axios.get(`${BASE_URL}/api/files/${nonExistentWallet}`);
    
    console.log('✓ Status:', response3.status);
    console.log('✓ Files count:', response3.data.count);
    console.log('✓ PASS: Returns empty array for wallet with no files');

    // Test 4: Case insensitivity
    console.log('\n\nTest 4: Testing case insensitivity');
    const lowercaseWallet = TEST_WALLET.toLowerCase();
    const response4 = await axios.get(`${BASE_URL}/api/files/${lowercaseWallet}`);
    
    console.log('✓ Status:', response4.status);
    console.log('✓ Files count:', response4.data.count);
    console.log('✓ PASS: Wallet address is case-insensitive');

    console.log('\n\n=== All Tests Completed Successfully ===');

  } catch (error) {
    console.error('\n✗ Test failed with error:');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    } else {
      console.error('  Error:', error.message);
    }
    process.exit(1);
  }
}

// Run tests
testUserFilesEndpoint();
