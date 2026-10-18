const asyncHandler = require('../../middlewares/asyncHandler');
const comensalesService = require('../../services/comensales.service');

// La cuenta del comensal: /api/app/v1/cuenta. Todas pasan por `exigirComensal`,
// y el id sale SIEMPRE del token, nunca del cuerpo ni de la URL: si viniera de
// ahí, cualquiera podría tocar la cuenta de otro mandando otro número.

const contexto = (req) => ({ dispositivoId: req.dispositivoId, plataforma: req.plataforma, ip: req.ip });

const obtener = asyncHandler(async (req, res) => {
  res.json(await comensalesService.perfil(req.comensal.id));
});

const actualizar = asyncHandler(async (req, res) => {
  res.json(await comensalesService.actualizarPerfil(req.comensal.id, req.body));
});

const cambiarPassword = asyncHandler(async (req, res) => {
  res.json(await comensalesService.cambiarPassword(req.comensal.id, req.body, contexto(req)));
});

const enviarVerificacion = asyncHandler(async (req, res) => {
  res.json(await comensalesService.enviarVerificacion(req.comensal.id, req.ip));
});

const confirmarVerificacion = asyncHandler(async (req, res) => {
  res.json(await comensalesService.confirmarVerificacion(req.comensal.id, req.body.codigo));
});

const eliminar = asyncHandler(async (req, res) => {
  await comensalesService.eliminarCuenta(req.comensal.id, req.body.password);
  res.status(204).send();
});

module.exports = { obtener, actualizar, cambiarPassword, enviarVerificacion, confirmarVerificacion, eliminar };
