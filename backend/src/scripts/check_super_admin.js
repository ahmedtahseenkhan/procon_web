const { pool } = require('../config/db');

async function checkSuperAdmins() {
    try {
        const res = await pool.query('SELECT * FROM super_admins');
        console.log('Super Admins Table:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkSuperAdmins();
