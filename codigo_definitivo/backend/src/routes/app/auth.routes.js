const router = require('express').Router();
const ctrl = require('../../controllers/app/auth.controller');
const validar = require('../../middlewares/validar');
const v = require('../../validators/app/auth.validator');
const {
  limiteRegistroApp,
  limiteLoginApp,
  limiteCodigosApp,
  limiteIntentosApp,
} = require('../../middlewares/limites');

// Públicas: quien las usa, por definición, todavía no tiene sesión. El freno va
// ANTES del validador, para que un atacante no gaste CPU de validación en cada
// intento antes de que nadie lo pare.
router.post('/registro', limiteRegistroApp, validar(v.registro), ctrl.registro);
router.post('/login', limiteLoginApp, validar(v.login), ctrl.login);

// Renovar y cerrar se identifican con el refresh token en el cuerpo, no con el
// access token: tienen que funcionar justo cuando este ya caducó. Sin freno
// propio (basta el techo general): un token de 256 bits no se adivina, y los
// rechazos por sesiones caducadas de otros usuarios detrás de la misma IP
// agotarían el cupo de intentos de quien está confirmando un código.
router.post('/refresh', validar(v.sesion), ctrl.refresh);
router.post('/logout', validar(v.sesion), ctrl.logout);

// Olvidé mi contraseña: un código de 6 dígitos por correo.
router.post('/recuperar', limiteCodigosApp, validar(v.recuperar), ctrl.recuperar);
router.post('/restablecer', limiteIntentosApp, validar(v.restablecer), ctrl.restablecer);

module.exports = router;
