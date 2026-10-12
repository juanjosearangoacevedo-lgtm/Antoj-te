import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
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
      {/* Barra superior flotante, se atenua durante el scroll para maxima inmersion */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-4 pb-8 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${
          showChrome ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          onClick={onVolver}
          className="grid place-items-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-cream active:scale-90 transition-transform"
          aria-label="Volver a categorías"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-lg text-cream">{categoriaNombre}</h1>
        <button
          onClick={onVolver}
          className="grid place-items-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-cream active:scale-90 transition-transform"
          aria-label="Buscar"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      <div className="feed" onScroll={handleScroll}>
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
