const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

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

module.exports = router;
