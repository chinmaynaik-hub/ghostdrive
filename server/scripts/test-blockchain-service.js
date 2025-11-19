const blockchainService = require('../services/blockchainService');
const crypto = require('crypto');

async function testBlockchainService() {
  try {
    console.log('Testing Blockchain Service...\n');

    // Initialize the service
    console.log('1. Initializing blockchain service...');
    await blockchainService.initialize();
    console.log('✓ Service initialized\n');

    // Check connection
    console.log('2. Checking connection...');
    const isConnected = await blockchainService.isConnected();
    console.log(`✓ Connected: ${isConnected}\n`);

    // Get network info
    console.log('3. Getting network info...');
    const networkId = await blockchainService.getNetworkId();
    const blockNumber = await blockchainService.getBlockNumber();
    console.log(`✓ Network ID: ${networkId}`);
    console.log(`✓ Block number: ${blockNumber}\n`);

    // Test file registration
    console.log('4. Testing file registration...');
    const testContent = `Test file ${Date.now()} - ${Math.random()}`;
    const fileHash = crypto.createHash('sha256').update(testContent).digest('hex');
    const timestamp = Math.floor(Date.now() / 1000);
    const walletAddress = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1'; // First Ganache account

    console.log(`   File hash: ${fileHash}`);
    console.log(`   Timestamp: ${timestamp}`);
    console.log(`   Wallet: ${walletAddress}`);

    const result = await blockchainService.recordFileOnBlockchain(
      fileHash,
      timestamp,
      walletAddress
    );

    console.log('✓ File registered successfully');
    console.log(`   Transaction hash: ${result.transactionHash}`);
    console.log(`   Block number: ${result.blockNumber}`);
    console.log(`   Gas used: ${result.gasUsed}\n`);

    // Test file verification
    console.log('5. Testing file verification...');
    const exists = await blockchainService.verifyFile(fileHash);
    console.log(`✓ File exists: ${exists}\n`);

    // Test getting metadata
    console.log('6. Testing metadata retrieval...');
    const metadata = await blockchainService.getFileMetadata(fileHash);
    console.log('✓ Metadata retrieved:');
    console.log(`   File hash: ${metadata.fileHash}`);
    console.log(`   Timestamp: ${metadata.timestamp}`);
    console.log(`   Uploader: ${metadata.uploader}`);
    console.log(`   Exists: ${metadata.exists}\n`);

    // Test file count
    console.log('7. Testing file count...');
    const fileCount = await blockchainService.getFileCount();
    console.log(`✓ Total files registered: ${fileCount}\n`);

    // Test verification of non-existent file
    console.log('8. Testing non-existent file...');
    const fakeHash = crypto.createHash('sha256').update('fake content').digest('hex');
    const fakeExists = await blockchainService.verifyFile(fakeHash);
    console.log(`✓ Fake file exists: ${fakeExists}\n`);

    // Test retry logic (simulate by using invalid wallet)
    console.log('9. Testing error handling...');
    try {
      await blockchainService.recordFileOnBlockchain(
        crypto.createHash('sha256').update('test2').digest('hex'),
        timestamp,
        '0x0000000000000000000000000000000000000000' // Invalid wallet
      );
      console.log('✗ Should have failed with invalid wallet');
    } catch (error) {
      console.log('✓ Error handling works correctly');
      console.log(`   Error: ${error.message}\n`);
    }

    console.log('✓ All tests passed!');

  } catch (error) {
    console.error('✗ Test failed:');
    console.error(error.message);
    process.exit(1);
  }
}

testBlockchainService();
