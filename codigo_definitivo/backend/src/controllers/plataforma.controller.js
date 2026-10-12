const asyncHandler = require('../middlewares/asyncHandler');
const plataformaService = require('../services/plataforma.service');

const estadisticas = asyncHandler(async (req, res) => {
  res.json(await plataformaService.estadisticas());
});

module.exports = { estadisticas };
