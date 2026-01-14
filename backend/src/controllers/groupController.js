const { pool } = require('../config/db');

// List Generic Groups (Global Groups)
async function listGenericGroups(req, res) {
    try {
        const { rows } = await pool.query('SELECT * FROM device_groups WHERE company_id IS NULL ORDER BY created_at DESC');
        res.json({ groups: rows });
    } catch (error) {
        console.error('Error listing generic groups:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Create Generic Group
async function createGenericGroup(req, res) {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Group name is required' });

        const { rows } = await pool.query(
            'INSERT INTO device_groups (name, description, company_id) VALUES ($1, $2, NULL) RETURNING *',
            [name, description]
        );
        res.status(201).json({ group: rows[0] });
    } catch (error) {
        console.error('Error creating generic group:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Update Generic Group
async function updateGenericGroup(req, res) {
    try {
        const { groupId } = req.params;
        const { name, description } = req.body;

        const check = await pool.query('SELECT group_id FROM device_groups WHERE group_id = $1 AND company_id IS NULL', [groupId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Group not found' });

        const { rows } = await pool.query(
            `UPDATE device_groups 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description)
             WHERE group_id = $3
             RETURNING *`,
            [name, description, groupId]
        );
        res.json({ group: rows[0] });
    } catch (error) {
        console.error('Error updating generic group:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Delete Generic Group
async function deleteGenericGroup(req, res) {
    try {
        const { groupId } = req.params;

        // Optional: Check if used by any devices? 
        // For now, let's allow delete. The user didn't specify constraint. 
        // But foreign key might restrict if strict.

        const check = await pool.query('SELECT group_id FROM device_groups WHERE group_id = $1 AND company_id IS NULL', [groupId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Group not found' });

        await pool.query('DELETE FROM device_groups WHERE group_id = $1', [groupId]);
        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Error deleting generic group:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    listGenericGroups,
    createGenericGroup,
    updateGenericGroup,
    deleteGenericGroup
};
