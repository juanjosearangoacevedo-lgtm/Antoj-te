const asyncHandler = require('../middlewares/asyncHandler');
const solicitudesService = require('../services/solicitudes.service');

// Público: lo llama el formulario de la landing, sin sesión.
const crear = asyncHandler(async (req, res) => {
  // req.ip sale del X-Forwarded-For que pone Nginx; sin el 'trust proxy' de
  // app.js llegaría la IP del contenedor y sería la misma para todo el mundo.
  res.status(201).json(await solicitudesService.crear(req.body, req.ip));
});

const listar = asyncHandler(async (req, res) => {
  res.json(await solicitudesService.listar(req.query));
});

const resumen = asyncHandler(async (req, res) => {
  res.json(await solicitudesService.resumen());
});

const actualizarSeguimiento = asyncHandler(async (req, res) => {
  res.json(await solicitudesService.actualizarSeguimiento(req.params.id, req.body));
});

// `req.user` va entero al service: necesita el id para dejar por escrito QUIÉN
// aprobó o rechazó, que es media razón de ser de esta bitácora.
const aprobar = asyncHandler(async (req, res) => {
  res.json(await solicitudesService.aprobar(req.params.id, req.body, req.user));
});

const rechazar = asyncHandler(async (req, res) => {
  res.json(await solicitudesService.rechazar(req.params.id, req.body, req.user));
});

module.exports = { crear, listar, resumen, actualizarSeguimiento, aprobar, rechazar };
