/**
 * Test Database Configuration
 * 
 * Provides a separate database configuration for testing
 * Uses SQLite in-memory for fast, isolated tests
 */

const { Sequelize } = require('sequelize');

// Use SQLite in-memory for testing (no external database required)
const testSequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false, // Disable logging during tests
  define: {
    timestamps: true
  }
});

module.exports = testSequelize;
