const router = require('express').Router();
const ctrl = require('../controllers/roles.controller');
const { authenticate, authorize } = require('../middlewares/auth');

router.get('/', authenticate, authorize('superadmin', 'admin_restaurante'), ctrl.listar);

module.exports = router;
