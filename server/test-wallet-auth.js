/**
 * Test script for wallet authentication functionality
 * 
 * This script tests:
 * 1. Wallet address validation in upload endpoint
 * 2. User files endpoint with wallet address filtering
 * 3. Wallet signature verification middleware
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

// Test wallet addresses
const VALID_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';
const INVALID_WALLET = 'invalid-address';

async function testWalletAddressValidation() {
  console.log('\n=== Test 1: Wallet Address Validation in Upload ===');
  
  try {
    // Create a test file
    const testFilePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'Test content for wallet auth');
    
    // Test 1a: Upload without wallet address (should fail)
    console.log('\n1a. Testing upload without wallet address...');
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testFilePath));
      formData.append('expiresIn', '24');
      formData.append('deleteAfterViews', '1');
      
      await axios.post(`${BASE_URL}/api/upload`, formData, {
        headers: formData.getHeaders()
      });
      console.log('❌ FAILED: Should have rejected upload without wallet address');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.code === 'WALLET_ADDRESS_REQUIRED') {
        console.log('✅ PASSED: Correctly rejected upload without wallet address');
      } else {
        console.log('❌ FAILED: Wrong error response:', error.response?.data);
      }
    }
    
    // Test 1b: Upload with invalid wallet address (should fail)
    console.log('\n1b. Testing upload with invalid wallet address...');
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testFilePath));
      formData.append('expiresIn', '24');
      formData.append('deleteAfterViews', '1');
      formData.append('walletAddress', INVALID_WALLET);
      
      await axios.post(`${BASE_URL}/api/upload`, formData, {
        headers: formData.getHeaders()
      });
      console.log('❌ FAILED: Should have rejected invalid wallet address');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.code === 'INVALID_WALLET_ADDRESS') {
        console.log('✅ PASSED: Correctly rejected invalid wallet address');
      } else {
        console.log('❌ FAILED: Wrong error response:', error.response?.data);
      }
    }
    
    // Test 1c: Upload with valid wallet address (should succeed)
    console.log('\n1c. Testing upload with valid wallet address...');
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testFilePath));
      formData.append('expiresIn', '24');
      formData.append('deleteAfterViews', '1');
      formData.append('walletAddress', VALID_WALLET);
      
      const response = await axios.post(`${BASE_URL}/api/upload`, formData, {
        headers: formData.getHeaders()
      });
      
      if (response.data.success && response.data.accessToken) {
        console.log('✅ PASSED: Successfully uploaded with valid wallet address');
        console.log('   File ID:', response.data.fileId);
        console.log('   Access Token:', response.data.accessToken);
        return response.data.fileId;
      } else {
        console.log('❌ FAILED: Upload succeeded but response format incorrect');
      }
    } catch (error) {
      console.log('❌ FAILED: Upload with valid wallet failed:', error.response?.data || error.message);
    }
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

async function testUserFilesEndpoint() {
  console.log('\n=== Test 2: User Files Endpoint ===');
  
  try {
    // Test 2a: Query with invalid wallet address (should fail)
    console.log('\n2a. Testing query with invalid wallet address...');
    try {
      await axios.get(`${BASE_URL}/api/files/${INVALID_WALLET}`);
      console.log('❌ FAILED: Should have rejected invalid wallet address');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.code === 'INVALID_WALLET_ADDRESS') {
        console.log('✅ PASSED: Correctly rejected invalid wallet address');
      } else {
        console.log('❌ FAILED: Wrong error response:', error.response?.data);
      }
    }
    
    // Test 2b: Query with valid wallet address (should succeed)
    console.log('\n2b. Testing query with valid wallet address...');
    try {
      const response = await axios.get(`${BASE_URL}/api/files/${VALID_WALLET}`);
      
      if (response.data.success && Array.isArray(response.data.files)) {
        console.log('✅ PASSED: Successfully retrieved user files');
        console.log('   Files count:', response.data.count);
        
        // Check if files have derived fields
        if (response.data.files.length > 0) {
          const firstFile = response.data.files[0];
          const hasRequiredFields = 
            'timeRemaining' in firstFile &&
            'timeRemainingHours' in firstFile &&
            'derivedStatus' in firstFile &&
            'isExpired' in firstFile &&
            'shareLink' in firstFile;
          
          if (hasRequiredFields) {
            console.log('✅ PASSED: Files have all derived fields');
            console.log('   Sample file:', {
              filename: firstFile.originalName,
              viewsRemaining: firstFile.viewsRemaining,
              timeRemainingHours: firstFile.timeRemainingHours,
              derivedStatus: firstFile.derivedStatus
            });
          } else {
            console.log('❌ FAILED: Files missing derived fields');
          }
        }
        
        // Check if files are sorted by newest first
        if (response.data.files.length > 1) {
          const isSorted = response.data.files.every((file, i) => {
            if (i === 0) return true;
            return new Date(response.data.files[i - 1].createdAt) >= new Date(file.createdAt);
          });
          
          if (isSorted) {
            console.log('✅ PASSED: Files are sorted by newest first');
          } else {
            console.log('❌ FAILED: Files are not properly sorted');
          }
        }
      } else {
        console.log('❌ FAILED: Response format incorrect');
      }
    } catch (error) {
      console.log('❌ FAILED: Query failed:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

async function testWalletSignatureVerification() {
  console.log('\n=== Test 3: Wallet Signature Verification ===');
  
  try {
    // Test 3a: Delete without signature headers (should fail)
    console.log('\n3a. Testing delete without signature headers...');
    try {
      await axios.delete(`${BASE_URL}/api/file/1`);
      console.log('❌ FAILED: Should have rejected request without signature');
    } catch (error) {
      if (error.response?.status === 401 && error.response?.data?.code === 'MISSING_AUTH_HEADERS') {
        console.log('✅ PASSED: Correctly rejected request without signature headers');
      } else {
        console.log('❌ FAILED: Wrong error response:', error.response?.data);
      }
    }
    
    // Test 3b: Delete with invalid signature (should fail)
    console.log('\n3b. Testing delete with invalid signature...');
    try {
      await axios.delete(`${BASE_URL}/api/file/1`, {
        headers: {
          'x-wallet-address': VALID_WALLET,
          'x-signature': '0xinvalidsignature',
          'x-message': 'Delete file 1'
        }
      });
      console.log('❌ FAILED: Should have rejected invalid signature');
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 500) {
        console.log('✅ PASSED: Correctly rejected invalid signature');
      } else {
        console.log('❌ FAILED: Wrong error response:', error.response?.data);
      }
    }
    
    console.log('\nℹ️  Note: Full signature verification test requires a valid signature from a wallet.');
    console.log('   This would typically be generated by MetaMask or another wallet provider.');
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

async function runTests() {
  console.log('=================================================');
  console.log('  Wallet Authentication Tests');
  console.log('=================================================');
  console.log('\nMake sure the server is running on port 3001');
  console.log('Run: npm start (in server directory)\n');
  
  // Wait a moment for user to read
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    // Check if server is running
    await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server is running\n');
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first.');
    process.exit(1);
  }
  
  await testWalletAddressValidation();
  await testUserFilesEndpoint();
  await testWalletSignatureVerification();
  
  console.log('\n=================================================');
  console.log('  Tests Complete');
  console.log('=================================================\n');
}

runTests().catch(console.error);
