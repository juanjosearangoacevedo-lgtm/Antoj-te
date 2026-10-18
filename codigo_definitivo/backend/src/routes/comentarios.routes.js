const router = require('express').Router();
const ctrl = require('../controllers/comentarios.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { requireFeature, FEATURES } = require('../middlewares/features');
const validar = require('../middlewares/validar');
const v = require('../validators/comentarios.validator');
const { z, id } = require('../validators/comunes');

// Moderación de los comentarios de la app. Solo tiene sentido si los platos del
// restaurante salen en la app, de ahí la feature.
router.use(authenticate, authorize('superadmin', 'admin_restaurante'), requireFeature(FEATURES.APP_PUBLICA));

const params = z.object({ id });

router.get('/', validar(v.listar, 'query'), ctrl.listar);
router.patch('/:id', validar(params, 'params'), validar(v.moderar), ctrl.moderar);
router.delete('/:id', validar(params, 'params'), ctrl.eliminar);

module.exports = router;
