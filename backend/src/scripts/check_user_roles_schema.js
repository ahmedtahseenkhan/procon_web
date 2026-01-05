const { pool } = require('../config/db');

async function checkSchema() {
    try {
        const res = await pool.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'user_roles'");
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkSchema();
