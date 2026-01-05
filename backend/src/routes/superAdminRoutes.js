const express = require('express');
const router = express.Router();
const { login, listCompanies, createCompany, deleteCompany } = require('../controllers/superAdminController');
const jwt = require('jsonwebtoken');

// Middleware for Super Admin Token
const verifySuperAdmin = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });
        if (decoded.type !== 'super_admin') return res.status(403).json({ error: 'Not authorized' });
        req.user = decoded;
        next();
    });
};

router.post('/login', login);
router.get('/companies', verifySuperAdmin, listCompanies);
router.post('/companies', verifySuperAdmin, createCompany);
router.delete('/companies/:companyId', verifySuperAdmin, deleteCompany);

// Nested Resources
const { listGroups, createGroup, listGlobalRoles, createGlobalRole, updateGlobalRole } = require('../controllers/superAdminController');
router.get('/companies/:companyId/groups', verifySuperAdmin, listGroups);
router.post('/companies/:companyId/groups', verifySuperAdmin, createGroup);

// Devices
const { listDevices } = require('../controllers/superAdminController');
router.get('/companies/:companyId/devices', verifySuperAdmin, listDevices);

// Global Roles
router.get('/roles', verifySuperAdmin, listGlobalRoles);
router.post('/roles', verifySuperAdmin, createGlobalRole);
router.put('/roles/:roleId', verifySuperAdmin, updateGlobalRole);

module.exports = router;
