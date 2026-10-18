import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronsUp, Search } from 'lucide-react';
import { useActiveSlide } from '@/features/menu/hooks/useActiveSlide';
import VideoCard from './VideoCard';

export default function VideoFeed({
  platos,
  categoriaNombre,
  favoritosIds,
  onVolver,
  onToggleFavorito,
  onAbrirInfo,
  onAgregarCarrito,
  registrarEvento,
  platoInicialId,
}) {
  const { activeIndex, setRef, irA } = useActiveSlide(platos.length);
  const [showChrome, setShowChrome] = useState(true);
  // La pista de que se desliza, hasta que la persona lo hace la primera vez. Se
  // escuchan el dedo, la rueda y el teclado, no el scroll: el salto al plato
  // inicial también mueve el scroll y apagaría la pista antes de verla.
  const [deslizo, setDeslizo] = useState(false);
  const marcarDeslizo = () => setDeslizo(true);

  // Entrada por enlace compartido: el feed abre en ese plato en vez del primero.
  // Va en un efecto y no en el render porque necesita los nodos ya montados.
  //
  // Se aplica UNA vez: después el comensal navega con el dedo y volver a
  // saltar al plato del enlace en cada render sería pelearse con él.
  const saltoAplicado = useRef(false);
  useEffect(() => {
    if (saltoAplicado.current || !platoInicialId || !platos.length) return;
    saltoAplicado.current = true;
    const i = platos.findIndex((p) => String(p.id) === String(platoInicialId));
    // El índice 0 ya es donde arranca el scroll: moverlo no aporta nada.
    if (i > 0) irA(i);
    // `platos.length` y no `platos`: la lista se recalcula en cada render del
    // padre y su identidad cambia siempre, aunque el contenido sea el mismo.
  }, [platoInicialId, platos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const activoRef = useMemo(() => platos[activeIndex], [platos, activeIndex]);

  const handleScroll = () => {
    setShowChrome(false);
    clearTimeout(handleScroll._t);
    handleScroll._t = setTimeout(() => setShowChrome(true), 900);
  };

  return (
    <div className="relative h-[100dvh] bg-black">
      {/* Volver, siempre a mano: también mientras se desliza. El resto de la barra
          se aparta durante el scroll; este botón solo se vuelve más discreto, para
          poder salir en cualquier momento sin esperar a que la barra regrese. */}
      <button
        onClick={onVolver}
        className={`absolute left-4 top-4 z-40 grid place-items-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-cream active:scale-90 transition duration-300 ${
          showChrome ? 'opacity-100' : 'opacity-60'
        }`}
        aria-label="Volver"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Barra superior flotante, se atenua durante el scroll para maxima inmersion.
          Oculta no recibe toques: un toque sobre el video no debe salir del feed. */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-4 pb-8 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${
          showChrome ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {/* El hueco del botón de volver, que va fuera de la barra. */}
        <span className="w-10 h-10 shrink-0" aria-hidden />
        <div className="min-w-0 px-2 text-center">
          <h1 className="truncate font-display text-lg text-cream">{categoriaNombre}</h1>
          {platos.length > 1 && (
            <p className="text-[11px] font-semibold text-white/80" aria-hidden>
              {Math.min(activeIndex + 1, platos.length)} de {platos.length}
            </p>
          )}
        </div>
        <button
          onClick={onVolver}
          className="grid place-items-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-cream active:scale-90 transition-transform"
          aria-label="Buscar"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {!deslizo && platos.length > 1 && activeIndex < platos.length - 1 && (
        <div className="pointer-events-none absolute left-1/2 top-[5.5rem] z-30 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-boton px-3 py-1.5 text-xs font-semibold text-botontxt shadow-card">
            <ChevronsUp className="h-4 w-4" aria-hidden />
            Desliza hacia arriba para el siguiente
          </span>
        </div>
      )}

      <div
        className="feed"
        onScroll={handleScroll}
        onTouchMove={marcarDeslizo}
        onWheel={marcarDeslizo}
        onKeyDown={marcarDeslizo}
      >
        {platos.map((plato, index) => (
          <VideoCard
            key={plato.id}
            index={index}
            plato={plato}
            isActive={index === activeIndex}
            isNeighbor={Math.abs(index - activeIndex) === 1}
            registerRef={setRef(index)}
            esFavorito={favoritosIds.has(plato.id)}
            onToggleFavorito={() => onToggleFavorito(plato)}
            onAbrirInfo={(tipo) => onAbrirInfo(plato, tipo)}
            onAgregarCarrito={onAgregarCarrito}
            onVideoStart={() => registrarEvento({ plato_id: plato.id, tipo_evento: 'video_start' })}
            onVideoComplete={() => registrarEvento({ plato_id: plato.id, tipo_evento: 'video_complete' })}
            onTiempoVisto={(segundos) =>
              registrarEvento({ plato_id: plato.id, tipo_evento: 'tiempo_visto', tiempo_segundos: segundos })
            }
            onAbandonoVideo={(segundos) =>
              registrarEvento({ plato_id: plato.id, tipo_evento: 'abandono_video', tiempo_segundos: segundos })
            }
          />
        ))}

        {/* Cierre del feed: invita a seguir explorando otras categorias */}
        <div className="feed-slide flex flex-col items-center justify-center bg-surface text-center px-8">
          <p className="font-display text-2xl text-cream mb-2">Eso es todo por ahora</p>
          <p className="text-muted text-sm mb-6">Explora otra categoría o revisa tu carrito.</p>
          <button
            onClick={onVolver}
            className="rounded-full bg-amber px-6 py-3 font-bold text-botontxt active:scale-95 transition-transform"
          >
            Ver más categorías
          </button>
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        {activoRef?.nombre}
      </div>
    </div>
  );
}
