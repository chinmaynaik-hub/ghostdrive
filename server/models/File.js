const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const File = sequelize.define('File', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  fileHash: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  accessToken: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  uploaderAddress: {
    type: DataTypes.STRING(42),
    allowNull: false,
    validate: {
      is: /^0x[a-fA-F0-9]{40}$/i
    }
  },
  anonymousMode: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  viewLimit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 100
    }
  },
  viewsRemaining: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  expiryTime: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isValidExpiryRange(value) {
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        if (value < oneHourFromNow || value > thirtyDaysFromNow) {
          throw new Error('Expiry time must be between 1 hour and 30 days from now');
        }
      }
    }
  },
  transactionHash: {
    type: DataTypes.STRING(66),
    allowNull: false
  },
  blockNumber: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'deleted'),
    defaultValue: 'active'
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['accessToken']
    },
    {
      fields: ['uploaderAddress']
    },
    {
      fields: ['expiryTime']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = File; 