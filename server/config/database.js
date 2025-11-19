const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      connectTimeout: 60000
    }
  }
);

// Test the connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    console.error('Please make sure:');
    console.error('1. MySQL is installed and running');
    console.error(`2. The database "${process.env.DB_NAME}" exists`);
    console.error(`3. The user "${process.env.DB_USER}" has privileges`);
    console.error(`4. MySQL is running on port ${process.env.DB_PORT}`);
  }
};

testConnection();

module.exports = sequelize; 