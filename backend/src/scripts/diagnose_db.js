const { Pool } = require('pg');
const path = require('path');
// Correct path to .env in backend folder
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function diagnose() {
    // Use DATABASE_URL or fallback to separate env vars like the main app does
    const connectionConfig = process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'procon_gaming',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
        };

    const pool = new Pool(connectionConfig);
    const client = await pool.connect();
    try {
        console.log('--- Database Diagnostics ---');

        // 1. Check existing tables
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        const tables = tablesRes.rows.map(r => r.table_name);
        console.log('Tables found:', tables.join(', ') || 'NONE');

        const expectedTables = ['severity_levels', 'device_groups'];
        expectedTables.forEach(t => {
            if (tables.includes(t)) {
                console.log(`✅ Table ${t} exists.`);
            } else {
                console.log(`❌ Table ${t} is MISSING.`);
            }
        });

        // Check for specific column in financial_summary
        if (tables.includes('financial_summary')) {
            const colRes = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'financial_summary' AND column_name = 'total_vouchers'
            `);
            if (colRes.rows.length > 0) {
                console.log('✅ Column total_vouchers exists in financial_summary.');
            } else {
                console.log('❌ Column total_vouchers is MISSING in financial_summary.');
            }
        }

        // 2. Check environment variables (mask API keys)
        console.log('\n--- Environment Variables ---');
        const envVars = [
            'PROCON_API_URL',
            'PROCON_API_KEY',
            'PROCON_EVENTS_URL',
            'PROCON_DEVICES_URL',
            'PROCON_ACCOUNT_ID',
            'DATABASE_URL'
        ];
        envVars.forEach(v => {
            const val = process.env[v];
            if (val) {
                const display = (v.includes('KEY') || v.includes('URL')) ? (val.substring(0, 5) + '...') : val;
                console.log(`✅ ${v}: ${display}`);
            } else {
                console.log(`❌ ${v} is NOT SET.`);
            }
        });

        // 3. Check for companies
        try {
            const compRes = await client.query('SELECT company_id FROM companies');
            console.log('\n--- Companies ---');
            console.log(`Count: ${compRes.rows.length}`);
            if (compRes.rows.length > 0) {
                console.log('Sample ID:', compRes.rows[0].company_id);
            }
        } catch (e) {
            console.log('\nError checking companies table.');
        }

        // 4. Check schema_migrations
        try {
            const migRes = await client.query('SELECT filename FROM schema_migrations');
            console.log('\n--- Applied Migrations ---');
            console.log(migRes.rows.map(r => r.filename).join(', ') || 'NONE');
        } catch (e) {
            console.log('\nschema_migrations table not found.');
        }

        // 5. Check sync logs
        try {
            const syncRes = await client.query('SELECT sync_type, status, rows_fetched, error_message, sync_timestamp FROM api_sync_logs ORDER BY sync_timestamp DESC LIMIT 5');
            console.log('\n--- Recent Sync Logs ---');
            if (syncRes.rows.length > 0) {
                syncRes.rows.forEach(r => {
                    console.log(`[${r.sync_timestamp.toISOString()}] ${r.sync_type}: ${r.status} (${r.rows_fetched} rows) ${r.error_message || ''}`);
                });
            } else {
                console.log('No sync logs found.');
            }
        } catch (e) {
            console.log('\nError checking api_sync_logs table.');
        }

        // 6. Check for the specific user
        try {
            const userRes = await client.query('SELECT username, email FROM users WHERE email = $1', ['user_104437@example.com']);
            console.log('\n--- Test User ---');
            if (userRes.rows.length > 0) {
                console.log('✅ User 104437 exists:', userRes.rows[0].email);
            } else {
                console.log('❌ User 104437 NOT found.');
            }
        } catch (e) {
            console.log('\nError checking users table.');
        }

    } catch (error) {
        console.error('Diagnosis failed:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

diagnose();
