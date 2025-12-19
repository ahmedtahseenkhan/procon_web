const { pool } = require('./src/config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Create table
        await client.query(`
      CREATE TABLE IF NOT EXISTS severity_levels (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        label VARCHAR(50) NOT NULL,
        color VARCHAR(20) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

        // Seed data
        const severities = [
            { code: 'critical', label: 'Critical', color: 'red' },
            { code: 'warning', label: 'Warning', color: 'orange' },
            { code: 'normal', label: 'Normal', color: 'green' },
            { code: 'info', label: 'Info', color: 'blue' },
            { code: 'maintenance', label: 'Maintenance', color: 'gray' }
        ];

        for (const s of severities) {
            await client.query(`
        INSERT INTO severity_levels (code, label, color)
        VALUES ($1, $2, $3)
        ON CONFLICT (code) DO UPDATE SET
          label = EXCLUDED.label,
          color = EXCLUDED.color;
      `, [s.code, s.label, s.color]);
        }

        await client.query('COMMIT');
        console.log('Migration successful: severity_levels table created and seeded.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
