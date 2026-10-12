import { Clapperboard, ShoppingCart, ChefHat, Palette, QrCode, BarChart3 } from 'lucide-react';
import { BENEFICIOS as COPIA } from '@/features/landing/contenido/landing';

// Los textos viven en contenido/landing.js (una sola fuente para React y para
// el HTML estático del build). Cada bloque corresponde a algo que la plataforma
// ya hace hoy; aquí solo se le pone su icono.
const ICONOS = {
  video: Clapperboard,
  pedido: ShoppingCart,
  cocina: ChefHat,
  marca: Palette,
  qr: QrCode,
  analitica: BarChart3,
};

const BENEFICIOS = COPIA.items.map((item) => ({ ...item, icono: ICONOS[item.clave] }));

export default function Beneficios() {
  return (
    <section id="beneficios" className="max-w-6xl mx-auto px-5 py-16 md:py-20">
      <h2 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.02em] text-cream text-center mb-3 text-balance">
        {COPIA.h2}
      </h2>
      <p className="text-muted text-base text-center max-w-2xl mx-auto mb-12 leading-relaxed text-pretty">
        {COPIA.entradilla}
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {BENEFICIOS.map(({ icono: Icono, titulo, texto }) => (
          <article key={titulo} className="tarjeta-landing rounded-[1.75rem] p-6 shadow-sm">
            <span className="icono-marca inline-grid place-items-center w-12 h-12 rounded-3xl mb-5">
              <Icono size={20} />
            </span>
            <h3 className="text-lg font-semibold text-cream mb-2">{titulo}</h3>
            <p className="text-sm text-muted leading-relaxed">{texto}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
