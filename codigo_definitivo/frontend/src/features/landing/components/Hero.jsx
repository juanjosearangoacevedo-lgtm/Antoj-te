import { QrCode, Play, Heart, Info, Share2, ShoppingBag, Clapperboard, BarChart3 } from 'lucide-react';
import { Btn } from '@/shared/components/ui';
import { BitemoIsotipo } from './marca/BitemoLogo';
import MascotaBitemo from './marca/MascotaBitemo';
import { DEMO_LINK_PROPS, VIDEO_DEMO } from '@/features/landing/contenido/demo';
import { HERO } from '@/features/landing/contenido/landing';

// Los tres pilares del manual de marca, recortados a lo que la plataforma
// ya hace hoy. El texto vive en contenido/landing.js; aquí solo su icono.
const ICONOS = { video: Clapperboard, pedido: ShoppingBag, analitica: BarChart3 };

const PILARES = HERO.pilares.map((pilar) => ({ ...pilar, icono: ICONOS[pilar.clave] }));

// El H1 se parte en tres para pintar el trozo destacado en naranja sin repetir
// la frase: el HTML estático del build recibe HERO.h1 entero y limpio.
const [ANTES, DESPUES] = HERO.h1.split(HERO.destacado);

const ACCIONES_FEED = [Heart, Info, Share2];

export default function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-5 pt-14 pb-24 md:pt-20 md:pb-28">
      <div className="grid gap-16 lg:gap-12 lg:grid-cols-[1.1fr_.9fr] items-center">
        <div className="text-center lg:text-left">
          <span className="chip-marca inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-semibold uppercase tracking-[0.24em] mb-6">
            <QrCode size={14} />
            {HERO.etiqueta}
          </span>

          {/* El H1 carga el término que buscamos posicionar ("menú digital…
              restaurante") sin perder el gancho de marca. Sin <br/>: es largo y
              un salto fijo se parte mal según el ancho; text-balance reparte
              las líneas solo. */}
          <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] lg:text-[3.4rem] font-bold tracking-[-0.03em] text-cream leading-[1.06] text-balance">
            {ANTES}
            <span className="text-amber">{HERO.destacado}</span>
            {DESPUES}
          </h1>

          <p className="text-muted text-base md:text-lg mt-6 max-w-xl mx-auto lg:mx-0 leading-relaxed text-pretty">
            {HERO.entradilla}
          </p>

          {/* El botón principal apunta al formulario, no a /login: quien llega
              de una búsqueda todavía no tiene cuenta. Entrar al panel es para
              clientes y ya está en la barra superior. */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-9">
            <a href="#contacto">
              <Btn className="px-7 py-3">Quiero una demo</Btn>
            </a>
            <a {...DEMO_LINK_PROPS} aria-label="Ver el menú de ejemplo (se abre en una pestaña nueva)">
              <Btn variante="secundario" className="px-7 py-3">
                <Play size={16} />
                Ver el menú de ejemplo
              </Btn>
            </a>
          </div>

          <ul className="mt-10 flex flex-col sm:flex-row sm:flex-wrap items-center lg:items-start justify-center lg:justify-start gap-x-6 gap-y-3">
            {PILARES.map(({ icono: Icono, texto }) => (
              <li key={texto} className="inline-flex items-center gap-2 text-[13px] text-muted">
                <Icono size={15} className="text-amber shrink-0" />
                {texto}
              </li>
            ))}
          </ul>
        </div>

        {/* Maqueta del menú del comensal. El alto sale de la proporción del
            teléfono, no de un valor fijo: así nunca sobra ni falta caja. */}
        <div className="relative mx-auto w-full max-w-[290px] sm:max-w-[310px]">
          <div className="telefono-marco">
            <div className="telefono-pantalla">
              <span className="telefono-notch" />

              {/* Con video, el teléfono lo enseña a pantalla completa: es la app
                  funcionando de verdad y gana a cualquier maqueta. Sin video, se
                  mantiene la simulación en CSS de abajo. */}
              {VIDEO_DEMO.url ? (
                <video
                  className="absolute inset-0 h-full w-full object-cover"
                  src={VIDEO_DEMO.url}
                  poster={VIDEO_DEMO.poster || undefined}
                  // muted + playsInline es lo que exigen los navegadores para
                  // autoarrancar; sin `muted` el video simplemente no empieza.
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="Demostración del menú digital de Bitemo en un teléfono"
                />
              ) : (
              <div className="absolute inset-0 flex flex-col">
                <div className="flex items-center justify-between px-4 pt-9 pb-3">
                  <span className="inline-flex items-center gap-2">
                    <BitemoIsotipo size={20} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">Mesa 8</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-ok animate-pulsedot" />
                    En vivo
                  </span>
                </div>

                <div className="plato-simulado relative mx-3 flex-1 overflow-hidden rounded-[1.4rem]">
                  {/* Decorativo: pointer-events-none para no comerse los clics. */}
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />

                  <span className="pointer-events-none absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm">
                    <Play size={20} className="translate-x-[1px] fill-white text-white" />
                  </span>

                  <div className="pointer-events-none absolute bottom-24 right-2.5 flex flex-col items-center gap-3.5">
                    {ACCIONES_FEED.map((Icono, i) => (
                      <span
                        key={i}
                        className="grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white/90 ring-1 ring-white/15"
                      >
                        <Icono size={15} />
                      </span>
                    ))}
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
                    <p className="text-[15px] font-semibold leading-tight text-white">Cheesecake de frutos rojos</p>
                    <p className="mt-1 text-[12px] text-white/65">Postres · $18.000</p>
                  </div>
                </div>

                <div className="px-3 pb-4 pt-3">
                  <span className="flex items-center justify-center gap-2 rounded-2xl bg-amber py-3 text-[13px] font-bold text-botontxt">
                    <ShoppingBag size={15} />
                    Agregar al pedido
                  </span>
                </div>
              </div>
              )}
            </div>
          </div>

          <MascotaBitemo
            expresion="recomendando"
            className="mascota-flotante pointer-events-none absolute -bottom-10 -left-6 w-28 sm:-left-14 sm:w-36 lg:-bottom-12 lg:-left-20 lg:w-44"
          />
        </div>
      </div>
    </section>
  );
}
