const { pool } = require('../config/db');

// GET /api/roles
async function listRoles(req, res) {
    try {
        const { rows } = await pool.query(
            `SELECT r.role_id, r.role_name, r.permissions, r.description, r.created_at
             FROM user_roles r
             WHERE r.company_id IS NULL
             ORDER BY r.role_name ASC`
        );
        res.json({ roles: rows });
    } catch (error) {
        console.error('Error listing roles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// POST /api/roles
async function createRole(req, res) {
    const client = await pool.connect();
    try {
        const { role_name, description, permissions, device_group_ids } = req.body;
        const companyId = req.user.company_id;

        if (!role_name) return res.status(400).json({ error: 'Role name is required' });

        await client.query('BEGIN');

        const roleRes = await client.query(
            `INSERT INTO user_roles (role_name, description, permissions, company_id)
       VALUES ($1, $2, $3, $4)
       RETURNING role_id, role_name, created_at`,
            [role_name, description, JSON.stringify(permissions || {}), companyId]
        );
        const newRole = roleRes.rows[0];

        if (device_group_ids && Array.isArray(device_group_ids) && device_group_ids.length > 0) {
            const values = device_group_ids.map((gid, i) => `($1, $${i + 2})`).join(',');
            await client.query(
                `INSERT INTO role_device_groups (role_id, group_id) VALUES ${values}`,
                [newRole.role_id, ...device_group_ids]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ role: newRole });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating role:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
}

// PUT /api/roles/:roleId
async function updateRole(req, res) {
    const client = await pool.connect();
    try {
        const { roleId } = req.params;
        const { role_name, description, permissions, device_group_ids } = req.body;
        const companyId = req.user.company_id;

        await client.query('BEGIN');

        // Verify ownership
        const check = await client.query(
            'SELECT role_id FROM user_roles WHERE role_id = $1 AND company_id = $2',
            [roleId, companyId]
        );
        if (check.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Role not found' });
        }

        await client.query(
            `UPDATE user_roles 
       SET role_name = COALESCE($1, role_name),
           description = COALESCE($2, description),
           permissions = COALESCE($3, permissions)
       WHERE role_id = $4`,
            [role_name, description, permissions ? JSON.stringify(permissions) : null, roleId]
        );

        if (device_group_ids !== undefined) {
            await client.query('DELETE FROM role_device_groups WHERE role_id = $1', [roleId]);
            if (Array.isArray(device_group_ids) && device_group_ids.length > 0) {
                const values = device_group_ids.map((gid, i) => `($1, $${i + 2})`).join(',');
                await client.query(
                    `INSERT INTO role_device_groups (role_id, group_id) VALUES ${values}`,
                    [roleId, ...device_group_ids]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Role updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating role:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
}

module.exports = { listRoles, createRole, updateRole };
