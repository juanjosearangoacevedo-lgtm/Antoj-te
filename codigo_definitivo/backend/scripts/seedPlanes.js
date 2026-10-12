/**
 * Siembra los tres planes comerciales de Bitemo y sus feature flags.
 * Uso: npm run seed:planes
 * Es idempotente: puede correrse varias veces sin duplicar datos.
 */
require('dotenv').config();
const pool = require('../src/config/db');

// Los precios están en pesos colombianos (COP), sin decimales: Bitemo factura
// sus suscripciones en Colombia. No confundir con la moneda del menú, que la
// elige cada restaurante (restaurantes.moneda) y solo afecta a sus platos.
// `features` son interruptores TÉCNICOS que lee `requireFeature` para dejar pasar
// o no una petición. `caracteristicas` es el texto que ve el cliente en la landing.
// Van separados a propósito: "kds" no se le enseña a nadie, y "Panel de cocina en
// tiempo real" no lo entiende el middleware.
//
// El precio anual son diez mensualidades: dos meses de regalo por pagar por año.
const PLANES = [
  {
    nombre: 'Básico',
    slug: 'basico',
    precio: 99000,
    precio_anual: 990000,
    orden: 1,
    destacado: 0,
    limite_platos: 40,
    limite_usuarios: 3,
    descripcion: 'Carta digital con fotos y videos: categorías, productos, precios y orden de visualización.',
    features: ['menu'],
    caracteristicas: [
      'Carta digital con video, lista para el QR',
      'Hasta 40 platos y 3 usuarios',
      'Categorías, precios y orden de la carta',
      'Códigos QR por mesa, ilimitados',
      'Analíticas de tu carta',
    ],
  },
  {
    nombre: 'Intermedio',
    slug: 'intermedio',
    precio: 169900,
    precio_anual: 1699000,
    orden: 2,
    destacado: 0,
    limite_platos: 120,
    limite_usuarios: 8,
    descripcion: 'Todo lo del Básico + personalización visual completa del menú (colores, tipografía, banner, tema).',
    features: ['menu', 'personalizacion'],
    caracteristicas: [
      'Todo lo del plan Básico',
      'Hasta 120 platos y 8 usuarios',
      'Colores y tipografías de tu marca',
      'Pantalla de bienvenida y portada propias',
      'Botón de llamar al mesero',
    ],
  },
  {
    nombre: 'Pro',
    slug: 'pro',
    precio: 229900,
    precio_anual: 2299000,
    orden: 3,
    destacado: 1,
    limite_platos: null,
    limite_usuarios: null,
    descripcion: 'Todo lo anterior + carrito de compras, envío automático a cocina y panel de cocina en tiempo real.',
    features: ['menu', 'personalizacion', 'carrito', 'kds'],
    caracteristicas: [
      'Todo lo del plan Intermedio',
      'Platos y usuarios sin límite',
      'El comensal pide desde su mesa',
      'Panel de cocina en tiempo real',
      'Tiempos de cocina y embudo de conversión',
    ],
  },
];

(async () => {
  try {
    for (const plan of PLANES) {
      const campos = [
        plan.slug,
        plan.precio,
        plan.precio_anual,
        plan.descripcion,
        plan.orden,
        plan.destacado,
        plan.limite_platos,
        plan.limite_usuarios,
      ];

      const [rows] = await pool.query('SELECT id FROM planes WHERE nombre = ?', [plan.nombre]);
      let planId;
      if (rows[0]) {
        planId = rows[0].id;
        // `activo` NO se toca al re-sembrar: si alguien retiró un plan de la venta
        // desde el panel, volver a correr el seed no debe reponerlo en la landing.
        await pool.query(
          `UPDATE planes SET slug = ?, precio = ?, precio_anual = ?, descripcion = ?,
           orden = ?, destacado = ?, limite_platos = ?, limite_usuarios = ? WHERE id = ?`,
          [...campos, planId]
        );
      } else {
        const [result] = await pool.query(
          `INSERT INTO planes (nombre, slug, precio, precio_anual, descripcion, orden, destacado, limite_platos, limite_usuarios)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [plan.nombre, ...campos]
        );
        planId = result.insertId;
      }

      await pool.query('DELETE FROM plan_features WHERE plan_id = ?', [planId]);
      const values = plan.features.map((f) => [planId, f]);
      await pool.query('INSERT INTO plan_features (plan_id, feature) VALUES ?', [values]);

      await pool.query('DELETE FROM plan_caracteristicas WHERE plan_id = ?', [planId]);
      const textos = plan.caracteristicas.map((t, i) => [planId, t, i + 1]);
      await pool.query('INSERT INTO plan_caracteristicas (plan_id, texto, orden) VALUES ?', [textos]);

      console.log(
        `Plan "${plan.nombre}" (#${planId}) → features: ${plan.features.join(', ')} · ${plan.caracteristicas.length} características`
      );
    }
    console.log('Planes sembrados correctamente.');
    process.exit(0);
  } catch (err) {
    console.error('Error sembrando planes:', err.message);
    process.exit(1);
  }
})();
