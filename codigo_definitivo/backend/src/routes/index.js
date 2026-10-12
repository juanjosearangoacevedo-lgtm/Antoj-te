const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/planes', require('./planes.routes'));
router.use('/restaurantes', require('./restaurantes.routes'));
router.use('/roles', require('./roles.routes'));
router.use('/usuarios', require('./usuarios.routes'));
router.use('/sucursales', require('./sucursales.routes'));
router.use('/mesas', require('./mesas.routes'));
router.use('/categorias', require('./categorias.routes'));
router.use('/ingredientes', require('./ingredientes.routes'));
router.use('/platos', require('./platos.routes'));
router.use('/combos', require('./combos.routes'));
router.use('/modificadores', require('./modificadores.routes'));
router.use('/pedidos', require('./pedidos.routes'));
router.use('/llamados', require('./llamados.routes'));
router.use('/recomendaciones', require('./recomendaciones.routes'));
router.use('/analitica', require('./analitica.routes'));
router.use('/temas', require('./temas.routes'));
router.use('/plataforma', require('./plataforma.routes'));
router.use('/solicitudes', require('./solicitudes.routes'));
router.use('/pagos', require('./pagos.routes'));
router.use('/public', require('./public.routes'));

module.exports = router;
