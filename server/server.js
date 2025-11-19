const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const sequelize = require('./config/database');
const File = require('./models/File');
const blockchainService = require('./services/blockchainService');
require('dotenv').config();
const crypto = require('crypto');

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
const fs = require('fs');
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
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Calculate expiry time
    const expiryHours = parseInt(req.body.expiresIn) || 24;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Generate file hash
    const fileHash = crypto.createHash('sha256').update(fs.readFileSync(req.file.path)).digest('hex');

    // Record on blockchain (with retry logic)
    let transactionHash = null;
    let blockNumber = null;
    
    try {
      const blockchainResult = await blockchainService.recordFileOnBlockchain(
        fileHash,
        Math.floor(Date.now() / 1000),
        req.body.walletAddress || '0x0000000000000000000000000000000000000000'
      );
      transactionHash = blockchainResult.transactionHash;
      blockNumber = blockchainResult.blockNumber;
    } catch (blockchainError) {
      console.error('Blockchain recording failed:', blockchainError.message);
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(500).json({
        message: 'Failed to record file on blockchain',
        error: blockchainError.message
      });
    }

    // Create file record
    const file = await File.create({
      filename: req.file.originalname,
      path: req.file.path,
      deleteAfterViews: parseInt(req.body.deleteAfterViews) || 1,
      viewsRemaining: parseInt(req.body.deleteAfterViews) || 1,
      expiresAt,
      transactionHash,
      fileHash
    });

    res.json({
      message: 'File uploaded successfully',
      fileId: file.id,
      transactionHash,
      fileHash
    });
  } catch (error) {
    console.error('Upload error:', error.stack);
    res.status(500).json({
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