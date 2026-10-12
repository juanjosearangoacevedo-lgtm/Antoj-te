const router = require('express').Router();
const ctrl = require('../controllers/solicitudes.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const v = require('../validators/solicitudes.validator');

// Bandeja comercial de la plataforma: solo superadmin. Un admin de restaurante
// no tiene por qué ver los datos de contacto de otros restaurantes interesados.
// La CREACIÓN es pública y vive en public.routes.js.
router.use(authenticate, authorize('superadmin'));

router.get('/', validar(v.filtros, 'query'), ctrl.listar);
router.get('/resumen', ctrl.resumen);
router.patch('/:id/seguimiento', validar(v.actualizarSeguimiento), ctrl.actualizarSeguimiento);

// Aprobar CREA restaurante, suscripción y usuario administrador. Por eso tiene su
// propio endpoint y no es un estado más de `seguimiento`: no es anotar algo, es
// darle de alta un cliente a la plataforma.
router.post('/:id/aprobar', validar(v.aprobar), ctrl.aprobar);
router.post('/:id/rechazar', validar(v.rechazar), ctrl.rechazar);

module.exports = router;
