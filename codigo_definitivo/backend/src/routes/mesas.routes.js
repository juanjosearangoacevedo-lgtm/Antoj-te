const router = require('express').Router();
const ctrl = require('../controllers/mesas.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const v = require('../validators/mesas.validator');

router.use(authenticate, authorize('superadmin', 'admin_restaurante'));
router.get('/sucursal/:sucursalId', ctrl.listarPorSucursal);
router.post('/', validar(v.crear), ctrl.crear);
router.put('/:id', validar(v.actualizar), ctrl.actualizar);
router.post('/:id/regenerar-qr', ctrl.regenerarQr);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
