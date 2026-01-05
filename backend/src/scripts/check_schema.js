const { pool } = require('../config/db');

async function checkSchema() {
    try {
        const companies = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'companies'");
        console.log('--- Companies Table ---');
        console.table(companies.rows);

        const users = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
        console.log('--- Users Table ---');
        console.table(users.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkSchema();
