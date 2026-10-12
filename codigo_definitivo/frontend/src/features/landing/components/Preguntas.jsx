import { PREGUNTAS } from '@/features/landing/contenido/preguntas';
import { PREGUNTAS as COPIA } from '@/features/landing/contenido/landing';

// Las respuestas se pintan siempre visibles, sin acordeón: Google le da menos
// peso al texto que arranca oculto, y esta sección existe justamente para que
// lo lea. El mismo array alimenta el FAQPage de index.html.
export default function Preguntas() {
  return (
    <section id="preguntas" className="border-t border-line bg-surface">
      <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.02em] text-cream text-center mb-3 text-balance">
          {COPIA.h2}
        </h2>
        <p className="text-muted text-base text-center max-w-2xl mx-auto mb-12 leading-relaxed text-pretty">
          {COPIA.entradilla}
        </p>

        <dl className="grid gap-x-8 gap-y-8 md:grid-cols-2">
          {PREGUNTAS.map(({ pregunta, respuesta }) => (
            <div key={pregunta}>
              <dt className="text-base font-semibold text-cream mb-2">{pregunta}</dt>
              <dd className="text-sm text-muted leading-relaxed">{respuesta}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
