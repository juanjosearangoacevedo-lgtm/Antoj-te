const router = require('express').Router();
const ctrl = require('../controllers/temas.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { requireFeature, FEATURES } = require('../middlewares/features');
const validar = require('../middlewares/validar');
const v = require('../validators/temas.validator');

router.use(authenticate);
router.get('/', authorize('superadmin', 'admin_restaurante'), ctrl.obtener);
router.put(
  '/',
  authorize('superadmin', 'admin_restaurante'),
  requireFeature(FEATURES.PERSONALIZACION),
  validar(v.guardar),
  ctrl.guardar
);

module.exports = router;
