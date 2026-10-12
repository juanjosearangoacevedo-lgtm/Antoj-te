/**
 * Crea un restaurante demo completo para ver toda la experiencia Bitemo:
 *  - Restaurante "Casa Bitemo" en Plan Pro, aprobado
 *  - Admin: demo@bitemo.com / Demo2026*
 *  - 1 sucursal + 2 mesas (la mesa 1 con QR fijo: bitemo-demo)
 *  - 4 categorías con 3 platos con video cada una (12 platos)
 *  - Tema visual configurado (personalización del Plan Intermedio+)
 *
 * Uso: npm run seed:demo   (correr después de seed:roles y seed:planes)
 * Menú del comensal: http://localhost:5173/menu?mesa=bitemo-demo
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../src/config/db');

// Videos de muestra (dominio público). Reemplázalos por los reales desde el panel.
const V = {
  food: 'https://storage.googleapis.com/coverr-main/mp4/Food-Photography.mp4',
  cocina: 'https://storage.googleapis.com/coverr-main/mp4/Cooking-Show.mp4',
  cafe: 'https://storage.googleapis.com/coverr-main/mp4/Coffee-Made.mp4',
  bebida: 'https://storage.googleapis.com/coverr-main/mp4/Pouring-Drinks.mp4',
};

const CARTA = [
  {
    categoria: 'Entradas',
    platos: [
      ['Carpaccio de Res', 'Láminas finas de res, rúgula fresca, parmesano y aceite de oliva al limón.', 24000, V.food, 0, true],
      ['Croquetas de Jamón', 'Croquetas cremosas doradas al momento con alioli suave de ajo asado.', 18000, V.cocina, 0, false],
      ['Ceviche de la Casa', 'Pesca del día marinada en leche de tigre, camote crocante y maíz cancha.', 28000, V.bebida, 1, false],
    ],
  },
  {
    categoria: 'Platos Fuertes',
    platos: [
      ['Ribeye a la Brasa', '350 g de ribeye madurado, papas rústicas confitadas y chimichurri de la casa.', 62000, V.cocina, 0, true],
      ['Risotto de Hongos', 'Arroz arborio cremoso, mezcla de hongos silvestres y aceite de trufa.', 42000, V.food, 0, false],
      ['Pollo al Curry Rojo', 'Pollo en curry rojo tailandés con leche de coco, arroz jazmín y cilantro.', 38000, V.cafe, 2, false],
    ],
  },
  {
    categoria: 'Postres',
    platos: [
      ['Cheesecake de Frutos Rojos', 'Base de galleta artesanal, queso crema horneado y coulis de frutos rojos.', 18000, V.food, 0, true],
      ['Brownie con Helado', 'Brownie de chocolate 70% tibio, helado de vainilla y nueces caramelizadas.', 16000, V.cocina, 0, false],
      ['Affogato Clásico', 'Helado de vainilla ahogado en espresso recién extraído y cacao amargo.', 14000, V.cafe, 0, false],
    ],
  },
  {
    categoria: 'Bebidas',
    platos: [
      ['Limonada de Hierbabuena', 'Limones exprimidos al momento con hierbabuena y jarabe natural.', 9000, V.bebida, 0, false],
      ['Sangría de la Casa', 'Vino tinto, frutas maceradas y un toque de brandy. Jarra para compartir.', 32000, V.bebida, 0, true],
      ['Cold Brew Tonic', 'Café de origen extraído en frío sobre tónica y cáscara de naranja.', 13000, V.cafe, 0, false],
    ],
  },
];

// Tema del restaurante demo.
// NO fija colores ni tipografías a propósito: en NULL, el menú hereda el diseño
// de Bitemo (naranja #FF7A00, Geist, categorías a pantalla completa). Antes este
// seed escribía la paleta anterior al rediseño de marca y eso PISABA el diseño
// nuevo en el menú del comensal, que es como se veía "desactualizado".
// Un restaurante real elige su paleta desde el panel de personalización.
const TEMA = {
  colores_categorias: JSON.stringify({
    Entradas: '#6e8f5c',
    'Platos Fuertes': '#e7a93c',
    Postres: '#d8482f',
    Bebidas: '#5cb8e4',
  }),
  modo: 'oscuro',
};

(async () => {
  try {
    // Requisitos: plan Pro y rol admin_restaurante
    const [[planPro]] = await pool.query("SELECT id FROM planes WHERE nombre = 'Pro' LIMIT 1");
    if (!planPro) throw new Error("No existe el plan 'Pro'. Corre primero: npm run seed:planes");
    const [[rolAdmin]] = await pool.query("SELECT id FROM roles WHERE nombre_rol = 'admin_restaurante' LIMIT 1");
    if (!rolAdmin) throw new Error('No existe el rol admin_restaurante. Corre primero: npm run seed:roles');

    // Restaurante (idempotente)
    const [[existente]] = await pool.query("SELECT id FROM restaurantes WHERE nombre = 'Casa Bitemo' LIMIT 1");
    if (existente) {
      console.log('El restaurante "Casa Bitemo" ya existe (#' + existente.id + ').');
      console.log('Menú: http://localhost:5173/menu?mesa=bitemo-demo');
      process.exit(0);
    }

    const [r] = await pool.query(
      "INSERT INTO restaurantes (nombre, logo_url, plan_id, estado) VALUES ('Casa Bitemo', NULL, ?, 'activo')",
      [planPro.id]
    );
    const restauranteId = r.insertId;
    await pool.query('INSERT INTO suscripciones (restaurante_id, plan_id) VALUES (?, ?)', [restauranteId, planPro.id]);

    // Admin del restaurante
    const hash = await bcrypt.hash('Demo2026*', 10);
    await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash, restaurante_id, role_id) VALUES (?, ?, ?, ?, ?)',
      ['Demo Bitemo', 'demo@bitemo.com', hash, restauranteId, rolAdmin.id]
    );

    // Sucursal + mesas
    const [s] = await pool.query(
      "INSERT INTO sucursales (restaurante_id, nombre, direccion, telefono) VALUES (?, 'Sede Principal', 'Calle 10 # 5-23', '3001234567')",
      [restauranteId]
    );
    const sucursalId = s.insertId;
    await pool.query('INSERT INTO mesas (sucursal_id, numero_mesa, codigo_qr_token) VALUES (?, ?, ?)', [
      sucursalId,
      '1',
      'bitemo-demo',
    ]);
    await pool.query('INSERT INTO mesas (sucursal_id, numero_mesa, codigo_qr_token) VALUES (?, ?, ?)', [
      sucursalId,
      '2',
      uuidv4(),
    ]);

    // Categorías y platos (3 videos por categoría)
    for (let c = 0; c < CARTA.length; c++) {
      const [cat] = await pool.query(
        'INSERT INTO categorias (restaurante_id, nombre, orden) VALUES (?, ?, ?)',
        [restauranteId, CARTA[c].categoria, c]
      );
      for (let p = 0; p < CARTA[c].platos.length; p++) {
        const [nombre, descripcion, precio, video, picante, chef] = CARTA[c].platos[p];
        await pool.query(
          `INSERT INTO platos (categoria_id, nombre, descripcion, precio, video_url, orden, nivel_picante, recomendado_chef)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [cat.insertId, nombre, descripcion, precio, video, p, picante, chef ? 1 : 0]
        );
      }
    }

    // Tema visual (Plan Intermedio+)
    const columnas = ['restaurante_id', ...Object.keys(TEMA)];
    await pool.query(
      `INSERT INTO temas_restaurante (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})`,
      [restauranteId, ...Object.values(TEMA)]
    );

    console.log('Restaurante demo creado con éxito:');
    console.log('  Restaurante : Casa Bitemo (#' + restauranteId + ', Plan Pro, activo)');
    console.log('  Admin       : demo@bitemo.com / Demo2026*');
    console.log('  Carta       : 4 categorías × 3 platos con video');
    console.log('  Menú comensal: http://localhost:5173/menu?mesa=bitemo-demo');
    console.log('  Cocina (KDS) : http://localhost:5173/cocina');
    process.exit(0);
  } catch (err) {
    console.error('Error creando el restaurante demo:', err.message);
    process.exit(1);
  }
})();
