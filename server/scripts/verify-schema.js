/**
 * Script to verify the database schema
 */

const sequelize = require('../config/database');

async function verifySchema() {
  try {
    console.log('Verifying database schema...\n');
    
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if table exists
    const tables = await queryInterface.showAllTables();
    console.log('Available tables:', tables);
    
    const tableName = tables.find(t => t.toLowerCase() === 'files');
    
    if (tableName) {
      console.log(`\n✓ Files table exists (as '${tableName}')`);
      
      // Get table description
      const tableDescription = await queryInterface.describeTable(tableName);
      
      console.log('\nFiles table columns:');
      console.log('-------------------');
      Object.entries(tableDescription).forEach(([columnName, columnInfo]) => {
        console.log(`${columnName}:`, {
          type: columnInfo.type,
          allowNull: columnInfo.allowNull,
          defaultValue: columnInfo.defaultValue,
          primaryKey: columnInfo.primaryKey || false
        });
      });
      
      // Get indexes
      const [indexes] = await sequelize.query(`
        SHOW INDEX FROM ${tableName}
      `);
      
      console.log('\nIndexes:');
      console.log('--------');
      const uniqueIndexes = {};
      indexes.forEach(index => {
        if (!uniqueIndexes[index.Key_name]) {
          uniqueIndexes[index.Key_name] = {
            name: index.Key_name,
            column: index.Column_name,
            unique: index.Non_unique === 0
          };
        }
      });
      Object.values(uniqueIndexes).forEach(index => {
        console.log(`${index.name}: ${index.column} (unique: ${index.unique})`);
      });
      
      // Count records
      const [result] = await sequelize.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`\nTotal records: ${result[0].count}`);
      
    } else {
      console.log('\n✗ Files table does not exist');
    }
    
    console.log('\n✓ Schema verification complete');
    process.exit(0);
    
  } catch (error) {
    console.error('\n✗ Verification failed:', error.message);
    process.exit(1);
  }
}

verifySchema();
