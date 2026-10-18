import { pedir } from './cliente';
import {
  esquemaConteo,
  esquemaDetallePlato,
  esquemaGuardados,
  esquemaOpcionesFeed,
  esquemaPaginaFeed,
  esquemaPlatoFeed,
} from './esquemas';

// El feed de la app (fase 2). No exige cuenta: con sesión, el cliente manda el
// token y el backend responde con los "me gusta" y guardados de la cuenta; sin
// ella, con los del teléfono (X-Dispositivo).

/** `?antojo=a&antojo=b…` más lo que se añada. Los antojos son los ids de la hoja ANTOJATE. */
function consulta(antojos: string[], extra: Record<string, string | number | null | undefined> = {}): string {
  const partes = antojos.map((a) => `antojo=${encodeURIComponent(a)}`);
  for (const [clave, valor] of Object.entries(extra)) {
    if (valor !== null && valor !== undefined && valor !== '') partes.push(`${clave}=${encodeURIComponent(String(valor))}`);
  }
  return partes.length ? `?${partes.join('&')}` : '';
}

export const feed = {
  pagina: (
    { antojos, cursor, limite }: { antojos: string[]; cursor: string | null; limite: number },
    senal?: AbortSignal
  ) => pedir(`/app/v1/feed${consulta(antojos, { cursor, limite })}`, { esquema: esquemaPaginaFeed, senal }),

  opciones: (senal?: AbortSignal) => pedir('/app/v1/feed/opciones', { esquema: esquemaOpcionesFeed, senal }),

  // Cuántos platos coinciden con unos antojos: el contador de la hoja ANTOJATE.
  conteo: (antojos: string[], senal?: AbortSignal) =>
    pedir(`/app/v1/feed/conteo${consulta(antojos)}`, { esquema: esquemaConteo, senal }),

  plato: (id: number, senal?: AbortSignal) => pedir(`/app/v1/platos/${id}`, { esquema: esquemaPlatoFeed, senal }),

  guardados: (senal?: AbortSignal) => pedir('/app/v1/guardados', { esquema: esquemaGuardados, senal }),

  // Ingredientes y alérgenos: la misma ficha pública que usa la web.
  detalle: (id: number, senal?: AbortSignal) =>
    pedir(`/public/platos/${id}`, { sesion: false, esquema: esquemaDetallePlato, senal }),
};
