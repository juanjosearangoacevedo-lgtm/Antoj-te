import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Btn } from '@/shared/components/ui';
import ContenidoLayout from '@/features/contenido/components/ContenidoLayout';
import Secciones from '@/features/contenido/components/Secciones';
import { buscarPorSlug } from '@/features/contenido/contenido/paginas';
import NoEncontrado from '@/features/contenido/pages/NoEncontrado';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

// Se formatea partiendo la cadena y no con new Date(): '2026-08-11' se
// interpreta como medianoche UTC, y en Colombia (UTC-5) eso se muestra como el
// día 10. Una fecha de actualización que retrocede un día es un detalle tonto
// pero se ve.
function fechaLarga(iso) {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${anio}`;
}

/**
 * Una página de contenido (producto o guía). El contenido sale del mismo módulo
 * que usa el build para escribir el HTML estático, así que lo que ve el
 * visitante y lo que ve un buscador son el mismo texto.
 */
export default function PaginaContenido({ slug }) {
  const pagina = buscarPorSlug(slug);
  if (!pagina) return <NoEncontrado />;

  const relacionadas = (pagina.relacionadas || []).map(buscarPorSlug).filter(Boolean);
  const migas =
    pagina.coleccion === 'guia'
      ? [
          { nombre: 'Inicio', ruta: '/' },
          { nombre: 'Guías', ruta: '/guias' },
          { nombre: pagina.h1, ruta: pagina.ruta },
        ]
      : [
          { nombre: 'Inicio', ruta: '/' },
          { nombre: pagina.h1, ruta: pagina.ruta },
        ];

  return (
    <ContenidoLayout migas={migas}>
      <article className="max-w-3xl mx-auto px-5 pt-8 pb-16">
        <h1 className="font-display text-[2rem] md:text-[2.6rem] font-bold tracking-[-0.03em] text-cream leading-[1.1] text-balance">
          {pagina.h1}
        </h1>
        <p className="text-muted text-lg mt-5 leading-relaxed text-pretty">{pagina.entradilla}</p>

        <Secciones secciones={pagina.secciones} />

        {pagina.faq?.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl md:text-[1.75rem] font-bold tracking-[-0.02em] text-cream mb-5 text-balance">
              Preguntas frecuentes
            </h2>
            {/* Sin acordeón: el texto que arranca oculto pesa menos para un
                buscador, y esta sección existe justamente para que lo lea. */}
            <dl className="grid gap-6">
              {pagina.faq.map(({ pregunta, respuesta }) => (
                <div key={pregunta}>
                  <dt className="text-base font-semibold text-cream mb-2">{pregunta}</dt>
                  <dd className="text-sm text-muted leading-relaxed text-pretty">{respuesta}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <p className="text-xs text-muted mt-12">Actualizado el {fechaLarga(pagina.actualizado)}.</p>

        <aside className="tarjeta-destacada rounded-[1.75rem] p-7 mt-12 shadow-card">
          <h2 className="font-display text-xl font-bold text-cream text-balance">
            Monta el menú digital de tu restaurante con Bitemo
          </h2>
          <p className="text-sm text-muted mt-3 leading-relaxed text-pretty">
            Carta en video, un QR por mesa y las comandas directo a cocina. Te lo mostramos funcionando con tus propios
            platos.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/#contacto">
              <Btn className="px-6 py-2.5">Quiero una demo</Btn>
            </a>
            <a href="/#precios">
              <Btn variante="secundario" className="px-6 py-2.5">
                Ver precios
              </Btn>
            </a>
          </div>
        </aside>

        {relacionadas.length > 0 && (
          <nav aria-label="Contenido relacionado" className="mt-12">
            <h2 className="font-display text-xl font-bold text-cream mb-4">Seguir leyendo</h2>
            <ul className="grid gap-3">
              {relacionadas.map((r) => (
                <li key={r.slug}>
                  <Link
                    to={r.ruta}
                    className="tarjeta-landing group flex items-start gap-3 rounded-[1.25rem] p-4 transition-colors duration-fast"
                  >
                    <ArrowRight
                      size={16}
                      className="mt-1 shrink-0 text-amber transition-transform duration-fast group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-cream">{r.h1}</span>
                      <span className="block text-xs text-muted mt-1 leading-relaxed">{r.descripcion}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </article>
    </ContenidoLayout>
  );
}
