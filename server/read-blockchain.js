const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');

// Get blocks in table format
(async () => {
  const current = await web3.eth.getBlockNumber();
  const blocks = [];
  
  for (let i = Math.max(0, current - 9); i <= current; i++) {
    const block = await web3.eth.getBlock(i);
    blocks.push({
      Number: block.number,
      Hash: block.hash.substring(0, 10) + '...',
      Transactions: block.transactions.length,
      GasUsed: block.gasUsed,
      Timestamp: new Date(block.timestamp * 1000).toLocaleTimeString()
    });
  }
  
  console.table(blocks);
})();
