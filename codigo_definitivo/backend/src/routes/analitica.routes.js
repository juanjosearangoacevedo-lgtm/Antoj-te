const router = require('express').Router();
const ctrl = require('../controllers/analitica.controller');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate, authorize('superadmin', 'admin_restaurante'));

// Analítica del propio restaurante. El superadmin puede mirar la de cualquiera
// pasando ?restaurante_id=, que es lo que resuelve `resolveRestauranteId`.
router.get('/resumen', ctrl.resumen);
router.get('/productos', ctrl.productos);
router.get('/actividad', ctrl.actividad);

// Vista agregada de toda la plataforma: solo para quien la administra.
router.get('/plataforma', authorize('superadmin'), ctrl.plataforma);

module.exports = router;
