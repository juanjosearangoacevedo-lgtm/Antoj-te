import { request } from './http';

// Endpoints autenticados del panel (superadmin, admin de restaurante y cocina).
// Todas las llamadas viajan con el JWT del staff.
const pedir = (path, options) => request(path, { auth: true, ...options });

const crud = (base) => ({
  listar: (query = '') => pedir(`${base}${query}`),
  obtener: (id) => pedir(`${base}/${id}`),
  crear: (body) => pedir(base, { method: 'POST', body: JSON.stringify(body) }),
  actualizar: (id, body) => pedir(`${base}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  eliminar: (id) => pedir(`${base}/${id}`, { method: 'DELETE' }),
});

export const staffApi = {
  login: (email, password) =>
    pedir('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => pedir('/auth/me'),
  // Cambiar la propia contraseña. El id sale del token, no se manda.
  cambiarPassword: (actual, nueva) =>
    pedir('/auth/password', { method: 'PUT', body: JSON.stringify({ actual, nueva }) }),

  planes: crud('/planes'),
  restaurantes: {
    ...crud('/restaurantes'),
    cambiarEstado: (id, estado) =>
      pedir(`/restaurantes/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }),
    cambiarPlan: (id, plan_id) =>
      pedir(`/restaurantes/${id}/plan`, { method: 'PATCH', body: JSON.stringify({ plan_id }) }),
    // { accion: 'sumar_dias', dias } | { accion: 'fijar_fecha', fecha } |
    // { accion: 'renovar', periodo } | { accion: 'vencer' } | { accion: 'sin_vencimiento' }
    ajustarSuscripcion: (id, cambio) =>
      pedir(`/restaurantes/${id}/suscripcion`, { method: 'PATCH', body: JSON.stringify(cambio) }),
  },
  usuarios: {
    ...crud('/usuarios'),
    // Restablecer la clave de OTRA persona del equipo (no pide la actual: quien
    // la restablece es un admin, no el dueño de la cuenta).
    restablecerPassword: (id, password) =>
      pedir(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify({ password }) }),
  },
  roles: () => pedir('/roles'),
  sucursales: crud('/sucursales'),
  mesas: {
    porSucursal: (sucursalId) => pedir(`/mesas/sucursal/${sucursalId}`),
    crear: (body) => pedir('/mesas', { method: 'POST', body: JSON.stringify(body) }),
    eliminar: (id) => pedir(`/mesas/${id}`, { method: 'DELETE' }),
    regenerarQr: (id) => pedir(`/mesas/${id}/regenerar-qr`, { method: 'POST' }),
  },
  categorias: crud('/categorias'),
  // Insumos del restaurante. Los platos apuntan aquí: el mismo "Queso crema"
  // sirve a diez platos y su marca de alérgeno se corrige en un solo sitio.
  ingredientes: crud('/ingredientes'),
  platos: {
    ...crud('/platos'),
    // Reemplaza la receta completa del plato (no añade: sustituye).
    setIngredientes: (id, ingredientes) =>
      pedir(`/platos/${id}/ingredientes`, { method: 'PUT', body: JSON.stringify({ ingredientes }) }),
    // Pide a Bunny (vía backend) un video nuevo + credencial firmada para subir por TUS
    solicitarSubidaVideo: (titulo) =>
      pedir('/platos/video/solicitar-subida', { method: 'POST', body: JSON.stringify({ titulo }) }),
    // Consulta el estado de transcodificación de un video en Bunny
    estadoVideo: (guid) => pedir(`/platos/video/${guid}/estado`),
  },
  pedidos: {
    listar: (query = '') => pedir(`/pedidos${query}`),
    obtener: (id) => pedir(`/pedidos/${id}`),
    cambiarEstado: (id, estado) =>
      pedir(`/pedidos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }),
  },
  // Llamados de mesa sin atender. Los pinta la misma pantalla que los pedidos.
  llamados: {
    pendientes: (query = '') => pedir(`/llamados${query}`),
    atender: (id) => pedir(`/llamados/${id}/atender`, { method: 'PATCH' }),
  },
  tema: {
    obtener: (query = '') => pedir(`/temas${query}`),
    guardar: (body, query = '') => pedir(`/temas${query}`, { method: 'PUT', body: JSON.stringify(body) }),
  },
  // Suscripción del propio restaurante: resumen, iniciar un pago en Wompi y
  // consultar cómo terminó al volver del checkout.
  pagos: {
    resumen: () => pedir('/pagos'),
    iniciar: (periodo) => pedir('/pagos', { method: 'POST', body: JSON.stringify({ periodo }) }),
    consultar: (transaccionId) => pedir(`/pagos/transaccion/${encodeURIComponent(transaccionId)}`),
  },
  plataforma: {
    estadisticas: () => pedir('/plataforma/estadisticas'),
  },
  // Interesados que llegaron por el formulario de la landing (solo superadmin).
  solicitudes: {
    listar: (query = '') => pedir(`/solicitudes${query}`),
    resumen: () => pedir('/solicitudes/resumen'),
    seguimiento: (id, body) =>
      pedir(`/solicitudes/${id}/seguimiento`, { method: 'PATCH', body: JSON.stringify(body) }),
    // Aprobar CREA el restaurante, su suscripción y el usuario administrador.
    // Por eso no es un estado más de `seguimiento`.
    aprobar: (id, plan_id) =>
      pedir(`/solicitudes/${id}/aprobar`, { method: 'POST', body: JSON.stringify({ plan_id }) }),
    rechazar: (id, motivo) =>
      pedir(`/solicitudes/${id}/rechazar`, { method: 'POST', body: JSON.stringify({ motivo }) }),
  },
  // Todas aceptan ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD. Sin rango, el backend
  // devuelve los últimos 30 días.
  analitica: {
    resumen: (query = '') => pedir(`/analitica/resumen${query}`),
    productos: (query = '') => pedir(`/analitica/productos${query}`),
    actividad: (query = '') => pedir(`/analitica/actividad${query}`),
    plataforma: (query = '') => pedir(`/analitica/plataforma${query}`),
  },
};
