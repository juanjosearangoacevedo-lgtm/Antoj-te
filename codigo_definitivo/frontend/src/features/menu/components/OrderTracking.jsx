import { useEffect, useState } from 'react';
import { CheckCircle2, ChefHat, Bell, PartyPopper, Soup } from 'lucide-react';
import { api } from '@/features/menu/services/menu.api';
import { formatoMoneda } from '@/shared/utils/formato';

const PASOS = [
  { estado: 'Recibido', label: 'Recibido', icon: CheckCircle2 },
  { estado: 'En Preparación', label: 'En Preparación', icon: ChefHat },
  { estado: 'Listo', label: 'Listo', icon: Soup },
  { estado: 'Entregado', label: '¡Disfrútalo!', icon: PartyPopper },
];

const MENSAJES = {
  Recibido: 'Tu pedido llegó a cocina.',
  'En Preparación': 'Tu pedido está en preparación.',
  Listo: 'Tu pedido está listo, en camino a tu mesa.',
  Entregado: '¡Buen provecho!',
};

export default function OrderTracking({ pedidoInicial, mesa, sesionToken, demoMode, onVolverAlMenu }) {
  const [pedido, setPedido] = useState(pedidoInicial);

  useEffect(() => {
    if (demoMode) {
      // Simulacion de avance de estados en modo demo, para previsualizar la experiencia completa
      const secuencia = ['Recibido', 'En Preparación', 'Listo', 'Entregado'];
      let i = 0;
      const t = setInterval(() => {
        i += 1;
        if (i >= secuencia.length) {
          clearInterval(t);
          return;
        }
        setPedido((p) => ({ ...p, estado: secuencia[i] }));
      }, 4000);
      return () => clearInterval(t);
    }

    const interval = setInterval(async () => {
      try {
        const pedidos = await api.misPedidos(sesionToken);
        const actualizado = pedidos.find((p) => p.id === pedidoInicial.id);
        if (actualizado) setPedido(actualizado);
      } catch {
        /* silencioso */
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [demoMode, sesionToken, pedidoInicial]);

  const pasoActualIndex = PASOS.findIndex((p) => p.estado === pedido.estado);

  return (
    <div className="min-h-[100dvh] bg-base px-5 pt-8 pb-10 flex flex-col animate-risein">
      <p className="text-xs uppercase tracking-wider text-muted font-semibold">Mesa {mesa?.numero_mesa}</p>
      <h1 className="font-display text-3xl text-cream mt-1 mb-8">Seguimiento del pedido</h1>

      {/* Timeline horizontal */}
      <div className="flex items-center justify-between mb-3 px-1">
        {PASOS.map((paso, i) => {
          const Icon = paso.icon;
          const completado = i <= pasoActualIndex;
          const actual = i === pasoActualIndex;
          return (
            <div key={paso.estado} className="flex flex-col items-center gap-2 flex-1">
              <div
                className={`grid place-items-center w-11 h-11 rounded-full border-2 transition-colors ${
                  completado ? 'border-ok bg-ok-soft text-ok' : 'border-line bg-surface text-muted'
                } ${actual ? 'animate-pulsedot' : ''}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[11px] text-center leading-tight ${completado ? 'text-cream' : 'text-muted'}`}>
                {paso.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="relative h-1 rounded-full bg-line mx-6 mb-8 -mt-9 -z-0">
        <div
          className="h-full rounded-full bg-ok transition-[width] duration-700"
          style={{ width: `${(pasoActualIndex / (PASOS.length - 1)) * 100}%` }}
        />
      </div>

      {/* Ticket de notificacion actual */}
      <div className="rounded-2xl border border-line bg-surface p-5 flex items-center gap-4 mb-6">
        <div className="grid place-items-center w-11 h-11 rounded-full bg-accent-soft text-amber shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-cream">Mesa {mesa?.numero_mesa}</p>
          <p className="text-sm text-muted">{MENSAJES[pedido.estado]}</p>
        </div>
      </div>

      {/* Resumen tipo comanda */}
      <div className="rounded-2xl border border-line bg-surface overflow-hidden">
        <div className="ticket-edge bg-surface" />
        <div className="px-5 py-4 flex items-center justify-between">
          <span className="font-mono text-xs text-muted">Pedido #{pedido.id}</span>
          <span className="font-mono text-sm font-bold text-amber-soft">{formatoMoneda(pedido.total)}</span>
        </div>
        <div className="ticket-edge bg-surface rotate-180" />
      </div>

      <button
        onClick={onVolverAlMenu}
        className="mt-auto w-full rounded-full border border-line py-4 font-semibold text-cream active:scale-[0.98] transition-transform"
      >
        Seguir explorando el menú
      </button>
    </div>
  );
}
