const { pool } = require('./backend/src/config/db');

async function inspect() {
    try {
        const resTypes = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name IN ('devices', 'device_groups')
      ORDER BY table_name, ordinal_position;
    `);
        console.table(resTypes.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

inspect();
