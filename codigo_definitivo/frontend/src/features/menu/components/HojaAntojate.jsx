import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import MascotaAntojate from '@/shared/components/marca/MascotaAntojate';
import { filtrar } from '@/features/menu/logica/antojos';
import ChipAntojo from './ChipAntojo';

// La hoja que abre el botón ANTOJATE. El comensal marca lo que se le antoja y,
// mientras elige, el botón de abajo le dice cuántos platos de la carta coinciden;
// al confirmar, la carta se filtra. Cerrar sin confirmar descarta lo marcado.
// Las opciones sin datos detrás van al final, marcadas como "Pronto".
export default function HojaAntojate({ abierta, grupos, platos, seleccion, onAplicar, onCerrar }) {
  const [borrador, setBorrador] = useState(seleccion);

  // Cada vez que se abre, parte de lo que ya estaba elegido.
  useEffect(() => {
    if (abierta) setBorrador(seleccion);
  }, [abierta, seleccion]);

  // Escape cierra, como cualquier diálogo.
  useEffect(() => {
    if (!abierta) return undefined;
    const alTeclear = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierta, onCerrar]);

  const total = useMemo(() => filtrar(platos, borrador).length, [platos, borrador]);
  if (!abierta) return null;

  const alternar = (id) => setBorrador((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id]));
  const disponibles = grupos.filter((g) => !g.pronto);
  const pronto = grupos.filter((g) => g.pronto);
  const sinCoincidencias = borrador.length > 0 && total === 0;
  const tituloAccion = !borrador.length
    ? `Ver toda la carta (${total})`
    : total
      ? `Ver ${total} ${total === 1 ? 'plato' : 'platos'}`
      : 'Ningún plato coincide';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onCerrar} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-antojate"
        className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-line bg-base shadow-sheet animate-ticketIn sm:max-w-md"
      >
        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-10 rounded-full bg-line" />
        </div>

        <div className="flex items-center gap-3 px-5 pb-2 pt-3">
          <MascotaAntojate expresion="curioso" className="w-14 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 id="titulo-antojate" className="font-display text-2xl font-bold leading-tight text-cream">
              ¿Qué se te antoja?
            </h2>
            <p className="text-xs text-muted">Elige lo que quieras y te mostramos los platos.</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface2 text-cream transition-transform active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-5 py-3">
          {disponibles.map((grupo) => (
            <section key={grupo.id} className="space-y-2">
              <h3 className="text-sm font-semibold text-cream">{grupo.titulo}</h3>
              <div className="flex flex-wrap gap-2">
                {grupo.opciones.map((o) => (
                  <ChipAntojo key={o.id} etiqueta={o.etiqueta} activo={borrador.includes(o.id)} onClick={() => alternar(o.id)} />
                ))}
              </div>
            </section>
          ))}

          {pronto.length ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[11px] font-bold tracking-[0.14em] text-muted">MUY PRONTO</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <p className="text-xs leading-relaxed text-muted">
                Para buscar por ocasión, dieta o plan, el restaurante tiene que etiquetar sus platos. Las activamos en
                cuanto lo haga.
              </p>
              {pronto.map((grupo) => (
                <section key={grupo.id} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted">{grupo.titulo}</h3>
                  <div className="flex flex-wrap gap-2">
                    {grupo.opciones.map((o) => (
                      <ChipAntojo key={o.id} etiqueta={o.etiqueta} pronto />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-line px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={() => setBorrador([])}
            disabled={!borrador.length}
            className="h-12 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-cream transition-transform active:scale-95 disabled:opacity-40"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={() => onAplicar(borrador)}
            disabled={sinCoincidencias}
            className="h-12 flex-1 rounded-full bg-boton px-5 text-sm font-bold text-botontxt transition-transform active:scale-95 disabled:opacity-40"
          >
            {tituloAccion}
          </button>
        </div>
      </div>
    </div>
  );
}
