require('dotenv').config();
const sequelize = require('./config/db');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`);
    console.log('✅ is_active column ready');

    await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP`);
    console.log('✅ otp_expiry column ready');

    console.log('✅ All migrations done. You can now restart the server.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
