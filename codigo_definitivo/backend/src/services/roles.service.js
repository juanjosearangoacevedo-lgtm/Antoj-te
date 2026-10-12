const rolesModel = require('../models/roles.model');

const listar = () => rolesModel.listarTodos();

module.exports = { listar };
