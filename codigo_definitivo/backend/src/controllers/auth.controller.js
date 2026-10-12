const asyncHandler = require('../middlewares/asyncHandler');
const authService = require('../services/auth.service');
const recuperacionService = require('../services/recuperacion.service');

const login = asyncHandler(async (req, res) => {
  res.json(await authService.login(req.body.email, req.body.password));
});

const me = asyncHandler(async (req, res) => {
  const contexto = await authService.contextoPlan(req.user);
  res.json({ usuario: req.user, ...contexto });
});

const cambiarPassword = asyncHandler(async (req, res) => {
  // El id sale del token, NUNCA del cuerpo: si viniera del cuerpo, cualquiera
  // cambiaria la clave de cualquier otro mandando otro numero.
  res.json(await authService.cambiarPassword(req.user, req.body.actual, req.body.nueva));
});

// Públicos: "olvidé mi contraseña". `solicitar` responde lo mismo exista o no
// el correo; el envío ocurre en segundo plano.
const recuperar = asyncHandler(async (req, res) => {
  res.json(recuperacionService.solicitar(req.body.email, req.ip));
});

const restablecer = asyncHandler(async (req, res) => {
  res.json(await recuperacionService.restablecer(req.body.token, req.body.password));
});

module.exports = { login, me, cambiarPassword, recuperar, restablecer };
