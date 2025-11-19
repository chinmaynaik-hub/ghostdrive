# Blockchain-Based Secure File Sharing Platform

A decentralized file sharing platform that leverages blockchain technology for immutable file verification and secure sharing with access controls.

## 🚀 Features

- **Blockchain Verification**: Every file upload is recorded on the blockchain for immutable proof of authenticity
- **Secure Sharing**: Token-based access control with configurable view limits and expiry times
- **Anonymous Mode**: Option to share files without revealing uploader identity
- **File Verification**: Recipients can verify file integrity against blockchain records
- **Automatic Cleanup**: Expired files are automatically removed
- **Wallet Integration**: Ethereum wallet-based authentication

## 📋 Project Status

### ✅ Completed
- **Task 1**: Blockchain infrastructure and smart contract
  - FileRegistry smart contract deployed
  - Blockchain service with retry logic
  - Ganache local blockchain setup
  - Comprehensive testing suite

### 🚧 In Progress
- Database schema enhancements
- Access token-based sharing system
- Frontend wallet integration

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
- Git

### Clone the Repository
```bash
git clone <your-repo-url>
cd hyperthon
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
npm run ganache
```
Keep this terminal running!

4. **Deploy smart contract:**
```bash
npm run deploy
```

5. **Start the server:**
```bash
npm run dev
```

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

## 🧪 Testing

### Test Blockchain Service
```bash
cd server
npm run test-blockchain
```

### Check Ganache Connection
```bash
npm run check-ganache
```

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
- File uploads currently require manual wallet address input (frontend integration pending)

## 📞 Support

For issues or questions, please refer to the documentation in the `server/` directory or create an issue in the repository.

---

**Note**: This project is under active development. The blockchain infrastructure (Task 1) is complete and tested. Additional features are being implemented according to the task list.
