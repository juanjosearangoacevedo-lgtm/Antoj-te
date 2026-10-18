const asyncHandler = require('../../middlewares/asyncHandler');
const feedService = require('../../services/feed.service');
const eventosService = require('../../services/eventosApp.service');

// El feed de la app: /api/app/v1/feed, /platos/:id, /guardados y /eventos.
//
// Quien pregunta es la cuenta (si mandó token) o el teléfono (X-Dispositivo). No
// exige cuenta: sin ella las respuestas son las mismas, solo que "me gusta" y
// guardados son los del teléfono.
const quien = (req) => ({
  comensalId: req.comensal?.id ?? null,
  dispositivoId: req.dispositivoId,
  plataforma: req.plataforma,
});

// Las respuestas llevan lo que marcó quien pregunta: ningún intermediario
// debe guardarlas ni servírselas a otro.
const privado = (res) => res.set('Cache-Control', 'private, no-store');

const pagina = asyncHandler(async (req, res) => {
  const { antojo, cursor, limite } = req.query;
  privado(res).json(await feedService.pagina({ antojos: antojo, cursor, limite }, quien(req)));
});

const conteo = asyncHandler(async (req, res) => {
  res.json(await feedService.conteo({ antojos: req.query.antojo }));
});

const opciones = asyncHandler(async (req, res) => {
  res.json(await feedService.opciones());
});

const plato = asyncHandler(async (req, res) => {
  privado(res).json(await feedService.plato(req.params.id, quien(req)));
});

const guardados = asyncHandler(async (req, res) => {
  privado(res).json(await feedService.guardados(quien(req)));
});

const eventos = asyncHandler(async (req, res) => {
  await eventosService.registrar(req.body.eventos, quien(req));
  res.status(204).send();
});

module.exports = { pagina, conteo, opciones, plato, guardados, eventos, quien };
