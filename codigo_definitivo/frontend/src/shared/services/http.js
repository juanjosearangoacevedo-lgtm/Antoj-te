import { getToken, setToken } from './token';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Único punto por donde el frontend habla con el backend.
// `auth: true` adjunta el JWT del staff; las rutas públicas del comensal no lo usan.
export async function request(path, { auth = false, ...options } = {}) {
  const token = auth ? getToken() : null;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  // Un 401 en una petición que llevaba token significa que la sesión ya no vale:
  // caducó, o se revocó (contraseña o rol cambiados, usuario borrado). Seguir en
  // el panel solo produciría errores en cada botón, así que se cierra la sesión
  // y se manda a iniciar sesión. El backend reserva el 401 para eso: un dato mal
  // tecleado con la sesión viva (la contraseña actual, por ejemplo) es un 400.
  //
  // Solo se redirige desde el panel y la cocina: la app consulta /auth/me en
  // cualquier página si hay un token guardado, y quien visita la portada con un
  // token viejo no tiene por qué acabar en el login. Ahí basta con borrarlo.
  if (res.status === 401 && token) {
    setToken(null);
    if (/^\/(admin|cocina)(\/|$)/.test(window.location.pathname)) window.location.assign('/login');
  }

  // 402 = la membresía del restaurante venció con el panel abierto. Se recarga en
  // la pantalla de pago: al volver a pedir /auth/me el panel sabe que está
  // vencida y bloquea lo demás. En la cocina no se redirige (no tiene panel):
  // CocinaPage lo explica con su propio aviso.
  if (res.status === 402 && token && /^\/admin(\/|$)/.test(window.location.pathname)) {
    if (window.location.pathname !== '/admin/suscripcion') window.location.assign('/admin/suscripcion');
  }

  if (!res.ok) {
    const err = new Error(data?.message || `Error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}
