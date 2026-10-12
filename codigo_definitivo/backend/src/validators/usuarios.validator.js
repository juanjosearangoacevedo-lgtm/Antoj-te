const { z, id, idOpcional, texto, passwordNueva } = require('./comunes');

const OBLIGATORIOS = 'nombre, email, password y role_id son obligatorios';

const crear = z.object({
  nombre: z.string({ error: OBLIGATORIOS }).trim().min(1, OBLIGATORIOS).max(255),
  email: z.string({ error: OBLIGATORIOS }).trim().min(1, OBLIGATORIOS).email('El email no tiene un formato valido'),
  password: passwordNueva,
  role_id: id,
  // Solo lo usa el superadmin al crear el admin de un restaurante.
  restaurante_id: idOpcional,
});

const actualizar = z.object({
  nombre: texto('nombre').optional(),
  email: z.string().trim().email('El email no tiene un formato valido').optional(),
  password: passwordNueva.optional(),
  role_id: id.optional(),
});

module.exports = { crear, actualizar };
