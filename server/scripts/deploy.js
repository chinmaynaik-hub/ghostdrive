const fs = require('fs');
const path = require('path');
const Web3 = require('web3');

async function deploy() {
  try {
    // Connect to Ganache
    const web3 = new Web3('http://localhost:8545');
    
    console.log('Connecting to Ganache at http://localhost:8545...');
    
    // Check connection
    const isConnected = await web3.eth.net.isListening();
    if (!isConnected) {
      throw new Error('Cannot connect to Ganache. Make sure Ganache is running on port 8545.');
    }
    
    console.log('✓ Connected to Ganache');
    
    // Get accounts
    const accounts = await web3.eth.getAccounts();
    if (accounts.length === 0) {
      throw new Error('No accounts found in Ganache');
    }
    
    const deployerAccount = accounts[0];
    console.log(`✓ Using account: ${deployerAccount}`);
    
    // Load compiled contract
    const buildPath = path.resolve(__dirname, '../build');
    const abi = JSON.parse(
      fs.readFileSync(path.join(buildPath, 'FileRegistry.abi.json'), 'utf8')
    );
    const bytecodeData = JSON.parse(
      fs.readFileSync(path.join(buildPath, 'FileRegistry.bytecode.json'), 'utf8')
    );
    const bytecode = '0x' + bytecodeData.bytecode;
    
    console.log('✓ Contract artifacts loaded');
    
    // Create contract instance
    const FileRegistry = new web3.eth.Contract(abi);
    
    console.log('Deploying FileRegistry contract...');
    
    // Deploy contract
    const deployedContract = await FileRegistry.deploy({
      data: bytecode
    }).send({
      from: deployerAccount,
      gas: 3000000,
      gasPrice: await web3.eth.getGasPrice()
    });
    
    const contractAddress = deployedContract.options.address;
    
    console.log('✓ Contract deployed successfully!');
    console.log(`  Contract address: ${contractAddress}`);
    
    // Save deployment info
    const deploymentInfo = {
      contractAddress,
      deployerAccount,
      network: 'ganache',
      networkUrl: 'http://localhost:8545',
      deployedAt: new Date().toISOString(),
      abi
    };
    
    const configPath = path.resolve(__dirname, '../config');
    if (!fs.existsSync(configPath)) {
      fs.mkdirSync(configPath, { recursive: true });
    }
    
    const deploymentPath = path.join(configPath, 'blockchain.json');
    fs.writeFileSync(
      deploymentPath,
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log(`✓ Deployment info saved to: ${deploymentPath}`);
    
    // Test the contract
    console.log('\nTesting contract...');
    const testHash = web3.utils.sha3('test file content');
    const testTimestamp = Math.floor(Date.now() / 1000);
    
    const receipt = await deployedContract.methods
      .registerFile(testHash, testTimestamp)
      .send({ from: deployerAccount, gas: 200000 });
    
    console.log('✓ Test file registered successfully');
    console.log(`  Transaction hash: ${receipt.transactionHash}`);
    
    // Verify the test file
    const metadata = await deployedContract.methods
      .getFileMetadata(testHash)
      .call();
    
    console.log('✓ Test file verified');
    console.log(`  File hash: ${metadata.fileHash}`);
    console.log(`  Uploader: ${metadata.uploader}`);
    console.log(`  Timestamp: ${metadata.timestamp}`);
    
    console.log('\n✓ Deployment complete!');
    console.log('\nNext steps:');
    console.log('1. Keep Ganache running');
    console.log('2. Start your server with: npm run dev');
    console.log('3. The contract address is stored in config/blockchain.json');
    
  } catch (error) {
    console.error('\n✗ Deployment failed:');
    console.error(error.message);
    
    if (error.message.includes('connect')) {
      console.error('\nMake sure Ganache is running:');
      console.error('  npx ganache --port 8545');
    }
    
    process.exit(1);
  }
}

deploy();
