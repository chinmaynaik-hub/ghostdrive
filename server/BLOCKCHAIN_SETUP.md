# Blockchain Infrastructure Setup

This document explains how to set up and use the blockchain infrastructure for the file sharing system.

## Prerequisites

- Node.js installed
- Ganache (installed as dev dependency)

## Setup Steps

### 1. Start Ganache (Local Blockchain)

In a separate terminal, run:

```bash
npm run ganache
```

This will start a local Ethereum blockchain on `http://localhost:8545` with deterministic accounts.

**Keep this terminal running** - the blockchain needs to be active for the application to work.

### 2. Compile the Smart Contract

```bash
npm run compile
```

This compiles the `FileRegistry.sol` contract and generates:
- `build/FileRegistry.abi.json` - Contract ABI (Application Binary Interface)
- `build/FileRegistry.bytecode.json` - Contract bytecode

### 3. Deploy the Smart Contract

```bash
npm run deploy
```

This script will:
- Connect to Ganache
- Deploy the FileRegistry contract
- Save the contract address and ABI to `config/blockchain.json`
- Run a test transaction to verify the deployment

### 4. Start the Server

```bash
npm run dev
```

The server will automatically:
- Load the blockchain configuration from `config/blockchain.json`
- Initialize the Web3 connection
- Connect to the deployed smart contract

## Smart Contract: FileRegistry

### Purpose
Stores immutable file metadata on the blockchain for verification and audit trails.

### Key Functions

#### `registerFile(bytes32 fileHash, uint256 timestamp)`
- Records a file's hash and metadata on the blockchain
- Emits a `FileRegistered` event
- Returns true on success

#### `getFileMetadata(bytes32 fileHash)`
- Retrieves stored metadata for a file
- Returns: fileHash, timestamp, uploader address, exists flag

#### `verifyFile(bytes32 fileHash)`
- Checks if a file hash exists on the blockchain
- Returns: boolean indicating if file is registered

#### `getFileCount()`
- Returns the total number of registered files

## Blockchain Service API

The `blockchainService.js` module provides a high-level API for interacting with the smart contract:

### `initialize()`
Loads configuration and establishes connection to the blockchain.

### `recordFileOnBlockchain(fileHash, timestamp, walletAddress, maxRetries = 3)`
Records file metadata with automatic retry logic and exponential backoff.

**Parameters:**
- `fileHash` - SHA-256 hash of the file (hex string)
- `timestamp` - Unix timestamp
- `walletAddress` - Uploader's Ethereum address
- `maxRetries` - Number of retry attempts (default: 3)

**Returns:**
```javascript
{
  transactionHash: '0x...',
  blockNumber: 123,
  gasUsed: 45678
}
```

### `getFileMetadata(fileHash)`
Retrieves file metadata from the blockchain.

### `verifyFile(fileHash)`
Checks if a file exists on the blockchain.

### `isConnected()`
Checks if the blockchain connection is active.

## Error Handling

The blockchain service includes comprehensive error handling:

1. **Connection Errors**: Detects when Ganache is not running
2. **Retry Logic**: Automatically retries failed transactions up to 3 times
3. **Exponential Backoff**: Waits 2^attempt seconds between retries
4. **Gas Estimation**: Automatically estimates and adds 20% buffer to gas limits

## Configuration File

After deployment, `config/blockchain.json` contains:

```json
{
  "contractAddress": "0x...",
  "deployerAccount": "0x...",
  "network": "ganache",
  "networkUrl": "http://localhost:8545",
  "deployedAt": "2024-01-01T00:00:00.000Z",
  "abi": [...]
}
```

## Troubleshooting

### "Cannot connect to blockchain network"
- Make sure Ganache is running: `npm run ganache`
- Check that it's running on port 8545

### "Blockchain configuration not found"
- Run the deployment script: `npm run deploy`

### "Transaction failed"
- Check Ganache logs for errors
- Ensure the wallet address has sufficient ETH for gas fees
- Try restarting Ganache and redeploying

### "File already registered"
- Each file hash can only be registered once
- This is by design to prevent duplicate entries

## Development Workflow

1. Start Ganache: `npm run ganache` (keep running)
2. Compile contract: `npm run compile` (only needed after contract changes)
3. Deploy contract: `npm run deploy` (only needed once, or after Ganache restart)
4. Start server: `npm run dev`

## Production Deployment

For production, you'll need to:

1. Update `networkUrl` in the deployment script to point to a testnet or mainnet
2. Configure a wallet with sufficient ETH for gas fees
3. Update the `.env` file with production blockchain settings
4. Consider using Infura or Alchemy as the Web3 provider
5. Implement proper key management for the deployer account

## Gas Costs

Approximate gas costs (on Ganache):
- Deploy contract: ~1,500,000 gas
- Register file: ~100,000 gas
- Get metadata: 0 gas (read-only)
- Verify file: 0 gas (read-only)

## Security Considerations

1. **Private Keys**: Never commit private keys or mnemonics to version control
2. **Network Security**: Use HTTPS endpoints for production Web3 providers
3. **Access Control**: The contract allows anyone to register files - consider adding access control if needed
4. **Gas Limits**: Set appropriate gas limits to prevent excessive costs
