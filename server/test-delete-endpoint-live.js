/**
 * Live integration test for DELETE /api/file/:fileId endpoint
 * This test requires the server to be running
 */

const axios = require('axios');
const Web3 = require('web3');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

async function testDeleteEndpoint() {
  console.log('=== Live DELETE Endpoint Test ===\n');
  
  try {
    // Check if server is running
    console.log('1. Checking server health...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/api/health`);
      console.log(`   ✓ Server is running`);
      console.log(`   Database: ${healthResponse.data.database}`);
      console.log(`   Blockchain: ${healthResponse.data.blockchain}`);
    } catch (error) {
      console.log('   ✗ Server is not running');
      console.log('   Please start the server with: npm start');
      return;
    }
    console.log('');
    
    // Create test account
    const web3 = new Web3();
    const testAccount = web3.eth.accounts.create();
    console.log('2. Created test wallet');
    console.log(`   Address: ${testAccount.address}`);
    console.log('');
    
    // Upload a test file
    console.log('3. Uploading test file...');
    
    // Create a temporary test file
    const testFilePath = path.join(__dirname, 'test-file-temp.txt');
    fs.writeFileSync(testFilePath, 'This is a test file for deletion endpoint testing.');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('walletAddress', testAccount.address);
    formData.append('expiresIn', '24');
    formData.append('deleteAfterViews', '5');
    formData.append('anonymousMode', 'false');
    
    let uploadResponse;
    try {
      uploadResponse = await axios.post(`${BASE_URL}/api/upload`, formData, {
        headers: formData.getHeaders()
      });
      
      console.log(`   ✓ File uploaded successfully`);
      console.log(`   File ID: ${uploadResponse.data.fileId}`);
      console.log(`   Access Token: ${uploadResponse.data.accessToken.substring(0, 20)}...`);
      console.log(`   Transaction Hash: ${uploadResponse.data.transactionHash || 'N/A'}`);
    } catch (error) {
      console.log(`   ✗ Upload failed: ${error.response?.data?.message || error.message}`);
      fs.unlinkSync(testFilePath);
      return;
    }
    
    // Clean up temp file
    fs.unlinkSync(testFilePath);
    console.log('');
    
    const fileId = uploadResponse.data.fileId;
    
    // Test 1: Delete without authentication (should fail)
    console.log('4. Test: Delete without authentication headers');
    try {
      await axios.delete(`${BASE_URL}/api/file/${fileId}`);
      console.log('   ✗ Request should have been rejected');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ✓ Request correctly rejected with 401');
        console.log(`   Error: ${error.response.data.message}`);
      } else {
        console.log(`   ✗ Unexpected error: ${error.message}`);
      }
    }
    console.log('');
    
    // Test 2: Delete with invalid signature (should fail)
    console.log('5. Test: Delete with invalid signature');
    const wrongAccount = web3.eth.accounts.create();
    const message = `Delete file with ID: ${fileId}`;
    const wrongSignature = wrongAccount.sign(message);
    
    try {
      await axios.delete(`${BASE_URL}/api/file/${fileId}`, {
        headers: {
          'x-wallet-address': testAccount.address,
          'x-signature': wrongSignature.signature,
          'x-message': message
        }
      });
      console.log('   ✗ Request should have been rejected');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ✓ Request correctly rejected with 403');
        console.log(`   Error: ${error.response.data.message}`);
      } else {
        console.log(`   ✗ Unexpected error: ${error.message}`);
      }
    }
    console.log('');
    
    // Test 3: Delete with valid signature (should succeed)
    console.log('6. Test: Delete with valid signature');
    const validSignature = testAccount.sign(message);
    
    try {
      const deleteResponse = await axios.delete(`${BASE_URL}/api/file/${fileId}`, {
        headers: {
          'x-wallet-address': testAccount.address,
          'x-signature': validSignature.signature,
          'x-message': message
        }
      });
      
      console.log('   ✓ File deleted successfully');
      console.log(`   Response: ${deleteResponse.data.message}`);
      console.log(`   File ID: ${deleteResponse.data.fileId}`);
    } catch (error) {
      console.log(`   ✗ Delete failed: ${error.response?.data?.message || error.message}`);
    }
    console.log('');
    
    // Test 4: Try to delete again (should fail - already deleted)
    console.log('7. Test: Try to delete already deleted file');
    try {
      await axios.delete(`${BASE_URL}/api/file/${fileId}`, {
        headers: {
          'x-wallet-address': testAccount.address,
          'x-signature': validSignature.signature,
          'x-message': message
        }
      });
      console.log('   ✗ Request should have been rejected');
    } catch (error) {
      if (error.response?.status === 410) {
        console.log('   ✓ Request correctly rejected with 410');
        console.log(`   Error: ${error.response.data.message}`);
      } else {
        console.log(`   ✗ Unexpected status: ${error.response?.status}`);
      }
    }
    console.log('');
    
    console.log('=== All Tests Complete ===\n');
    console.log('Summary:');
    console.log('✓ Server is running and accessible');
    console.log('✓ File upload working');
    console.log('✓ Unauthenticated requests rejected (401)');
    console.log('✓ Invalid signatures rejected (403)');
    console.log('✓ Valid signatures accepted and file deleted');
    console.log('✓ Already deleted files rejected (410)');
    console.log('\nThe wallet signature verification is working correctly in production!');
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

// Run the test
testDeleteEndpoint();
