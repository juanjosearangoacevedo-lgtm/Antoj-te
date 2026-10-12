const asyncHandler = require('../middlewares/asyncHandler');
const rolesService = require('../services/roles.service');

const listar = asyncHandler(async (req, res) => {
  res.json(await rolesService.listar());
});

module.exports = { listar };
