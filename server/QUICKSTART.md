# Quick Start Guide - Blockchain File Sharing

This guide will help you get the blockchain infrastructure up and running quickly.

## Prerequisites

- Node.js installed
- MySQL running (for the database)
- All dependencies installed (`npm install`)

## Step-by-Step Setup

### 1. Start Ganache (Local Blockchain)

Open a **separate terminal** and run:

```bash
cd server
npm run ganache
```

**Keep this terminal open!** Ganache must stay running for blockchain features to work.

You should see output showing 10 accounts with 1000 ETH each.

### 2. Verify Ganache is Running

In your main terminal:

```bash
npm run check-ganache
```

You should see:
```
✓ Ganache is running
  Network ID: ...
  Block number: 0
  Accounts: 10
```

### 3. Compile the Smart Contract

```bash
npm run compile
```

This creates the contract ABI and bytecode in the `build/` directory.

### 4. Deploy the Smart Contract

```bash
npm run deploy
```

This will:
- Deploy the FileRegistry contract to Ganache
- Save the contract address to `config/blockchain.json`
- Run a test transaction to verify everything works

You should see:
```
✓ Contract deployed successfully!
  Contract address: 0x...
```

### 5. Test the Blockchain Service (Optional)

```bash
npm run test-blockchain
```

This runs a comprehensive test of all blockchain functionality.

### 6. Start the Server

```bash
npm run dev
```

The server will:
- Connect to the database
- Initialize the blockchain service
- Load the deployed contract
- Start listening on port 3001 (or your configured PORT)

You should see:
```
Database connected and synced
✓ Blockchain service initialized
  Network: http://localhost:8545
  Contract: 0x...
Blockchain service ready
Server running on port 3001
```

## Verify Everything is Working

Test the health endpoint:

```bash
curl http://localhost:3001/api/health
```

You should see:
```json
{
  "status": "ok",
  "database": "connected",
  "blockchain": "connected",
  "blockNumber": 2,
  "timestamp": "2024-..."
}
```

## Common Issues

### "Cannot connect to blockchain network"

**Problem**: Ganache is not running.

**Solution**: 
```bash
npm run ganache
```
Keep this terminal open.

### "Blockchain configuration not found"

**Problem**: Contract hasn't been deployed.

**Solution**:
```bash
npm run compile
npm run deploy
```

### "Database sync error"

**Problem**: MySQL is not running or credentials are wrong.

**Solution**: 
- Check MySQL is running
- Verify credentials in `.env` file
- Make sure the database exists

### Port 8545 already in use

**Problem**: Another process is using port 8545.

**Solution**:
- Stop the other process
- Or change the port in scripts and config files

## Development Workflow

For daily development:

1. **First time only**:
   ```bash
   npm run compile
   ```

2. **Every time you start working**:
   - Terminal 1: `npm run ganache` (keep running)
   - Terminal 2: `npm run deploy` (only if Ganache was restarted)
   - Terminal 2: `npm run dev`

3. **When you make contract changes**:
   ```bash
   npm run compile
   npm run deploy
   ```
   Then restart the server.

## What Each Script Does

- `npm run ganache` - Starts local blockchain (keep running)
- `npm run check-ganache` - Checks if Ganache is running
- `npm run compile` - Compiles the Solidity contract
- `npm run deploy` - Deploys contract to Ganache
- `npm run test-blockchain` - Tests blockchain service
- `npm run dev` - Starts the server with auto-reload

## File Structure

```
server/
├── contracts/
│   └── FileRegistry.sol          # Smart contract
├── build/
│   ├── FileRegistry.abi.json     # Contract ABI (generated)
│   └── FileRegistry.bytecode.json # Contract bytecode (generated)
├── config/
│   └── blockchain.json           # Deployment info (generated)
├── services/
│   └── blockchainService.js      # Blockchain service API
└── scripts/
    ├── compile.js                # Compilation script
    ├── deploy.js                 # Deployment script
    ├── check-ganache.js          # Connection check
    └── test-blockchain-service.js # Test script
```

## Next Steps

Now that the blockchain infrastructure is set up, you can:

1. Test file uploads with blockchain recording
2. Verify files against blockchain
3. View transaction hashes for uploaded files
4. Build the frontend integration

See `BLOCKCHAIN_SETUP.md` for detailed documentation.
