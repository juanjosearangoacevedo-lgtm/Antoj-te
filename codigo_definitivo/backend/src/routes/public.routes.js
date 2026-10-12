const router = require('express').Router();

const mesasCtrl = require('../controllers/mesas.controller');
const platosCtrl = require('../controllers/platos.controller');
const carritoCtrl = require('../controllers/carrito.controller');
const favoritosCtrl = require('../controllers/favoritos.controller');
const analiticaCtrl = require('../controllers/analitica.controller');
const pedidosCtrl = require('../controllers/pedidos.controller');
const recomendacionesCtrl = require('../controllers/recomendaciones.controller');
const temasCtrl = require('../controllers/temas.controller');
const solicitudesCtrl = require('../controllers/solicitudes.controller');
const llamadosCtrl = require('../controllers/llamados.controller');
const planesCtrl = require('../controllers/planes.controller');
const directorioCtrl = require('../controllers/directorio.controller');
const validar = require('../middlewares/validar');
const carritoV = require('../validators/carrito.validator');
const favoritosV = require('../validators/favoritos.validator');
const analiticaV = require('../validators/analitica.validator');
const solicitudesV = require('../validators/solicitudes.validator');
const llamadosV = require('../validators/llamados.validator');
const {
  requireFeaturePublic,
  requireFeatureDetallePublic,
  FEATURES,
} = require('../middlewares/features');
const { limiteEscrituraPublica } = require('../middlewares/limites');

// Toda ESCRITURA anonima pasa por el freno de tasa. Se aplica aqui, a nivel de
// router, y no ruta por ruta, para que una ruta publica nueva nazca protegida
// en vez de depender de que alguien se acuerde de anadirle el middleware.
// Las lecturas quedan fuera: el comensal recorre el menu a su ritmo y no hay
// nada que abusar que no sea ya publico.
router.use((req, res, next) =>
  req.method === 'GET' ? next() : limiteEscrituraPublica(req, res, next)
);

// Formulario de la landing: un interesado deja los datos de su restaurante.
// Va arriba porque no depende de ningun token de mesa, a diferencia del resto.
router.post('/solicitudes', validar(solicitudesV.crear), solicitudesCtrl.crear);

// Planes a la venta. Es la UNICA fuente de la seccion de precios de la landing:
// cambiar un precio en el panel lo cambia ahi sin tocar codigo.
router.get('/planes', planesCtrl.listarPublicos);

// Directorio publico de restaurantes: lo que pinta /restaurantes en React. La
// version en HTML para buscadores la escribe routes/seo.routes.js, pero las dos
// salen del mismo servicio para que apliquen la misma puerta de calidad.
router.get('/directorio', directorioCtrl.listar);
router.get('/directorio/:ciudad', directorioCtrl.porCiudad);

// Vitrina publica del restaurante: /r/:slug. Va ANTES de las rutas con ':token'
// porque Express sirve la primera que encaja, y '/:token/config' se tragaria
// '/r/...' si estuviera declarada antes.
//
// Aqui NO hay carrito ni pedidos, y no es una limitacion olvidada: carritos y
// pedidos cuelgan de una mesa por clave ajena, y quien llega desde Instagram no
// esta sentado en ninguna. Esta URL es escaparate; para pedir, el QR de la mesa.
router.get('/r/:slug', temasCtrl.configPorSlug);
router.get('/r/:slug/menu', platosCtrl.feedPorSlug);

// Resolucion de mesa al escanear el QR
router.get('/mesas/:token', mesasCtrl.resolverPorToken);

// Configuracion del restaurante: features del plan + tema visual (personalizacion)
router.get('/:token/config', temasCtrl.configPublica);

// Menu (feed de video) y detalle de plato
router.get('/:token/menu', platosCtrl.feedPublico);
router.get('/platos/:platoId', platosCtrl.obtenerPublico);
router.get('/platos/:platoId/recomendaciones', recomendacionesCtrl.porPlato);

// Carrito persistente — solo disponible si el plan del restaurante incluye 'carrito' (Plan Pro)
router.get('/:token/carrito/:sesionToken', requireFeaturePublic(FEATURES.CARRITO), carritoCtrl.obtenerCarrito);
router.post('/:token/carrito', requireFeaturePublic(FEATURES.CARRITO), validar(carritoV.agregarItem), carritoCtrl.agregarItem);
router.put('/carrito/detalle/:detalleId', requireFeatureDetallePublic(FEATURES.CARRITO), validar(carritoV.actualizarItem), carritoCtrl.actualizarItem);
router.delete('/carrito/detalle/:detalleId', requireFeatureDetallePublic(FEATURES.CARRITO), validar(carritoV.eliminarItem), carritoCtrl.eliminarItem);
router.post('/:token/carrito/checkout', requireFeaturePublic(FEATURES.CARRITO), validar(carritoV.checkout), carritoCtrl.checkout);

// Llamar al mesero desde la mesa. Se atiende en el panel de cocina, asi que
// exige la misma feature que esa pantalla.
router.post(
  '/:token/llamados',
  requireFeaturePublic(FEATURES.KDS),
  validar(llamadosV.crear),
  llamadosCtrl.crear
);

// Favoritos (likes anonimos)
router.post('/favoritos', validar(favoritosV.toggle), favoritosCtrl.toggle);
router.get('/favoritos/:sesionToken', favoritosCtrl.listarPorSesion);

// Tracking de eventos de video/engagement (embudo de conversion)
router.post('/eventos', validar(analiticaV.registrarEvento), analiticaCtrl.registrarEvento);

// Seguimiento de pedidos propios (sin necesidad de cuenta)
router.get('/pedidos/:sesionToken', pedidosCtrl.misPedidos);

module.exports = router;
