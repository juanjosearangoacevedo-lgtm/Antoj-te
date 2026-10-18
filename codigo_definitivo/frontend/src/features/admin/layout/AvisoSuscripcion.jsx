import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';

// Aviso de membresía: se muestra cuando la suscripción del restaurante está
// vencida o próxima a vencer (7 días o menos). El superadmin no lo ve.
export default function AvisoSuscripcion() {
  const { suscripcion } = useAuth();
  const { pathname } = useLocation();
  // En la propia pantalla de pago sobra: ahí ya está todo lo que el aviso diría.
  if (pathname === '/admin/suscripcion') return null;
  if (!suscripcion || (!suscripcion.vencida && !suscripcion.por_vencer)) return null;

  const { vencida, dias_restantes, gracia_hasta, carta_apagada } = suscripcion;
  const Icono = vencida ? AlertTriangle : Clock;
  const fechaGracia = gracia_hasta
    ? new Date(String(gracia_hasta).replace(' ', 'T')).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
    : null;

  const texto = vencida
    ? carta_apagada
      ? 'Tu membresía está vencida y tu carta pública ya no se ve. Renueva para volver a atender por Antojate.'
      : `Tu membresía está vencida. Tu carta sigue visible para tus clientes${
          fechaGracia ? ` hasta el ${fechaGracia}` : ' unos días más'
        }: renueva antes para no dejarlos sin menú.`
    : dias_restantes === 0
    ? 'Tu membresía vence hoy. Renueva para no perder el servicio.'
    : `Tu membresía vence en ${dias_restantes} día${dias_restantes === 1 ? '' : 's'}. Renuévala para no perder el servicio.`;

  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-xl px-4 py-3 mb-5 text-sm ${
        vencida ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-amber-soft'
      }`}
    >
      <Icono size={16} className="shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold">{vencida ? 'Membresía vencida' : 'Membresía por vencer'}</span>
        <p className="opacity-90 mt-0.5">{texto}</p>
        <Link to="/admin/suscripcion" className="inline-block mt-2 text-xs font-semibold underline underline-offset-2">
          Renovar ahora
        </Link>
      </div>
    </div>
  );
}
