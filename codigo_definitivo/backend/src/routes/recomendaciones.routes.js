const router = require('express').Router();
const ctrl = require('../controllers/recomendaciones.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const v = require('../validators/recomendaciones.validator');

router.use(authenticate, authorize('superadmin', 'admin_restaurante'));
router.post('/', validar(v.crearOActualizar), ctrl.crearOActualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
