/**
 * Semilla de DESARROLLO para la app móvil (decisión D7 de APP_MOVIL.md).
 *
 * Con un solo restaurante no se puede probar lo que hace distinto al feed de la
 * app: el intercalado (nunca dos platos seguidos del mismo restaurante), el
 * filtro por restaurante ni la paginación entre varios. Esto crea dos
 * restaurantes FICTICIOS, marcados "(prueba)" y con slug `prueba-app-*`, con
 * platos que reutilizan los videos que el restaurante demo ya tiene en Bunny:
 * no sube nada ni gasta almacenamiento.
 *
 * Nunca corre en producción, y no toca nada que no haya creado ella.
 *
 * Uso:  node scripts/seedDesarrolloApp.js            los crea (si ya existen, no los toca)
 *       node scripts/seedDesarrolloApp.js --borrar   los quita con todo lo que cuelga de ellos
 */
require('dotenv').config();
const pool = require('../src/config/db');

if (process.env.NODE_ENV === 'production') {
  console.error('Esta semilla es solo para desarrollo: con NODE_ENV=production no corre.');
  process.exit(1);
}

const PREFIJO = 'prueba-app-';

// [nombre, descripción, precio, nivel de picante, recomendado del chef]
const RESTAURANTES = [
  {
    slug: `${PREFIJO}areperia`,
    nombre: 'Arepería La Esquina (prueba)',
    ciudad: 'Medellín',
    descripcion: 'Restaurante ficticio para probar la app en desarrollo.',
    plan: 'basico',
    carta: [
      {
        categoria: 'Arepas',
        platos: [
          ['Arepa de chócolo con quesito', 'Chócolo dulce a la plancha con quesito antioqueño.', 12000, 0, true],
          ['Arepa rellena de carne desmechada', 'Carne desmechada en hogao, aguacate y suero costeño.', 15000, 1, false],
          ['Arepa de huevo costeña', 'Frita al momento, con huevo entero adentro.', 9000, 0, false],
          ['Arepa reina pepiada', 'Pollo, aguacate y mayonesa de la casa.', 14000, 0, false],
        ],
      },
      {
        categoria: 'Bebidas',
        platos: [
          ['Chocolate santafereño', 'Chocolate de mesa con queso para fundir.', 7000, 0, false],
          ['Avena helada', 'Avena cremosa con canela, bien fría.', 6000, 0, false],
        ],
      },
    ],
  },
  {
    slug: `${PREFIJO}wok`,
    nombre: 'Wok Ruta 7 (prueba)',
    ciudad: 'Envigado',
    descripcion: 'Restaurante ficticio para probar la app en desarrollo.',
    plan: 'intermedio',
    carta: [
      {
        categoria: 'Wok',
        platos: [
          ['Arroz frito con cerdo', 'Arroz al wok con cerdo, huevo y cebollín.', 26000, 1, true],
          ['Pad thai de langostinos', 'Fideos de arroz, langostinos, maní y tamarindo.', 34000, 2, false],
          ['Fideos con pollo teriyaki', 'Fideos salteados con pollo glaseado en teriyaki.', 28000, 0, false],
          ['Ramen picante de la casa', 'Caldo de cerdo, chile, huevo marinado y cebollín.', 31000, 3, true],
        ],
      },
      {
        categoria: 'Postres',
        platos: [
          ['Mochi de maracuyá', 'Mochi relleno de crema de maracuyá.', 12000, 0, false],
          ['Helado de té verde', 'Helado artesanal de matcha.', 10000, 0, false],
        ],
      },
    ],
  },
];

async function borrar() {
  const [r] = await pool.query('DELETE FROM restaurantes WHERE slug LIKE ?', [`${PREFIJO}%`]);
  console.log(`Borrados ${r.affectedRows} restaurante(s) de prueba, con sus categorías, platos y lo social.`);
}

async function crear() {
  // Videos reales del demo, para que la app tenga qué reproducir.
  const [videos] = await pool.query(
    `SELECT p.video_url, p.video_thumbnail_url, p.publicado_en
       FROM platos p JOIN categorias c ON c.id = p.categoria_id JOIN restaurantes r ON r.id = c.restaurante_id
      WHERE p.video_status = 'listo' AND p.video_thumbnail_url IS NOT NULL AND r.slug NOT LIKE ?
      ORDER BY p.id`,
    [`${PREFIJO}%`]
  );
  if (!videos.length) throw new Error('No hay platos con video listo para reutilizar. Carga primero el demo.');
  const referencia = videos.reduce((max, v) => (v.publicado_en > max ? v.publicado_en : max), videos[0].publicado_en);

  const [planes] = await pool.query('SELECT id, slug FROM planes');
  let n = 0;

  for (const rest of RESTAURANTES) {
    const [existe] = await pool.query('SELECT id FROM restaurantes WHERE slug = ?', [rest.slug]);
    if (existe.length) {
      console.log(`Ya existe ${rest.slug}: se deja como está.`);
      continue;
    }
    const plan = planes.find((p) => p.slug === rest.plan) ?? planes[0];
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.query(
        "INSERT INTO restaurantes (nombre, slug, descripcion, ciudad, moneda, plan_id, estado) VALUES (?, ?, ?, ?, 'COP', ?, 'activo')",
        [rest.nombre, rest.slug, rest.descripcion, rest.ciudad, plan.id]
      );
      let orden = 0;
      for (const { categoria, platos } of rest.carta) {
        const [c] = await conn.query('INSERT INTO categorias (restaurante_id, nombre, orden) VALUES (?, ?, ?)', [
          r.insertId,
          categoria,
          orden++,
        ]);
        for (const [i, [nombre, descripcion, precio, picante, chef]] of platos.entries()) {
          const video = videos[n % videos.length];
          // Publicados alrededor de la fecha del demo, cada uno media hora antes
          // que el anterior: así el feed tiene de dónde intercalar.
          await conn.query(
            `INSERT INTO platos (categoria_id, nombre, descripcion, precio, video_url, video_thumbnail_url, video_status,
                                 nivel_picante, recomendado_chef, orden, en_feed, publicado_en)
             VALUES (?, ?, ?, ?, ?, ?, 'listo', ?, ?, ?, 1, ? - INTERVAL ? MINUTE)`,
            [c.insertId, nombre, descripcion, precio, video.video_url, video.video_thumbnail_url, picante, chef ? 1 : 0, i, referencia, n * 30]
          );
          n += 1;
        }
      }
      await conn.commit();
      console.log(`Creado ${rest.nombre} (${rest.slug}), plan ${plan.slug}.`);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

(process.argv.includes('--borrar') ? borrar() : crear())
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
