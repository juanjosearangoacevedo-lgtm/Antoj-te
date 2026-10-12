import { Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import PantallaCargando from '@/shared/components/PantallaCargando';
import { esOperacion, esSuperadmin } from '@/shared/constants/roles';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AvisoSuscripcion from './AvisoSuscripcion';

// Espera de una sección mientras llega su trozo de código. Ocupa el ancho del
// contenido, no la pantalla: el marco del panel ya está pintado alrededor.
function EsperaSeccion() {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando sección">
      <div className="skeleton h-6 w-48" />
      <div className="skeleton h-24 w-full" />
      <div className="skeleton h-24 w-full" />
    </div>
  );
}

// Plantilla común de todo el panel administrativo: sidebar + topbar + contenido.
// Cocineros y meseros no tienen panel: van directo a /cocina.
export default function AdminLayout() {
  const { usuario, plan, cargando, logout, hasFeature, suscripcion } = useAuth();
  const { pathname } = useLocation();

  // Va antes de los returns: los hooks no pueden quedar detrás de un condicional.
  useTituloPagina('Panel · Bitemo');

  if (cargando) return <PantallaCargando />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (esOperacion(usuario)) return <Navigate to="/cocina" replace />;

  const esSuper = esSuperadmin(usuario);

  // Membresía vencida: el backend rechaza todo salvo el pago, así que cualquier
  // sección llevaría a una pantalla llena de errores. Se manda a Suscripción,
  // que es la única que sirve para salir de ahí.
  if (!esSuper && suscripcion?.vencida && pathname !== '/admin/suscripcion') {
    return <Navigate to="/admin/suscripcion" replace />;
  }

  return (
    <div className="superficie-plataforma min-h-[100dvh] bg-base flex flex-col md:flex-row">
      <AdminSidebar esSuper={esSuper} hasFeature={hasFeature} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader usuario={usuario} plan={plan} esSuper={esSuper} onLogout={logout} />

        <main className="p-4 md:p-8 max-w-6xl w-full">
          <AvisoSuscripcion />
          {/* Cada sección del panel llega en su propio trozo. La espera va aquí
              y no en el router para que solo se repinte el contenido: el
              sidebar y la cabecera se quedan quietos al cambiar de sección. */}
          <Suspense fallback={<EsperaSeccion />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
