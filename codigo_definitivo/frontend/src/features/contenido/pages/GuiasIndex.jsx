import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ContenidoLayout from '@/features/contenido/components/ContenidoLayout';
import { listarPorColeccion } from '@/features/contenido/contenido/paginas';

const MIGAS = [
  { nombre: 'Inicio', ruta: '/' },
  { nombre: 'Guías', ruta: '/guias' },
];

/**
 * Índice del clúster de guías. Es la página que sostiene el enlazado interno del
 * tema: recibe enlaces de la portada y reparte hacia cada guía, en vez de dejar
 * siete páginas colgando cada una por su cuenta.
 */
export default function GuiasIndex() {
  const guias = listarPorColeccion('guia');

  return (
    <ContenidoLayout migas={MIGAS}>
      <div className="max-w-3xl mx-auto px-5 pt-8 pb-16">
        <h1 className="font-display text-[2rem] md:text-[2.6rem] font-bold tracking-[-0.03em] text-cream leading-[1.1] text-balance">
          Guías para restaurantes
        </h1>
        <p className="text-muted text-lg mt-5 leading-relaxed text-pretty">
          Cómo montar y aprovechar un menú digital, explicado sin vender nada: qué formatos existen, cómo se crea la
          carta, cómo se graban los platos y qué cambia frente a la carta impresa.
        </p>

        <ul className="grid gap-4 mt-12">
          {guias.map((g) => (
            <li key={g.slug}>
              <Link
                to={g.ruta}
                className="tarjeta-landing group flex items-start gap-4 rounded-[1.5rem] p-6 transition-colors duration-fast"
              >
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-cream text-balance">{g.h1}</h2>
                  <p className="text-sm text-muted mt-2 leading-relaxed text-pretty">{g.descripcion}</p>
                </div>
                <ArrowRight
                  size={18}
                  className="mt-1 shrink-0 text-amber transition-transform duration-fast group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </ContenidoLayout>
  );
}
