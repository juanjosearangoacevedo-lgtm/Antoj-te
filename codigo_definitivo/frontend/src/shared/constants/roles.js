// Roles del staff, tal como los devuelve el backend en `usuario.role_nombre`.
// Usar estas constantes en vez de strings sueltos: un typo en 'superadmin'
// no falla, solo deja al usuario fuera de su propia pantalla sin avisar.
export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN_RESTAURANTE: 'admin_restaurante',
  COCINERO: 'cocinero',
  MESERO: 'mesero',
};

// Quien administra desde el panel con sidebar (/admin)
export const ROLES_PANEL = [ROLES.SUPERADMIN, ROLES.ADMIN_RESTAURANTE];

// Quien opera en el piso y va directo a /cocina, sin panel
export const ROLES_OPERACION = [ROLES.COCINERO, ROLES.MESERO];

export const esSuperadmin = (usuario) => usuario?.role_nombre === ROLES.SUPERADMIN;
export const esOperacion = (usuario) => ROLES_OPERACION.includes(usuario?.role_nombre);
