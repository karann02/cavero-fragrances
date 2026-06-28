const { Sequelize } = require('sequelize');
const sequelize = require('./config/db');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    const queryInterface = sequelize.getQueryInterface();
    const tableDesc = await queryInterface.describeTable('products');

    if (!tableDesc.weight_unit) {
      await queryInterface.addColumn('products', 'weight_unit', {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: 'ml'
      });
      console.log('✅ Added weight_unit column to products table');
    } else {
      console.log('ℹ️  weight_unit column already exists, skipping');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
