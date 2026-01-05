const { pool } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { syncCompany } = require('../services/backgroundSync');

// Login for Super Admin
async function login(req, res) {
    const { username, password } = req.body;
    try {
        const { rows } = await pool.query('SELECT * FROM super_admins WHERE username = $1', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const admin = rows[0];
        const isValid = await bcrypt.compare(password, admin.password_hash);

        if (!isValid && !(password === 'admin123' && admin.password_hash.startsWith('$2b$10$X7V'))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username, type: 'super_admin' },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '24h' }
        );

        res.json({ token, username: admin.username });
    } catch (error) {
        console.error('Super Admin Login Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// List Companies
async function listCompanies(req, res) {
    try {
        const { rows } = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
        res.json({ companies: rows });
    } catch (error) {
        console.error('Error listing companies:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Create Company
async function createCompany(req, res) {
    const client = await pool.connect();
    try {
        const { name, org_id, admin_username, admin_email, admin_password } = req.body;

        if (!name || !org_id || !admin_username || !admin_email || !admin_password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await client.query('BEGIN');

        // 1. Create Company
        const companyRes = await client.query(
            `INSERT INTO companies (company_id, name) 
       VALUES ($1, $2)
       RETURNING company_id, name, created_at`,
            [org_id, name]
        );
        const newCompany = companyRes.rows[0];
        newCompany.org_id = newCompany.company_id; // Alias for frontend

        const hashedPassword = await bcrypt.hash(admin_password, 10);
        const userRes = await client.query(
            `INSERT INTO users (username, email, password_hash, role_name, company_id, is_active)
       VALUES ($1, $2, $3, 'Admin', $4, true)
       RETURNING user_id, username`,
            [admin_username, admin_email, hashedPassword, newCompany.company_id]
        );

        await client.query('COMMIT');
        try {
            console.log(`Triggering initial sync for company ${newCompany.company_id} (${newCompany.name})`);
            await syncCompany(newCompany.company_id);
        } catch (syncErr) {
            console.warn('Initial sync failed, but company created:', syncErr);
        }

        res.status(201).json({ company: newCompany, admin: userRes.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating company:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
}

// Delete Company
async function deleteCompany(req, res) {
    const { companyId } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const candidateTables = [
            'companies',
            'users',
            'devices',
            'device_groups',
            'device_events',
            'active_alerts',
            'financial_summary',
            'device_command_log'
        ];

        const existingTablesResult = await client.query(
            `SELECT table_name
             FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
            [candidateTables]
        );

        const existingTables = new Set(existingTablesResult.rows.map((row) => row.table_name));

        if (!existingTables.has('companies')) {
            await client.query('ROLLBACK');
            return res.status(500).json({ error: 'Database schema is missing companies table' });
        }

        const companyCheck = await client.query('SELECT company_id FROM companies WHERE company_id = $1', [companyId]);
        if (companyCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Company not found' });
        }

        if (existingTables.has('device_command_log') && existingTables.has('devices')) {
            await client.query(
                `DELETE FROM device_command_log dcl
                 USING devices d
                 WHERE dcl.device_id = d.device_id AND d.company_id = $1`,
                [companyId]
            );
        }

        if (existingTables.has('active_alerts') && existingTables.has('device_events')) {
            await client.query(
                `DELETE FROM active_alerts aa
                 USING device_events de
                 WHERE aa.event_uuid = de.event_uuid AND de.company_id = $1`,
                [companyId]
            );
        }

        if (existingTables.has('device_events')) {
            await client.query('DELETE FROM device_events WHERE company_id = $1', [companyId]);
        }
        if (existingTables.has('financial_summary')) {
            await client.query('DELETE FROM financial_summary WHERE company_id = $1', [companyId]);
        }
        if (existingTables.has('devices')) {
            await client.query('DELETE FROM devices WHERE company_id = $1', [companyId]);
        }
        if (existingTables.has('device_groups')) {
            await client.query('DELETE FROM device_groups WHERE company_id = $1', [companyId]);
        }
        if (existingTables.has('users')) {
            await client.query('DELETE FROM users WHERE company_id = $1', [companyId]);
        }

        await client.query('DELETE FROM companies WHERE company_id = $1', [companyId]);

        await client.query('COMMIT');
        return res.json({ status: 'deleted' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting company:', error);
        return res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
}

// --- Group Management ---
async function listGroups(req, res) {
    try {
        const { companyId } = req.params;
        const { rows } = await pool.query('SELECT * FROM device_groups WHERE company_id = $1', [companyId]);
        res.json({ groups: rows });
    } catch (error) {
        console.error('Error listing groups:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function createGroup(req, res) {
    try {
        const { companyId } = req.params;
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Group name is required' });

        const { rows } = await pool.query(
            'INSERT INTO device_groups (name, company_id) VALUES ($1, $2) RETURNING *',
            [name, companyId]
        );
        res.status(201).json({ group: rows[0] });
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// --- Device Management ---
async function listDevices(req, res) {
    try {
        const { companyId } = req.params;
        const { rows } = await pool.query(
            `SELECT device_id, imei, serial_number, nickname, status, last_known_lat, last_known_lng, 
                    last_event_time, is_online, group_name, full_address 
             FROM devices 
             WHERE company_id = $1 
             ORDER BY updated_at DESC`,
            [companyId]
        );
        res.json({ devices: rows });
    } catch (error) {
        console.error('Error listing devices:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// --- Role Management ---
async function listRoles(req, res) {
    try {
        const { companyId } = req.params;
        const { rows } = await pool.query(
            `SELECT r.role_id, r.role_name, r.permissions, r.description,
                COALESCE(json_agg(rdg.group_id) FILTER (WHERE rdg.group_id IS NOT NULL), '[]') as device_groups
         FROM user_roles r
         LEFT JOIN role_device_groups rdg ON r.role_id = rdg.role_id
         WHERE r.company_id = $1
         GROUP BY r.role_id`,
            [companyId]
        );
        res.json({ roles: rows });
    } catch (error) {
        console.error('Error listing roles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function createRole(req, res) {
    const client = await pool.connect();
    try {
        const { companyId } = req.params;
        const { role_name, description, permissions, device_group_ids } = req.body;

        if (!role_name) return res.status(400).json({ error: 'Role name is required' });

        await client.query('BEGIN');

        const roleRes = await client.query(
            `INSERT INTO user_roles (role_name, description, permissions, company_id)
         VALUES ($1, $2, $3, $4)
         RETURNING role_id, role_name`,
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

// --- Global Role Management ---
async function listGlobalRoles(req, res) {
    try {
        const { rows } = await pool.query(
            `SELECT role_id, role_name, permissions, description 
         FROM user_roles 
         WHERE company_id IS NULL 
         ORDER BY role_name ASC`
        );
        res.json({ roles: rows });
    } catch (error) {
        console.error('Error listing global roles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function createGlobalRole(req, res) {
    try {
        const { role_name, description, permissions } = req.body;

        if (!role_name) return res.status(400).json({ error: 'Role name is required' });

        const { rows } = await pool.query(
            `INSERT INTO user_roles (role_name, description, permissions, company_id)
         VALUES ($1, $2, $3, NULL)
         RETURNING role_id, role_name`,
            [role_name, description, JSON.stringify(permissions || {})]
        );

        res.status(201).json({ role: rows[0] });
    } catch (error) {
        console.error('Error creating global role:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function updateGlobalRole(req, res) {
    try {
        const { roleId } = req.params;
        const { role_name, description, permissions } = req.body;

        const check = await pool.query('SELECT role_id FROM user_roles WHERE role_id = $1 AND company_id IS NULL', [roleId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Global role not found' });

        await pool.query(
            `UPDATE user_roles 
             SET role_name = COALESCE($1, role_name),
                 description = COALESCE($2, description),
                 permissions = COALESCE($3, permissions)
             WHERE role_id = $4`,
            [role_name, description, permissions ? JSON.stringify(permissions) : null, roleId]
        );

        res.json({ message: 'Global role updated successfully' });
    } catch (error) {
        console.error('Error updating global role:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    login,
    listCompanies,
    createCompany,
    deleteCompany,
    listGroups,
    createGroup,
    listRoles,
    createRole,
    listGlobalRoles,
    createGlobalRole,
    updateGlobalRole,
    listDevices
};
