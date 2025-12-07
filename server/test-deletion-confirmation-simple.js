/**
 * Simple test for enhanced deletion confirmation (Task 8.2)
 * This test creates a file directly in the database and tests the deletion response
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { personalSign } = require('@metamask/eth-sig-util');
const crypto = require('crypto');

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
 * Test enhanced deletion confirmation
 */
async function testDeletionConfirmation() {
  console.log('=== Testing Enhanced Deletion Confirmation (Task 8.2) ===\n');

  let createdFileId = null;
  let testFilePath = null;

  try {
    // Step 1: Create a test file directly in the database
    console.log('Step 1: Creating test file in database...');
    const File = require('./models/File');
    const sequelize = require('./config/database');
    await sequelize.sync();

    // Create a physical test file
    testFilePath = path.join(__dirname, 'uploads', `test-${Date.now()}.txt`);
    const testContent = `Test file for deletion confirmation\nCreated at: ${new Date().toISOString()}`;
    fs.writeFileSync(testFilePath, testContent);

    // Create file record in database
    const file = await File.create({
      filename: 'test-deletion.txt',
      originalName: 'test-deletion.txt',
      filePath: testFilePath,
      fileSize: Buffer.byteLength(testContent),
      fileHash: crypto.createHash('sha256').update(testContent).digest('hex'),
      accessToken: crypto.randomBytes(32).toString('hex'),
      uploaderAddress: TEST_WALLET_ADDRESS.toLowerCase(),
      anonymousMode: false,
      viewLimit: 5,
      viewsRemaining: 5,
      expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      transactionHash: '0x' + crypto.randomBytes(32).toString('hex'),
      blockNumber: 12345,
      status: 'active'
    });

    createdFileId = file.id;
    console.log('✓ Test file created in database');
    console.log(`  File ID: ${file.id}`);
    console.log(`  Filename: ${file.originalName}`);
    console.log(`  File Size: ${file.fileSize} bytes`);
    console.log(`  File Hash: ${file.fileHash}`);
    console.log(`  Uploader: ${file.uploaderAddress}`);
    console.log(`  Views Remaining: ${file.viewsRemaining}`);
    console.log(`  Transaction Hash: ${file.transactionHash}`);
    console.log(`  Block Number: ${file.blockNumber}`);

    // Step 2: Delete the file with proper signature
    console.log('\nStep 2: Deleting file with wallet signature...');
    const message = `Delete file ${file.id}`;
    const signature = signMessage(message, TEST_PRIVATE_KEY);

    const deleteResponse = await axios.delete(`${BASE_URL}/api/file/${file.id}`, {
      headers: {
        'x-wallet-address': TEST_WALLET_ADDRESS,
        'x-signature': signature,
        'x-message': message
      }
    });

    console.log('✓ File deleted successfully');

    // Step 3: Verify enhanced deletion confirmation response structure
    console.log('\nStep 3: Verifying deletion confirmation response structure...');
    const response = deleteResponse.data;

    // Check required top-level fields
    const requiredFields = ['success', 'message', 'deletedAt', 'file'];
    const missingFields = requiredFields.filter(field => !(field in response));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    console.log('✓ All required top-level fields present');
    console.log(`  - success: ${response.success}`);
    console.log(`  - message: ${response.message}`);
    console.log(`  - deletedAt: ${response.deletedAt}`);
    console.log(`  - file: [object]`);

    // Check file details object
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

    // Step 4: Verify field values match original file
    console.log('\nStep 4: Verifying field values match original file...');
    
    const verifications = [
      { field: 'id', expected: file.id, actual: fileDetails.id },
      { field: 'filename', expected: file.originalName, actual: fileDetails.filename },
      { field: 'fileSize', expected: file.fileSize, actual: fileDetails.fileSize },
      { field: 'fileHash', expected: file.fileHash, actual: fileDetails.fileHash },
      { field: 'uploaderAddress', expected: file.uploaderAddress, actual: fileDetails.uploaderAddress },
      { field: 'viewsRemaining', expected: file.viewsRemaining, actual: fileDetails.viewsRemaining },
      { field: 'transactionHash', expected: file.transactionHash, actual: fileDetails.transactionHash },
      { field: 'blockNumber', expected: file.blockNumber, actual: fileDetails.blockNumber }
    ];

    let allMatch = true;
    for (const verification of verifications) {
      if (verification.expected !== verification.actual) {
        console.log(`✗ Field mismatch: ${verification.field}`);
        console.log(`  Expected: ${verification.expected}`);
        console.log(`  Actual: ${verification.actual}`);
        allMatch = false;
      } else {
        console.log(`✓ ${verification.field}: ${verification.actual}`);
      }
    }

    if (!allMatch) {
      throw new Error('Some field values do not match');
    }

    // Step 5: Verify deletedAt timestamp
    console.log('\nStep 5: Verifying deletedAt timestamp...');
    const deletedAt = new Date(response.deletedAt);
    const now = new Date();
    const timeDiff = Math.abs(now - deletedAt);
    
    if (isNaN(deletedAt.getTime())) {
      throw new Error('deletedAt is not a valid timestamp');
    }
    
    if (timeDiff > 10000) {
      throw new Error(`deletedAt timestamp is not recent (${timeDiff}ms difference)`);
    }
    console.log(`✓ deletedAt is valid: ${response.deletedAt}`);
    console.log(`✓ Time difference: ${timeDiff}ms (within acceptable range)`);

    // Step 6: Display complete response
    console.log('\n=== Complete Deletion Confirmation Response ===');
    console.log(JSON.stringify(response, null, 2));

    // Step 7: Verify file status in database
    console.log('\n=== Verifying Database State ===');
    await file.reload();
    console.log(`File status in database: ${file.status}`);
    
    if (file.status !== 'deleted') {
      throw new Error(`File status should be 'deleted' but is '${file.status}'`);
    }
    console.log('✓ File status correctly updated to "deleted"');

    console.log('\n=== ✅ All Tests Passed! ===');
    console.log('\n📋 Task 8.2 Implementation Verified Successfully:');
    console.log('✓ Deletion returns success status');
    console.log('✓ Deletion returns descriptive message');
    console.log('✓ Deletion returns deletedAt timestamp (ISO 8601 format)');
    console.log('✓ Deletion returns comprehensive file details:');
    console.log('  • File ID');
    console.log('  • Filename');
    console.log('  • File size (bytes)');
    console.log('  • File hash (SHA-256)');
    console.log('  • Uploader address (Ethereum wallet)');
    console.log('  • Upload timestamp');
    console.log('  • Views remaining (at deletion)');
    console.log('  • Expiry time');
    console.log('  • Transaction hash (blockchain)');
    console.log('  • Block number (blockchain)');
    console.log('\n✓ All field values match original file data');
    console.log('✓ File status correctly updated to "deleted" in database');
    
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Clean up test file if it exists
    if (testFilePath && fs.existsSync(testFilePath)) {
      try {
        fs.unlinkSync(testFilePath);
        console.log('✓ Test file cleaned up');
      } catch (cleanupError) {
        console.error('Failed to clean up test file:', cleanupError.message);
      }
    }
    
    process.exit(1);
  }
}

// Run the test
testDeletionConfirmation();
