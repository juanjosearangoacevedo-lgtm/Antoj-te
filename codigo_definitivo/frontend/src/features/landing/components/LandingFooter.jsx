import { Link } from 'react-router-dom';
import { BitemoLogo } from './marca/BitemoLogo';
import { WHATSAPP_URL } from '@/features/landing/contenido/contacto';
import { DEMO_LINK_PROPS } from '@/features/landing/contenido/demo';
import { ENLACES_CONTENIDO } from '@/features/landing/contenido/landing';

export default function LandingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        {/* Aquí sí cabe explicar el nombre: la nav solo alcanza para insinuarlo. */}
        <div className="text-center md:text-left">
          <BitemoLogo size="md" leyenda="tagline" />
          <p className="text-sm text-muted mt-4 max-w-sm mx-auto md:mx-0 leading-relaxed">
            De <strong className="font-semibold text-cream">bite</strong> (bocado) y{' '}
            <strong className="font-semibold text-cream">motion</strong> (movimiento): el bocado en movimiento. Marca,
            video y ventas para restaurantes latinoamericanos.
          </p>
        </div>

        {/* Dos grupos: la navegación de la propia página y los enlaces al
            contenido indexable. Los segundos van con <Link> y no con <a> para
            que naveguen dentro de la SPA, pero salen igual en el HTML como
            enlaces reales: es así como un rastreador llega a /guias. */}
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 md:max-w-md md:justify-end">
          {ENLACES_CONTENIDO.map(({ ruta, texto }) => (
            <Link
              key={ruta}
              to={ruta}
              className="text-sm text-muted transition-colors duration-fast hover:text-cream"
            >
              {texto}
            </Link>
          ))}
          <a href="#como-funciona" className="text-sm text-muted transition-colors duration-fast hover:text-cream">
            Cómo funciona
          </a>
          <a href="#beneficios" className="text-sm text-muted transition-colors duration-fast hover:text-cream">
            Qué incluye
          </a>
          <a href="#preguntas" className="text-sm text-muted transition-colors duration-fast hover:text-cream">
            Preguntas
          </a>
          <a href="#contacto" className="text-sm text-muted transition-colors duration-fast hover:text-cream">
            Contacto
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted transition-colors duration-fast hover:text-cream"
          >
            WhatsApp
          </a>
          <a
            {...DEMO_LINK_PROPS}
            aria-label="Menú de ejemplo (se abre en una pestaña nueva)"
            className="text-sm text-muted transition-colors duration-fast hover:text-cream"
          >
            Menú de ejemplo
          </a>
          <Link to="/login" className="text-sm text-muted transition-colors duration-fast hover:text-cream">
            Iniciar sesión
          </Link>
        </nav>
      </div>

      <div className="border-t border-line">
        <p className="max-w-6xl mx-auto px-5 py-5 text-xs text-muted text-center md:text-left">
          © {new Date().getFullYear()} Bitemo · Descubre antes de pedir.
        </p>
      </div>
    </footer>
  );
}
