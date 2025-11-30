const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

async function fixUser() {
    try {
        console.log('🚀 Fixing user 104437...');

        // 1. Ensure Company Exists
        await pool.query(`
      INSERT INTO companies (company_id, name) 
      VALUES ('104437', 'Company 104437') 
      ON CONFLICT (company_id) DO NOTHING
    `);
        console.log('✅ Company 104437 ensured');

        // 2. Generate Hash
        const password = 'password123';
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        console.log('🔐 Generated new hash for password:', password);

        // 3. Upsert User
        // We'll set both username and email to be sure
        const username = 'user_104437';
        const email = 'user_104437@example.com';

        await pool.query(`
      INSERT INTO users (username, email, password_hash, company_id, role_name, is_active) 
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        company_id = EXCLUDED.company_id,
        role_name = EXCLUDED.role_name,
        is_active = EXCLUDED.is_active
    `, [
            username,
            email,
            passwordHash,
            '104437',
            'Admin',
            true
        ]);

        console.log('✅ User updated successfully');
        console.log(`   Username: ${username}`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);

    } catch (error) {
        console.error('❌ Failed:', error);
    } finally {
        await pool.end();
    }
}

fixUser();
