const bcrypt = require('bcryptjs');
const usuariosModel = require('../models/usuarios.model');
const rolesModel = require('../models/roles.model');
const sesiones = require('./sesiones.service');
const { NotFoundError, ConflictError, ForbiddenError, BadRequestError } = require('../errors');

const RONDAS_BCRYPT = 10;

// Roles que un admin de restaurante puede repartir dentro de su propio equipo.
// 'superadmin' queda fuera A PROPOSITO: es el rol de plataforma.
const ROLES_DE_RESTAURANTE = ['admin_restaurante', 'cocinero', 'mesero'];

// A que tenant queda atado el actor. null = superadmin, que opera sobre toda la
// plataforma; el resto SIEMPRE va acotado a su restaurante.
const tenantDe = (actor) => (actor.role_nombre === 'superadmin' ? null : actor.restaurante_id);

// Un role_id es solo un entero: hay que mirar QUE rol es antes de asignarlo.
// Sin esto, un admin de restaurante se ascendia a superadmin mandando
// {"role_id": 1} y se quedaba con toda la plataforma en el siguiente login.
const asegurarRolAsignable = async (roleId, actor) => {
  if (roleId === undefined || roleId === null) return; // no se toca el rol
  if (actor.role_nombre === 'superadmin') return; // la plataforma reparte lo que quiera

  const rol = await rolesModel.buscarPorId(roleId);
  if (!rol) throw new BadRequestError('El rol indicado no existe');
  if (!ROLES_DE_RESTAURANTE.includes(rol.nombre_rol)) {
    throw new ForbiddenError('No puedes asignar ese rol');
  }
};

const listar = (restauranteId) => usuariosModel.listar(restauranteId);

const crear = async ({ nombre, email, password, role_id, restaurante_id }, actor) => {
  await asegurarRolAsignable(role_id, actor);

  const password_hash = await bcrypt.hash(password, RONDAS_BCRYPT);
  try {
    const id = await usuariosModel.crear({ nombre, email, password_hash, restaurante_id, role_id });
    return usuariosModel.buscarPorId(id, tenantDe(actor));
  } catch (err) {
    if (usuariosModel.esEmailDuplicado(err)) {
      throw new ConflictError('Ya existe un usuario con ese email');
    }
    throw err;
  }
};

const actualizar = async (id, { nombre, email, role_id, password }, actor) => {
  await asegurarRolAsignable(role_id, actor);

  // Sin password nuevo, el hash queda como está (COALESCE en el UPDATE).
  const password_hash = password ? await bcrypt.hash(password, RONDAS_BCRYPT) : null;

  const tenant = tenantDe(actor);
  const actualizados = await usuariosModel.actualizar(
    id,
    { nombre, email, role_id, password_hash },
    tenant
  );
  // Con el UPDATE acotado por tenant, "0 filas" tambien cubre el caso de un
  // usuario de OTRO restaurante: se responde 404 y no 403 para no confirmarle
  // al atacante que ese id existe en otra parte.
  if (actualizados === 0) throw new NotFoundError('Usuario no encontrado');

  // Clave restablecida por un admin, o rol cambiado: las sesiones abiertas de esa
  // persona se cierran. Con el rol es imprescindible, porque el rol viaja DENTRO
  // del token: sin esto, un admin degradado a mesero seguiría siendo admin hasta
  // que su token caducara.
  if (password || (role_id !== undefined && role_id !== null)) await sesiones.revocar(id);

  return usuariosModel.buscarPorId(id, tenant);
};

const eliminar = async (id, actor) => {
  // Borrarse a uno mismo deja al restaurante sin quien administre: se corta
  // aqui porque no hay forma de deshacerlo desde el panel.
  if (Number(id) === Number(actor.id)) {
    throw new BadRequestError('No puedes eliminar tu propio usuario');
  }

  const eliminados = await usuariosModel.eliminar(id, tenantDe(actor));
  if (eliminados === 0) throw new NotFoundError('Usuario no encontrado');
  // Sin fila, su token ya no pasa (sesiones.vigente); se olvida la versión
  // recordada para que el corte sea inmediato y no a los 30 s.
  sesiones.olvidar(id);
};

module.exports = { listar, crear, actualizar, eliminar };
