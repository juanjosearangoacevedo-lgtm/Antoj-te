import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import type { PaginaComentarios, PaginaFeed, PlatoFeed } from '@/shared/api/esquemas';
import { actualizarSocial, claves, platosDe, quitarComentario, sumarComentario } from './cache';

function plato(id: number, meGusta = 0): PlatoFeed {
  return {
    id,
    nombre: `Plato ${id}`,
    descripcion: null,
    precio: 20_000,
    moneda: 'COP',
    categoria: 'Postres',
    video_url: `https://cdn/${id}/playlist.m3u8`,
    video_thumbnail_url: null,
    imagen_url: null,
    duracion_segundos: null,
    nivel_picante: 0,
    recomendado_chef: false,
    restaurante: { slug: 'demo', nombre: 'Demo', ciudad: null, logo: null },
    social: { me_gusta: meGusta, comentarios: 0, me_gusta_yo: false, guardado_yo: false },
    compartir_url: `https://bitemo.co/r/demo?plato=${id}`,
  };
}

const pagina = (items: PlatoFeed[], cursor: string | null = null): PaginaFeed => ({
  items,
  total: items.length,
  hay_mas: Boolean(cursor),
  cursor,
});

// Sin recolección de basura: en las pruebas no hay quien observe las consultas,
// y su temporizador de limpieza dejaría a Jest esperando.
const nuevoCliente = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

const infinita = <T,>(paginas: T[]): InfiniteData<T, string | null> => ({ pages: paginas, pageParams: paginas.map(() => null) });

describe('actualizarSocial', () => {
  test('un me gusta se ve igual en todas las listas donde está el plato', () => {
    const cliente = nuevoCliente();
    cliente.setQueryData(claves.lista([]), infinita([pagina([plato(1, 3), plato(2)])]));
    cliente.setQueryData(claves.lista(['chef']), infinita([pagina([plato(1, 3)])]));
    cliente.setQueryData(claves.guardados, { items: [plato(1, 3)] });
    cliente.setQueryData(claves.plato(1), plato(1, 3));

    actualizarSocial(cliente, 1, (s) => ({ ...s, me_gusta: s.me_gusta + 1, me_gusta_yo: true }));

    const enInicio = cliente.getQueryData<InfiniteData<PaginaFeed>>(claves.lista([]))!.pages[0]!.items;
    expect(enInicio[0]!.social).toMatchObject({ me_gusta: 4, me_gusta_yo: true });
    // El otro plato de la lista no se toca.
    expect(enInicio[1]!.social.me_gusta_yo).toBe(false);
    expect(cliente.getQueryData<InfiniteData<PaginaFeed>>(claves.lista(['chef']))!.pages[0]!.items[0]!.social.me_gusta).toBe(4);
    expect(cliente.getQueryData<{ items: PlatoFeed[] }>(claves.guardados)!.items[0]!.social.me_gusta).toBe(4);
    expect(cliente.getQueryData<PlatoFeed>(claves.plato(1))!.social.me_gusta).toBe(4);
  });

  test('si el plato no está en caché, no pasa nada', () => {
    const cliente = nuevoCliente();
    expect(() => actualizarSocial(cliente, 99, (s) => s)).not.toThrow();
  });
});

describe('listas', () => {
  test('la misma selección en otro orden usa la misma caché', () => {
    expect(claves.lista(['sabor:picante', 'chef'])).toEqual(claves.lista(['chef', 'sabor:picante']));
  });

  test('platosDe junta las páginas sin repetir', () => {
    const datos = infinita([pagina([plato(1), plato(2)], 'c1'), pagina([plato(2), plato(3)])]);
    expect(platosDe(datos).map((p) => p.id)).toEqual([1, 2, 3]);
    expect(platosDe(undefined)).toEqual([]);
  });
});

describe('comentarios', () => {
  const comentario = (id: number) => ({ id, texto: `c${id}`, creado_en: '', hace_segundos: 0, autor: { nombre: 'Ana' }, mio: false });

  test('el comentario nuevo va arriba y suma al total; quitarlo lo saca', () => {
    const cliente = nuevoCliente();
    const inicial: PaginaComentarios = { items: [comentario(1)], total: 1, hay_mas: false, cursor: null };
    cliente.setQueryData(claves.comentarios(7), infinita([inicial]));

    sumarComentario(cliente, 7, comentario(2));
    let datos = cliente.getQueryData<InfiniteData<PaginaComentarios>>(claves.comentarios(7))!;
    expect(datos.pages[0]!.items.map((c) => c.id)).toEqual([2, 1]);
    expect(datos.pages[0]!.total).toBe(2);

    quitarComentario(cliente, 7, 1);
    datos = cliente.getQueryData<InfiniteData<PaginaComentarios>>(claves.comentarios(7))!;
    expect(datos.pages[0]!.items.map((c) => c.id)).toEqual([2]);
  });

  test('quitar un comentario lo descuenta del total una sola vez', () => {
    const cliente = nuevoCliente();
    const inicial: PaginaComentarios = { items: [comentario(1), comentario(2)], total: 5, hay_mas: true, cursor: 'x' };
    cliente.setQueryData(claves.comentarios(7), infinita([inicial]));
    const total = () => cliente.getQueryData<InfiniteData<PaginaComentarios>>(claves.comentarios(7))!.pages[0]!.total;

    quitarComentario(cliente, 7, 1);
    expect(total()).toBe(4);
    // Repetirlo (dos respuestas, un doble toque) no descuenta otra vez.
    quitarComentario(cliente, 7, 1);
    expect(total()).toBe(4);
  });
});
