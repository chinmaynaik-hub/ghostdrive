/**
 * Final comprehensive test for Task 7.3: Build user files endpoint
 * Tests Requirements 6.1, 6.2
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Task 7.3: User Files Endpoint - Comprehensive Test       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let passCount = 0;
  let failCount = 0;

  // Test 1: Requirement 6.1 - Retrieve all files for wallet address
  console.log('📋 Test 1: Retrieve all files for wallet address (Req 6.1)');
  try {
    const wallet = '0x1234567890123456789012345678901234567890';
    const res = await axios.get(`${BASE_URL}/api/files/${wallet}`);
    
    if (res.status === 200 && res.data.success && Array.isArray(res.data.files)) {
      console.log('   ✓ PASS: Successfully retrieved files for wallet');
      console.log(`   - Found ${res.data.count} file(s)`);
      passCount++;
    } else {
      console.log('   ✗ FAIL: Invalid response structure');
      failCount++;
    }
  } catch (e) {
    console.log('   ✗ FAIL:', e.message);
    failCount++;
  }

  // Test 2: Requirement 6.2 - Display required file information
  console.log('\n📋 Test 2: Display required file information (Req 6.2)');
  try {
    const res = await axios.get(`${BASE_URL}/api/files`);
    if (res.data.length > 0) {
      const wallet = res.data[0].uploaderAddress;
      const fileRes = await axios.get(`${BASE_URL}/api/files/${wallet}`);
      
      if (fileRes.data.files.length > 0) {
        const file = fileRes.data.files[0];
        const requiredFields = [
          'originalName',      // filename
          'createdAt',         // upload timestamp
          'viewsRemaining',    // View_Limit remaining
          'expiryTime'         // Expiry_Time
        ];
        
        const allPresent = requiredFields.every(field => file[field] !== undefined);
        
        if (allPresent) {
          console.log('   ✓ PASS: All required fields present');
          console.log('   - Filename:', file.originalName);
          console.log('   - Upload timestamp:', file.createdAt);
          console.log('   - Views remaining:', file.viewsRemaining);
          console.log('   - Expiry time:', file.expiryTime);
          passCount++;
        } else {
          console.log('   ✗ FAIL: Missing required fields');
          failCount++;
        }
      } else {
        console.log('   ⚠ SKIP: No files to test with');
      }
    } else {
      console.log('   ⚠ SKIP: No files in database');
    }
  } catch (e) {
    console.log('   ✗ FAIL:', e.message);
    failCount++;
  }

  // Test 3: Derived fields calculation
  console.log('\n📋 Test 3: Calculate derived fields (time remaining, status)');
  try {
    const res = await axios.get(`${BASE_URL}/api/files/0x0000000000000000000000000000000000000000`);
    
    if (res.data.files.length > 0) {
      const file = res.data.files[0];
      const derivedFields = [
        'timeRemaining',
        'timeRemainingHours',
        'derivedStatus',
        'isExpired',
        'shareLink'
      ];
      
      const allPresent = derivedFields.every(field => file[field] !== undefined);
      
      if (allPresent) {
        console.log('   ✓ PASS: All derived fields calculated');
        console.log('   - timeRemaining:', file.timeRemaining, 'ms');
        console.log('   - timeRemainingHours:', file.timeRemainingHours, 'hours');
        console.log('   - derivedStatus:', file.derivedStatus);
        console.log('   - isExpired:', file.isExpired);
        console.log('   - shareLink:', file.shareLink ? 'present' : 'missing');
        passCount++;
      } else {
        console.log('   ✗ FAIL: Missing derived fields');
        failCount++;
      }
    } else {
      console.log('   ⚠ SKIP: No files to test with');
    }
  } catch (e) {
    console.log('   ✗ FAIL:', e.message);
    failCount++;
  }

  // Test 4: Sort by upload timestamp (newest first)
  console.log('\n📋 Test 4: Sort by upload timestamp (newest first)');
  try {
    const res = await axios.get(`${BASE_URL}/api/files/0x0000000000000000000000000000000000000000`);
    
    if (res.data.files.length > 1) {
      const sorted = res.data.files.every((file, i) => {
        if (i === 0) return true;
        const currentTime = new Date(file.createdAt).getTime();
        const previousTime = new Date(res.data.files[i - 1].createdAt).getTime();
        return currentTime <= previousTime;
      });
      
      if (sorted) {
        console.log('   ✓ PASS: Files sorted correctly (newest first)');
        console.log(`   - Tested ${res.data.files.length} files`);
        passCount++;
      } else {
        console.log('   ✗ FAIL: Files not sorted correctly');
        failCount++;
      }
    } else {
      console.log('   ⚠ SKIP: Need multiple files to test sorting');
    }
  } catch (e) {
    console.log('   ✗ FAIL:', e.message);
    failCount++;
  }

  // Test 5: Wallet address validation
  console.log('\n📋 Test 5: Wallet address validation');
  try {
    await axios.get(`${BASE_URL}/api/files/invalid-address`);
    console.log('   ✗ FAIL: Should reject invalid wallet address');
    failCount++;
  } catch (e) {
    if (e.response?.status === 400 && e.response?.data?.code === 'INVALID_WALLET_ADDRESS') {
      console.log('   ✓ PASS: Invalid wallet address rejected');
      console.log('   - Error code:', e.response.data.code);
      passCount++;
    } else {
      console.log('   ✗ FAIL: Wrong error response');
      failCount++;
    }
  }

  // Test 6: Case insensitivity
  console.log('\n📋 Test 6: Case insensitivity');
  try {
    const wallet = '0x1234567890123456789012345678901234567890';
    const res1 = await axios.get(`${BASE_URL}/api/files/${wallet}`);
    const res2 = await axios.get(`${BASE_URL}/api/files/${wallet.toLowerCase()}`);
    const res3 = await axios.get(`${BASE_URL}/api/files/${wallet.toUpperCase()}`);
    
    if (res1.data.count === res2.data.count && res2.data.count === res3.data.count) {
      console.log('   ✓ PASS: Wallet address is case-insensitive');
      console.log(`   - All variations returned ${res1.data.count} file(s)`);
      passCount++;
    } else {
      console.log('   ✗ FAIL: Case sensitivity issue');
      failCount++;
    }
  } catch (e) {
    console.log('   ✗ FAIL:', e.message);
    failCount++;
  }

  // Test 7: Empty result for non-existent wallet
  console.log('\n📋 Test 7: Empty result for non-existent wallet');
  try {
    const nonExistentWallet = '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
    const res = await axios.get(`${BASE_URL}/api/files/${nonExistentWallet}`);
    
    if (res.status === 200 && res.data.success && res.data.count === 0) {
      console.log('   ✓ PASS: Returns empty array for non-existent wallet');
      passCount++;
    } else {
      console.log('   ✗ FAIL: Should return empty array');
      failCount++;
    }
  } catch (e) {
    console.log('   ✗ FAIL:', e.message);
    failCount++;
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      Test Summary                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n   Total Tests: ${passCount + failCount}`);
  console.log(`   ✓ Passed: ${passCount}`);
  console.log(`   ✗ Failed: ${failCount}`);
  
  if (failCount === 0) {
    console.log('\n   🎉 All tests passed! Task 7.3 is complete.\n');
  } else {
    console.log('\n   ⚠ Some tests failed. Please review.\n');
  }
}

runAllTests();
