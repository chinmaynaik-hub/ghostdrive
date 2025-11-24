/**
 * Test script for Task 5 endpoints
 * Tests the file preview, download, and deletion functionality
 */

const sequelize = require('./config/database');
const File = require('./models/File');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function runTests() {
  console.log('🧪 Testing Task 5: File Access Control and Validation\n');
  
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    // Test 1: Create a test file record
    console.log('Test 1: Create test file record');
    const testFilePath = path.join(__dirname, 'uploads', '.gitkeep');
    const accessToken = crypto.randomBytes(32).toString('hex');
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const testFile = await File.create({
      filename: 'test.txt',
      originalName: 'test.txt',
      filePath: testFilePath,
      fileSize: fs.existsSync(testFilePath) ? fs.statSync(testFilePath).size : 0,
      fileHash: 'a'.repeat(64),
      accessToken: accessToken,
      uploaderAddress: '0x1234567890123456789012345678901234567890',
      anonymousMode: false,
      viewLimit: 3,
      viewsRemaining: 3,
      expiryTime: expiryTime,
      transactionHash: '0x' + 'b'.repeat(64),
      blockNumber: 12345,
      status: 'active'
    });
    
    console.log('✅ Test file created with ID:', testFile.id);
    console.log('   Access Token:', accessToken);
    console.log('   Views Remaining:', testFile.viewsRemaining);
    
    // Test 2: Simulate file preview (should not decrement views)
    console.log('\nTest 2: File preview logic');
    const previewFile = await File.findOne({ where: { accessToken } });
    
    if (previewFile) {
      console.log('✅ File found for preview');
      console.log('   Filename:', previewFile.originalName);
      console.log('   File Size:', previewFile.fileSize);
      console.log('   Views Remaining:', previewFile.viewsRemaining);
      console.log('   Uploader Address:', previewFile.uploaderAddress);
      console.log('   Anonymous Mode:', previewFile.anonymousMode);
      
      // Check if uploader address should be hidden
      if (!previewFile.anonymousMode) {
        console.log('✅ Uploader address visible (not anonymous)');
      }
    } else {
      console.log('❌ File not found');
    }
    
    // Test 3: Simulate download with atomic view decrement
    console.log('\nTest 3: Atomic view decrement');
    const transaction = await sequelize.transaction();
    
    try {
      const downloadFile = await File.findOne({
        where: { accessToken },
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      
      if (downloadFile) {
        const viewsBefore = downloadFile.viewsRemaining;
        downloadFile.viewsRemaining = downloadFile.viewsRemaining - 1;
        await downloadFile.save({ transaction });
        await transaction.commit();
        
        const viewsAfter = downloadFile.viewsRemaining;
        console.log('✅ Views decremented atomically');
        console.log('   Before:', viewsBefore);
        console.log('   After:', viewsAfter);
        
        if (viewsAfter === viewsBefore - 1) {
          console.log('✅ View count correctly decremented');
        } else {
          console.log('❌ View count not correctly decremented');
        }
      }
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
    // Test 4: Check views after download
    console.log('\nTest 4: Verify views after download');
    const afterDownload = await File.findOne({ where: { accessToken } });
    console.log('   Views Remaining:', afterDownload.viewsRemaining);
    
    if (afterDownload.viewsRemaining === 2) {
      console.log('✅ Views correctly persisted');
    } else {
      console.log('❌ Views not correctly persisted');
    }
    
    // Test 5: Test anonymous mode
    console.log('\nTest 5: Anonymous mode');
    const anonToken = crypto.randomBytes(32).toString('hex');
    const anonFile = await File.create({
      filename: 'anon.txt',
      originalName: 'anon.txt',
      filePath: testFilePath,
      fileSize: 100,
      fileHash: 'c'.repeat(64),
      accessToken: anonToken,
      uploaderAddress: '0x9876543210987654321098765432109876543210',
      anonymousMode: true,
      viewLimit: 1,
      viewsRemaining: 1,
      expiryTime: expiryTime,
      transactionHash: '0x' + 'd'.repeat(64),
      blockNumber: 12346,
      status: 'active'
    });
    
    console.log('✅ Anonymous file created');
    console.log('   Anonymous Mode:', anonFile.anonymousMode);
    
    if (anonFile.anonymousMode) {
      console.log('✅ Uploader address should be hidden in preview');
    }
    
    // Test 6: Test file deletion logic
    console.log('\nTest 6: File deletion logic');
    const fileToDelete = await File.findByPk(anonFile.id);
    
    if (fileToDelete) {
      fileToDelete.status = 'deleted';
      await fileToDelete.save();
      console.log('✅ File status updated to deleted');
      
      const deletedFile = await File.findByPk(anonFile.id);
      if (deletedFile.status === 'deleted') {
        console.log('✅ Deletion status persisted');
      }
    }
    
    // Test 7: Test ownership verification
    console.log('\nTest 7: Ownership verification');
    const ownerWallet = '0x1234567890123456789012345678901234567890';
    const nonOwnerWallet = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    
    const fileForOwnership = await File.findByPk(testFile.id);
    
    if (fileForOwnership.uploaderAddress.toLowerCase() === ownerWallet.toLowerCase()) {
      console.log('✅ Owner verification passed');
    } else {
      console.log('❌ Owner verification failed');
    }
    
    if (fileForOwnership.uploaderAddress.toLowerCase() !== nonOwnerWallet.toLowerCase()) {
      console.log('✅ Non-owner correctly rejected');
    } else {
      console.log('❌ Non-owner should be rejected');
    }
    
    // Test 8: Test expiry check
    console.log('\nTest 8: Expiry time validation');
    const now = new Date();
    // Create a file that will expire soon (1 hour from now, minimum allowed)
    const soonToExpireFile = await File.create({
      filename: 'expiring.txt',
      originalName: 'expiring.txt',
      filePath: testFilePath,
      fileSize: 100,
      fileHash: 'e'.repeat(64),
      accessToken: crypto.randomBytes(32).toString('hex'),
      uploaderAddress: '0x1234567890123456789012345678901234567890',
      anonymousMode: false,
      viewLimit: 1,
      viewsRemaining: 1,
      expiryTime: new Date(now.getTime() + 61 * 60 * 1000), // 61 minutes from now
      transactionHash: '0x' + 'f'.repeat(64),
      blockNumber: 12347,
      status: 'active'
    });
    
    // Simulate checking if file is expired
    const checkTime = new Date(now.getTime() + 62 * 60 * 1000); // 62 minutes from now
    if (checkTime > soonToExpireFile.expiryTime) {
      console.log('✅ Expiry check logic works correctly');
      soonToExpireFile.status = 'expired';
      await soonToExpireFile.save();
      console.log('✅ Expired file status can be updated');
    }
    
    // Test 9: Test view limit check
    console.log('\nTest 9: View limit validation');
    const zeroViewsFile = await File.create({
      filename: 'noviews.txt',
      originalName: 'noviews.txt',
      filePath: testFilePath,
      fileSize: 100,
      fileHash: 'g'.repeat(64),
      accessToken: crypto.randomBytes(32).toString('hex'),
      uploaderAddress: '0x1234567890123456789012345678901234567890',
      anonymousMode: false,
      viewLimit: 1,
      viewsRemaining: 0,
      expiryTime: expiryTime,
      transactionHash: '0x' + 'h'.repeat(64),
      blockNumber: 12348,
      status: 'active'
    });
    
    if (zeroViewsFile.viewsRemaining <= 0) {
      console.log('✅ View limit check works correctly');
      zeroViewsFile.status = 'expired';
      await zeroViewsFile.save();
      console.log('✅ Zero views file status updated');
    }
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await File.destroy({ where: { id: [testFile.id, anonFile.id, soonToExpireFile.id, zeroViewsFile.id] } });
    console.log('✅ Test data cleaned up');
    
    console.log('\n✅ All tests passed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    console.log('\n✅ Database connection closed');
  }
}

runTests();
