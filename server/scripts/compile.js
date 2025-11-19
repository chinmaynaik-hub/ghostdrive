const fs = require('fs');
const path = require('path');
const solc = require('solc');

// Read the contract source code
const contractPath = path.resolve(__dirname, '../contracts/FileRegistry.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Prepare input for Solidity compiler
const input = {
  language: 'Solidity',
  sources: {
    'FileRegistry.sol': {
      content: source
    }
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode']
      }
    }
  }
};

// Compile the contract
console.log('Compiling FileRegistry.sol...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Check for errors
if (output.errors) {
  output.errors.forEach(error => {
    console.error(error.formattedMessage);
  });
  
  const hasError = output.errors.some(error => error.severity === 'error');
  if (hasError) {
    console.error('Compilation failed!');
    process.exit(1);
  }
}

// Extract the contract
const contract = output.contracts['FileRegistry.sol']['FileRegistry'];

// Create build directory if it doesn't exist
const buildPath = path.resolve(__dirname, '../build');
if (!fs.existsSync(buildPath)) {
  fs.mkdirSync(buildPath, { recursive: true });
}

// Write the ABI and bytecode to files
const abiPath = path.resolve(buildPath, 'FileRegistry.abi.json');
const bytecodePath = path.resolve(buildPath, 'FileRegistry.bytecode.json');

fs.writeFileSync(
  abiPath,
  JSON.stringify(contract.abi, null, 2)
);

fs.writeFileSync(
  bytecodePath,
  JSON.stringify({ bytecode: contract.evm.bytecode.object }, null, 2)
);

console.log('✓ Contract compiled successfully!');
console.log(`  ABI written to: ${abiPath}`);
console.log(`  Bytecode written to: ${bytecodePath}`);
