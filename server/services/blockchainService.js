const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const analyticsService = require('./analyticsService');

class BlockchainService {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.contractAddress = null;
    this.initialized = false;
  }

  /**
   * Initialize the blockchain connection and contract
   */
  async initialize() {
    try {
      // Load blockchain configuration
      const configPath = path.resolve(__dirname, '../config/blockchain.json');
      
      if (!fs.existsSync(configPath)) {
        throw new Error(
          'Blockchain configuration not found. Please run deployment script first: node scripts/deploy.js'
        );
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Initialize Web3
      const networkUrl = config.networkUrl || 'http://localhost:8545';
      this.web3 = new Web3(networkUrl);
      
      // Check connection
      const isConnected = await this.web3.eth.net.isListening();
      if (!isConnected) {
        throw new Error(
          `Cannot connect to blockchain network at ${networkUrl}. Make sure Ganache is running.`
        );
      }

      // Initialize contract
      this.contractAddress = config.contractAddress;
      this.contract = new this.web3.eth.Contract(config.abi, this.contractAddress);
      
      this.initialized = true;
      console.log('✓ Blockchain service initialized');
      console.log(`  Network: ${networkUrl}`);
      console.log(`  Contract: ${this.contractAddress}`);
      
      return true;
    } catch (error) {
      console.error('✗ Blockchain initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Ensure the service is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Blockchain service not initialized. Call initialize() first.');
    }
  }

  /**
   * Record file metadata on blockchain with retry logic
   * @param {string} fileHash - SHA-256 hash of the file (hex string)
   * @param {number} timestamp - Unix timestamp
   * @param {string} walletAddress - Uploader's wallet address
   * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
   * @returns {Promise<Object>} Transaction receipt with hash and block number
   */
  async recordFileOnBlockchain(fileHash, timestamp, walletAddress, maxRetries = 3) {
    this.ensureInitialized();
    const startTime = Date.now();
    let retryCount = 0;

    // Convert hex string to bytes32 if needed
    let fileHashBytes32;
    if (fileHash.startsWith('0x')) {
      fileHashBytes32 = fileHash;
    } else {
      fileHashBytes32 = '0x' + fileHash;
    }

    // Ensure it's 32 bytes (64 hex characters + 0x prefix)
    if (fileHashBytes32.length !== 66) {
      throw new Error('File hash must be 32 bytes (64 hex characters)');
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Blockchain recording attempt ${attempt}/${maxRetries}...`);

        // Get gas price
        const gasPrice = await this.web3.eth.getGasPrice();
        
        // Estimate gas
        const gasEstimate = await this.contract.methods
          .registerFile(fileHashBytes32, timestamp)
          .estimateGas({ from: walletAddress });

        // Send transaction
        const receipt = await this.contract.methods
          .registerFile(fileHashBytes32, timestamp)
          .send({
            from: walletAddress,
            gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
            gasPrice: gasPrice
          });

        const confirmationTime = Date.now() - startTime;
        console.log('✓ File recorded on blockchain');
        console.log(`  Transaction hash: ${receipt.transactionHash}`);
        console.log(`  Block number: ${receipt.blockNumber}`);

        // Log successful blockchain transaction
        analyticsService.logBlockchainTransaction(true, confirmationTime, retryCount, {
          transactionHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed
        });

        return {
          transactionHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed
        };

      } catch (error) {
        console.error(`Blockchain attempt ${attempt} failed:`, error.message);
        retryCount++;

        if (attempt === maxRetries) {
          const confirmationTime = Date.now() - startTime;
          // Log failed blockchain transaction
          analyticsService.logBlockchainTransaction(false, confirmationTime, retryCount, {
            error: error.message
          });
          analyticsService.logError('blockchain', error, { fileHash, walletAddress });
          
          throw new Error(
            `Blockchain recording failed after ${maxRetries} attempts: ${error.message}`
          );
        }

        // Exponential backoff: 2^attempt seconds
        const backoffTime = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${backoffTime / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }

  /**
   * Get file metadata from blockchain
   * @param {string} fileHash - File hash to query
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(fileHash) {
    this.ensureInitialized();

    try {
      // Convert hex string to bytes32 if needed
      let fileHashBytes32;
      if (fileHash.startsWith('0x')) {
        fileHashBytes32 = fileHash;
      } else {
        fileHashBytes32 = '0x' + fileHash;
      }

      const metadata = await this.contract.methods
        .getFileMetadata(fileHashBytes32)
        .call();

      return {
        fileHash: metadata.fileHash,
        timestamp: metadata.timestamp,
        uploader: metadata.uploader,
        exists: metadata.exists
      };
    } catch (error) {
      if (error.message.includes('File not found')) {
        return null;
      }
      throw new Error(`Failed to retrieve file metadata: ${error.message}`);
    }
  }

  /**
   * Get file metadata from blockchain using file hash
   * This is the primary method for verification
   * @param {string} fileHash - File hash to query (with or without 0x prefix)
   * @returns {Promise<Object|null>} File metadata or null if not found
   */
  async getFileMetadataFromBlockchain(fileHash) {
    this.ensureInitialized();

    try {
      // Convert hex string to bytes32 if needed
      let fileHashBytes32;
      if (fileHash.startsWith('0x')) {
        fileHashBytes32 = fileHash;
      } else {
        fileHashBytes32 = '0x' + fileHash;
      }

      // Ensure it's 32 bytes (64 hex characters + 0x prefix)
      if (fileHashBytes32.length !== 66) {
        throw new Error('File hash must be 32 bytes (64 hex characters)');
      }

      // Query the smart contract
      const metadata = await this.contract.methods
        .getFileMetadata(fileHashBytes32)
        .call();

      // Check if file exists
      if (!metadata.exists) {
        return null;
      }

      // Get block information for the file
      // Since we don't have the transaction hash, we'll return the metadata
      // The block number will need to be retrieved from the database
      return {
        fileHash: metadata.fileHash,
        timestamp: parseInt(metadata.timestamp),
        uploader: metadata.uploader,
        exists: metadata.exists
      };
    } catch (error) {
      // Handle "File not found" error gracefully
      if (error.message.includes('File not found') || 
          error.message.includes('revert')) {
        console.log(`File not found on blockchain: ${fileHash}`);
        return null;
      }
      
      // Re-throw other errors
      console.error('Blockchain query error:', error.message);
      throw new Error(`Failed to retrieve file metadata from blockchain: ${error.message}`);
    }
  }

  /**
   * Verify if a file exists on blockchain
   * @param {string} fileHash - File hash to verify
   * @returns {Promise<boolean>} True if file exists
   */
  async verifyFile(fileHash) {
    this.ensureInitialized();

    try {
      // Convert hex string to bytes32 if needed
      let fileHashBytes32;
      if (fileHash.startsWith('0x')) {
        fileHashBytes32 = fileHash;
      } else {
        fileHashBytes32 = '0x' + fileHash;
      }

      const exists = await this.contract.methods
        .verifyFile(fileHashBytes32)
        .call();

      return exists;
    } catch (error) {
      throw new Error(`Failed to verify file: ${error.message}`);
    }
  }

  /**
   * Get total number of registered files
   * @returns {Promise<number>} File count
   */
  async getFileCount() {
    this.ensureInitialized();

    try {
      const count = await this.contract.methods.getFileCount().call();
      return parseInt(count);
    } catch (error) {
      throw new Error(`Failed to get file count: ${error.message}`);
    }
  }

  /**
   * Check if blockchain service is connected
   * @returns {Promise<boolean>} Connection status
   */
  async isConnected() {
    if (!this.web3) {
      return false;
    }

    try {
      return await this.web3.eth.net.isListening();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current network ID
   * @returns {Promise<number>} Network ID
   */
  async getNetworkId() {
    this.ensureInitialized();
    return await this.web3.eth.net.getId();
  }

  /**
   * Get current block number
   * @returns {Promise<number>} Block number
   */
  async getBlockNumber() {
    this.ensureInitialized();
    return await this.web3.eth.getBlockNumber();
  }
}

// Export singleton instance
module.exports = new BlockchainService();
