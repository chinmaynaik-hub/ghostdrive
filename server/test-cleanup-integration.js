/**
 * Integration test for cleanup service
 * Tests the cleanup service API endpoint
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testCleanupIntegration() {
  console.log('========================================');
  console.log('Cleanup Service Integration Test');
  console.log('========================================\n');

  try {
    // Test 1: Check server health
    console.log('Test 1: Checking server health...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log(`✓ Server is running`);
    console.log(`  - Database: ${healthResponse.data.database}`);
    console.log(`  - Blockchain: ${healthResponse.data.blockchain}\n`);

    // Test 2: Trigger manual cleanup
    console.log('Test 2: Triggering manual cleanup...');
    const cleanupResponse = await axios.post(`${BASE_URL}/api/cleanup/trigger`);
    
    if (cleanupResponse.data.success) {
      console.log('✓ Cleanup triggered successfully');
      console.log(`  - Timestamp: ${cleanupResponse.data.timestamp}`);
      console.log(`  - Message: ${cleanupResponse.data.message}\n`);
    } else {
      console.log('✗ Cleanup trigger failed');
      console.log(`  - Response: ${JSON.stringify(cleanupResponse.data)}\n`);
    }

    // Wait a moment for cleanup to complete
    console.log('Waiting for cleanup to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✓ Cleanup should be complete\n');

    console.log('========================================');
    console.log('✅ Integration test completed');
    console.log('========================================\n');
    console.log('Note: Check server logs for detailed cleanup output');

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\nMake sure the server is running:');
      console.error('  npm start (or npm run dev)');
    }
  }
}

// Run test
testCleanupIntegration();
