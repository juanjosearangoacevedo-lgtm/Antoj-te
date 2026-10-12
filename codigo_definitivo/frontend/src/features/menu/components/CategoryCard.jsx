import { ArrowRight, Utensils } from 'lucide-react';

/**
 * Tarjeta de una categoría en la pantalla de exploración.
 *
 * `previa` decide qué se ve ANTES de entrar (se configura desde el panel):
 *   'imagen'    foto fija del primer plato de la categoría (por defecto)
 *   'video'     el video del plato en bucle, silenciado
 *   'animacion' la foto con un acercamiento lento y continuo
 *   'ninguna'   sin medio: solo el nombre sobre un fondo liso
 */
export default function CategoryCard({ categoria, medio, previa = 'imagen', compacta = false, onSeleccionar }) {
  const conMedio = previa !== 'ninguna' && medio;
  const esVideo = previa === 'video' && medio?.video;
  const imagen = medio?.imagen;

  return (
    <button
      onClick={() => onSeleccionar(categoria)}
      className={`group relative w-full overflow-hidden rounded-card border border-line bg-surface text-left
                  shadow-card active:scale-[0.98] transition-transform duration-fast
                  ${compacta ? 'h-28' : 'h-categoria'}`}
    >
      {conMedio && esVideo && (
        <video
          src={medio.video}
          poster={imagen || undefined}
          muted
          loop
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {conMedio && !esVideo && imagen && (
        <img
          src={imagen}
          alt=""
          loading="lazy"
          className={`absolute inset-0 w-full h-full object-cover ${previa === 'animacion' ? 'previa-animada' : ''}`}
        />
      )}

      {/* Degradado para que el nombre se lea sobre cualquier foto.
          Su intensidad es configurable desde el panel. */}
      {conMedio && (
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black to-transparent"
          style={{ opacity: 'var(--overlay-categoria)' }}
        />
      )}

      <span className="relative z-10 flex h-full flex-col justify-end p-4">
        {!conMedio && (
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-accent-soft text-amber mb-auto">
            <Utensils className="w-5 h-5" />
          </span>
        )}
        <span
          className={`font-display font-bold drop-shadow-sm ${compacta ? 'text-lg' : 'text-2xl'} ${
            conMedio ? 'text-white' : 'text-cream'
          }`}
        >
          {categoria.nombre}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-xs mt-1 ${conMedio ? 'text-white/80' : 'text-muted'}`}
        >
          Ver en video <ArrowRight className="w-3 h-3" />
        </span>
      </span>
    </button>
  );
}
