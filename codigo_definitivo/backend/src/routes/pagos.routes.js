const router = require('express').Router();
const ctrl = require('../controllers/pagos.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const v = require('../validators/pagos.validator');

// Webhook de Wompi: sin sesión, va ANTES del authenticate. Lo que lo protege es
// la firma del evento, que se verifica en el service.
router.post('/wompi/eventos', ctrl.eventoWompi);

// Paga el dueño del restaurante. El superadmin no tiene restaurante propio, y
// cocineros y meseros no tienen por qué tocar la facturación.
router.use(authenticate, authorize('admin_restaurante'));

router.get('/', ctrl.resumen);
router.post('/', validar(v.iniciar), ctrl.iniciar);
router.get('/transaccion/:transaccionId', validar(v.consultar, 'params'), ctrl.consultar);

module.exports = router;
