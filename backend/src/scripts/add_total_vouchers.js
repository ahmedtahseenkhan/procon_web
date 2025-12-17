var { pool } = require('../config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting migration...');
        await client.query('BEGIN');

        // Add total_vouchers column to financial_summary if it doesn't exist
        await client.query(`
      ALTER TABLE financial_summary 
      ADD COLUMN IF NOT EXISTS total_vouchers NUMERIC(10, 2) DEFAULT 0;
    `);

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
