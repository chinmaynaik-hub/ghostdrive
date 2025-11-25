/**
 * Simple test script for file verification endpoint using native http
 */

const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3001;

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testVerification() {
  console.log('=== Testing File Verification Endpoint ===\n');

  try {
    // Test 1: Check server health
    console.log('Test 1: Check server health');
    try {
      const health = await makeRequest('GET', '/api/health');
      console.log('✓ Server is running');
      console.log('  Status:', health.data.status);
      console.log('  Blockchain:', health.data.blockchain);
      console.log('  Database:', health.data.database, '\n');
    } catch (error) {
      console.log('❌ Server not responding:', error.message);
      console.log('Please start the server first: cd server && node server.js\n');
      return;
    }

    // Test 2: Missing file hash
    console.log('Test 2: Missing file hash');
    const test2 = await makeRequest('POST', '/api/verify', {});
    if (test2.status === 400 && test2.data.code === 'FILE_HASH_REQUIRED') {
      console.log('✓ Correctly rejected missing file hash\n');
    } else {
      console.log('❌ Unexpected response:', test2, '\n');
    }

    // Test 3: Invalid hash format
    console.log('Test 3: Invalid hash format');
    const test3 = await makeRequest('POST', '/api/verify', {
      fileHash: 'invalid-hash'
    });
    if (test3.status === 400 && test3.data.code === 'INVALID_HASH_FORMAT') {
      console.log('✓ Correctly rejected invalid hash format\n');
    } else {
      console.log('❌ Unexpected response:', test3, '\n');
    }

    // Test 4: Valid hash format but file not on blockchain
    console.log('Test 4: Valid hash format but file not on blockchain');
    const nonExistentHash = 'a'.repeat(64);
    const test4 = await makeRequest('POST', '/api/verify', {
      fileHash: nonExistentHash
    });
    if (test4.data.success && !test4.data.verified) {
      console.log('✓ Correctly returned not verified for non-existent file');
      console.log('  Message:', test4.data.message, '\n');
    } else {
      console.log('❌ Unexpected response:', test4, '\n');
    }

    // Test 5: Check if we can verify an existing file
    console.log('Test 5: Verify existing file (if any)');
    const filesResponse = await makeRequest('GET', '/api/files');
    const files = filesResponse.data;
    
    if (files && files.length > 0) {
      const testFile = files[0];
      console.log(`  Testing with file: ${testFile.originalName}`);
      console.log(`  File hash: ${testFile.fileHash}`);
      console.log(`  Transaction hash: ${testFile.transactionHash}`);
      
      const verifyResponse = await makeRequest('POST', '/api/verify', {
        fileHash: testFile.fileHash,
        transactionHash: testFile.transactionHash
      });
      
      console.log('  Verification result:');
      console.log('    Verified:', verifyResponse.data.verified);
      console.log('    Message:', verifyResponse.data.message);
      
      if (verifyResponse.data.verified) {
        console.log('✓ File verified successfully\n');
      } else {
        console.log('⚠ File not verified (may not be on blockchain yet)\n');
      }
    } else {
      console.log('  No files found in database to test with\n');
    }

    console.log('=== Verification Tests Complete ===');

  } catch (error) {
    console.error('Test suite error:', error.message);
  }
}

testVerification();
