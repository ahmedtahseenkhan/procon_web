const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

async function runMigration() {
    try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS super_admins (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Table super_admins created/verified.');

        // Create default admin
        const passwordHash = await bcrypt.hash('admin123', 10);
        await pool.query(`
      INSERT INTO super_admins (username, password_hash)
      VALUES ('admin', $1)
      ON CONFLICT (username) DO NOTHING;
    `, [passwordHash]);
        console.log('✅ Default super admin inserted (user: admin).');

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

runMigration();
