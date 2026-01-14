const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const authMiddleware = require('../middleware/auth');

// GET /api/metadata/severities
router.get('/severities', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT code, label, color FROM severity_levels WHERE is_active = true ORDER BY id ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching severities:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/groups', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const exists = await pool.query(
            `SELECT 1
             FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'device_groups'
             LIMIT 1`
        );

        if (exists.rows.length === 0) {
            return res.json([]);
        }

        const hasCompanyId = await pool.query(
            `SELECT 1
             FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'device_groups'
               AND column_name = 'company_id'
             LIMIT 1`
        );

        const { rows } = hasCompanyId.rows.length
            ? await pool.query(
                'SELECT group_id, name FROM device_groups WHERE company_id = $1 OR company_id IS NULL ORDER BY name ASC',
                [String(companyId)]
            )
            : await pool.query(
                'SELECT group_id, name FROM device_groups ORDER BY name ASC'
            );

        return res.json(rows);
    } catch (error) {
        console.error('Error fetching groups:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
