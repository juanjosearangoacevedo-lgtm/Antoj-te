import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { esSuperadmin } from '@/shared/constants/roles';

// El reverso de SoloSuper: páginas que solo tienen sentido para quien tiene un
// restaurante propio (su suscripción, por ejemplo). El superadmin vuelve a /admin.
export default function SoloRestaurante({ children }) {
  const { usuario } = useAuth();
  if (esSuperadmin(usuario)) return <Navigate to="/admin" replace />;
  return children;
}
