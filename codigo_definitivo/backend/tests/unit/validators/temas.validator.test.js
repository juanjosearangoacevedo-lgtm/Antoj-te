const test = require('node:test');
const assert = require('node:assert');

const { guardar } = require('../../../src/validators/temas.validator');

test('acepta colores hexadecimales y el vacio (= por defecto)', () => {
  assert.strictEqual(guardar.safeParse({ color_primario: '#FF7A00' }).success, true);
  assert.strictEqual(guardar.safeParse({ color_primario: '#f70' }).success, true);
  assert.strictEqual(guardar.safeParse({ color_primario: '' }).success, true);
  assert.strictEqual(guardar.safeParse({ color_primario: 'naranja' }).success, false);
});

test('modo solo admite los valores del ENUM de MySQL', () => {
  assert.strictEqual(guardar.safeParse({ modo: 'oscuro' }).success, true);
  assert.strictEqual(guardar.safeParse({ modo: 'claro' }).success, true);
  assert.strictEqual(guardar.safeParse({ modo: 'automatico' }).success, false);
});

// Regresión: estas columnas son VARCHAR, no ENUM. Encerrarlas en un z.enum()
// rompía la pantalla de personalización con valores perfectamente válidos.
test('estilo_tarjetas, layout_categorias e iconografia son texto libre', () => {
  const valores = {
    estilo_tarjetas: ['', 'redondeado', 'cuadrado', 'flotante', 'lo_que_venga'],
    layout_categorias: ['', 'pantalla_completa', 'cuadricula'],
    iconografia: ['', 'lineal', 'relleno', 'emoji'],
  };
  for (const [campo, opciones] of Object.entries(valores)) {
    for (const valor of opciones) {
      assert.strictEqual(
        guardar.safeParse({ [campo]: valor }).success,
        true,
        `${campo}="${valor}" deberia aceptarse`
      );
    }
  }
});

test('los campos JSON pasan tal cual', () => {
  const r = guardar.safeParse({
    colores_categorias: { Entradas: '#fff', Postres: '#000' },
    videos_destacados: [1, 2, 3],
  });
  assert.strictEqual(r.success, true);
  assert.deepStrictEqual(r.data.colores_categorias, { Entradas: '#fff', Postres: '#000' });
  assert.deepStrictEqual(r.data.videos_destacados, [1, 2, 3]);
});

// Los enlaces de redes acaban en un href del menú público: un 'javascript:…'
// guardado por un admin se ejecutaría en el teléfono de cada comensal que
// escanee el QR. Esta es la barrera, y por eso tiene prueba propia.
test('redes_sociales solo admite enlaces http(s)', () => {
  const conUrl = (url) => guardar.safeParse({ redes_sociales: [{ red: 'instagram', url }] }).success;

  assert.strictEqual(conUrl('https://instagram.com/bitemo'), true);
  assert.strictEqual(conUrl('http://bitemo.com'), true);

  assert.strictEqual(conUrl('javascript:alert(1)'), false, 'javascript: no puede pasar');
  assert.strictEqual(conUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.strictEqual(conUrl('instagram.com/bitemo'), false, 'sin esquema no vale');
  assert.strictEqual(conUrl(''), false);
});

test('redes_sociales acepta la lista vacia, null y hasta 8 entradas', () => {
  assert.strictEqual(guardar.safeParse({ redes_sociales: [] }).success, true);
  assert.strictEqual(guardar.safeParse({ redes_sociales: null }).success, true);

  const ocho = Array.from({ length: 8 }, (_, i) => ({ red: 'sitio', url: `https://x${i}.com` }));
  assert.strictEqual(guardar.safeParse({ redes_sociales: ocho }).success, true);
  assert.strictEqual(
    guardar.safeParse({ redes_sociales: [...ocho, { red: 'sitio', url: 'https://y.com' }] }).success,
    false
  );
});

test('los campos de la bienvenida sobreviven a la validacion', () => {
  const r = guardar.safeParse({
    llamar_mesero: true,
    mensaje_bienvenida: '¿Con hambre? Empecemos.',
    redes_sociales: [{ red: 'whatsapp', url: 'https://wa.me/573001112233' }],
  });
  assert.strictEqual(r.success, true, JSON.stringify(r.error?.issues));
  // El interruptor viaja como booleano desde el panel y llega a MySQL como 1/0.
  assert.strictEqual(r.data.llamar_mesero, 1);
  assert.strictEqual(r.data.mensaje_bienvenida, '¿Con hambre? Empecemos.');
  assert.strictEqual(r.data.redes_sociales.length, 1);
});

test('un tema completo del frontend pasa entero', () => {
  const desdeElPanel = {
    color_primario: '#FF7A00',
    color_fondo: '#0e0e11',
    color_botones: '#FF7A00',
    color_texto: '#f5f5f6',
    tipografia_titulos: '"Fraunces", serif',
    tipografia_cuerpo: '"Manrope", sans-serif',
    colores_categorias: {},
    iconografia: 'lineal',
    banner_url: 'https://cdn/banner.jpg',
    portada_url: '',
    videos_destacados: [],
    orden_visual: [],
    estilo_tarjetas: 'redondeado',
    layout_categorias: 'pantalla_completa',
    config_navegacion: {},
    modo: 'oscuro',
  };
  const r = guardar.safeParse(desdeElPanel);
  assert.strictEqual(r.success, true, JSON.stringify(r.error?.issues));
  for (const campo of Object.keys(desdeElPanel)) {
    assert.ok(campo in r.data, `${campo} se perdio al validar`);
  }
});
