import { useEffect, useRef, useState } from 'react';
import { Heart, Info, Flame, ChefHat, MessageSquareText, Share2, ShoppingBag } from 'lucide-react';
import { formatoMoneda } from '@/shared/utils/formato';

function NivelPicante({ nivel }) {
  if (!nivel) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-chile" aria-label={`Nivel de picante ${nivel}`}>
      {Array.from({ length: Math.min(nivel, 3) }).map((_, i) => (
        <Flame key={i} className="w-3.5 h-3.5" fill="currentColor" />
      ))}
    </span>
  );
}

export default function VideoCard({
  plato,
  isActive,
  isNeighbor,
  registerRef,
  index,
  esFavorito,
  onToggleFavorito,
  onAbrirInfo,
  onAgregarCarrito,
  onVideoStart,
  onVideoComplete,
  onTiempoVisto,
  onAbandonoVideo,
}) {
  const videoRef = useRef(null);
  const [showHeart, setShowHeart] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const lastTapRef = useRef(0);
  const startedRef = useRef(false);
  const completadoRef = useRef(false);
  const watchedSecondsRef = useRef(0);
  const activoRef = useRef(isActive);

  // Fuente del video: HLS adaptativo (Bunny) vía hls.js donde el navegador no lo
  // soporta nativo (Chrome/Android/Firefox). Safari/iOS reproduce HLS nativamente.
  //
  // El import es diferido a propósito: hls.js pesa más que todo el resto del menú
  // junto, y así no lo descarga ni iOS —que nunca lo usa— ni quien solo abre la
  // landing. La variante 'light' deja fuera subtítulos, pistas de audio
  // alternativas y DRM: nada de eso interviene en el video de un plato.
  useEffect(() => {
    const video = videoRef.current;
    const url = plato.video_url;
    if (!video || !url) return undefined;

    const necesitaHls = url.includes('.m3u8') && !video.canPlayType('application/vnd.apple.mpegurl');
    if (!necesitaHls) {
      video.src = url; // HLS nativo (Safari) o MP4/otros formatos directos
      return undefined;
    }

    let hls = null;
    let cancelado = false;

    import('hls.js/light').then(({ default: Hls }) => {
      // El slide pudo desmontarse (o cambiar de plato) mientras llegaba el módulo.
      if (cancelado) return;
      if (!Hls.isSupported()) {
        video.src = url;
        return;
      }
      // "Buena calidad desde el inicio": asumimos buena conexión para que el nivel
      // inicial sea alto (no borroso). NO usamos capLevelToPlayerSize porque mide
      // en píxeles CSS e ignora las pantallas retina (DPR 2-3), lo que dejaba el
      // video en 480p. Bunny tope a 1080p, así que no hay riesgo de gastar de más;
      // si la conexión es lenta, el ABR baja de nivel solo tras medir el ancho real.
      hls = new Hls({
        maxBufferLength: 12,
        abrEwmaDefaultEstimate: 4_000_000, // 4 Mbps
      });
      // Al ser diferido, el módulo puede llegar cuando el slide YA está activo:
      // en ese caso el play() de abajo corrió sin fuente y no hizo nada, así que
      // el arranque tiene que dispararse aquí o el primer video se queda quieto.
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (activoRef.current) video.play()?.catch(() => {});
      });
      hls.loadSource(url);
      hls.attachMedia(video);
    });

    return () => {
      cancelado = true;
      hls?.destroy();
    };
  }, [plato.video_url]);

  useEffect(() => {
    const video = videoRef.current;
    activoRef.current = isActive;
    if (!video) return;

    if (isActive) {
      video.currentTime = 0; // al (re)entrar al slide, siempre desde 0
      setProgreso(0);
      const playPromise = video.play();
      if (playPromise) playPromise.catch(() => {});
      if (!startedRef.current) {
        startedRef.current = true;
        onVideoStart?.();
      }
    } else {
      video.pause();
      if (watchedSecondsRef.current > 0) {
        onTiempoVisto?.(Math.round(watchedSecondsRef.current));
        // Se fue sin llegar al final: eso es lo que separa "lo vio" de "lo dejó",
        // y es la única señal de retención que da el feed.
        if (!completadoRef.current) {
          onAbandonoVideo?.(Math.round(watchedSecondsRef.current));
        }
      }
      video.currentTime = 0;
      startedRef.current = false;
      completadoRef.current = false;
      watchedSecondsRef.current = 0;
      setProgreso(0);
    }
  }, [isActive]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgreso(video.currentTime / video.duration);
    watchedSecondsRef.current = video.currentTime;
  };

  const handleEnded = () => {
    // Solo la PRIMERA vuelta cuenta como completado. El bucle de abajo vuelve a
    // disparar `ended` cada pasada, y sin este freno un plato que alguien dejó
    // sonando acumulaba decenas de "completado" y falseaba el embudo.
    if (!completadoRef.current) {
      completadoRef.current = true;
      onVideoComplete?.();
    }
    // Bucle estilo TikTok/Reels: al terminar, vuelve a empezar desde 0
    const video = videoRef.current;
    if (video && isActive) {
      video.currentTime = 0;
      const p = video.play();
      if (p) p.catch(() => {});
    }
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      triggerLike();
    }
    lastTapRef.current = now;
  };

  const triggerLike = () => {
    if (!esFavorito) onToggleFavorito();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 700);
  };

  return (
    <div
      ref={registerRef}
      data-index={index}
      className="feed-slide flex items-end bg-black overflow-hidden"
      onClick={handleTap}
    >
      {/* Video de fondo. preload="auto" solo si es activo o vecino inmediato, para fluidez sin saturar red */}
      <video
        ref={videoRef}
        poster={plato.video_thumbnail_url || plato.imagen_url || undefined}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        loop={false}
        playsInline
        preload={isActive || isNeighbor ? 'auto' : 'none'}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      {/* Degradados para legibilidad del texto */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40" />

      {/* Barra de progreso del video (fina, arriba) */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/15 z-20">
        <div
          className="h-full bg-amber transition-[width] duration-150 ease-linear"
          style={{ width: `${progreso * 100}%` }}
        />
      </div>

      {/* Corazon de "me gusta" al doble tap */}
      {showHeart && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
          <Heart className="w-28 h-28 text-amber drop-shadow-lg animate-heartburst" fill="currentColor" />
        </div>
      )}

      {/* Columna de acciones (derecha).
          z-30 y no z-20: el bloque de info de abajo es `w-full` y va DESPUÉS en
          el DOM, así que con el mismo z-index ganaba él y se comía los clics del
          icono más bajo de esta columna —el de compartir—. Su `pr-20` aparta el
          texto, pero la caja sigue estando ahí y el relleno transparente también
          recibe toques. Con la columna por encima, da igual cuánto crezca la
          descripción del plato: los iconos siempre reciben el toque. */}
      <div
        className="absolute right-3 bottom-32 z-30 flex flex-col items-center gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <AccionIcono
          icon={<Heart fill={esFavorito ? 'currentColor' : 'none'} />}
          label="Favorito"
          active={esFavorito}
          onClick={onToggleFavorito}
        />
        <AccionIcono icon={<Info />} label="Ingredientes" onClick={() => onAbrirInfo('ingredientes')} />
        {plato.nivel_picante > 0 && (
          <AccionIcono
            icon={<Flame />}
            label="Picante"
            active
            activeColor="text-chile"
            onClick={() => onAbrirInfo('picante')}
          />
        )}
        {plato.recomendado_chef ? (
          <AccionIcono icon={<ChefHat />} label="Del chef" active onClick={() => onAbrirInfo('chef')} />
        ) : null}
        <AccionIcono icon={<MessageSquareText />} label="Descripción" onClick={() => onAbrirInfo('descripcion')} />
        <AccionIcono icon={<Share2 />} label="Compartir" onClick={() => onAbrirInfo('compartir')} />
      </div>

      {/* Info del plato + boton agregar (izquierda/abajo) */}
      <div className="relative z-20 w-full px-4 pb-6 pr-20" onClick={(e) => e.stopPropagation()}>
        {plato.recomendado_chef ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/35 backdrop-blur-sm border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-amber-soft mb-2">
            <ChefHat className="w-3.5 h-3.5" /> Recomendado del chef
          </span>
        ) : null}
        <h2 className="font-display text-2xl font-bold leading-tight text-white drop-shadow-sm">{plato.nombre}</h2>
        <div className="mt-1 flex items-center gap-2.5 text-sm">
          <span className="font-semibold text-white/90 tabular-nums">{formatoMoneda(plato.precio)}</span>
          <NivelPicante nivel={plato.nivel_picante} />
        </div>
        <p className="mt-2 text-sm text-white/75 line-clamp-2 max-w-[85%]">{plato.descripcion}</p>

        {onAgregarCarrito && (
          <button
            onClick={() => onAgregarCarrito(plato)}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber px-5 py-3 font-body font-bold text-base text-botontxt active:scale-95 transition-transform shadow-card"
          >
            <ShoppingBag className="w-5 h-5" /> Agregar
          </button>
        )}
      </div>
    </div>
  );
}

function AccionIcono({ icon, label, onClick, active, activeColor = 'text-amber' }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex flex-col items-center gap-1 text-cream active:scale-90 transition-transform"
    >
      <span
        className={`grid place-items-center w-11 h-11 rounded-full bg-black/35 backdrop-blur-sm border border-white/10 ${
          active ? activeColor : 'text-cream'
        }`}
      >
        {icon}
      </span>
      <span className="text-[10px] font-medium text-cream/80">{label}</span>
    </button>
  );
}
