/**
 * Test script to verify enhanced deletion confirmation response
 * This test verifies that task 8.2 is correctly implemented
 */

const axios = require('axios');
const { personalSign } = require('@metamask/eth-sig-util');

const BASE_URL = 'http://localhost:5000';

// Test configuration
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
 * Test the enhanced deletion confirmation response
 */
async function testDeletionConfirmation() {
  console.log('=== Testing Enhanced Deletion Confirmation (Task 8.2) ===\n');

  try {
    // Step 1: Find an active file for testing
    console.log('Step 1: Finding an active test file...');
    const File = require('./models/File');
    const sequelize = require('./config/database');
    await sequelize.sync();
    
    const file = await File.findOne({
      where: {
        uploaderAddress: TEST_WALLET_ADDRESS.toLowerCase(),
        status: 'active'
      }
    });

    if (!file) {
      console.log('✗ No active test file found for wallet:', TEST_WALLET_ADDRESS);
      console.log('  Please upload a file first using this wallet address.');
      process.exit(1);
    }

    console.log('✓ Test file found');
    console.log(`  File ID: ${file.id}`);
    console.log(`  Filename: ${file.originalName}`);
    console.log(`  File Size: ${file.fileSize} bytes`);
    console.log(`  File Hash: ${file.fileHash}`);
    console.log(`  Upload Timestamp: ${file.createdAt}`);
    console.log(`  Views Remaining: ${file.viewsRemaining}`);
    console.log(`  Expiry Time: ${file.expiryTime}`);
    console.log(`  Transaction Hash: ${file.transactionHash}`);
    console.log(`  Block Number: ${file.blockNumber}`);

    // Step 2: Delete the file with proper signature
    console.log('\nStep 2: Deleting file with proper signature...');
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
    console.log('\nStep 3: Verifying deletion confirmation response structure...');

    // Verify response structure
    const response = deleteResponse.data;

    // Check required fields
    const requiredFields = ['success', 'message', 'deletedAt', 'file'];
    const missingFields = requiredFields.filter(field => !(field in response));
    
    if (missingFields.length > 0) {
      console.log(`✗ FAILED: Missing required fields: ${missingFields.join(', ')}`);
      process.exit(1);
    }
    console.log('✓ All required top-level fields present');

    // Check file details object
    const fileDetails = response.file;
    const requiredFileFields = [
      'id', 'filename', 'fileSize', 'fileHash', 
      'uploaderAddress', 'uploadTimestamp', 'viewsRemaining', 
      'expiryTime', 'transactionHash', 'blockNumber'
    ];
    const missingFileFields = requiredFileFields.filter(field => !(field in fileDetails));
    
    if (missingFileFields.length > 0) {
      console.log(`✗ FAILED: Missing file detail fields: ${missingFileFields.join(', ')}`);
      process.exit(1);
    }
    console.log('✓ All required file detail fields present');

    // Verify field values match original file
    console.log('\nStep 4: Verifying deletion confirmation details match original file...');
    
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
      }
    }

    if (!allMatch) {
      console.log('\n✗ FAILED: Some field values do not match');
      process.exit(1);
    }
    console.log('✓ All field values match original file');

    // Verify deletedAt timestamp is valid and recent
    console.log('\nStep 5: Verifying deletedAt timestamp...');
    const deletedAt = new Date(response.deletedAt);
    const now = new Date();
    const timeDiff = Math.abs(now - deletedAt);
    
    if (isNaN(deletedAt.getTime())) {
      console.log('✗ FAILED: deletedAt is not a valid timestamp');
      process.exit(1);
    }
    
    if (timeDiff > 5000) { // More than 5 seconds difference
      console.log('✗ FAILED: deletedAt timestamp is not recent');
      console.log(`  Time difference: ${timeDiff}ms`);
      process.exit(1);
    }
    console.log('✓ deletedAt timestamp is valid and recent');

    // Display complete response
    console.log('\nStep 6: Complete deletion confirmation response:');
    console.log(JSON.stringify(response, null, 2));

    console.log('\n=== Task 8.2 Implementation Verified Successfully! ===');
    console.log('\nSummary:');
    console.log('✓ Deletion confirmation includes success status');
    console.log('✓ Deletion confirmation includes descriptive message');
    console.log('✓ Deletion confirmation includes deletedAt timestamp');
    console.log('✓ Deletion confirmation includes comprehensive file details:');
    console.log('  - File ID');
    console.log('  - Filename');
    console.log('  - File size');
    console.log('  - File hash');
    console.log('  - Uploader address');
    console.log('  - Upload timestamp');
    console.log('  - Views remaining (at deletion)');
    console.log('  - Expiry time');
    console.log('  - Transaction hash');
    console.log('  - Block number');
    
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testDeletionConfirmation();
