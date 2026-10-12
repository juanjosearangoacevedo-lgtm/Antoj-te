const asyncHandler = require('../middlewares/asyncHandler');
const carritoService = require('../services/carrito.service');

const obtenerCarrito = asyncHandler(async (req, res) => {
  res.json(await carritoService.obtenerCarrito(req.params.token, req.params.sesionToken));
});

const agregarItem = asyncHandler(async (req, res) => {
  res.status(201).json(await carritoService.agregarItem(req.params.token, req.body));
});

const actualizarItem = asyncHandler(async (req, res) => {
  await carritoService.actualizarItem(req.params.detalleId, req.body);
  res.json({ ok: true });
});

// El `sesion_token` viaja en el cuerpo, no en la URL: es lo que identifica al
// comensal y los servidores registran las rutas completas en su bitacora.
const eliminarItem = asyncHandler(async (req, res) => {
  await carritoService.eliminarItem(req.params.detalleId, req.body?.sesion_token);
  res.status(204).send();
});

const checkout = asyncHandler(async (req, res) => {
  res.status(201).json(await carritoService.checkout(req.params.token, req.body));
});

module.exports = { obtenerCarrito, agregarItem, actualizarItem, eliminarItem, checkout };
