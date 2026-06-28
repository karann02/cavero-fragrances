// migrate_slider_screen_type.js
const { DataTypes } = require('sequelize');
const sequelize = require('./config/db');

async function addScreenTypeColumn() {
  try {
    console.log('Starting migration: Adding screen_type column to sliders table...');
    
    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'sliders' AND COLUMN_NAME = 'screen_type'
    `);
    
    if (results.length > 0) {
      console.log('screen_type column already exists. Skipping migration.');
      return;
    }
    
    // Add the screen_type column
    await sequelize.query(`
      ALTER TABLE sliders 
      ADD COLUMN screen_type ENUM('desktop', 'mobile') DEFAULT 'desktop'
    `);
    
    console.log('Successfully added screen_type column to sliders table');
    
    // Update existing sliders to have 'desktop' as default
    await sequelize.query(`
      UPDATE sliders 
      SET screen_type = 'desktop' 
      WHERE screen_type IS NULL
    `);
    
    console.log('Updated existing sliders with default screen_type value');
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  addScreenTypeColumn()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = addScreenTypeColumn;