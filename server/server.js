const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const sequelize = require('./config/database');
const File = require('./models/File');
const blockchainService = require('./services/blockchainService');
const { calculateFileHash, verifyFileHash } = require('./utils/hashUtils');
require('dotenv').config();
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

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

// File Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

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
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const transaction = await sequelize.transaction();
  let uploadedFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
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
        req.body.walletAddress || '0x0000000000000000000000000000000000000000'
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

    // Store transaction hash and block number in database
    const viewLimit = parseInt(req.body.deleteAfterViews) || 1;
    const file = await File.create({
      filename: req.file.originalname,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileHash,
      accessToken: require('crypto').randomBytes(32).toString('hex'),
      uploaderAddress: req.body.walletAddress || '0x0000000000000000000000000000000000000000',
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
app.get('/api/file/:accessToken', async (req, res) => {
  try {
    const { accessToken } = req.params;
    
    // Validate access token format (64 character hex string)
    if (!/^[a-f0-9]{64}$/i.test(accessToken)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid access token format' 
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

app.get('/api/download/:accessToken', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { accessToken } = req.params;
    
    // Validate access token format (64 character hex string)
    if (!/^[a-f0-9]{64}$/i.test(accessToken)) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: 'Invalid access token format' 
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

// Manual file deletion endpoint
app.delete('/api/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { walletAddress } = req.body;

    // Validate wallet address is provided
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false,
        message: 'Wallet address is required for file deletion',
        code: 'WALLET_ADDRESS_REQUIRED'
      });
    }

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

    // Delete file from filesystem and update database
    await deleteFile(file);

    res.json({ 
      success: true,
      message: 'File deleted successfully',
      fileId: file.id,
      filename: file.originalName
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 