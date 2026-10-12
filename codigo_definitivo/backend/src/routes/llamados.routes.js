const router = require('express').Router();
const ctrl = require('../controllers/llamados.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { requireFeature, FEATURES } = require('../middlewares/features');
const validar = require('../middlewares/validar');
const v = require('../validators/llamados.validator');

// Quien atiende un llamado es quien está en el salón, así que además del panel
// entran cocineros y meseros: son los mismos roles que ven /cocina.
// La CREACIÓN es pública (la hace el comensal) y vive en public.routes.js.
//
// Va sobre la feature 'kds' porque los llamados se atienden EN esa pantalla:
// sin ella el restaurante encendería un botón que nadie puede ver, que es peor
// que no tenerlo. Por eso la opción también se oculta en Personalización.
router.use(
  authenticate,
  authorize('superadmin', 'admin_restaurante', 'cocinero', 'mesero'),
  requireFeature(FEATURES.KDS)
);

router.get('/', validar(v.filtros, 'query'), ctrl.listarPendientes);
router.patch('/:id/atender', ctrl.atender);

module.exports = router;
