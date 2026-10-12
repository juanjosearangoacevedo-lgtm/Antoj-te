import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import PantallaCargando from '@/shared/components/PantallaCargando';

// Guard genérico para rutas que exigen sesión (ej. /cocina).
// `roles` opcional: si se pasa, además exige que el rol esté en la lista.
export default function RequireAuth({ roles, children }) {
  const { usuario, cargando } = useAuth();

  if (cargando) return <PantallaCargando ancho="max-w-3xl" bloques={1} />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.role_nombre)) return <Navigate to="/admin" replace />;

  return children;
}
