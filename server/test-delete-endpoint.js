const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { signPersonalMessage } = require('@metamask/eth-sig-util');

const BASE_URL = 'http://localhost:3001';

// Test wallet (use a test private key - NEVER use real private keys in code)
const TEST_WALLET_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const TEST_PRIVATE_KEY = Buffer.from('59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', 'hex');

/**
 * Sign a message with the test wallet
 */
function signMessage(message, privateKey) {
  const signature = signPersonalMessage({
    privateKey: privateKey,
    data: message
  });
  return signature;
}

/**
 * Test the complete delete endpoint flow
 */
async function testDeleteEndpoint() {
  console.log('=== Testing Delete Endpoint ===\n');

  try {
    // Step 1: Upload a test file
    console.log('Step 1: Uploading test file...');
    const testFilePath = path.join(__dirname, 'test-file-for-deletion.txt');
    fs.writeFileSync(testFilePath, 'This is a test file for deletion endpoint testing.');

    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('walletAddress', TEST_WALLET_ADDRESS);
    formData.append('expiresIn', '24');
    formData.append('deleteAfterViews', '5');
    formData.append('anonymousMode', 'false');

    const uploadResponse = await axios.post(`${BASE_URL}/api/upload`, formData, {
      headers: formData.getHeaders()
    });

    if (!uploadResponse.data.success) {
      throw new Error('Upload failed: ' + uploadResponse.data.message);
    }

    const fileId = uploadResponse.data.fileId;
    const accessToken = uploadResponse.data.accessToken;
    console.log('✓ File uploaded successfully');
    console.log(`  File ID: ${fileId}`);
    console.log(`  Access Token: ${accessToken}`);

    // Clean up test file
    fs.unlinkSync(testFilePath);

    // Step 2: Verify file exists and is accessible
    console.log('\nStep 2: Verifying file is accessible...');
    const previewResponse = await axios.get(`${BASE_URL}/api/file/${accessToken}`);
    
    if (!previewResponse.data.success) {
      throw new Error('File preview failed: ' + previewResponse.data.message);
    }
    
    console.log('✓ File is accessible');
    console.log(`  Filename: ${previewResponse.data.filename}`);
    console.log(`  Views Remaining: ${previewResponse.data.viewsRemaining}`);

    // Step 3: Test delete without signature (should fail)
    console.log('\nStep 3: Testing delete without signature (should fail)...');
    try {
      await axios.delete(`${BASE_URL}/api/file/${fileId}`);
      console.log('✗ FAILED: Delete without signature should have been rejected');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✓ Delete without signature correctly rejected (401)');
      } else {
        throw error;
      }
    }

    // Step 4: Test delete with wrong wallet signature (should fail)
    console.log('\nStep 4: Testing delete with wrong wallet (should fail)...');
    const wrongWalletAddress = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
    const wrongPrivateKey = Buffer.from('5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', 'hex');
    
    const wrongMessage = `Delete file ${fileId}`;
    const wrongSignature = signMessage(wrongMessage, wrongPrivateKey);

    try {
      await axios.delete(`${BASE_URL}/api/file/${fileId}`, {
        headers: {
          'x-wallet-address': wrongWalletAddress,
          'x-signature': wrongSignature,
          'x-message': wrongMessage
        }
      });
      console.log('✗ FAILED: Delete with wrong wallet should have been rejected');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('✓ Delete with wrong wallet correctly rejected (403)');
        console.log(`  Error: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }

    // Step 5: Test delete with correct wallet signature (should succeed)
    console.log('\nStep 5: Testing delete with correct wallet signature...');
    const message = `Delete file ${fileId}`;
    const signature = signMessage(message, TEST_PRIVATE_KEY);

    const deleteResponse = await axios.delete(`${BASE_URL}/api/file/${fileId}`, {
      headers: {
        'x-wallet-address': TEST_WALLET_ADDRESS,
        'x-signature': signature,
        'x-message': message
      }
    });

    if (!deleteResponse.data.success) {
      throw new Error('Delete failed: ' + deleteResponse.data.message);
    }

    console.log('✓ File deleted successfully');
    console.log(`  Message: ${deleteResponse.data.message}`);
    console.log(`  Deleted File: ${deleteResponse.data.filename}`);

    // Step 6: Verify file is no longer accessible
    console.log('\nStep 6: Verifying file is no longer accessible...');
    try {
      await axios.get(`${BASE_URL}/api/file/${accessToken}`);
      console.log('✗ FAILED: Deleted file should not be accessible');
    } catch (error) {
      if (error.response && error.response.status === 410) {
        console.log('✓ Deleted file correctly returns 410 Gone');
      } else {
        throw error;
      }
    }

    // Step 7: Verify share link is invalidated (download should fail)
    console.log('\nStep 7: Verifying share link is invalidated...');
    try {
      await axios.get(`${BASE_URL}/api/download/${accessToken}`);
      console.log('✗ FAILED: Download of deleted file should fail');
    } catch (error) {
      if (error.response && error.response.status === 410) {
        console.log('✓ Download of deleted file correctly returns 410 Gone');
      } else {
        throw error;
      }
    }

    // Step 8: Test deleting already deleted file (should fail gracefully)
    console.log('\nStep 8: Testing delete of already deleted file...');
    const message2 = `Delete file ${fileId} again`;
    const signature2 = signMessage(message2, TEST_PRIVATE_KEY);

    try {
      await axios.delete(`${BASE_URL}/api/file/${fileId}`, {
        headers: {
          'x-wallet-address': TEST_WALLET_ADDRESS,
          'x-signature': signature2,
          'x-message': message2
        }
      });
      console.log('✗ FAILED: Deleting already deleted file should return error');
    } catch (error) {
      if (error.response && error.response.status === 410) {
        console.log('✓ Already deleted file correctly returns 410 Gone');
        console.log(`  Error: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }

    // Step 9: Test deleting non-existent file
    console.log('\nStep 9: Testing delete of non-existent file...');
    const fakeFileId = 99999;
    const message3 = `Delete file ${fakeFileId}`;
    const signature3 = signMessage(message3, TEST_PRIVATE_KEY);

    try {
      await axios.delete(`${BASE_URL}/api/file/${fakeFileId}`, {
        headers: {
          'x-wallet-address': TEST_WALLET_ADDRESS,
          'x-signature': signature3,
          'x-message': message3
        }
      });
      console.log('✗ FAILED: Deleting non-existent file should return 404');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✓ Non-existent file correctly returns 404 Not Found');
      } else {
        throw error;
      }
    }

    console.log('\n=== All Delete Endpoint Tests Passed! ===');

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testDeleteEndpoint();
