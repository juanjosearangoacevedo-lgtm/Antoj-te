const asyncHandler = require('../middlewares/asyncHandler');
const pagosService = require('../services/pagos.service');
const { resolveRestauranteId } = require('../middlewares/auth');

const resumen = asyncHandler(async (req, res) => {
  res.json(await pagosService.resumen(resolveRestauranteId(req)));
});

const iniciar = asyncHandler(async (req, res) => {
  res.status(201).json(await pagosService.iniciar(resolveRestauranteId(req), req.body.periodo));
});

const consultar = asyncHandler(async (req, res) => {
  res.json(await pagosService.consultar(resolveRestauranteId(req), req.params.transaccionId));
});

// Público: lo llama Wompi. Responde 200 en cuanto el evento está procesado
// (o ignorado por no ser nuestro); cualquier otro código hace que Wompi
// reintente, que es justo lo que se quiere si la base falló.
const eventoWompi = asyncHandler(async (req, res) => {
  await pagosService.procesarEvento(req.body);
  res.json({ ok: true });
});

module.exports = { resumen, iniciar, consultar, eventoWompi };
