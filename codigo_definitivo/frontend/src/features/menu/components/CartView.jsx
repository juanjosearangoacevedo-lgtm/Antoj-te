import { useState } from 'react';
import { ArrowLeft, Minus, Plus, Trash2, Receipt } from 'lucide-react';
import { formatoMoneda } from '@/shared/utils/formato';

export default function CartView({ carrito, mesa, onVolver, onActualizarCantidad, onEliminar, onEnviarPedido }) {
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);
  const detalles = carrito?.detalles || [];
  const total = carrito?.total || 0;

  const handleEnviar = async () => {
    setEnviando(true);
    try {
      await onEnviarPedido(observaciones);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-base flex flex-col animate-risein">
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button
          onClick={onVolver}
          className="grid place-items-center w-10 h-10 rounded-full bg-surface border border-line text-cream active:scale-90 transition-transform"
          aria-label="Volver al menú"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-2xl text-cream">Mi Carrito</h1>
      </div>

      <div className="px-5 flex-1 overflow-y-auto pb-4">
        {/* Comanda / ticket */}
        <div className="rounded-2xl bg-surface border border-line overflow-hidden shadow-card">
          <div className="ticket-edge bg-surface" />
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber" />
              <span className="font-mono text-xs uppercase tracking-wider text-muted">Mesa {mesa?.numero_mesa}</span>
            </div>
            <span className="font-mono text-xs text-muted">{detalles.length} productos</span>
          </div>

          {detalles.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-cream/70 text-sm">Tu carrito está vacío.</p>
              <p className="text-muted text-xs mt-1">Vuelve al menú y agrega algo delicioso.</p>
            </div>
          ) : (
            <div className="ticket-dashed mx-5 mt-2">
              {detalles.map((d) => (
                <div key={d.id} className="ticket-dashed first:border-t-0 py-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-cream truncate">
                      {d.plato_nombre || d.combo_nombre}
                    </p>
                    {d.modificadores?.length > 0 && (
                      <p className="text-[11px] text-muted mt-0.5">
                        {d.modificadores.map((m) => m.nombre).join(', ')}
                      </p>
                    )}
                    {d.notas_instrucciones && (
                      <p className="text-[11px] text-amber-soft italic mt-0.5">"{d.notas_instrucciones}"</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => onActualizarCantidad(d, Math.max(1, d.cantidad - 1))}
                        className="grid place-items-center w-6 h-6 rounded-full bg-surface2 text-cream active:scale-90 transition-transform"
                        aria-label="Restar"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-4 text-center font-mono text-xs text-cream">{d.cantidad}</span>
                      <button
                        onClick={() => onActualizarCantidad(d, d.cantidad + 1)}
                        className="grid place-items-center w-6 h-6 rounded-full bg-surface2 text-cream active:scale-90 transition-transform"
                        aria-label="Sumar"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onEliminar(d)}
                        className="ml-2 text-muted active:scale-90 transition-transform"
                        aria-label="Quitar del carrito"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <span className="font-mono text-sm text-amber-soft shrink-0">{formatoMoneda(d.precio_linea)}</span>
                </div>
              ))}
            </div>
          )}

          {detalles.length > 0 && (
            <>
              <div className="px-5 pt-4">
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Observaciones para cocina (opcional)"
                  rows={2}
                  className="w-full rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-cream placeholder:text-muted focus:border-amber outline-none resize-none"
                />
              </div>
              <div className="ticket-dashed mx-5 mt-4 pt-3 pb-5 flex items-center justify-between">
                <span className="font-display text-lg text-cream">Total</span>
                <span className="font-mono text-lg font-bold text-amber-soft">{formatoMoneda(total)}</span>
              </div>
            </>
          )}
          <div className="ticket-edge bg-surface rotate-180" />
        </div>
      </div>

      {detalles.length > 0 && (
        <div className="px-5 pb-8 pt-2">
          <button
            onClick={handleEnviar}
            disabled={enviando}
            className="w-full rounded-full bg-amber py-4 font-bold text-botontxt disabled:opacity-50 active:scale-[0.98] transition-transform shadow-card"
          >
            {enviando ? 'Enviando…' : 'Enviar pedido a cocina'}
          </button>
        </div>
      )}
    </div>
  );
}
