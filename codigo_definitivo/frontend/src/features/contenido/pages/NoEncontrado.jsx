import { Link } from 'react-router-dom';
import ContenidoLayout from '@/features/contenido/components/ContenidoLayout';

const SALIDAS = [
  { ruta: '/', texto: 'Portada de Bitemo' },
  { ruta: '/guias', texto: 'Guías para restaurantes' },
  { ruta: '/restaurantes', texto: 'Restaurantes en Bitemo' },
];

/**
 * Pantalla de "no encontrado".
 *
 * Antes el router mandaba cualquier ruta desconocida a la portada con un
 * Navigate. Para un visitante era confuso —pedía una dirección y aterrizaba en
 * otra sin explicación— y para un buscador era peor: el servidor respondía 200
 * a URLs que no existen, que es lo que Google llama "soft 404" y llena el índice
 * de direcciones inventadas. Ahora Nginx devuelve un 404 de verdad y esta
 * pantalla explica qué pasó.
 */
export default function NoEncontrado() {
  return (
    <ContenidoLayout>
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <p className="text-[11px] uppercase tracking-[0.28em] text-amber-soft font-semibold">Error 404</p>
        <h1 className="font-display text-[2rem] md:text-[2.6rem] font-bold tracking-[-0.03em] text-cream mt-4 text-balance">
          Esta página no existe
        </h1>
        <p className="text-muted mt-5 leading-relaxed text-pretty">
          Puede que el enlace esté mal escrito o que la página haya cambiado de dirección.
        </p>

        <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {SALIDAS.map(({ ruta, texto }) => (
            <li key={ruta}>
              <Link to={ruta} className="text-sm text-amber transition-opacity duration-fast hover:opacity-80">
                {texto}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </ContenidoLayout>
  );
}
