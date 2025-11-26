const axios = require('axios');
const { personalSign } = require('@metamask/eth-sig-util');

const BASE_URL = 'http://localhost:3001';

// Test wallet matching file #8
const TEST_WALLET_ADDRESS = '0x14791697260e4c9a71f18484c9f997b308e59325';
const TEST_PRIVATE_KEY = Buffer.from('0123456789012345678901234567890123456789012345678901234567890123', 'hex');

/**
 * Sign a message with the test wallet
 */
function signMessage(message, privateKey) {
  const signature = personalSign({
    privateKey: privateKey,
    data: message
  });
  return signature;
}

/**
 * Test the delete endpoint with existing file
 */
async function testDeleteEndpoint() {
  console.log('=== Testing Delete Endpoint (Simple) ===\n');

  try {
    const fileId = 8; // Using existing active file

    // Step 1: Verify file exists and is accessible
    console.log('Step 1: Checking if test file exists...');
    const File = require('./models/File');
    const sequelize = require('./config/database');
    await sequelize.sync();
    
    const file = await File.findByPk(fileId);
    if (!file) {
      console.log('✗ Test file not found. Please ensure file #8 exists in database.');
      process.exit(1);
    }
    
    console.log('✓ Test file found');
    console.log(`  File ID: ${file.id}`);
    console.log(`  Filename: ${file.originalName}`);
    console.log(`  Owner: ${file.uploaderAddress}`);
    console.log(`  Status: ${file.status}`);
    console.log(`  Access Token: ${file.accessToken}`);

    // Step 2: Test delete without signature (should fail)
    console.log('\nStep 2: Testing delete without signature (should fail)...');
    try {
      await axios.delete(`${BASE_URL}/api/file/${fileId}`);
      console.log('✗ FAILED: Delete without signature should have been rejected');
      process.exit(1);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✓ Delete without signature correctly rejected (401)');
        console.log(`  Message: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }

    // Step 3: Test delete with wrong wallet signature (should fail)
    console.log('\nStep 3: Testing delete with wrong wallet (should fail)...');
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
      process.exit(1);
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('✓ Delete with wrong wallet correctly rejected (403)');
        console.log(`  Message: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }

    // Step 4: Test delete with correct wallet signature (should succeed)
    console.log('\nStep 4: Testing delete with correct wallet signature...');
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

    // Step 5: Verify file status is updated to 'deleted'
    console.log('\nStep 5: Verifying file status in database...');
    await file.reload();
    
    if (file.status !== 'deleted') {
      console.log(`✗ FAILED: File status should be 'deleted' but is '${file.status}'`);
      process.exit(1);
    }
    
    console.log('✓ File status correctly updated to "deleted"');

    // Step 6: Verify file is no longer accessible via preview endpoint
    console.log('\nStep 6: Verifying file is no longer accessible...');
    try {
      await axios.get(`${BASE_URL}/api/file/${file.accessToken}`);
      console.log('✗ FAILED: Deleted file should not be accessible');
      process.exit(1);
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
      await axios.get(`${BASE_URL}/api/download/${file.accessToken}`);
      console.log('✗ FAILED: Download of deleted file should fail');
      process.exit(1);
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
      process.exit(1);
    } catch (error) {
      if (error.response && error.response.status === 410) {
        console.log('✓ Already deleted file correctly returns 410 Gone');
        console.log(`  Message: ${error.response.data.message}`);
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
      process.exit(1);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✓ Non-existent file correctly returns 404 Not Found');
      } else {
        throw error;
      }
    }

    console.log('\n=== All Delete Endpoint Tests Passed! ===');
    process.exit(0);

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
