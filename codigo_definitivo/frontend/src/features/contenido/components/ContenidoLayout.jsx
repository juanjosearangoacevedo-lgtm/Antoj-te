import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import LandingNav from '@/features/landing/components/LandingNav';
import LandingFooter from '@/features/landing/components/LandingFooter';

// Marco común de las páginas de contenido. Reutiliza la barra y el pie de la
// portada a propósito: son las mismas páginas del mismo sitio, y una guía con
// otra cabecera se lee como si fuera de otra empresa.
//
// La superficie es la de plataforma (tema oscuro de marca), igual que la landing.
export default function ContenidoLayout({ migas = [], children }) {
  return (
    <div className="landing-page superficie-plataforma min-h-[100dvh] bg-base">
      <LandingNav />

      {migas.length > 0 && (
        <nav aria-label="Migas de pan" className="max-w-3xl mx-auto px-5 pt-8">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
            {migas.map((m, i) => (
              <li key={m.ruta} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} className="opacity-50" aria-hidden="true" />}
                {i === migas.length - 1 ? (
                  <span aria-current="page">{m.nombre}</span>
                ) : (
                  <Link to={m.ruta} className="transition-colors duration-fast hover:text-cream">
                    {m.nombre}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <main>{children}</main>
      <LandingFooter />
    </div>
  );
}
