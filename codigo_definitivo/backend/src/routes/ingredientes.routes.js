const router = require('express').Router();
const ctrl = require('../controllers/ingredientes.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const v = require('../validators/ingredientes.validator');

router.use(authenticate);
router.get('/', authorize('superadmin', 'admin_restaurante', 'cocinero'), ctrl.listar);
router.post('/', authorize('superadmin', 'admin_restaurante'), validar(v.crear), ctrl.crear);
router.put('/:id', authorize('superadmin', 'admin_restaurante'), validar(v.actualizar), ctrl.actualizar);
router.patch('/:id/stock', authorize('superadmin', 'admin_restaurante', 'cocinero'), validar(v.ajustarStock), ctrl.ajustarStock);
router.delete('/:id', authorize('superadmin', 'admin_restaurante'), ctrl.eliminar);

module.exports = router;
