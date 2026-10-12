const router = require('express').Router();
const ctrl = require('../controllers/restaurantes.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const v = require('../validators/restaurantes.validator');

router.use(authenticate);
router.get('/', authorize('superadmin'), ctrl.listar);
router.post('/', authorize('superadmin'), validar(v.crear), ctrl.crear);
router.delete('/:id', authorize('superadmin'), ctrl.eliminar);
router.patch('/:id/estado', authorize('superadmin'), validar(v.cambiarEstado), ctrl.cambiarEstado);
router.patch('/:id/plan', authorize('superadmin'), validar(v.cambiarPlan), ctrl.cambiarPlan);
// Sumar días, fijar fecha, renovar, vencer o dejar sin vencimiento (solo plataforma).
router.patch('/:id/suscripcion', authorize('superadmin'), validar(v.ajustarSuscripcion), ctrl.ajustarSuscripcion);
router.get('/:id', authorize('superadmin', 'admin_restaurante'), ctrl.obtener);
router.put('/:id', authorize('superadmin', 'admin_restaurante'), validar(v.actualizar), ctrl.actualizar);

module.exports = router;
