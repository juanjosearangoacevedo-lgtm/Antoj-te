import { request } from '@/shared/services/http';

// Endpoints de acceso que se usan SIN sesión: por eso no van en staffApi, cuyas
// llamadas viajan todas con el JWT.
export const authApi = {
  recuperar: (email) => request('/auth/recuperar', { method: 'POST', body: JSON.stringify({ email }) }),
  restablecer: (token, password) =>
    request('/auth/restablecer', { method: 'POST', body: JSON.stringify({ token, password }) }),
};
