/**
 * Migration script to update File table schema
 * Run this to migrate from old schema to new enhanced schema
 * 
 * Usage: node server/migrations/update-file-schema.js
 */

const sequelize = require('../config/database');
const crypto = require('crypto');

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('Starting database migration...');
    
    // Check if table exists
    const tables = await queryInterface.showAllTables();
    const tableName = tables.find(t => t.toLowerCase() === 'files');
    
    if (!tableName) {
      console.log('Files table does not exist. Creating new table with updated schema...');
      // Let Sequelize create the table with the new schema
      await sequelize.sync({ force: false });
      console.log('Migration completed successfully!');
      process.exit(0);
      return;
    }
    
    console.log(`Found table: ${tableName}`);
    
    // Get current columns
    const tableDescription = await queryInterface.describeTable(tableName);
    console.log('Current columns:', Object.keys(tableDescription));
    
    // Add new columns if they don't exist
    if (!tableDescription.originalName) {
      console.log('Adding originalName column...');
      await queryInterface.addColumn(tableName, 'originalName', {
        type: sequelize.Sequelize.STRING(255),
        allowNull: true
      });
    }
    
    if (!tableDescription.filePath) {
      console.log('Adding filePath column...');
      await queryInterface.addColumn(tableName, 'filePath', {
        type: sequelize.Sequelize.STRING(500),
        allowNull: true
      });
    }
    
    if (!tableDescription.fileSize) {
      console.log('Adding fileSize column...');
      await queryInterface.addColumn(tableName, 'fileSize', {
        type: sequelize.Sequelize.BIGINT,
        allowNull: true
      });
    }
    
    if (!tableDescription.accessToken) {
      console.log('Adding accessToken column...');
      await queryInterface.addColumn(tableName, 'accessToken', {
        type: sequelize.Sequelize.STRING(64),
        allowNull: true
      });
    }
    
    if (!tableDescription.uploaderAddress) {
      console.log('Adding uploaderAddress column...');
      await queryInterface.addColumn(tableName, 'uploaderAddress', {
        type: sequelize.Sequelize.STRING(42),
        allowNull: true
      });
    }
    
    if (!tableDescription.anonymousMode) {
      console.log('Adding anonymousMode column...');
      await queryInterface.addColumn(tableName, 'anonymousMode', {
        type: sequelize.Sequelize.BOOLEAN,
        defaultValue: false
      });
    }
    
    if (!tableDescription.viewLimit) {
      console.log('Adding viewLimit column...');
      await queryInterface.addColumn(tableName, 'viewLimit', {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true
      });
    }
    
    if (!tableDescription.expiryTime) {
      console.log('Adding expiryTime column...');
      await queryInterface.addColumn(tableName, 'expiryTime', {
        type: sequelize.Sequelize.DATE,
        allowNull: true
      });
    }
    
    if (!tableDescription.blockNumber) {
      console.log('Adding blockNumber column...');
      await queryInterface.addColumn(tableName, 'blockNumber', {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true
      });
    }
    
    if (!tableDescription.status) {
      console.log('Adding status column...');
      await queryInterface.addColumn(tableName, 'status', {
        type: sequelize.Sequelize.ENUM('active', 'expired', 'deleted'),
        defaultValue: 'active'
      });
    }
    
    // Migrate existing data
    console.log('Migrating existing data...');
    const [results] = await sequelize.query(`SELECT COUNT(*) as count FROM ${tableName} WHERE originalName IS NULL`);
    const recordsToMigrate = results[0].count;
    
    if (recordsToMigrate > 0) {
      console.log(`Found ${recordsToMigrate} records to migrate...`);
      
      // Get all records that need migration
      const [files] = await sequelize.query(`SELECT * FROM ${tableName} WHERE originalName IS NULL`);
      
      for (const file of files) {
        // Generate unique access token
        const accessToken = crypto.randomBytes(32).toString('hex');
        
        // Get file size if file exists
        let fileSize = 0;
        try {
          const fs = require('fs');
          if (file.path && fs.existsSync(file.path)) {
            const stats = fs.statSync(file.path);
            fileSize = stats.size;
          }
        } catch (err) {
          console.warn(`Could not get file size for ${file.path}:`, err.message);
        }
        
        await sequelize.query(`
          UPDATE ${tableName}
          SET 
            originalName = :originalName,
            filePath = :filePath,
            fileSize = :fileSize,
            accessToken = :accessToken,
            uploaderAddress = '0x0000000000000000000000000000000000000000',
            viewLimit = :viewLimit,
            expiryTime = :expiryTime,
            status = :status
          WHERE id = :id
        `, {
          replacements: {
            id: file.id,
            originalName: file.filename,
            filePath: file.path,
            fileSize: fileSize,
            accessToken: accessToken,
            viewLimit: file.deleteAfterViews || file.viewLimit || 1,
            expiryTime: file.expiresAt || file.expiryTime,
            status: (file.viewsRemaining > 0 && new Date(file.expiresAt) > new Date()) ? 'active' : 'expired'
          }
        });
      }
      
      console.log(`Migrated ${recordsToMigrate} records successfully.`);
    } else {
      console.log('No records need migration.');
    }
    
    // Add indexes
    console.log('Adding indexes...');
    try {
      await queryInterface.addIndex(tableName, ['accessToken'], {
        unique: true,
        name: 'files_access_token_unique'
      });
      console.log('Added accessToken index');
    } catch (err) {
      if (err.message.includes('Duplicate key name')) {
        console.log('accessToken index already exists');
      } else {
        throw err;
      }
    }
    
    try {
      await queryInterface.addIndex(tableName, ['uploaderAddress'], {
        name: 'files_uploader_address'
      });
      console.log('Added uploaderAddress index');
    } catch (err) {
      if (err.message.includes('Duplicate key name')) {
        console.log('uploaderAddress index already exists');
      } else {
        throw err;
      }
    }
    
    try {
      await queryInterface.addIndex(tableName, ['expiryTime'], {
        name: 'files_expiry_time'
      });
      console.log('Added expiryTime index');
    } catch (err) {
      if (err.message.includes('Duplicate key name')) {
        console.log('expiryTime index already exists');
      } else {
        throw err;
      }
    }
    
    try {
      await queryInterface.addIndex(tableName, ['status'], {
        name: 'files_status'
      });
      console.log('Added status index');
    } catch (err) {
      if (err.message.includes('Duplicate key name')) {
        console.log('status index already exists');
      } else {
        throw err;
      }
    }
    
    console.log('\n✓ Migration completed successfully!');
    console.log('\nNote: Old columns (path, deleteAfterViews, expiresAt) are kept for backward compatibility.');
    console.log('You can manually drop them after verifying everything works correctly.');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
migrate();
