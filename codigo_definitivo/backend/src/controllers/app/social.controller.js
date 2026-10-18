const asyncHandler = require('../../middlewares/asyncHandler');
const socialService = require('../../services/social.service');
const { quien } = require('./feed.controller');

// La capa social de la app. "Me gusta" y guardados funcionan sin cuenta;
// comentar, reportar y bloquear pasan antes por `exigirComensal`, así que aquí
// `req.comensal` existe siempre que hace falta. El id de la cuenta sale SIEMPRE
// del token, nunca del cuerpo.

const marcarMeGusta = asyncHandler(async (req, res) => {
  res.json(await socialService.meGusta(req.params.id, true, quien(req)));
});

const quitarMeGusta = asyncHandler(async (req, res) => {
  res.json(await socialService.meGusta(req.params.id, false, quien(req)));
});

const guardar = asyncHandler(async (req, res) => {
  res.json(await socialService.guardado(req.body.plato_id, true, quien(req)));
});

const quitarGuardado = asyncHandler(async (req, res) => {
  res.json(await socialService.guardado(req.params.id, false, quien(req)));
});

const comentarios = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  res.json(await socialService.comentarios(req.params.id, { cursor: req.query.cursor }, quien(req)));
});

const comentar = asyncHandler(async (req, res) => {
  res.status(201).json(await socialService.comentar(req.params.id, req.body.texto, quien(req)));
});

const eliminarComentario = asyncHandler(async (req, res) => {
  await socialService.eliminarComentario(req.params.id, quien(req));
  res.status(204).send();
});

const reportar = asyncHandler(async (req, res) => {
  res.status(201).json(await socialService.reportar(req.body, quien(req)));
});

const bloquear = asyncHandler(async (req, res) => {
  res.status(201).json(await socialService.bloquear(req.body, quien(req)));
});

module.exports = {
  marcarMeGusta,
  quitarMeGusta,
  guardar,
  quitarGuardado,
  comentarios,
  comentar,
  eliminarComentario,
  reportar,
  bloquear,
};
