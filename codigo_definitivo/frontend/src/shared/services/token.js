// Token JWT de la sesión del staff (panel admin y cocina).
// El comensal NO usa token: su sesión es anónima y vive en SessionContext.
const TOKEN_KEY = 'bitemo_staff_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
