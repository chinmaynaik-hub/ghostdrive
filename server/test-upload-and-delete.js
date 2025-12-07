/**
 * Integration test: Upload a file and test enhanced deletion confirmation
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { personalSign } = require('@metamask/eth-sig-util');

const BASE_URL = 'http://localhost:3001';
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
 * Test upload and deletion with enhanced confirmation
 */
async function testUploadAndDelete() {
  console.log('=== Integration Test: Upload and Delete with Enhanced Confirmation ===\n');

  let uploadedFileId = null;

  try {
    // Step 1: Create a test file
    console.log('Step 1: Creating test file...');
    const testFilePath = path.join(__dirname, 'test-file-for-deletion.txt');
    const testContent = `Test file for deletion confirmation\nCreated at: ${new Date().toISOString()}\nRandom: ${Math.random()}`;
    fs.writeFileSync(testFilePath, testContent);
    console.log('✓ Test file created:', testFilePath);

    // Step 2: Upload the file
    console.log('\nStep 2: Uploading test file...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('walletAddress', TEST_WALLET_ADDRESS);
    formData.append('deleteAfterViews', '5');
    formData.append('expiresIn', '24');
    formData.append('anonymousMode', 'false');

    const uploadResponse = await axios.post(`${BASE_URL}/api/upload`, formData, {
      headers: formData.getHeaders()
    });

    if (!uploadResponse.data.success) {
      throw new Error('Upload failed: ' + uploadResponse.data.message);
    }

    uploadedFileId = uploadResponse.data.fileId;
    console.log('✓ File uploaded successfully');
    console.log(`  File ID: ${uploadedFileId}`);
    console.log(`  Access Token: ${uploadResponse.data.accessToken}`);
    console.log(`  Transaction Hash: ${uploadResponse.data.transactionHash}`);

    // Step 3: Verify file exists in database
    console.log('\nStep 3: Verifying file in database...');
    const File = require('./models/File');
    const sequelize = require('./config/database');
    await sequelize.sync();
    
    const file = await File.findByPk(uploadedFileId);
    if (!file) {
      throw new Error('File not found in database');
    }
    
    console.log('✓ File found in database');
    console.log(`  Filename: ${file.originalName}`);
    console.log(`  File Size: ${file.fileSize} bytes`);
    console.log(`  File Hash: ${file.fileHash}`);
    console.log(`  Views Remaining: ${file.viewsRemaining}`);
    console.log(`  Status: ${file.status}`);

    // Step 4: Delete the file with signature
    console.log('\nStep 4: Deleting file with wallet signature...');
    const message = `Delete file ${uploadedFileId}`;
    const signature = signMessage(message, TEST_PRIVATE_KEY);

    const deleteResponse = await axios.delete(`${BASE_URL}/api/file/${uploadedFileId}`, {
      headers: {
        'x-wallet-address': TEST_WALLET_ADDRESS,
        'x-signature': signature,
        'x-message': message
      }
    });

    console.log('✓ File deleted successfully');

    // Step 5: Verify enhanced deletion confirmation response
    console.log('\nStep 5: Verifying enhanced deletion confirmation response...');
    const response = deleteResponse.data;

    // Check top-level fields
    const requiredFields = ['success', 'message', 'deletedAt', 'file'];
    const missingFields = requiredFields.filter(field => !(field in response));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    console.log('✓ All required top-level fields present');

    // Check file details
    const fileDetails = response.file;
    const requiredFileFields = [
      'id', 'filename', 'fileSize', 'fileHash', 
      'uploaderAddress', 'uploadTimestamp', 'viewsRemaining', 
      'expiryTime', 'transactionHash', 'blockNumber'
    ];
    const missingFileFields = requiredFileFields.filter(field => !(field in fileDetails));
    
    if (missingFileFields.length > 0) {
      throw new Error(`Missing file detail fields: ${missingFileFields.join(', ')}`);
    }
    console.log('✓ All required file detail fields present');

    // Verify field values
    console.log('\nStep 6: Verifying field values match original file...');
    const verifications = [
      { field: 'id', expected: file.id, actual: fileDetails.id },
      { field: 'filename', expected: file.originalName, actual: fileDetails.filename },
      { field: 'fileSize', expected: file.fileSize, actual: fileDetails.fileSize },
      { field: 'fileHash', expected: file.fileHash, actual: fileDetails.fileHash },
      { field: 'uploaderAddress', expected: file.uploaderAddress, actual: fileDetails.uploaderAddress },
      { field: 'viewsRemaining', expected: file.viewsRemaining, actual: fileDetails.viewsRemaining },
      { field: 'transactionHash', expected: file.transactionHash, actual: fileDetails.transactionHash }
    ];

    let allMatch = true;
    for (const verification of verifications) {
      if (verification.expected !== verification.actual) {
        console.log(`✗ Field mismatch: ${verification.field}`);
        console.log(`  Expected: ${verification.expected}`);
        console.log(`  Actual: ${verification.actual}`);
        allMatch = false;
      }
    }

    if (!allMatch) {
      throw new Error('Some field values do not match');
    }
    console.log('✓ All field values match original file');

    // Verify deletedAt timestamp
    console.log('\nStep 7: Verifying deletedAt timestamp...');
    const deletedAt = new Date(response.deletedAt);
    const now = new Date();
    const timeDiff = Math.abs(now - deletedAt);
    
    if (isNaN(deletedAt.getTime())) {
      throw new Error('deletedAt is not a valid timestamp');
    }
    
    if (timeDiff > 10000) {
      throw new Error(`deletedAt timestamp is not recent (${timeDiff}ms difference)`);
    }
    console.log('✓ deletedAt timestamp is valid and recent');

    // Display complete response
    console.log('\n=== Complete Deletion Confirmation Response ===');
    console.log(JSON.stringify(response, null, 2));

    // Verify file status in database
    console.log('\n=== Verifying Database State ===');
    await file.reload();
    console.log(`File status in database: ${file.status}`);
    
    if (file.status !== 'deleted') {
      throw new Error(`File status should be 'deleted' but is '${file.status}'`);
    }
    console.log('✓ File status correctly updated to "deleted"');

    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('\n✓ Test file cleaned up');
    }

    console.log('\n=== ✅ All Tests Passed! ===');
    console.log('\nTask 8.2 Implementation Verified:');
    console.log('✓ Deletion returns success status');
    console.log('✓ Deletion returns descriptive message');
    console.log('✓ Deletion returns deletedAt timestamp');
    console.log('✓ Deletion returns comprehensive file details:');
    console.log('  • File ID, filename, size, hash');
    console.log('  • Uploader address');
    console.log('  • Upload timestamp');
    console.log('  • Views remaining at deletion');
    console.log('  • Expiry time');
    console.log('  • Transaction hash and block number');
    
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    
    // Clean up test file if it exists
    const testFilePath = path.join(__dirname, 'test-file-for-deletion.txt');
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    
    process.exit(1);
  }
}

// Run the test
testUploadAndDelete();
