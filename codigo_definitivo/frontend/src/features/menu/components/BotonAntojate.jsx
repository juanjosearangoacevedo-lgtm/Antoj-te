import { SlidersHorizontal } from 'lucide-react';
import MascotaAntojate from '@/shared/components/marca/MascotaAntojate';

// El botón ANTOJATE del menú: abre la hoja donde el comensal dice qué se le
// antoja, y con eso se filtra la carta. Va con el estilo sticker de la marca
// (borde y sombra dura), pero con los colores del tema del restaurante: la
// sombra es su color de botón, así encaja en cualquier carta personalizada.
export default function BotonAntojate({ activos = 0, onAbrir }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={activos ? `ANTOJATE, ${activos} ${activos === 1 ? 'antojo activo' : 'antojos activos'}` : 'ANTOJATE'}
      className="relative block w-full pr-[5px] pb-[5px] text-left transition-transform duration-fast active:translate-x-[2px] active:translate-y-[2px]"
    >
      <span aria-hidden className="absolute left-[5px] top-[5px] right-0 bottom-0 rounded-full bg-boton" />
      <span className="relative flex h-[72px] items-center gap-3 rounded-full border-2 border-cream bg-surface pl-2 pr-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white">
          <MascotaAntojate expresion="increible" className="w-12" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-2xl font-extrabold leading-none tracking-[0.06em] text-cream">
            ANTOJATE
          </span>
          <span className="mt-1 block truncate text-xs font-semibold text-muted">
            {activos ? 'Toca para cambiar tus antojos' : 'Dinos qué se te antoja'}
          </span>
        </span>
        {activos ? (
          <span className="grid h-[30px] min-w-[30px] place-items-center rounded-full bg-boton px-2 text-sm font-bold text-botontxt">
            {activos}
          </span>
        ) : (
          <SlidersHorizontal className="h-5 w-5 text-cream" aria-hidden />
        )}
      </span>
    </button>
  );
}
