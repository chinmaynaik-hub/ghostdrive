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
  methods: ['GET', 'POST'],
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

app.get('/api/download/:fileId', async (req, res) => {
  try {
    const file = await File.findByPk(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (file.viewsRemaining <= 0) {
      return res.status(400).json({ message: 'File has expired' });
    }

    if (new Date() > file.expiresAt) {
      return res.status(400).json({ message: 'File has expired' });
    }

    // Decrement views remaining
    file.viewsRemaining--;
    await file.save();

    // Send file
    res.download(file.path, file.filename);

    // Delete file if no views remaining
    if (file.viewsRemaining <= 0) {
      setTimeout(async () => {
        try {
          await file.destroy();
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }, 1000);
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Error downloading file' });
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 