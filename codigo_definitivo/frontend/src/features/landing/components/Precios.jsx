import { useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { Btn } from '@/shared/components/ui';
import { formatoPrecioPlan } from '@/shared/utils/formato';
import { usePlanes } from '@/features/landing/hooks/usePlanes';
import { PRECIOS as COPIA } from '@/features/landing/contenido/landing';

// Doce mensualidades es lo que costaría pagar mes a mes; el precio anual del plan
// es lo que se cobra de verdad. La diferencia es el descuento que se anuncia.
function descuentoAnual(plan) {
  if (!plan.precio_anual || !plan.precio) return null;
  const ahorro = plan.precio * 12 - plan.precio_anual;
  if (ahorro <= 0) return null;
  return Math.round((ahorro / (plan.precio * 12)) * 100);
}

function TarjetaPlan({ plan, anual, onElegir }) {
  // Con precio anual se muestra el equivalente por mes, no el desembolso de golpe:
  // así las dos columnas se comparan entre sí y no una mensualidad contra un pago
  // anual, que parece diez veces más caro de un vistazo.
  const mensual = anual && plan.precio_anual ? plan.precio_anual / 12 : plan.precio;
  const descuento = descuentoAnual(plan);

  return (
    <article
      className={`tarjeta-landing rounded-[1.75rem] p-7 shadow-sm flex flex-col relative ${
        plan.destacado ? 'ring-2 ring-amber' : ''
      }`}
    >
      {plan.destacado && (
        <span className="absolute -top-3 left-7 px-3 py-1 rounded-full bg-boton text-botontxt text-[11px] font-bold uppercase tracking-wider">
          El más elegido
        </span>
      )}

      <h3 className="text-lg font-semibold text-cream">{plan.nombre}</h3>
      {plan.descripcion && (
        <p className="text-sm text-muted leading-relaxed mt-2 mb-5">{plan.descripcion}</p>
      )}

      <div className="mb-6 mt-auto pt-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-4xl font-bold tracking-[-0.02em] text-cream tabular-nums">
            {formatoPrecioPlan(mensual)}
          </span>
          <span className="text-sm text-muted">/mes</span>
        </div>
        <p className="text-xs text-muted mt-1.5">
          {anual && plan.precio_anual
            ? `${formatoPrecioPlan(plan.precio_anual)} al año` +
              (descuento ? ` · ahorras ${descuento}%` : '')
            : 'IVA no incluido'}
        </p>
      </div>

      {plan.caracteristicas?.length > 0 && (
        <ul className="space-y-2.5 mb-7">
          {plan.caracteristicas.map((c) => (
            <li key={c} className="flex items-start gap-2.5 text-sm text-muted">
              <Check size={16} className="text-amber shrink-0 mt-0.5" aria-hidden="true" />
              <span className="leading-relaxed">{c}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Enlace real y no un botón con scroll por JavaScript: así funciona con el
          teclado, con clic central y si el JS aún no cargó. El onClick solo añade
          el plan elegido. */}
      <a href="#contacto" className="block mt-auto" onClick={() => onElegir?.(plan.id)}>
        <Btn variante={plan.destacado ? 'primario' : 'secundario'} className="w-full">
          Solicitar una cuenta
        </Btn>
      </a>
    </article>
  );
}

function Esqueleto() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="tarjeta-landing rounded-[1.75rem] p-7 h-[26rem] animate-pulse">
          <div className="h-5 w-24 rounded bg-surface2 mb-4" />
          <div className="h-3 w-full rounded bg-surface2 mb-2" />
          <div className="h-3 w-3/4 rounded bg-surface2 mb-8" />
          <div className="h-10 w-32 rounded bg-surface2" />
        </div>
      ))}
    </div>
  );
}

export default function Precios({ onElegirPlan }) {
  const { planes, error, cargando, reintentar } = usePlanes();
  const [anual, setAnual] = useState(false);

  // Si ningún plan tiene precio anual configurado, el interruptor no pinta nada.
  const hayAnual = planes?.some((p) => p.precio_anual > 0);

  return (
    <section id="precios" className="max-w-6xl mx-auto px-5 py-16 md:py-20">
      <h2 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.02em] text-cream text-center mb-3 text-balance">
        {COPIA.h2}
      </h2>
      <p className="text-muted text-base text-center max-w-2xl mx-auto mb-10 leading-relaxed text-pretty">
        {COPIA.entradilla}
      </p>

      {hayAnual && (
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-xl border border-line bg-surface p-1" role="group">
            {[
              { id: false, texto: 'Mensual' },
              { id: true, texto: 'Anual' },
            ].map((op) => (
              <button
                key={String(op.id)}
                type="button"
                onClick={() => setAnual(op.id)}
                aria-pressed={anual === op.id}
                className={`px-4 py-1.5 text-sm rounded-lg transition-colors duration-fast ${
                  anual === op.id ? 'bg-boton text-botontxt font-semibold' : 'text-muted hover:text-cream'
                }`}
              >
                {op.texto}
              </button>
            ))}
          </div>
        </div>
      )}

      {cargando && <Esqueleto />}

      {error && (
        <div className="tarjeta-landing rounded-[1.75rem] p-8 text-center max-w-md mx-auto">
          <p className="text-sm text-muted mb-4">
            {error} Escríbenos y te contamos los planes por WhatsApp.
          </p>
          <Btn variante="secundario" onClick={reintentar}>
            <RefreshCw size={15} /> Reintentar
          </Btn>
        </div>
      )}

      {planes?.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
          {planes.map((plan) => (
            <TarjetaPlan key={plan.id} plan={plan} anual={anual} onElegir={onElegirPlan} />
          ))}
        </div>
      )}

      {/* Ningún plan a la venta no es un error: es el superadmin habiéndolos
          desactivado todos. La sección no se puede quedar en blanco. */}
      {planes?.length === 0 && (
        <p className="text-sm text-muted text-center">
          Estamos ajustando los planes. Escríbenos y te pasamos una propuesta a medida.
        </p>
      )}
    </section>
  );
}
