const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { listRoles, createRole, updateRole } = require('../controllers/roleController');

router.use(authMiddleware);

// Only Admins (of the company) can manage roles
router.get('/', roleCheck(['Admin']), listRoles);
router.post('/', roleCheck(['Admin']), createRole);
router.put('/:roleId', roleCheck(['Admin']), updateRole);

module.exports = router;
