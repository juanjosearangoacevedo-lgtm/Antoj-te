import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { formatoMoneda } from '@/shared/utils/formato';
import { api } from '@/features/menu/services/menu.api';
import { GRUPOS_MODIFICADORES_DEMO } from '@/features/menu/data/mock';

export default function AddToCartSheet({ plato, onClose, onConfirmar, demoMode }) {
  const [grupos, setGrupos] = useState([]);
  const [seleccion, setSeleccion] = useState({}); // { grupoId: Set(opcionId) }
  const [cantidad, setCantidad] = useState(1);
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!plato) return;
    setCantidad(1);
    setNotas('');
    setSeleccion({});
    if (demoMode) {
      setGrupos(GRUPOS_MODIFICADORES_DEMO[plato.id] || []);
      return;
    }
    api
      .detallePlato(plato.id)
      .then((data) => setGrupos(data.grupos_modificadores || []))
      .catch(() => setGrupos([]));
  }, [plato, demoMode]);

  const toggleOpcion = (grupo, opcionId) => {
    setSeleccion((prev) => {
      const actual = new Set(prev[grupo.id] || []);
      if (actual.has(opcionId)) {
        actual.delete(opcionId);
      } else {
        if (actual.size >= grupo.max_seleccion) {
          if (grupo.max_seleccion === 1) actual.clear();
          else return prev;
        }
        actual.add(opcionId);
      }
      return { ...prev, [grupo.id]: actual };
    });
  };

  const modificadoresPlanos = useMemo(() => {
    const ids = [];
    const detalle = [];
    grupos.forEach((g) => {
      (seleccion[g.id] || []).forEach((optId) => {
        ids.push(optId);
        const opcion = g.opciones.find((o) => o.id === optId);
        if (opcion) detalle.push(opcion);
      });
    });
    return { ids, detalle };
  }, [grupos, seleccion]);

  const precioUnitario =
    Number(plato?.precio || 0) + modificadoresPlanos.detalle.reduce((acc, o) => acc + Number(o.precio_adicional), 0);
  const total = precioUnitario * cantidad;

  if (!plato) return null;

  const gruposIncompletos = grupos.filter(
    (g) => g.es_obligatorio && (seleccion[g.id]?.size || 0) < Math.max(1, g.min_seleccion)
  );

  const handleConfirmar = async () => {
    setEnviando(true);
    try {
      await onConfirmar({
        plato_id: plato.id,
        cantidad,
        notas_instrucciones: notas || null,
        modificadores: modificadoresPlanos.ids,
      });
      onClose();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <BottomSheet open={!!plato} onClose={onClose} title="Personaliza tu plato" maxHeight="86vh">
      <div className="flex items-center gap-3 mb-5 rounded-xl bg-surface2 p-3">
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-black/40 shrink-0">
          <video src={plato.video_url} muted className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <p className="text-cream font-medium truncate">{plato.nombre}</p>
          <p className="text-sm font-mono text-amber-soft">{formatoMoneda(plato.precio)}</p>
        </div>
      </div>

      {grupos.map((g) => (
        <div key={g.id} className="mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <h4 className="text-sm font-semibold text-cream">{g.nombre}</h4>
            <span className="text-[11px] text-muted">
              {g.es_obligatorio ? 'Obligatorio' : 'Opcional'} · máx {g.max_seleccion}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {g.opciones.map((opcion) => {
              const activo = seleccion[g.id]?.has(opcion.id);
              return (
                <button
                  key={opcion.id}
                  onClick={() => toggleOpcion(g, opcion.id)}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors duration-fast ${
                    activo ? 'border-amber bg-accent-soft' : 'border-line bg-surface2'
                  }`}
                >
                  <span className="text-sm text-cream">{opcion.nombre}</span>
                  <span className="text-xs font-mono text-amber-soft">
                    {opcion.precio_adicional > 0 ? `+${formatoMoneda(opcion.precio_adicional)}` : 'Sin costo'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mb-5">
        <h4 className="text-sm font-semibold text-cream mb-2">Instrucciones especiales</h4>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej: sin cebolla, término medio…"
          rows={2}
          className="w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm text-cream placeholder:text-muted focus:border-amber outline-none resize-none"
        />
      </div>

      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-semibold text-cream">Cantidad</span>
        <div className="flex items-center gap-4 rounded-full border border-line bg-surface2 px-3 py-1.5">
          <button
            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            className="grid place-items-center w-7 h-7 rounded-full bg-base text-cream active:scale-90 transition-transform"
            aria-label="Restar"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-5 text-center font-mono text-cream">{cantidad}</span>
          <button
            onClick={() => setCantidad((c) => c + 1)}
            className="grid place-items-center w-7 h-7 rounded-full bg-base text-cream active:scale-90 transition-transform"
            aria-label="Sumar"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <button
        disabled={gruposIncompletos.length > 0 || enviando}
        onClick={handleConfirmar}
        className="w-full rounded-full bg-amber py-4 font-bold text-botontxt disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
      >
        {enviando ? 'Agregando…' : `Agregar · ${formatoMoneda(total)}`}
      </button>
      {gruposIncompletos.length > 0 && (
        <p className="text-center text-xs text-chile mt-2">
          Falta elegir: {gruposIncompletos.map((g) => g.nombre).join(', ')}
        </p>
      )}
    </BottomSheet>
  );
}
