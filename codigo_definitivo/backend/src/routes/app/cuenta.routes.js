const router = require('express').Router();
const ctrl = require('../../controllers/app/cuenta.controller');
const validar = require('../../middlewares/validar');
const v = require('../../validators/app/cuenta.validator');
const { exigirComensal } = require('../../middlewares/comensal');
const { limiteCodigosApp, limiteIntentosApp } = require('../../middlewares/limites');

// La cuenta del comensal. Todo exige sesión de comensal: un token de staff no
// verifica aquí (ver utils/jwt.js).
router.use(exigirComensal);

router.get('/', ctrl.obtener);
router.put('/', validar(v.actualizar), ctrl.actualizar);
// Pide la clave actual: sin freno sería un oráculo para adivinarla.
router.put('/password', limiteIntentosApp, validar(v.cambiarPassword), ctrl.cambiarPassword);
router.post('/verificacion', limiteCodigosApp, ctrl.enviarVerificacion);
router.post('/verificacion/confirmar', limiteIntentosApp, validar(v.confirmarVerificacion), ctrl.confirmarVerificacion);
// DELETE con cuerpo JSON (la clave), igual que el carrito público.
router.delete('/', limiteIntentosApp, validar(v.eliminar), ctrl.eliminar);

module.exports = router;
