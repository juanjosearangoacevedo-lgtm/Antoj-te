const asyncHandler = require('../../middlewares/asyncHandler');
const comensalesService = require('../../services/comensales.service');

// Acceso del comensal a la app móvil: /api/app/v1/auth.

// De qué teléfono viene la petición: lo guarda la sesión para poder cerrar la de
// un dispositivo concreto. Lo leen las cabeceras (middlewares/comensal.js).
const contexto = (req) => ({ dispositivoId: req.dispositivoId, plataforma: req.plataforma, ip: req.ip });

const registro = asyncHandler(async (req, res) => {
  res.status(201).json(await comensalesService.registrar(req.body, contexto(req)));
});

const login = asyncHandler(async (req, res) => {
  res.json(await comensalesService.iniciarSesion(req.body, contexto(req)));
});

const refresh = asyncHandler(async (req, res) => {
  res.json(await comensalesService.refrescar(req.body.refresh_token, contexto(req)));
});

const logout = asyncHandler(async (req, res) => {
  await comensalesService.cerrarSesion(req.body.refresh_token);
  res.status(204).send();
});

// Responde lo mismo exista o no la cuenta; el envío ocurre en segundo plano.
const recuperar = asyncHandler(async (req, res) => {
  res.json(comensalesService.solicitarRecuperacion(req.body.email, req.ip));
});

const restablecer = asyncHandler(async (req, res) => {
  res.json(await comensalesService.restablecer(req.body, contexto(req)));
});

module.exports = { registro, login, refresh, logout, recuperar, restablecer };
