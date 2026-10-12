const asyncHandler = require('../middlewares/asyncHandler');
const restaurantesService = require('../services/restaurantes.service');

const listar = asyncHandler(async (req, res) => {
  res.json(await restaurantesService.listar());
});

const obtener = asyncHandler(async (req, res) => {
  const id = req.user.role_nombre === 'superadmin' ? req.params.id : req.user.restaurante_id;
  res.json(await restaurantesService.obtener(id));
});

const crear = asyncHandler(async (req, res) => {
  res.status(201).json(await restaurantesService.crear(req.body));
});

const actualizar = asyncHandler(async (req, res) => {
  const esSuperadmin = req.user.role_nombre === 'superadmin';
  const id = esSuperadmin ? req.params.id : req.user.restaurante_id;
  // El admin del restaurante solo puede editar su información básica, no su plan ni su estado.
  // `moneda` faltaba en esta lista: el panel tenía su selector y el model sabía
  // guardarla, pero se perdía justo aquí y no se guardaba nunca.
  const { nombre, logo_url, moneda, slug, descripcion, ciudad } = req.body;
  const plan_id = esSuperadmin ? req.body.plan_id : undefined;
  const estado = esSuperadmin ? req.body.estado : undefined;
  res.json(
    await restaurantesService.actualizar(id, {
      nombre,
      logo_url,
      moneda,
      slug,
      descripcion,
      ciudad,
      plan_id,
      estado,
    })
  );
});

const cambiarEstado = asyncHandler(async (req, res) => {
  res.json(await restaurantesService.cambiarEstado(req.params.id, req.body.estado));
});

const cambiarPlan = asyncHandler(async (req, res) => {
  res.json(await restaurantesService.cambiarPlan(req.params.id, req.body.plan_id));
});

const eliminar = asyncHandler(async (req, res) => {
  await restaurantesService.eliminar(req.params.id);
  res.status(204).send();
});

const ajustarSuscripcion = asyncHandler(async (req, res) => {
  res.json(await restaurantesService.ajustarSuscripcion(req.params.id, req.body));
});

module.exports = {
  ajustarSuscripcion, listar, obtener, crear, actualizar, cambiarEstado, cambiarPlan, eliminar };
