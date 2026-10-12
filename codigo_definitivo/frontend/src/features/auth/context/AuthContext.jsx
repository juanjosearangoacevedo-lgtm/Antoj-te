import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { staffApi } from '@/shared/services/staffApi';
import { getToken, setToken } from '@/shared/services/token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [plan, setPlan] = useState(null);
  const [features, setFeatures] = useState([]);
  const [estadoRestaurante, setEstadoRestaurante] = useState(null);
  const [suscripcion, setSuscripcion] = useState(null);
  const [cargando, setCargando] = useState(true);

  const aplicarSesion = (data) => {
    setUsuario(data.usuario);
    setPlan(data.plan || null);
    setFeatures(data.features || []);
    setEstadoRestaurante(data.estado_restaurante ?? null);
    setSuscripcion(data.suscripcion ?? null);
  };

  useEffect(() => {
    (async () => {
      if (!getToken()) {
        setCargando(false);
        return;
      }
      try {
        aplicarSesion(await staffApi.me());
      } catch {
        setToken(null);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await staffApi.login(email, password);
    setToken(data.token);
    aplicarSesion(data);
    return data.usuario;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUsuario(null);
    setPlan(null);
    setFeatures([]);
    setEstadoRestaurante(null);
    setSuscripcion(null);
  }, []);

  // Vuelve a leer la sesión del backend. Lo usa la pantalla de suscripción tras
  // un pago: la fecha de vencimiento cambió y el aviso del panel debe enterarse.
  const refrescarSesion = useCallback(async () => {
    aplicarSesion(await staffApi.me());
  }, []);

  const hasFeature = useCallback((f) => features.includes(f), [features]);

  const value = useMemo(
    () => ({
      usuario,
      plan,
      features,
      estadoRestaurante,
      suscripcion,
      cargando,
      login,
      logout,
      refrescarSesion,
      hasFeature,
    }),
    [usuario, plan, features, estadoRestaurante, suscripcion, cargando, login, logout, refrescarSesion, hasFeature]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// El hook de lectura vive en features/auth/hooks/useAuth.js
export { AuthContext };
