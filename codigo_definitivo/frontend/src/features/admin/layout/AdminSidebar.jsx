import {
  LayoutDashboard,
  Store,
  CreditCard,
  Users,
  ListTree,
  Clapperboard,
  Palette,
  QrCode,
  ChefHat,
  Inbox,
  Lock,
  ChartNoAxesColumn,
  Receipt,
  MessageSquare,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavItem } from '@/shared/components/ui';
import { FEATURES } from '@/shared/constants/features';
import { staffApi } from '@/shared/services/staffApi';
import { LogoAntojate } from '@/shared/components/marca/LogoAntojate';

// Solicitudes que nadie ha tocado. Es lo más parecido a una notificación que hay
// hoy: no existe infraestructura de avisos ni librería de correo, así que sin
// esto el superadmin solo se entera de una solicitud nueva abriendo la pantalla.
function useSolicitudesPendientes(activo) {
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    if (!activo) return undefined;

    let vigente = true;
    const consultar = () =>
      staffApi.solicitudes
        .resumen()
        .then((r) => vigente && setPendientes(Number(r?.nueva) || 0))
        .catch(() => {});

    consultar();
    // Un minuto: quien solicita una cuenta espera horas, no segundos. El KDS
    // consulta cada 5 s porque ahí sí corre prisa; aquí sería gasto sin motivo.
    const id = setInterval(consultar, 60000);
    return () => {
      vigente = false;
      clearInterval(id);
    };
  }, [activo]);

  return pendientes;
}

// Menú lateral del panel. El superadmin administra la plataforma;
// el admin de restaurante administra su propio negocio.
export default function AdminSidebar({ esSuper, hasFeature }) {
  const solicitudesPendientes = useSolicitudesPendientes(esSuper);
  return (
    <aside className="w-full md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-line flex flex-col md:sticky md:top-0 md:h-[100dvh]">
      <div className="px-5 md:px-7 pt-4 md:pt-6 pb-3 md:pb-5">
        <LogoAntojate size="sm" />
        <div className="text-[11px] text-muted mt-1.5">
          {esSuper ? 'Administración global' : 'Panel del restaurante'}
        </div>
      </div>

      <nav className="flex-1 px-3 pb-3 md:pb-0 flex md:flex-col gap-1 md:gap-0 md:space-y-1 overflow-x-auto no-scrollbar">
        {esSuper ? (
          <>
            <NavItem to="/admin" icono={LayoutDashboard}>Dashboard</NavItem>
            <NavItem to="/admin/analiticas" icono={ChartNoAxesColumn}>Analíticas</NavItem>
            <NavItem to="/admin/restaurantes" icono={Store}>Restaurantes</NavItem>
            <NavItem to="/admin/planes" icono={CreditCard}>Planes</NavItem>
            <NavItem to="/admin/solicitudes" icono={Inbox} aviso={solicitudesPendientes}>
              Solicitudes
            </NavItem>
            <NavItem to="/admin/usuarios" icono={Users}>Usuarios</NavItem>
            <NavItem to="/admin/comentarios" icono={MessageSquare}>Comentarios</NavItem>
          </>
        ) : (
          <>
            <NavItem to="/admin" icono={Store}>Mi restaurante</NavItem>
            <NavItem to="/admin/analiticas" icono={ChartNoAxesColumn}>Analíticas</NavItem>
            <NavItem to="/admin/categorias" icono={ListTree}>Categorías</NavItem>
            <NavItem to="/admin/platos" icono={Clapperboard}>Carta y videos</NavItem>
            {hasFeature(FEATURES.APP_PUBLICA) && (
              <NavItem to="/admin/comentarios" icono={MessageSquare}>Comentarios</NavItem>
            )}
            <NavItem to="/admin/personalizacion" icono={Palette}>
              <span className="inline-flex items-center gap-1.5">
                Personalización
                {!hasFeature(FEATURES.PERSONALIZACION) && (
                  <Lock size={12} className="text-muted" aria-label="Requiere mejorar el plan" />
                )}
              </span>
            </NavItem>
            <NavItem to="/admin/mesas" icono={QrCode}>Sucursales y QR</NavItem>
            <NavItem to="/admin/usuarios" icono={Users}>Mi equipo</NavItem>
            <NavItem to="/admin/suscripcion" icono={Receipt}>Suscripción</NavItem>
            {hasFeature(FEATURES.KDS) && <NavItem to="/cocina" icono={ChefHat}>Panel de cocina</NavItem>}
          </>
        )}
      </nav>
    </aside>
  );
}
