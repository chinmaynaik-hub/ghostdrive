const Web3 = require('web3');

async function checkGanache() {
  const web3 = new Web3('http://localhost:8545');
  
  try {
    const isListening = await web3.eth.net.isListening();
    
    if (isListening) {
      const networkId = await web3.eth.net.getId();
      const blockNumber = await web3.eth.getBlockNumber();
      const accounts = await web3.eth.getAccounts();
      
      console.log('✓ Ganache is running');
      console.log(`  Network ID: ${networkId}`);
      console.log(`  Block number: ${blockNumber}`);
      console.log(`  Accounts: ${accounts.length}`);
      console.log(`  First account: ${accounts[0]}`);
      
      return true;
    }
  } catch (error) {
    console.log('✗ Ganache is not running');
    console.log('\nTo start Ganache, run:');
    console.log('  npm run ganache');
    console.log('\nOr in a separate terminal:');
    console.log('  npx ganache --port 8545 --deterministic');
    
    return false;
  }
}

checkGanache();
