import { useState } from 'react';
import { ChefHat, Clapperboard, Flame, Play } from 'lucide-react';
import { formatoMoneda } from '@/shared/utils/formato';

// Tarjeta de un plato: la miniatura de su video, el nombre y el precio. Al
// tocarla se abre el feed vertical en ese plato. Solo datos de la carta: nada de
// calificaciones ni tiempos que no existen.
export default function TarjetaPlato({ plato, onAbrir, className = '' }) {
  const imagen = plato.video_thumbnail_url || plato.imagen_url;
  // Si la miniatura no existe o no carga, un ícono en vez de un hueco.
  const [fallo, setFallo] = useState(false);
  const picante = Number(plato.nivel_picante) || 0;
  const delChef = Boolean(Number(plato.recomendado_chef)) || plato.recomendado_chef === true;

  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={`${plato.nombre}, ${formatoMoneda(plato.precio)}. Ver en video`}
      className={`overflow-hidden rounded-card border border-line bg-surface text-left transition-transform duration-fast active:scale-[0.98] ${className}`}
    >
      <span className="relative block aspect-[4/5] bg-surface2">
        {imagen && !fallo ? (
          <img
            src={imagen}
            alt=""
            loading="lazy"
            onError={() => setFallo(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-muted">
            <Clapperboard className="h-8 w-8" strokeWidth={1.6} aria-hidden />
          </span>
        )}
        <span className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white">
          <Play className="h-3.5 w-3.5 translate-x-[1px] fill-white" aria-hidden />
        </span>
        <span className="absolute left-2 top-2 flex flex-col items-start gap-1.5">
          {delChef ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f6b931] px-2 py-1 text-[11px] font-bold text-[#2b1b12]">
              <ChefHat className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
              Del chef
            </span>
          ) : null}
          {picante > 0 ? (
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-black/60 px-2 py-1"
              aria-label={`Picante nivel ${picante} de 3`}
            >
              {Array.from({ length: picante }, (_, i) => (
                <Flame key={i} className="h-3 w-3 fill-[#ff8a5c] text-[#ff8a5c]" aria-hidden />
              ))}
            </span>
          ) : null}
        </span>
      </span>
      <span className="block p-3">
        <span className="line-clamp-2 block min-h-[2.5rem] text-sm font-semibold leading-snug text-cream">{plato.nombre}</span>
        <span className="mt-1 block text-sm font-bold text-amber">{formatoMoneda(plato.precio)}</span>
      </span>
    </button>
  );
}
