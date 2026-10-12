const router = require('express').Router();
const ctrl = require('../controllers/sucursales.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const v = require('../validators/sucursales.validator');

router.use(authenticate, authorize('superadmin', 'admin_restaurante'));
router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', validar(v.crear), ctrl.crear);
router.put('/:id', validar(v.actualizar), ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
