const router = require('express').Router();
const ctrl = require('../controllers/modificadores.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const v = require('../validators/modificadores.validator');

router.use(authenticate, authorize('superadmin', 'admin_restaurante'));
router.get('/grupos', ctrl.listarGrupos);
router.post('/grupos', validar(v.crearGrupo), ctrl.crearGrupo);
router.put('/grupos/:id', validar(v.actualizarGrupo), ctrl.actualizarGrupo);
router.delete('/grupos/:id', ctrl.eliminarGrupo);
router.post('/opciones', validar(v.crearOpcion), ctrl.crearOpcion);
router.put('/opciones/:id', validar(v.actualizarOpcion), ctrl.actualizarOpcion);
router.delete('/opciones/:id', ctrl.eliminarOpcion);

module.exports = router;
