const { pool } = require('../config/db');

async function runMigration() {
    try {
        // Add company_id to device_groups
        await pool.query(`
      ALTER TABLE device_groups 
      ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
    `);
        console.log('✅ Added company_id to device_groups.');

        // Also verify no other missing columns on user_roles if needed
        // But let's stick to the known issue first.

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

runMigration();
