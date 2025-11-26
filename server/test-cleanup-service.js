/**
 * Test script for cleanup service
 * Tests the automated cleanup functionality
 */

const sequelize = require('./config/database');
const File = require('./models/File');
const cleanupService = require('./services/cleanupService');
const fs = require('fs');
const path = require('path');

async function testCleanupService() {
  console.log('========================================');
  console.log('Testing Cleanup Service');
  console.log('========================================\n');

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Create test files directory if it doesn't exist
    const testUploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(testUploadsDir)) {
      fs.mkdirSync(testUploadsDir);
    }

    // Test 1: Create a file expired by time
    console.log('Test 1: Creating file expired by time...');
    const expiredByTimeFile = path.join(testUploadsDir, 'test-expired-time.txt');
    fs.writeFileSync(expiredByTimeFile, 'This file is expired by time');
    
    const fileExpiredByTime = await File.create({
      filename: 'test-expired-time.txt',
      originalName: 'test-expired-time.txt',
      filePath: expiredByTimeFile,
      fileSize: 100,
      fileHash: 'a'.repeat(64),
      accessToken: 'a'.repeat(64),
      uploaderAddress: '0x' + '1'.repeat(40),
      anonymousMode: false,
      viewLimit: 5,
      viewsRemaining: 3,
      expiryTime: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      transactionHash: '0x' + 'a'.repeat(64),
      blockNumber: 1,
      status: 'active'
    }, { validate: false }); // Skip validation to allow expired time
    console.log(`✓ Created file ID ${fileExpiredByTime.id} (expired by time)\n`);

    // Test 2: Create a file expired by views
    console.log('Test 2: Creating file expired by views...');
    const expiredByViewsFile = path.join(testUploadsDir, 'test-expired-views.txt');
    fs.writeFileSync(expiredByViewsFile, 'This file is expired by views');
    
    const fileExpiredByViews = await File.create({
      filename: 'test-expired-views.txt',
      originalName: 'test-expired-views.txt',
      filePath: expiredByViewsFile,
      fileSize: 100,
      fileHash: 'b'.repeat(64),
      accessToken: 'b'.repeat(64),
      uploaderAddress: '0x' + '2'.repeat(40),
      anonymousMode: false,
      viewLimit: 1,
      viewsRemaining: 0, // No views remaining
      expiryTime: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day from now
      transactionHash: '0x' + 'b'.repeat(64),
      blockNumber: 2,
      status: 'active'
    });
    console.log(`✓ Created file ID ${fileExpiredByViews.id} (expired by views)\n`);

    // Test 3: Create an active file (should NOT be deleted)
    console.log('Test 3: Creating active file (should not be deleted)...');
    const activeFile = path.join(testUploadsDir, 'test-active.txt');
    fs.writeFileSync(activeFile, 'This file is still active');
    
    const fileActive = await File.create({
      filename: 'test-active.txt',
      originalName: 'test-active.txt',
      filePath: activeFile,
      fileSize: 100,
      fileHash: 'c'.repeat(64),
      accessToken: 'c'.repeat(64),
      uploaderAddress: '0x' + '3'.repeat(40),
      anonymousMode: false,
      viewLimit: 5,
      viewsRemaining: 3,
      expiryTime: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day from now
      transactionHash: '0x' + 'c'.repeat(64),
      blockNumber: 3,
      status: 'active'
    });
    console.log(`✓ Created file ID ${fileActive.id} (active)\n`);

    // Verify files exist before cleanup
    console.log('Verifying files before cleanup...');
    const beforeCleanup = await File.findAll({
      where: {
        id: [fileExpiredByTime.id, fileExpiredByViews.id, fileActive.id]
      }
    });
    console.log(`✓ Found ${beforeCleanup.length} files in database\n`);

    // Run cleanup
    console.log('Running cleanup service...\n');
    await cleanupService.runCleanup();

    // Verify results
    console.log('\nVerifying cleanup results...');
    
    const file1After = await File.findByPk(fileExpiredByTime.id);
    const file2After = await File.findByPk(fileExpiredByViews.id);
    const file3After = await File.findByPk(fileActive.id);

    console.log('\nResults:');
    console.log(`  File 1 (expired by time): ${file1After ? '❌ STILL EXISTS' : '✓ DELETED'}`);
    console.log(`  File 2 (expired by views): ${file2After ? '❌ STILL EXISTS' : '✓ DELETED'}`);
    console.log(`  File 3 (active): ${file3After ? '✓ STILL EXISTS' : '❌ DELETED'}`);

    // Check filesystem
    console.log('\nFilesystem check:');
    console.log(`  File 1: ${fs.existsSync(expiredByTimeFile) ? '❌ STILL EXISTS' : '✓ DELETED'}`);
    console.log(`  File 2: ${fs.existsSync(expiredByViewsFile) ? '❌ STILL EXISTS' : '✓ DELETED'}`);
    console.log(`  File 3: ${fs.existsSync(activeFile) ? '✓ STILL EXISTS' : '❌ DELETED'}`);

    // Test summary (check before cleanup)
    const success = !file1After && !file2After && file3After &&
                   !fs.existsSync(expiredByTimeFile) && 
                   !fs.existsSync(expiredByViewsFile) &&
                   fs.existsSync(activeFile);

    // Cleanup test file 3 (active file)
    if (file3After) {
      await file3After.destroy();
      if (fs.existsSync(activeFile)) {
        fs.unlinkSync(activeFile);
      }
      console.log('\n✓ Cleaned up test file 3');
    }

    console.log('\n========================================');
    if (success) {
      console.log('✅ ALL TESTS PASSED');
    } else {
      console.log('❌ SOME TESTS FAILED');
    }
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    console.log('Database connection closed');
  }
}

// Run tests
testCleanupService();
