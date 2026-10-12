const router = require('express').Router();
const ctrl = require('../controllers/platos.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const v = require('../validators/platos.validator');
const { limiteSubidaVideo } = require('../middlewares/limites');

router.use(authenticate, authorize('superadmin', 'admin_restaurante'));
// Video (Bunny Stream) — declaradas antes de '/:id' para que no las capture esa ruta
router.post(
  '/video/solicitar-subida',
  limiteSubidaVideo,
  validar(v.solicitarSubidaVideo),
  ctrl.solicitarSubidaVideo
);
router.get('/video/:guid/estado', ctrl.estadoVideo);
router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', validar(v.crear), ctrl.crear);
router.put('/:id', validar(v.actualizar), ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);
router.put('/:id/ingredientes', validar(v.setIngredientes), ctrl.setIngredientes);
router.put('/:id/grupos-modificadores', validar(v.setGruposModificadores), ctrl.setGruposModificadores);

module.exports = router;
