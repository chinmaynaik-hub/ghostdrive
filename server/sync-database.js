/**
 * Sync database schema with models
 * This will update the Files table to match the new schema
 */

require('dotenv').config({ path: __dirname + '/.env' });
const sequelize = require('./config/database');
const File = require('./models/File');

async function syncDatabase() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected successfully!');
    
    console.log('\nSyncing File model with database...');
    // alter: true will add new columns without dropping the table
    await File.sync({ alter: true });
    
    console.log('✓ Database schema updated successfully!');
    console.log('\nYou can now view the updated Files table in MySQL Workbench.');
    console.log('New columns added:');
    console.log('  - originalName');
    console.log('  - filePath');
    console.log('  - fileSize');
    console.log('  - accessToken (unique, indexed)');
    console.log('  - uploaderAddress');
    console.log('  - anonymousMode');
    console.log('  - viewLimit');
    console.log('  - expiryTime');
    console.log('  - blockNumber');
    console.log('  - status (enum: active, expired, deleted)');
    
    process.exit(0);
  } catch (error) {
    console.error('Error syncing database:', error.message);
    process.exit(1);
  }
}

syncDatabase();
