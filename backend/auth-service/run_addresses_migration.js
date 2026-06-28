const fs = require('fs');
const path = require('path');
const sequelize = require('./config/db');

async function runAddressesMigration() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connected.');

        const sqlPath = path.join(__dirname, '../../create_addresses_table.sql');
        console.log(`Reading SQL from: ${sqlPath}`);

        if (!fs.existsSync(sqlPath)) {
            console.error('SQL file not found!');
            process.exit(1);
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing addresses table migration...');
        // Execute the entire SQL script
        await sequelize.query(sql);

        console.log('✅ Addresses table migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Addresses migration failed:', error);
        process.exit(1);
    }
}

runAddressesMigration();