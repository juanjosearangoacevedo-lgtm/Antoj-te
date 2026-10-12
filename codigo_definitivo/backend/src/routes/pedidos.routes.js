const router = require('express').Router();
const ctrl = require('../controllers/pedidos.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { requireFeature, FEATURES } = require('../middlewares/features');

// El KDS (panel de cocina) requiere que el plan del restaurante incluya 'kds' (Plan Pro)
router.use(
  authenticate,
  authorize('superadmin', 'admin_restaurante', 'cocinero', 'mesero'),
  requireFeature(FEATURES.KDS)
);
router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.patch('/:id/estado', ctrl.cambiarEstado);

module.exports = router;
