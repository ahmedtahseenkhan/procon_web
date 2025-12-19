const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function diagnose() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
        console.log('--- Database Diagnostics ---');

        // 1. Check existing tables
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables found:', tablesRes.rows.map(r => r.table_name).join(', ') || 'NONE');

        // 2. Check schema_migrations
        try {
            const migRes = await client.query('SELECT filename FROM schema_migrations');
            console.log('Applied migrations:', migRes.rows.map(r => r.filename).join(', ') || 'NONE');
        } catch (e) {
            console.log('schema_migrations table not found.');
        }

        // 3. Check for the specific user
        try {
            const userRes = await client.query('SELECT username, email, company_id FROM users WHERE email = $1', ['user_104437@example.com']);
            if (userRes.rows.length > 0) {
                console.log('User 104437 found:', userRes.rows[0]);
            } else {
                console.log('User 104437 NOT found in users table.');
            }
        } catch (e) {
            console.log('Error checking users table (maybe it does not exist).');
        }

    } catch (error) {
        console.error('Diagnosis failed:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

diagnose();
