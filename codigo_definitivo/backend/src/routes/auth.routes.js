const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const v = require('../validators/auth.validator');
const {
  limiteLogin,
  limiteCambioPassword,
  limiteRecuperacion,
  limiteRestablecer,
} = require('../middlewares/limites');

// El limite va ANTES del validador: si no, un atacante gasta CPU de validacion
// en cada intento antes de que nadie lo frene.
router.post('/login', limiteLogin, validar(v.login), ctrl.login);
router.get('/me', authenticate, ctrl.me);

// Cambiar la propia contraseña. Cualquier rol autenticado: tambien cocineros y
// meseros, que no entran al panel y hasta ahora no tenian por donde hacerlo.
router.put(
  '/password',
  authenticate,
  limiteCambioPassword,
  validar(v.cambiarPassword),
  ctrl.cambiarPassword
);

// Olvidé mi contraseña. Públicas: quien las usa, por definición, no puede entrar.
router.post('/recuperar', limiteRecuperacion, validar(v.recuperar), ctrl.recuperar);
router.post('/restablecer', limiteRestablecer, validar(v.restablecer), ctrl.restablecer);

module.exports = router;
