# Blockchain-Based Secure File Sharing Platform

A decentralized file sharing platform that leverages blockchain technology for immutable file verification and secure sharing with access controls.

## 🚀 Features

- **Blockchain Verification**: Every file upload is recorded on the blockchain for immutable proof of authenticity
- **Secure Sharing**: Token-based access control with configurable view limits and expiry times
- **Anonymous Mode**: Option to share files without revealing uploader identity
- **File Verification**: Recipients can verify file integrity against blockchain records
- **Automatic Cleanup**: Expired files are automatically removed
- **Wallet Integration**: MetaMask wallet-based authentication
- **View Limits**: Set maximum number of downloads per file
- **Expiry Times**: Configure automatic file deletion after specified time
- **File Management**: View and manage all your uploaded files
- **Share Links**: Generate secure, shareable links for file access

## 📋 Project Status

### ✅ Completed
- **Task 1**: Blockchain infrastructure and smart contract
  - FileRegistry smart contract deployed
  - Blockchain service with retry logic
  - Ganache local blockchain setup
  - Comprehensive testing suite
- **Task 5**: File upload with blockchain integration
  - Multi-part file upload with metadata
  - SHA-256 hash calculation
  - Blockchain transaction recording
  - View limits and expiry configuration
- **Task 6**: Access token-based file sharing
  - Secure token generation
  - Share link creation
  - Token-based file access
- **Task 7**: File management and listing
  - User file dashboard
  - Sorting and filtering
  - Status tracking (active/expired/deleted)
- **Task 8**: File deletion with confirmation
  - Secure deletion endpoint
  - Wallet signature verification
  - Cleanup of blockchain records
- **Task 9**: File verification system
  - Blockchain-based verification
  - Hash comparison
  - Metadata retrieval
- **Frontend**: Complete React UI
  - Wallet connection with MetaMask
  - File upload interface
  - File manager dashboard
  - Download and verification pages

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│                   (Material-UI + ethers.js)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
              ┌───────┴────────┐
              │                │
              ▼                ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   Express Backend       │   │  Blockchain Network     │
│   - File upload/download│◄──┤  - FileRegistry         │
│   - Access control      │   │  - Immutable records    │
│   - MySQL database      │   │  - Verification         │
└─────────────────────────┘   └─────────────────────────┘
```

## 🛠️ Tech Stack

**Frontend:**
- React 19 with Vite
- Material-UI
- ethers.js v6
- axios

**Backend:**
- Node.js + Express
- Sequelize ORM
- MySQL
- Web3.js
- Multer for file uploads

**Blockchain:**
- Solidity smart contracts
- Ganache (local development)
- Web3 provider

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MySQL (v8 or higher)
- MetaMask browser extension
- Git

### Clone the Repository
```bash
git clone https://github.com/chinmaynaik-hub/ghostdrive.git
cd ghostdrive
```

### Backend Setup

1. **Install dependencies:**
```bash
cd server
npm install
```

2. **Configure environment:**
Create a `.env` file in the `server` directory:
```env
DB_NAME=file_share_system
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
PORT=3001
```

3. **Start Ganache (local blockchain):**
```bash
npx ganache --port 8545 --chain.chainId 1337
```
Keep this terminal running!

4. **Deploy smart contract:**
In a new terminal:
```bash
cd server
node scripts/deploy.js
```

5. **Start the server:**
```bash
node server.js
```
Server will run on `http://localhost:3001`

### Frontend Setup

1. **Install dependencies:**
```bash
cd client
npm install
```

2. **Start development server:**
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### MetaMask Setup

1. **Install MetaMask:**
   - Install the MetaMask browser extension from https://metamask.io/download/

2. **Add Ganache Network:**
   - Open MetaMask
   - Click on the network dropdown (top center)
   - Click "Add Network" → "Add a network manually"
   - Enter the following details:
     - Network Name: `Ganache Local`
     - RPC URL: `http://127.0.0.1:8545`
     - Chain ID: `1337`
     - Currency Symbol: `ETH`
   - Click "Save"

3. **Import Test Account:**
   - When you start Ganache, it displays 10 test accounts with private keys
   - Copy any private key from the Ganache output
   - In MetaMask, click the account icon → "Import Account"
   - Paste the private key
   - You now have a test account with 1000 ETH for development

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "blockchain": "connected",
  "blockNumber": 5,
  "timestamp": "2024-..."
}
```

### Manual Testing Flow

1. **Start all services:**
   - Terminal 1: Ganache blockchain
   - Terminal 2: Backend server
   - Terminal 3: Frontend dev server

2. **Connect wallet:**
   - Open http://localhost:5173
   - Click "Connect Wallet"
   - Approve connection in MetaMask

3. **Upload a file:**
   - Select a file
   - Configure view limit and expiry time
   - Click "Upload File"
   - Copy the share link

4. **Download file:**
   - Paste share link in browser
   - Click "Download File"

5. **Verify file:**
   - On download page, click "Verify File"
   - Check blockchain verification results

6. **Manage files:**
   - Navigate to "My Files"
   - View all uploaded files
   - Delete files if needed

## 📚 Documentation

- **[Quick Start Guide](server/QUICKSTART.md)** - Get up and running quickly
- **[Blockchain Setup](server/BLOCKCHAIN_SETUP.md)** - Detailed blockchain documentation
- **[Task 1 Summary](server/TASK_1_SUMMARY.md)** - Implementation details for blockchain infrastructure
- **[Requirements](/.kiro/specs/blockchain-file-sharing/requirements.md)** - Full requirements specification
- **[Design Document](/.kiro/specs/blockchain-file-sharing/design.md)** - System design and architecture
- **[Implementation Tasks](/.kiro/specs/blockchain-file-sharing/tasks.md)** - Development roadmap

## 🔧 Available Scripts

### Server Scripts
- `npm run dev` - Start server with auto-reload
- `npm run start` - Start server in production mode
- `npm run ganache` - Start local blockchain
- `npm run compile` - Compile smart contracts
- `npm run deploy` - Deploy contracts to Ganache
- `npm run check-ganache` - Verify Ganache is running
- `npm run test-blockchain` - Run blockchain tests

### Client Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🗂️ Project Structure

```
hyperthon/
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   └── ...
│   └── package.json
├── server/                      # Express backend
│   ├── contracts/              # Solidity smart contracts
│   │   └── FileRegistry.sol
│   ├── services/               # Business logic
│   │   └── blockchainService.js
│   ├── scripts/                # Utility scripts
│   │   ├── compile.js
│   │   ├── deploy.js
│   │   └── test-blockchain-service.js
│   ├── models/                 # Database models
│   ├── config/                 # Configuration files
│   ├── uploads/                # File storage
│   └── package.json
└── .kiro/                      # Spec-driven development
    └── specs/
        └── blockchain-file-sharing/
            ├── requirements.md
            ├── design.md
            └── tasks.md
```

## 🔐 Security Considerations

- **Private Keys**: Never commit `.env` files or private keys
- **File Storage**: Uploaded files are stored locally (not on blockchain for cost efficiency)
- **Access Tokens**: Cryptographically secure tokens for share links
- **Wallet Authentication**: Ethereum wallet-based user authentication
- **Input Validation**: All inputs are validated and sanitized

## 🚀 Deployment

### Development
Currently configured for local development with Ganache.

### Production
For production deployment:
1. Deploy smart contract to Ethereum testnet/mainnet
2. Update `networkUrl` in deployment scripts
3. Configure production database
4. Set up proper key management
5. Use Infura or Alchemy as Web3 provider

## 🤝 Contributing

This project follows a spec-driven development approach. See the implementation tasks in `.kiro/specs/blockchain-file-sharing/tasks.md` for the development roadmap.

## 📝 License

ISC

## 🐛 Known Issues

- Ganache must be restarted and contract redeployed if blockchain state is lost
- When Ganache restarts, previously uploaded files won't be verifiable on blockchain (database records remain)
- MetaMask must be properly configured with Ganache network for wallet features to work

## 📞 Support

For issues or questions, please refer to the documentation in the `server/` directory or create an issue in the repository.

---

**Note**: This project is under active development. The blockchain infrastructure (Task 1) is complete and tested. Additional features are being implemented according to the task list.
