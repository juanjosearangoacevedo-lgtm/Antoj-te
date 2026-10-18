const router = require('express').Router();
const configCtrl = require('../../controllers/app/config.controller');
const { leerDispositivo } = require('../../middlewares/comensal');
const { limiteApp } = require('../../middlewares/limites');

// API de la app móvil del comensal: /api/app/v1.
//
// Versionada porque una app publicada no se actualiza a la fuerza: el día que un
// contrato tenga que romperse, nace /v2 y las versiones viejas siguen hablando
// con /v1 hasta que desaparezcan. `/api/public` no se toca: lo consumen el menú
// por QR, la vitrina y el HTML del SEO, que ya están indexados.
//
// Todo lo de aquí pasa por el techo de tasa y por la lectura del dispositivo
// (X-Dispositivo, X-Plataforma), exija cuenta o no.
router.use(limiteApp, leerDispositivo);

router.get('/config', configCtrl.obtener);
router.use('/auth', require('./auth.routes'));
router.use('/cuenta', require('./cuenta.routes'));
// Fase 2: el feed, "me gusta", guardados, comentarios y señales.
router.use(require('./feed.routes'));

module.exports = router;
