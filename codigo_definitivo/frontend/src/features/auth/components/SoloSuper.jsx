import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { esSuperadmin } from '@/shared/constants/roles';

// Envuelve las páginas que solo existen para el superadmin de la plataforma
// (restaurantes, planes). Un admin de restaurante que llegue por URL vuelve a /admin.
export default function SoloSuper({ children }) {
  const { usuario } = useAuth();
  if (!esSuperadmin(usuario)) return <Navigate to="/admin" replace />;
  return children;
}
