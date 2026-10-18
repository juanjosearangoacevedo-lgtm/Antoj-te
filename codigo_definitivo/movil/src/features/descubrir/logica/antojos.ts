import type { OpcionesFeed, RestauranteFeed } from '@/shared/api/esquemas';
import { formatearPrecio } from '@/shared/utils/formato';

// Las preferencias del botón ANTOJATE. Todo es puro (sin React ni red) para
// poder probarlo.
//
// Desde la fase 2 quien filtra es el backend (GET /app/v1/feed?antojo=…), con la
// misma regla de siempre: dentro de un tipo basta una opción, entre tipos hay que
// cumplirlas todas. Aquí solo se arman las opciones de la hoja con lo que el
// backend dice que existe (GET /app/v1/feed/opciones): una opción aparece solo
// si algún plato real la cumple.
//
// Regla de oro: nada inventado. Ocasiones, dietas e intenciones necesitan que los
// restaurantes etiqueten sus platos (taxonomía de la fase 3): se muestran como
// "Pronto", no se pueden elegir y nunca filtran. Cuando exista GET
// /app/v1/taxonomia, OPCIONES_PRONTO desaparece y esas listas vienen de la API.

export interface Opcion {
  /** `tipo:valor`, el mismo id que entiende el backend. */
  id: string;
  etiqueta: string;
  /** Sin datos detrás todavía: se ve en la hoja, no se puede elegir. */
  pronto?: boolean;
}

export interface Grupo {
  id: string;
  titulo: string;
  opciones: Opcion[];
  /** Grupo entero sin datos todavía. */
  pronto?: boolean;
}

// El primer tope de presupuesto es el "Económico".
const TOPE_ECONOMICO = 15_000;

// Lo que pidió el brief y todavía no se puede responder con datos reales.
const OPCIONES_PRONTO: { id: string; titulo: string; opciones: string[] }[] = [
  {
    id: 'ocasion',
    titulo: 'Ocasión',
    opciones: ['Cumpleaños', 'Cita romántica', 'Con amigos', 'En familia', 'Aniversario', 'Reunión o evento'],
  },
  {
    id: 'dieta',
    titulo: 'Dieta y estilo',
    opciones: ['Vegana', 'Vegetariana', 'Saludable', 'Comida rápida', 'Comida típica', 'Cocina internacional'],
  },
  {
    id: 'intencion',
    titulo: 'Lo que buscas',
    opciones: ['Un lugar especial', 'Restaurantes nuevos', 'Cerca de ti', 'Experiencias gastronómicas', 'Para compartir'],
  },
];

/** Minúsculas, sin tildes ni espacios sobrantes: "Platos  Fuertes" y "platos fuertes" son la misma categoría. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * La misma selección en otro orden es el mismo feed: esta clave es la que
 * comparten la caché de cada lista y la pantalla de video que la recorre.
 */
export function claveAntojos(seleccion: string[]): string {
  return [...new Set(seleccion)].sort().join('|');
}

/** Los grupos de la hoja ANTOJATE, con las opciones que el backend dice que existen. */
export function construirGrupos(opciones: OpcionesFeed): Grupo[] {
  const grupos: Grupo[] = [];

  const antojos: Opcion[] = opciones.categorias.map(({ id, nombre }) => ({ id, etiqueta: nombre }));
  if (opciones.chef > 0) antojos.push({ id: 'chef', etiqueta: 'Recomendado del chef' });
  // "Sin picante" solo tiene sentido si también hay platos picantes.
  if (opciones.sabor.picante > 0) antojos.push({ id: 'sabor:picante', etiqueta: 'Con picante' });
  if (opciones.sabor.picante > 0 && opciones.sabor.suave > 0) antojos.push({ id: 'sabor:suave', etiqueta: 'Sin picante' });
  if (antojos.length) grupos.push({ id: 'antojo', titulo: '¿Qué se te antoja?', opciones: antojos });

  if (opciones.precio.topes.length) {
    grupos.push({
      id: 'precio',
      titulo: 'Presupuesto por plato',
      opciones: opciones.precio.topes.map(({ valor }) => ({
        id: `precio:${valor}`,
        etiqueta: valor === TOPE_ECONOMICO ? `Económico · hasta ${formatearPrecio(valor)}` : `Hasta ${formatearPrecio(valor)}`,
      })),
    });
  }

  // Con un solo restaurante, elegirlo no cambia nada: el grupo aparece desde dos.
  if (opciones.restaurantes.length >= 2) {
    grupos.push({
      id: 'restaurante',
      titulo: 'Restaurante',
      opciones: opciones.restaurantes.map((r) => ({ id: `restaurante:${r.slug}`, etiqueta: r.nombre })),
    });
  }

  for (const grupo of OPCIONES_PRONTO) {
    grupos.push({
      id: grupo.id,
      titulo: grupo.titulo,
      pronto: true,
      opciones: grupo.opciones.map((etiqueta) => ({ id: `${grupo.id}:${normalizar(etiqueta)}`, etiqueta, pronto: true })),
    });
  }

  return grupos;
}

/** Todas las opciones que se pueden elegir hoy, incluidas las de restaurante (las usa su tarjeta). */
export function opcionesElegibles(grupos: Grupo[], restaurantes: RestauranteFeed[]): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const grupo of grupos) for (const opcion of grupo.opciones) if (!opcion.pronto) mapa.set(opcion.id, opcion.etiqueta);
  for (const r of restaurantes) mapa.set(`restaurante:${r.slug}`, r.nombre);
  return mapa;
}

/**
 * La selección guardada puede tener opciones que ya no existen (una categoría
 * que el restaurante borró). Se descartan: filtrar por ellas daría cero
 * resultados sin explicación.
 */
export function seleccionVigente(seleccion: string[], elegibles: Map<string, string>): string[] {
  return seleccion.filter((id) => elegibles.has(id));
}
