const crypto = require('node:crypto');

// El orden del feed de la app, sin base de datos: qué platos entran según los
// antojos, en qué orden (lo más reciente primero y nunca dos seguidos del mismo
// restaurante si hay alternativa) y cómo se pagina con un cursor opaco. Todo es
// puro para poder probarlo con node:test; el service pone la base y las cachés.

// --- Antojos ---------------------------------------------------------------
//
// Los mismos ids que arma la app en su hoja ANTOJATE (`tipo:valor`). La regla es
// la de cualquier tienda en línea: dentro de un mismo tipo basta con cumplir una
// opción (Postres O Bebidas); entre tipos hay que cumplirlas todas (Postres Y
// hasta $25.000). Un id que no se entiende no filtra: se ignora, para que una
// app vieja que mande un antojo nuevo no se quede con el feed vacío.

const TOPES_PRECIO = [15000, 25000, 40000];
// Los topes están en pesos colombianos. Un plato en otra moneda no cumple un
// filtro de precio: "hasta 25.000" no significa nada en dólares (APP_MOVIL.md R18).
const MONEDA_PRECIO = 'COP';
const MAX_ANTOJOS = 30;

/** Minúsculas, sin tildes ni espacios sobrantes: "Platos  Fuertes" y "platos fuertes" son la misma categoría. */
function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function separar(id) {
  const i = id.indexOf(':');
  return i === -1 ? [id, ''] : [id.slice(0, i), id.slice(i + 1)];
}

// ¿Este id es un antojo que el feed sabe responder? Devuelve [tipo, valor] o null.
function interpretar(id) {
  const [tipo, valor] = separar(id);
  switch (tipo) {
    case 'chef':
      return valor === '' ? ['chef', ''] : null;
    case 'sabor':
      return valor === 'picante' || valor === 'suave' ? [tipo, valor] : null;
    case 'precio': {
      const tope = Number(valor);
      return Number.isInteger(tope) && tope > 0 ? [tipo, String(tope)] : null;
    }
    case 'categoria':
      return valor ? [tipo, normalizar(valor)] : null;
    case 'restaurante':
      return valor ? [tipo, valor.trim().toLowerCase()] : null;
    default:
      return null;
  }
}

/**
 * Lee los antojos de la petición (uno o varios `antojo=`). Devuelve los válidos,
 * sin repetir y ordenados (así dos peticiones con los mismos antojos en otro
 * orden comparten caché y cursor), y agrupados por tipo.
 */
function parsearAntojos(entrada) {
  const lista = (Array.isArray(entrada) ? entrada : entrada == null ? [] : [entrada])
    .filter((x) => typeof x === 'string')
    .slice(0, MAX_ANTOJOS);

  const validos = new Set();
  for (const bruto of lista) {
    const leido = interpretar(bruto.trim());
    if (leido) validos.add(leido[1] === '' ? leido[0] : `${leido[0]}:${leido[1]}`);
  }

  const ordenados = [...validos].sort();
  const porTipo = new Map();
  for (const id of ordenados) {
    const [tipo, valor] = separar(id);
    porTipo.set(tipo, [...(porTipo.get(tipo) ?? []), valor]);
  }
  return { validos: ordenados, porTipo, clave: ordenados.join('|') };
}

function cumple(plato, tipo, valor) {
  switch (tipo) {
    case 'categoria':
      return plato.categoria_normalizada === valor;
    case 'chef':
      return Boolean(plato.recomendado_chef);
    case 'sabor':
      return valor === 'picante' ? plato.nivel_picante > 0 : plato.nivel_picante === 0;
    case 'precio':
      return plato.moneda === MONEDA_PRECIO && Number(plato.precio) <= Number(valor);
    case 'restaurante':
      return plato.restaurante_slug === valor;
    default:
      return true;
  }
}

/** Los platos que cumplen los antojos: O dentro de un tipo, Y entre tipos. */
function filtrar(platos, porTipo) {
  if (!porTipo || porTipo.size === 0) return platos;
  const grupos = [...porTipo.entries()];
  return platos.filter((p) => grupos.every(([tipo, valores]) => valores.some((v) => cumple(p, tipo, v))));
}

// --- Intercalado -------------------------------------------------------------

/**
 * Reordena una lista ya ordenada por preferencia (lo más reciente primero) para
 * que nunca haya dos platos seguidos del mismo restaurante mientras quede otro
 * restaurante con platos. Dentro de cada restaurante se respeta el orden
 * original, y entre restaurantes gana el que tiene el siguiente plato más
 * preferido. Cuando solo queda un restaurante, sus platos van seguidos: no hay
 * alternativa que poner en medio.
 *
 * Es determinista (mismas entradas, mismo orden), que es lo que permite paginar
 * con un cursor sin repetir ni saltarse platos.
 */
function intercalar(lista, grupoDe = (p) => p.restaurante_id) {
  // Una cola por grupo, y un montículo de colas ordenado por la posición
  // original de su primer plato pendiente: O(n log g).
  const colas = new Map();
  lista.forEach((item, posicion) => {
    const grupo = grupoDe(item);
    if (!colas.has(grupo)) colas.set(grupo, { grupo, items: [], inicio: 0 });
    colas.get(grupo).items.push({ item, posicion });
  });

  const cabeza = (cola) => cola.items[cola.inicio].posicion;
  const monticulo = [];
  const subir = (i) => {
    while (i > 0) {
      const padre = (i - 1) >> 1;
      if (cabeza(monticulo[padre]) <= cabeza(monticulo[i])) break;
      [monticulo[padre], monticulo[i]] = [monticulo[i], monticulo[padre]];
      i = padre;
    }
  };
  const bajar = (i) => {
    for (;;) {
      const izq = 2 * i + 1;
      const der = izq + 1;
      let menor = i;
      if (izq < monticulo.length && cabeza(monticulo[izq]) < cabeza(monticulo[menor])) menor = izq;
      if (der < monticulo.length && cabeza(monticulo[der]) < cabeza(monticulo[menor])) menor = der;
      if (menor === i) return;
      [monticulo[menor], monticulo[i]] = [monticulo[i], monticulo[menor]];
      i = menor;
    }
  };
  const meter = (cola) => {
    monticulo.push(cola);
    subir(monticulo.length - 1);
  };
  const sacar = () => {
    const tope = monticulo[0];
    const ultimo = monticulo.pop();
    if (monticulo.length) {
      monticulo[0] = ultimo;
      bajar(0);
    }
    return tope;
  };

  for (const cola of colas.values()) meter(cola);

  const salida = [];
  let anterior;
  while (monticulo.length) {
    let cola = sacar();
    let apartada = null;
    if (cola.grupo === anterior && monticulo.length) {
      apartada = cola;
      cola = sacar();
    }
    salida.push(cola.items[cola.inicio].item);
    cola.inicio += 1;
    anterior = cola.grupo;
    if (cola.inicio < cola.items.length) meter(cola);
    if (apartada) meter(apartada);
  }
  return salida;
}

// --- Cursor ------------------------------------------------------------------
//
// Opaco para la app: lleva la versión de la estrategia, el corte (la hora de la
// base en que empezó esta sesión de feed: lo publicado después no entra, así que
// no corre las posiciones), el desplazamiento y una huella de los antojos. Un
// cursor de otros antojos, manipulado o de una versión que ya no existe se
// rechaza, y la app empieza de nuevo. Cambiar de estrategia (personalizar) es
// subir `v` sin publicar otra versión de la app.

const VERSION_CURSOR = 1;
const PATRON_CORTE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const MAX_DESPLAZAMIENTO = 100000;

const huella = (clave) => crypto.createHash('sha256').update(String(clave)).digest('base64url').slice(0, 12);

function codificarCursor({ corte, desplazamiento, clave }) {
  return Buffer.from(JSON.stringify({ v: VERSION_CURSOR, c: corte, o: desplazamiento, k: huella(clave) })).toString(
    'base64url'
  );
}

/** { corte, desplazamiento } o null si el cursor no sirve para estos antojos. */
function decodificarCursor(texto, clave) {
  if (typeof texto !== 'string' || texto.length > 200) return null;
  let datos;
  try {
    datos = JSON.parse(Buffer.from(texto, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!datos || datos.v !== VERSION_CURSOR || datos.k !== huella(clave)) return null;
  if (typeof datos.c !== 'string' || !PATRON_CORTE.test(datos.c)) return null;
  if (!Number.isInteger(datos.o) || datos.o < 0 || datos.o > MAX_DESPLAZAMIENTO) return null;
  return { corte: datos.c, desplazamiento: datos.o };
}

// --- Opciones de la hoja ANTOJATE ---------------------------------------------

/**
 * Lo que la app puede ofrecer como antojo, calculado con los platos reales: una
 * opción solo aparece si al menos un plato la cumple. Las etiquetas (y el
 * formato de los precios) las pone la app.
 */
function opciones(platos, restaurantes) {
  const categorias = new Map();
  let chef = 0;
  let picante = 0;
  let suave = 0;
  for (const p of platos) {
    if (p.categoria_normalizada) {
      const c = categorias.get(p.categoria_normalizada);
      if (c) c.total += 1;
      else categorias.set(p.categoria_normalizada, { id: `categoria:${p.categoria_normalizada}`, nombre: p.categoria.trim(), total: 1 });
    }
    if (p.recomendado_chef) chef += 1;
    if (p.nivel_picante > 0) picante += 1;
    else suave += 1;
  }

  const enPesos = platos.filter((p) => p.moneda === MONEDA_PRECIO);
  const topes = TOPES_PRECIO.map((valor) => ({ valor, total: enPesos.filter((p) => Number(p.precio) <= valor).length })).filter(
    (t) => t.total > 0
  );

  return {
    total_platos: platos.length,
    total_restaurantes: restaurantes.length,
    categorias: [...categorias.values()].sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es')),
    chef,
    sabor: { picante, suave },
    precio: { moneda: MONEDA_PRECIO, topes },
    restaurantes,
  };
}

module.exports = {
  TOPES_PRECIO,
  MONEDA_PRECIO,
  normalizar,
  parsearAntojos,
  filtrar,
  intercalar,
  codificarCursor,
  decodificarCursor,
  opciones,
};
