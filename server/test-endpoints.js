/**
 * Manual test script for file access control endpoints
 * Run this after starting the server with: node test-endpoints.js
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

async function testEndpoints() {
  console.log('🧪 Testing File Access Control Endpoints\n');
  
  try {
    // Test 1: Upload a test file
    console.log('Test 1: Upload a test file');
    const testFilePath = path.join(__dirname, 'uploads', '.gitkeep');
    
    if (!fs.existsSync(testFilePath)) {
      console.log('❌ Test file not found, skipping upload test');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('expiresIn', '24');
    formData.append('deleteAfterViews', '2');
    formData.append('anonymousMode', 'false');
    formData.append('walletAddress', '0x1234567890123456789012345678901234567890');
    
    const uploadResponse = await axios.post(`${BASE_URL}/api/upload`, formData, {
      headers: formData.getHeaders()
    });
    
    console.log('✅ Upload successful');
    console.log('   Access Token:', uploadResponse.data.accessToken);
    console.log('   Transaction Hash:', uploadResponse.data.transactionHash);
    
    const accessToken = uploadResponse.data.accessToken;
    
    // Test 2: Preview file metadata (should not decrement views)
    console.log('\nTest 2: Preview file metadata');
    const previewResponse = await axios.get(`${BASE_URL}/api/file/${accessToken}`);
    
    console.log('✅ Preview successful');
    console.log('   Filename:', previewResponse.data.filename);
    console.log('   File Size:', previewResponse.data.fileSize);
    console.log('   Views Remaining:', previewResponse.data.viewsRemaining);
    console.log('   Uploader Address:', previewResponse.data.uploaderAddress);
    
    // Test 3: Preview again (views should still be the same)
    console.log('\nTest 3: Preview again (views should not change)');
    const preview2Response = await axios.get(`${BASE_URL}/api/file/${accessToken}`);
    
    if (preview2Response.data.viewsRemaining === previewResponse.data.viewsRemaining) {
      console.log('✅ Views not decremented on preview:', preview2Response.data.viewsRemaining);
    } else {
      console.log('❌ Views were decremented on preview!');
    }
    
    // Test 4: Download file (should decrement views)
    console.log('\nTest 4: Download file (should decrement views)');
    const downloadResponse = await axios.get(`${BASE_URL}/api/download/${accessToken}`, {
      responseType: 'arraybuffer'
    });
    
    console.log('✅ Download successful');
    console.log('   File size:', downloadResponse.data.length, 'bytes');
    
    // Test 5: Preview after download (views should be decremented)
    console.log('\nTest 5: Preview after download (views should be decremented)');
    const preview3Response = await axios.get(`${BASE_URL}/api/file/${accessToken}`);
    
    console.log('✅ Preview successful');
    console.log('   Views Remaining:', preview3Response.data.viewsRemaining);
    
    if (preview3Response.data.viewsRemaining === previewResponse.data.viewsRemaining - 1) {
      console.log('✅ Views correctly decremented');
    } else {
      console.log('❌ Views not correctly decremented');
    }
    
    // Test 6: Test invalid access token
    console.log('\nTest 6: Test invalid access token');
    try {
      await axios.get(`${BASE_URL}/api/file/invalid_token`);
      console.log('❌ Should have failed with invalid token');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected invalid token format');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Test 7: Test non-existent file
    console.log('\nTest 7: Test non-existent file');
    try {
      const fakeToken = 'a'.repeat(64);
      await axios.get(`${BASE_URL}/api/file/${fakeToken}`);
      console.log('❌ Should have failed with 404');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Correctly returned 404 for non-existent file');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Test 8: Test anonymous mode
    console.log('\nTest 8: Test anonymous mode upload');
    const formData2 = new FormData();
    formData2.append('file', fs.createReadStream(testFilePath));
    formData2.append('expiresIn', '24');
    formData2.append('deleteAfterViews', '1');
    formData2.append('anonymousMode', 'true');
    formData2.append('walletAddress', '0x1234567890123456789012345678901234567890');
    
    const upload2Response = await axios.post(`${BASE_URL}/api/upload`, formData2, {
      headers: formData2.getHeaders()
    });
    
    const anonToken = upload2Response.data.accessToken;
    const anonPreview = await axios.get(`${BASE_URL}/api/file/${anonToken}`);
    
    if (!anonPreview.data.uploaderAddress) {
      console.log('✅ Uploader address correctly hidden in anonymous mode');
    } else {
      console.log('❌ Uploader address should be hidden in anonymous mode');
    }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Check if server is running
axios.get(`${BASE_URL}/api/health`)
  .then(() => {
    console.log('✅ Server is running\n');
    testEndpoints();
  })
  .catch(() => {
    console.error('❌ Server is not running. Please start the server first with: npm start');
    process.exit(1);
  });
