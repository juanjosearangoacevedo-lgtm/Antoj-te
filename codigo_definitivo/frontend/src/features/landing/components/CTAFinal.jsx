import { Play } from 'lucide-react';
import { Btn } from '@/shared/components/ui';
import MascotaBitemo from './marca/MascotaBitemo';
import { DEMO_LINK_PROPS } from '@/features/landing/contenido/demo';
import { CTA_FINAL } from '@/features/landing/contenido/landing';

export default function CTAFinal() {
  return (
    <section className="franja-cta border-t border-line">
      <div className="max-w-4xl mx-auto px-5 py-16 md:py-20">
        <div className="tarjeta-destacada relative rounded-[2rem] px-6 pt-32 pb-10 sm:px-10 sm:pt-10 shadow-card">
          {/* En móvil la mascota se centra arriba; desde sm se asoma por el
              costado y la tarjeta recupera su padding normal. */}
          <MascotaBitemo
            expresion="celebrando"
            className="mascota-flotante pointer-events-none absolute -top-6 left-1/2 w-28 -translate-x-1/2 sm:left-auto sm:-right-4 sm:-top-10 sm:w-36 sm:translate-x-0 lg:-right-12 lg:w-44"
          />

          <div className="text-center sm:text-left sm:max-w-[68%]">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.02em] text-cream text-balance">
              {CTA_FINAL.h2}
            </h2>
            <p className="text-muted text-base mt-4 leading-relaxed text-pretty">{CTA_FINAL.texto}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <a href="#contacto">
                <Btn className="px-8 py-3">Quiero una demo</Btn>
              </a>
              <a {...DEMO_LINK_PROPS} aria-label="Ver el ejemplo (se abre en una pestaña nueva)">
                <Btn variante="secundario" className="px-7 py-3">
                  <Play size={16} />
                  Ver el ejemplo
                </Btn>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
