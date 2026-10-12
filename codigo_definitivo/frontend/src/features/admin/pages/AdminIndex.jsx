import { useAuth } from '@/features/auth/hooks/useAuth';
import { esSuperadmin } from '@/shared/constants/roles';
import DashboardGlobalPage from '@/features/admin/dashboard/pages/DashboardGlobalPage';
import MiRestaurantePage from '@/features/admin/mi-restaurante/pages/MiRestaurantePage';

// La portada de /admin depende del rol: la plataforma completa para el
// superadmin, el propio restaurante para el administrador.
export default function AdminIndex() {
  const { usuario } = useAuth();
  return esSuperadmin(usuario) ? <DashboardGlobalPage /> : <MiRestaurantePage />;
}
