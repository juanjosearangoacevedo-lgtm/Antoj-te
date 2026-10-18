// Los antojos del botón ANTOJATE en el menú web: qué se puede elegir y cómo
// filtra la carta. Es la misma lógica de la app móvil
// (movil/src/features/descubrir/logica/antojos.ts), adaptada a un solo
// restaurante. Todo es puro (sin React ni red) para poder probarlo con node:test.
//
// Regla de oro: solo filtra lo que los datos reales permiten responder. La carta
// trae categoría, precio, nivel de picante y si es recomendado del chef; con eso
// se arman las opciones que funcionan. Ocasiones, dietas e intenciones necesitan
// que el restaurante etiquete sus platos: se muestran como "Pronto", no se
// pueden elegir y nunca devuelven resultados inventados.

// Topes de presupuesto por plato, por moneda. Solo hay para las monedas donde se
// sabe qué es "económico"; en las demás, el grupo de presupuesto no aparece.
export const TOPES_POR_MONEDA = {
  COP: [15000, 25000, 40000],
};

// Lo que todavía no se puede responder con datos reales.
const OPCIONES_PRONTO = [
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
    opciones: ['Algo especial', 'Para compartir', 'Lo nuevo de la carta'],
  },
];

/** Minúsculas, sin tildes ni espacios sobrantes: "Platos  Fuertes" y "platos fuertes" son la misma categoría. */
export function normalizar(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

const precioDe = (plato) => Number(plato.precio) || 0;
const picanteDe = (plato) => Number(plato.nivel_picante) || 0;
const esDelChef = (plato) => Boolean(Number(plato.recomendado_chef)) || plato.recomendado_chef === true;

function tipoDe(id) {
  const i = id.indexOf(':');
  return i === -1 ? id : id.slice(0, i);
}

function valorDe(id) {
  const i = id.indexOf(':');
  return i === -1 ? '' : id.slice(i + 1);
}

function coincide(plato, id) {
  const valor = valorDe(id);
  switch (tipoDe(id)) {
    case 'categoria':
      return Boolean(plato.categoria) && normalizar(plato.categoria) === valor;
    case 'chef':
      return esDelChef(plato);
    case 'sabor':
      return valor === 'picante' ? picanteDe(plato) > 0 : picanteDe(plato) === 0;
    case 'precio':
      return precioDe(plato) <= Number(valor);
    default:
      return true;
  }
}

const TIPOS_FILTRABLES = new Set(['categoria', 'chef', 'sabor', 'precio']);

/**
 * Filtra los platos con la selección. Dentro de un mismo tipo basta con cumplir
 * una opción (Postres O Bebidas); entre tipos hay que cumplirlas todas (Postres Y
 * hasta $15.000).
 */
export function filtrar(platos, seleccion) {
  const porTipo = new Map();
  for (const id of seleccion) {
    const tipo = tipoDe(id);
    if (!TIPOS_FILTRABLES.has(tipo)) continue;
    porTipo.set(tipo, [...(porTipo.get(tipo) ?? []), id]);
  }
  if (porTipo.size === 0) return platos;
  return platos.filter((plato) => [...porTipo.values()].every((ids) => ids.some((id) => coincide(plato, id))));
}

/** Categorías de los platos, en el orden en que aparecen, con su cantidad. */
export function categorias(platos) {
  const vistas = new Map();
  for (const plato of platos) {
    if (!plato.categoria) continue;
    const clave = normalizar(plato.categoria);
    const existente = vistas.get(clave);
    if (existente) existente.total += 1;
    else vistas.set(clave, { id: `categoria:${clave}`, nombre: plato.categoria.trim(), total: 1 });
  }
  return [...vistas.values()];
}

export function delChef(platos) {
  return platos.filter(esDelChef);
}

/**
 * Los grupos de la hoja ANTOJATE, armados con los datos reales. Una opción solo
 * aparece si hay al menos un plato que la cumple; los grupos "pronto" van al final.
 *
 * @param {object[]} platos
 * @param {{ moneda?: string, formatear?: (valor: number) => string }} opciones
 */
export function construirGrupos(platos, { moneda = 'COP', formatear = (v) => String(v) } = {}) {
  const grupos = [];

  const antojos = categorias(platos).map(({ id, nombre }) => ({ id, etiqueta: nombre }));
  if (platos.some(esDelChef)) antojos.push({ id: 'chef', etiqueta: 'Recomendado del chef' });
  const conPicante = platos.some((p) => picanteDe(p) > 0);
  const sinPicante = platos.some((p) => picanteDe(p) === 0);
  // "Sin picante" solo tiene sentido si también hay platos picantes.
  if (conPicante) antojos.push({ id: 'sabor:picante', etiqueta: 'Con picante' });
  if (conPicante && sinPicante) antojos.push({ id: 'sabor:suave', etiqueta: 'Sin picante' });
  if (antojos.length) grupos.push({ id: 'antojo', titulo: '¿Qué se te antoja?', opciones: antojos });

  const topes = (TOPES_POR_MONEDA[moneda] ?? []).filter((tope) => platos.some((p) => precioDe(p) <= tope));
  if (topes.length) {
    const primero = TOPES_POR_MONEDA[moneda][0];
    grupos.push({
      id: 'precio',
      titulo: 'Presupuesto por plato',
      opciones: topes.map((tope) => ({
        id: `precio:${tope}`,
        etiqueta: tope === primero ? `Económico · hasta ${formatear(tope)}` : `Hasta ${formatear(tope)}`,
      })),
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

/** Las opciones que se pueden elegir hoy, con su etiqueta. */
export function opcionesElegibles(grupos) {
  const mapa = new Map();
  for (const grupo of grupos) for (const opcion of grupo.opciones) if (!opcion.pronto) mapa.set(opcion.id, opcion.etiqueta);
  return mapa;
}

/** Descarta de la selección lo que ya no existe en la carta. */
export function seleccionVigente(seleccion, elegibles) {
  return seleccion.filter((id) => elegibles.has(id));
}
