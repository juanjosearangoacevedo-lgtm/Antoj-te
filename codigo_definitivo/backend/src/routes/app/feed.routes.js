const router = require('express').Router();
const feed = require('../../controllers/app/feed.controller');
const social = require('../../controllers/app/social.controller');
const validar = require('../../middlewares/validar');
const vFeed = require('../../validators/app/feed.validator');
const vSocial = require('../../validators/app/social.validator');
const vEventos = require('../../validators/app/eventos.validator');
const { identificarComensal, exigirComensal } = require('../../middlewares/comensal');
const {
  limiteSocialApp,
  limiteComentariosApp,
  limiteModeracionApp,
  limiteEventosApp,
} = require('../../middlewares/limites');

// El feed de la app y su capa social (fase 2).
//
// Nada de esto exige cuenta salvo comentar, reportar y bloquear. Todo pasa por
// `identificarComensal`: sin token responde igual, y con token personaliza ("me
// gusta" y guardados de la cuenta en vez de los del teléfono). Un token que no
// vale da 401, para que la app lo renueve en vez de mostrar datos del teléfono
// creyendo que son los de la cuenta.
router.use(identificarComensal);

// --- Feed ---
router.get('/feed', validar(vFeed.pagina, 'query'), feed.pagina);
router.get('/feed/conteo', validar(vFeed.conteo, 'query'), feed.conteo);
router.get('/feed/opciones', feed.opciones);

// --- Un plato y lo social de cada plato ---
router.get('/platos/:id', validar(vFeed.paramsPlato, 'params'), feed.plato);
router.post('/platos/:id/me-gusta', limiteSocialApp, validar(vFeed.paramsPlato, 'params'), social.marcarMeGusta);
router.delete('/platos/:id/me-gusta', limiteSocialApp, validar(vFeed.paramsPlato, 'params'), social.quitarMeGusta);
router.get(
  '/platos/:id/comentarios',
  validar(vFeed.paramsPlato, 'params'),
  validar(vSocial.listarComentarios, 'query'),
  social.comentarios
);
router.post(
  '/platos/:id/comentarios',
  limiteComentariosApp,
  exigirComensal,
  validar(vFeed.paramsPlato, 'params'),
  validar(vSocial.comentario),
  social.comentar
);

// --- Guardados ---
router.get('/guardados', feed.guardados);
router.post('/guardados', limiteSocialApp, validar(vSocial.guardado), social.guardar);
router.delete('/guardados/:id', limiteSocialApp, validar(vSocial.paramsId, 'params'), social.quitarGuardado);

// --- Comentarios propios, reportes y bloqueos (con cuenta) ---
router.delete('/comentarios/:id', exigirComensal, validar(vSocial.paramsId, 'params'), social.eliminarComentario);
router.post('/reportes', limiteModeracionApp, exigirComensal, validar(vSocial.reporte), social.reportar);
router.post('/bloqueos', limiteModeracionApp, exigirComensal, validar(vSocial.bloqueo), social.bloquear);

// --- Señales del feed, por lotes ---
router.post('/eventos', limiteEventosApp, validar(vEventos.lote), feed.eventos);

module.exports = router;
