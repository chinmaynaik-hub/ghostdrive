const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const sequelize = require('./config/database');
const File = require('./models/File');
const blockchainService = require('./services/blockchainService');
const cleanupService = require('./services/cleanupService');
const { calculateFileHash, verifyFileHash } = require('./utils/hashUtils');
const { generateUniqueAccessToken, isValidAccessToken } = require('./utils/tokenUtils');
const { verifyWalletSignature, isValidWalletAddress } = require('./middleware/walletAuth');
const { 
  errorHandler, 
  notFoundHandler, 
  asyncHandler,
  ValidationError,
  NotFoundError,
  GoneError,
  BlockchainError
} = require('./middleware/errorHandler');
const {
  fileValidationMiddleware,
  createSecureMulterConfig,
  sanitizeFilename,
  MAX_FILE_SIZE
} = require('./middleware/fileValidation');
const {
  uploadLimiter,
  downloadLimiter,
  previewLimiter,
  verifyLimiter,
  deleteLimiter,
  generalLimiter
} = require('./middleware/rateLimiter');
require('dotenv').config();
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-address', 'x-signature', 'x-message']
}));
app.use(express.json());

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Database Connection and Sync
sequelize.sync({ alter: true })
  .then(() => console.log('Database connected and synced'))
  .catch(err => {
    console.error('Database sync error:', err.stack);
    process.exit(1);
  });

// Initialize Blockchain Service
blockchainService.initialize()
  .then(() => console.log('Blockchain service ready'))
  .catch(err => {
    console.error('Blockchain initialization error:', err.message);
    console.error('The server will start, but blockchain features will be unavailable.');
    console.error('To fix this, run: npm run ganache (in a separate terminal) and npm run deploy');
  });

// Start Cleanup Service
cleanupService.start();

// File Storage Configuration with Security Enhancements
// Uses secure multer config with file size limits (100MB) and filename validation
const secureMulterConfig = createSecureMulterConfig({
  maxSize: MAX_FILE_SIZE,
  destination: 'uploads/'
});

const upload = multer(secureMulterConfig);

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = sequelize.authenticate()
      .then(() => true)
      .catch(() => false);
    
    const blockchainConnected = await blockchainService.isConnected();
    
    let blockNumber = null;
    if (blockchainConnected) {
      try {
        blockNumber = await blockchainService.getBlockNumber();
      } catch (err) {
        console.error('Error getting block number:', err.message);
      }
    }

    res.json({
      status: 'ok',
      database: await dbConnected ? 'connected' : 'disconnected',
      blockchain: blockchainConnected ? 'connected' : 'disconnected',
      blockNumber: blockNumber,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Routes
app.post('/api/upload', uploadLimiter, upload.single('file'), fileValidationMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();
  let uploadedFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Use sanitized filename from validation middleware
    const safeOriginalName = req.sanitizedFilename || sanitizeFilename(req.file.originalname);

    // Validate wallet address is provided
    if (!req.body.walletAddress) {
      return res.status(400).json({ 
        success: false,
        message: 'Wallet address is required',
        code: 'WALLET_ADDRESS_REQUIRED'
      });
    }

    // Validate wallet address format (Ethereum address: 0x followed by 40 hex characters)
    const walletAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletAddressRegex.test(req.body.walletAddress)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid wallet address format. Expected Ethereum address (0x followed by 40 hex characters)',
        code: 'INVALID_WALLET_ADDRESS'
      });
    }

    uploadedFilePath = req.file.path;

    // Calculate expiry time
    const expiryHours = parseInt(req.body.expiresIn) || 24;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Calculate file hash after upload
    console.log('Calculating file hash...');
    const fileHash = calculateFileHash(req.file.path);
    console.log(`File hash calculated: ${fileHash}`);

    // Verify client-provided hash if present
    if (req.body.fileHash) {
      const clientHash = req.body.fileHash.startsWith('0x') 
        ? req.body.fileHash.slice(2) 
        : req.body.fileHash;
      
      if (clientHash !== fileHash) {
        await transaction.rollback();
        fs.unlinkSync(uploadedFilePath);
        return res.status(400).json({
          message: 'File hash mismatch. File may be corrupted.',
          serverHash: fileHash,
          clientHash: clientHash
        });
      }
      console.log('✓ Client hash verified');
    }

    // Record metadata on blockchain with retry logic
    let transactionHash = null;
    let blockNumber = null;
    
    try {
      console.log('Recording file on blockchain...');
      const blockchainResult = await blockchainService.recordFileOnBlockchain(
        fileHash,
        Math.floor(Date.now() / 1000),
        req.body.walletAddress
      );
      transactionHash = blockchainResult.transactionHash;
      blockNumber = blockchainResult.blockNumber;
      console.log('✓ File recorded on blockchain');
    } catch (blockchainError) {
      console.error('✗ Blockchain recording failed:', blockchainError.message);
      
      // Rollback transaction and clean up uploaded file
      await transaction.rollback();
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to record file on blockchain',
        error: blockchainError.message
      });
    }

    // Generate unique access token with collision checking
    const accessToken = await generateUniqueAccessToken(async (token) => {
      const existing = await File.findOne({ where: { accessToken: token } });
      return existing !== null;
    });

    // Store transaction hash and block number in database
    const viewLimit = parseInt(req.body.deleteAfterViews) || 1;
    const file = await File.create({
      filename: safeOriginalName,
      originalName: safeOriginalName,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileHash,
      accessToken,
      uploaderAddress: req.body.walletAddress,
      anonymousMode: req.body.anonymousMode === 'true' || req.body.anonymousMode === true,
      viewLimit,
      viewsRemaining: viewLimit,
      expiryTime: expiresAt,
      transactionHash,
      blockNumber,
      status: 'active'
    }, { transaction });

    // Commit transaction
    await transaction.commit();
    console.log('✓ File record saved to database');

    res.json({
      success: true,
      message: 'File uploaded successfully',
      fileId: file.id,
      accessToken: file.accessToken,
      shareLink: `${req.protocol}://${req.get('host')}/download/${file.accessToken}`,
      transactionHash,
      blockNumber,
      fileHash
    });
  } catch (error) {
    console.error('✗ Upload error:', error.stack);
    
    // Rollback transaction
    await transaction.rollback();
    
    // Clean up uploaded file on any error
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
        console.log('✓ Cleaned up uploaded file after error');
      } catch (cleanupError) {
        console.error('✗ Failed to clean up file:', cleanupError.message);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// File preview endpoint - returns metadata without decrementing views
app.get('/api/file/:accessToken', previewLimiter, async (req, res) => {
  try {
    const { accessToken } = req.params;
    
    // Validate access token format using secure validation
    if (!isValidAccessToken(accessToken)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid access token format',
        code: 'INVALID_ACCESS_TOKEN'
      });
    }
    
    // Find file by access token
    const file = await File.findOne({ where: { accessToken } });
    
    if (!file) {
      return res.status(404).json({ 
        success: false,
        message: 'File not found' 
      });
    }

    // Check if file is active
    if (file.status !== 'active') {
      return res.status(410).json({ 
        success: false,
        message: 'File no longer available' 
      });
    }

    // Check expiry time
    if (new Date() > file.expiryTime) {
      file.status = 'expired';
      await file.save();
      return res.status(410).json({ 
        success: false,
        message: 'File has expired' 
      });
    }

    // Check view limit
    if (file.viewsRemaining <= 0) {
      file.status = 'expired';
      await file.save();
      return res.status(410).json({ 
        success: false,
        message: 'View limit reached' 
      });
    }

    // Return file metadata without decrementing views
    const metadata = {
      success: true,
      filename: file.originalName,
      fileSize: file.fileSize,
      uploadTimestamp: file.createdAt,
      viewsRemaining: file.viewsRemaining,
      expiryTime: file.expiryTime,
      fileHash: file.fileHash,
      transactionHash: file.transactionHash
    };

    // Conditionally include uploader address based on anonymous mode
    if (!file.anonymousMode) {
      metadata.uploaderAddress = file.uploaderAddress;
    }

    res.json(metadata);
  } catch (error) {
    console.error('File preview error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving file information' 
    });
  }
});

// Helper function to delete file from filesystem and update database
async function deleteFile(file) {
  try {
    // Delete file from filesystem
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
      console.log(`✓ Deleted file from filesystem: ${file.filePath}`);
    }
    
    // Update status to 'deleted' in database
    file.status = 'deleted';
    await file.save();
    console.log(`✓ Updated file status to 'deleted' in database: ${file.id}`);
    
    return true;
  } catch (error) {
    console.error('✗ Error deleting file:', error);
    throw error;
  }
}

app.get('/api/download/:accessToken', downloadLimiter, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { accessToken } = req.params;
    
    // Validate access token format using secure validation
    if (!isValidAccessToken(accessToken)) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: 'Invalid access token format',
        code: 'INVALID_ACCESS_TOKEN'
      });
    }
    
    // Find file by access token with row lock for atomic update
    const file = await File.findOne({ 
      where: { accessToken },
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    
    if (!file) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: 'File not found' 
      });
    }

    // Verify file exists and is active
    if (file.status !== 'active') {
      await transaction.rollback();
      return res.status(410).json({ 
        success: false,
        message: 'File no longer available',
        code: 'FILE_NOT_ACTIVE'
      });
    }

    // Check expiry time before download
    if (new Date() > file.expiryTime) {
      file.status = 'expired';
      await file.save({ transaction });
      await transaction.commit();
      return res.status(410).json({ 
        success: false,
        message: 'File has expired',
        code: 'FILE_EXPIRED'
      });
    }

    // Check view limit before download
    if (file.viewsRemaining <= 0) {
      file.status = 'expired';
      await file.save({ transaction });
      await transaction.commit();
      return res.status(410).json({ 
        success: false,
        message: 'View limit reached',
        code: 'VIEW_LIMIT_REACHED'
      });
    }

    // Verify file exists on filesystem
    if (!fs.existsSync(file.filePath)) {
      file.status = 'deleted';
      await file.save({ transaction });
      await transaction.commit();
      return res.status(404).json({ 
        success: false,
        message: 'File not found on server',
        code: 'FILE_NOT_FOUND_ON_DISK'
      });
    }

    // Atomically decrement view count
    file.viewsRemaining = file.viewsRemaining - 1;
    const shouldDelete = file.viewsRemaining <= 0;
    
    await file.save({ transaction });
    await transaction.commit();
    
    console.log(`✓ Download initiated for file: ${file.originalName}, views remaining: ${file.viewsRemaining}`);

    // Send file to client
    res.download(file.filePath, file.originalName, async (err) => {
      if (err) {
        console.error('✗ Error sending file:', err);
        // Don't send another response if headers already sent
        if (!res.headersSent) {
          res.status(500).json({ 
            success: false,
            message: 'Error downloading file' 
          });
        }
      } else {
        console.log(`✓ File sent successfully: ${file.originalName}`);
        
        // Queue file for deletion when views reach 0
        if (shouldDelete) {
          console.log('⏳ Queueing file for deletion...');
          setTimeout(async () => {
            try {
              // Reload file to get latest state
              const fileToDelete = await File.findByPk(file.id);
              if (fileToDelete && fileToDelete.status === 'active') {
                await deleteFile(fileToDelete);
                console.log(`✓ File deleted after reaching view limit: ${file.originalName}`);
              }
            } catch (deleteError) {
              console.error('✗ Error in delayed file deletion:', deleteError);
            }
          }, 2000); // Wait 2 seconds to ensure download completes
        }
      }
    });
    
  } catch (error) {
    console.error('✗ Download error:', error);
    await transaction.rollback();
    
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false,
        message: 'Error downloading file',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
});

app.get('/api/files', async (req, res) => {
  try {
    const files = await File.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(files);
  } catch (error) {
    console.error('File list error:', error.stack);
    res.status(500).json({ message: 'Error fetching files' });
  }
});

// Get all files for a specific wallet address
app.get('/api/files/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    // Validate wallet address format
    if (!isValidWalletAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format. Expected Ethereum address (0x followed by 40 hex characters)',
        code: 'INVALID_WALLET_ADDRESS'
      });
    }

    // Query database for files matching wallet address
    const files = await File.findAll({
      where: {
        uploaderAddress: walletAddress.toLowerCase()
      },
      order: [['createdAt', 'DESC']] // Sort by upload timestamp (newest first)
    });

    // Calculate derived fields for each file
    const now = new Date();
    const enrichedFiles = files.map(file => {
      const fileData = file.toJSON();
      
      // Calculate time remaining until expiry (in milliseconds)
      const expiryTime = new Date(file.expiryTime);
      const timeRemaining = expiryTime - now;
      
      // Calculate derived status
      let derivedStatus = file.status;
      if (file.status === 'active') {
        if (timeRemaining <= 0) {
          derivedStatus = 'expired';
        } else if (file.viewsRemaining <= 0) {
          derivedStatus = 'expired';
        }
      }
      
      // Add derived fields
      return {
        ...fileData,
        timeRemaining: Math.max(0, timeRemaining), // milliseconds until expiry (0 if expired)
        timeRemainingHours: Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60))), // hours until expiry
        derivedStatus,
        isExpired: timeRemaining <= 0 || file.viewsRemaining <= 0,
        shareLink: `${req.protocol}://${req.get('host')}/download/${file.accessToken}`
      };
    });

    res.json({
      success: true,
      count: enrichedFiles.length,
      files: enrichedFiles
    });

  } catch (error) {
    console.error('✗ Error fetching user files:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching files',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Manual file deletion endpoint with wallet signature verification
app.delete('/api/file/:fileId', deleteLimiter, verifyWalletSignature, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // verifiedWalletAddress is set by the middleware after signature verification
    const walletAddress = req.verifiedWalletAddress;

    // Find file by ID
    const file = await File.findByPk(fileId);
    
    if (!file) {
      return res.status(404).json({ 
        success: false,
        message: 'File not found',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Check if file belongs to requesting wallet
    if (file.uploaderAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(403).json({ 
        success: false,
        message: 'You do not have permission to delete this file',
        code: 'UNAUTHORIZED'
      });
    }

    // Check if file is already deleted
    if (file.status === 'deleted') {
      return res.status(410).json({ 
        success: false,
        message: 'File has already been deleted',
        code: 'ALREADY_DELETED'
      });
    }

    // Store file details before deletion for confirmation response
    const deletionDetails = {
      fileId: file.id,
      filename: file.originalName,
      fileSize: file.fileSize,
      fileHash: file.fileHash,
      uploaderAddress: file.uploaderAddress,
      uploadTimestamp: file.createdAt,
      viewsRemaining: file.viewsRemaining,
      expiryTime: file.expiryTime,
      transactionHash: file.transactionHash,
      blockNumber: file.blockNumber,
      accessToken: file.accessToken
    };

    // Delete file from filesystem and update database
    await deleteFile(file);

    // Return success confirmation with comprehensive details
    res.json({ 
      success: true,
      message: 'File deleted successfully',
      deletedAt: new Date().toISOString(),
      file: {
        id: deletionDetails.fileId,
        filename: deletionDetails.filename,
        fileSize: deletionDetails.fileSize,
        fileHash: deletionDetails.fileHash,
        uploaderAddress: deletionDetails.uploaderAddress,
        uploadTimestamp: deletionDetails.uploadTimestamp,
        viewsRemaining: deletionDetails.viewsRemaining,
        expiryTime: deletionDetails.expiryTime,
        transactionHash: deletionDetails.transactionHash,
        blockNumber: deletionDetails.blockNumber
      }
    });
    
  } catch (error) {
    console.error('✗ File deletion error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting file',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// File verification endpoint
app.post('/api/verify', verifyLimiter, async (req, res) => {
  try {
    const { fileHash, transactionHash } = req.body;

    // Validate required fields
    if (!fileHash) {
      return res.status(400).json({
        success: false,
        message: 'File hash is required',
        code: 'FILE_HASH_REQUIRED'
      });
    }

    // Normalize file hash (remove 0x prefix if present)
    const normalizedFileHash = fileHash.startsWith('0x') 
      ? fileHash.slice(2) 
      : fileHash;

    // Validate hash format (64 hex characters)
    if (!/^[a-f0-9]{64}$/i.test(normalizedFileHash)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file hash format. Expected 64 hex characters.',
        code: 'INVALID_HASH_FORMAT'
      });
    }

    // Check if blockchain service is available
    const isConnected = await blockchainService.isConnected();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        message: 'Blockchain service is not available. Please try again later.',
        code: 'BLOCKCHAIN_UNAVAILABLE'
      });
    }

    // Query smart contract for stored hash
    console.log(`Verifying file hash: ${normalizedFileHash}`);
    const blockchainMetadata = await blockchainService.getFileMetadataFromBlockchain(normalizedFileHash);

    if (!blockchainMetadata) {
      // File not found on blockchain
      return res.json({
        success: true,
        verified: false,
        message: 'File not found on blockchain',
        providedHash: normalizedFileHash,
        blockchainHash: null
      });
    }

    // Extract blockchain hash (remove 0x prefix for comparison)
    const blockchainHash = blockchainMetadata.fileHash.startsWith('0x')
      ? blockchainMetadata.fileHash.slice(2)
      : blockchainMetadata.fileHash;

    // Compare hashes
    const verified = blockchainHash.toLowerCase() === normalizedFileHash.toLowerCase();

    // Try to get additional metadata from database if transactionHash is provided
    let blockNumber = null;
    let uploadTimestamp = null;

    if (transactionHash) {
      try {
        const file = await File.findOne({ 
          where: { transactionHash } 
        });
        
        if (file) {
          blockNumber = file.blockNumber;
          uploadTimestamp = file.createdAt;
        }
      } catch (dbError) {
        console.error('Error fetching file from database:', dbError.message);
        // Continue without database metadata
      }
    }

    // Return verification result with blockchain metadata
    res.json({
      success: true,
      verified,
      message: verified 
        ? 'File integrity verified successfully' 
        : 'File hash does not match blockchain record',
      providedHash: normalizedFileHash,
      blockchainHash: blockchainHash,
      timestamp: blockchainMetadata.timestamp,
      uploader: blockchainMetadata.uploader,
      blockNumber: blockNumber,
      uploadTimestamp: uploadTimestamp
    });

    console.log(`✓ Verification complete: ${verified ? 'VERIFIED' : 'NOT VERIFIED'}`);

  } catch (error) {
    console.error('✗ Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying file',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'VERIFICATION_ERROR'
    });
  }
});

// Manual cleanup trigger endpoint (for testing/admin purposes)
app.post('/api/cleanup/trigger', async (req, res) => {
  try {
    console.log('Manual cleanup triggered via API');
    
    // Run cleanup in background
    cleanupService.triggerManualCleanup().catch(err => {
      console.error('Error in manual cleanup:', err);
    });
    
    res.json({
      success: true,
      message: 'Cleanup job triggered successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering cleanup',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Multer error handler for file upload errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxSizeMB = Math.round(MAX_FILE_SIZE / (1024 * 1024));
      return res.status(413).json({
        success: false,
        message: `File size exceeds maximum limit of ${maxSizeMB}MB`,
        code: 'FILE_TOO_LARGE'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'FILE_UPLOAD_ERROR'
    });
  }
  next(err);
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 