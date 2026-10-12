const router = require('express').Router();
const ctrl = require('../controllers/plataforma.controller');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate, authorize('superadmin'));
router.get('/estadisticas', ctrl.estadisticas);

module.exports = router;
