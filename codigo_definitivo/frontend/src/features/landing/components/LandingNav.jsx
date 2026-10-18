import { Link, useLocation } from 'react-router-dom';
import { Btn } from '@/shared/components/ui';
import { LogoAntojate } from '@/shared/components/marca/LogoAntojate';

const SECCIONES = [
  { ancla: '#como-funciona', texto: 'Cómo funciona' },
  { ancla: '#beneficios', texto: 'Qué incluye' },
  { ancla: '#precios', texto: 'Precios' },
  { ancla: '#preguntas', texto: 'Preguntas' },
  { ancla: '#contacto', texto: 'Contacto' },
];

// La misma barra sirve en la portada y en las páginas de contenido. Desde una
// guía, un '#precios' pelado no lleva a ninguna parte —esa sección está en la
// portada—, así que fuera de '/' el enlace se escribe completo.
export default function LandingNav() {
  const enPortada = useLocation().pathname === '/';

  return (
    <header className="nav-landing sticky top-0 z-30 backdrop-blur-xl">
      <nav className="max-w-6xl mx-auto px-5 h-20 flex items-center justify-between gap-4">
        {/* Leyenda corta en vez del tagline: cabe también en móvil junto al
            botón (el tagline largo no cabía y había que ocultarlo). */}
        <Link to="/" className="rounded-xl" aria-label="Antojate. Ir al inicio">
          <LogoAntojate size="md" leyenda="corta" />
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <ul className="hidden md:flex items-center gap-1">
            {SECCIONES.map(({ ancla, texto }) => (
              <li key={ancla}>
                <a
                  href={enPortada ? ancla : `/${ancla}`}
                  className="inline-block px-3 py-2 rounded-xl text-sm font-semibold text-muted transition-colors duration-fast hover:text-cream"
                >
                  {texto}
                </a>
              </li>
            ))}
          </ul>

          <Link to="/login">
            <Btn variante="secundario">Iniciar sesión</Btn>
          </Link>
        </div>
      </nav>
    </header>
  );
}
