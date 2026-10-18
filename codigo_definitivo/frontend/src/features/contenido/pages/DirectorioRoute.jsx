import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, UtensilsCrossed } from 'lucide-react';
import ContenidoLayout from '@/features/contenido/components/ContenidoLayout';
import NoEncontrado from '@/features/contenido/pages/NoEncontrado';
import { obtenerDirectorio } from '@/features/contenido/services/directorioApi';

/**
 * Directorio público de restaurantes: /restaurantes y /restaurantes/:ciudad.
 *
 * Existe por dos razones que van juntas. Para el visitante, es la única forma de
 * llegar a las cartas publicadas. Para un buscador, es lo que convierte a las
 * vitrinas /r/:slug en páginas enlazadas en vez de huérfanas: estaban en el
 * sitemap pero ni un solo enlace del sitio apuntaba a ellas.
 *
 * El primer HTML de esta URL lo escribe el servidor con la lista ya dentro (ver
 * backend/src/services/seo/directorio.js). Esto es lo que se pinta encima.
 */
export default function DirectorioRoute() {
  const { ciudad } = useParams();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    setError(null);

    obtenerDirectorio(ciudad)
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(e?.status === 404 ? 404 : 'error'));

    return () => {
      vigente = false;
    };
  }, [ciudad]);

  // Una ciudad sin suficientes restaurantes no tiene página, y el backend
  // responde 404. No es un fallo: es la puerta de calidad, y enseñar la pantalla
  // de "no existe" es lo coherente con el 404 que ya devolvió el servidor.
  if (error === 404) return <NoEncontrado />;

  const restaurantes = datos?.restaurantes || [];
  const nombreCiudad = datos?.ciudad?.nombre;
  const titulo = nombreCiudad
    ? `Restaurantes con menú digital en ${nombreCiudad}`
    : 'Restaurantes con menú digital en Antojate';

  const migas = [
    { nombre: 'Inicio', ruta: '/' },
    { nombre: 'Restaurantes', ruta: '/restaurantes' },
    ...(nombreCiudad ? [{ nombre: nombreCiudad, ruta: `/restaurantes/${datos.ciudad.slug}` }] : []),
  ];

  return (
    <ContenidoLayout migas={migas}>
      <div className="max-w-3xl mx-auto px-5 pt-8 pb-16">
        <h1 className="font-display text-[2rem] md:text-[2.6rem] font-bold tracking-[-0.03em] text-cream leading-[1.1] text-balance">
          {titulo}
        </h1>
        <p className="text-muted text-lg mt-5 leading-relaxed text-pretty">
          Cada restaurante publica aquí su carta completa: los platos que sirve, sus precios y el video de cada uno. Son
          cartas reales, mantenidas por el propio restaurante desde su panel.
        </p>

        {error && (
          <p className="text-muted mt-10">No pudimos cargar el directorio. Vuelve a intentarlo en un momento.</p>
        )}

        {!datos && !error && (
          <ul className="grid gap-4 mt-12" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="skeleton h-24 rounded-[1.5rem]" />
            ))}
          </ul>
        )}

        {datos && restaurantes.length === 0 && (
          <p className="text-muted mt-10">Todavía no hay ninguna carta publicada.</p>
        )}

        {restaurantes.length > 0 && (
          <ul className="grid gap-4 mt-12">
            {restaurantes.map((r) => (
              <li key={r.slug}>
                <Link
                  to={`/r/${r.slug}`}
                  className="tarjeta-landing group block rounded-[1.5rem] p-6 transition-colors duration-fast"
                >
                  <h2 className="text-lg font-semibold text-cream">{r.nombre}</h2>
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    {r.ciudad && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={13} className="text-amber" aria-hidden="true" />
                        {r.ciudad}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <UtensilsCrossed size={13} className="text-amber" aria-hidden="true" />
                      {r.platos} platos
                    </span>
                  </p>
                  {r.descripcion && (
                    <p className="text-sm text-muted mt-3 leading-relaxed text-pretty">{r.descripcion}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {datos?.ciudades?.length > 0 && (
          <nav aria-label="Restaurantes por ciudad" className="mt-14">
            <h2 className="font-display text-xl font-bold text-cream mb-4">Por ciudad</h2>
            <ul className="flex flex-wrap gap-3">
              {datos.ciudades.map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/restaurantes/${c.slug}`}
                    className="tarjeta-landing inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-cream transition-colors duration-fast"
                  >
                    {c.nombre}
                    <span className="text-xs text-muted">{c.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {nombreCiudad && (
          <p className="mt-12">
            <Link to="/restaurantes" className="text-sm text-amber transition-opacity duration-fast hover:opacity-80">
              Ver todos los restaurantes
            </Link>
          </p>
        )}
      </div>
    </ContenidoLayout>
  );
}
