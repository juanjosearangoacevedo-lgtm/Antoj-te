import { QrCode, Clapperboard, ShoppingBag } from 'lucide-react';
import MascotaBitemo from './marca/MascotaBitemo';
import { COMO_FUNCIONA } from '@/features/landing/contenido/landing';

// Los textos viven en contenido/landing.js porque el build también los escribe
// en el HTML estático. Aquí solo queda el icono de cada paso, que es diseño.
const ICONOS = { qr: QrCode, video: Clapperboard, pedido: ShoppingBag };

const PASOS = COMO_FUNCIONA.pasos.map((paso) => ({ ...paso, icono: ICONOS[paso.clave] }));

export default function ComoFunciona() {
  return (
    <section id="como-funciona" className="border-t border-line bg-surface">
      <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        <div className="flex flex-col items-center gap-3 mb-12 text-center">
          <MascotaBitemo expresion="curioso" className="w-20 sm:w-24" />
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.02em] text-cream text-balance">
            {COMO_FUNCIONA.h2}
          </h2>
          <p className="text-muted text-base max-w-lg leading-relaxed text-pretty">
            {COMO_FUNCIONA.entradilla}
          </p>
        </div>

        <ol className="linea-pasos relative grid gap-6 md:grid-cols-3">
          {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
            <li key={titulo} className="tarjeta-landing rounded-[1.75rem] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="icono-marca inline-grid place-items-center w-11 h-11 rounded-2xl shrink-0">
                  <Icono size={20} />
                </span>
                <span className="text-[11px] uppercase tracking-[0.28em] text-amber-soft font-semibold">
                  Paso {i + 1}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-cream mb-3">{titulo}</h3>
              <p className="text-sm text-muted leading-relaxed">{texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
