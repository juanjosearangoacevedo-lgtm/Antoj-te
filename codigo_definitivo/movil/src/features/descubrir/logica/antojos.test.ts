import type { OpcionesFeed, RestauranteFeed } from '@/shared/api/esquemas';
import { claveAntojos, construirGrupos, normalizar, opcionesElegibles, seleccionVigente } from './antojos';

const restaurante = (slug: string, nombre: string): RestauranteFeed => ({
  slug,
  nombre,
  ciudad: 'Medellín',
  descripcion: null,
  logo: null,
  total: 10,
  miniaturas: [],
});

// Lo que responde GET /app/v1/feed/opciones con una carta pequeña.
function opciones(parcial: Partial<OpcionesFeed> = {}): OpcionesFeed {
  return {
    total_platos: 5,
    total_restaurantes: 1,
    categorias: [
      { id: 'categoria:postres', nombre: 'Postres', total: 2 },
      { id: 'categoria:bebidas', nombre: 'Bebidas', total: 1 },
    ],
    chef: 1,
    sabor: { picante: 1, suave: 4 },
    precio: { moneda: 'COP', topes: [{ valor: 15_000, total: 2 }, { valor: 25_000, total: 4 }] },
    restaurantes: [restaurante('demo', 'Demo')],
    ...parcial,
  };
}

describe('construirGrupos', () => {
  test('arma los antojos con las categorías reales, el chef y el picante', () => {
    const antojo = construirGrupos(opciones()).find((g) => g.id === 'antojo');
    expect(antojo?.opciones.map((o) => o.id)).toEqual([
      'categoria:postres',
      'categoria:bebidas',
      'chef',
      'sabor:picante',
      'sabor:suave',
    ]);
  });

  test('solo ofrece lo que tiene platos detrás', () => {
    const grupos = construirGrupos(
      opciones({ chef: 0, sabor: { picante: 0, suave: 5 }, precio: { moneda: 'COP', topes: [] } })
    );
    const ids = grupos.find((g) => g.id === 'antojo')?.opciones.map((o) => o.id);
    expect(ids).toEqual(['categoria:postres', 'categoria:bebidas']);
    // "Sin picante" no se ofrece si no hay nada picante: todo lo sería.
    expect(ids).not.toContain('sabor:suave');
    // Sin topes con platos no hay grupo de presupuesto.
    expect(grupos.find((g) => g.id === 'precio')).toBeUndefined();
    // Un solo restaurante: elegirlo no cambiaría nada.
    expect(grupos.find((g) => g.id === 'restaurante')).toBeUndefined();
  });

  test('el presupuesto empieza por "Económico" y el restaurante aparece desde dos', () => {
    const grupos = construirGrupos(opciones({ restaurantes: [restaurante('demo', 'Demo'), restaurante('otro', 'Otro')] }));
    const precio = grupos.find((g) => g.id === 'precio');
    expect(precio?.opciones.map((o) => o.etiqueta)).toEqual(['Económico · hasta $15.000', 'Hasta $25.000']);
    expect(grupos.find((g) => g.id === 'restaurante')?.opciones.map((o) => o.id)).toEqual(['restaurante:demo', 'restaurante:otro']);
  });

  test('ocasiones, dietas e intenciones quedan como "pronto"', () => {
    const pronto = construirGrupos(opciones()).filter((g) => g.pronto);
    expect(pronto.map((g) => g.id)).toEqual(['ocasion', 'dieta', 'intencion']);
    expect(pronto.every((g) => g.opciones.every((o) => o.pronto))).toBe(true);
  });
});

describe('selección', () => {
  test('una selección guardada que ya no existe se descarta', () => {
    const elegibles = opcionesElegibles(construirGrupos(opciones()), [restaurante('demo', 'Demo')]);
    expect(
      seleccionVigente(['categoria:postres', 'categoria:sushi', 'ocasion:cumpleanos', 'restaurante:demo'], elegibles)
    ).toEqual(['categoria:postres', 'restaurante:demo']);
  });

  // El inicio y la pantalla de video tienen que compartir la misma lista.
  test('la misma selección en otro orden es la misma clave', () => {
    expect(claveAntojos(['precio:25000', 'chef'])).toBe(claveAntojos(['chef', 'precio:25000', 'chef']));
    expect(claveAntojos([])).toBe('');
  });

  test('la categoría se compara sin mayúsculas ni tildes', () => {
    expect(normalizar('  Platos  Fuertes ')).toBe('platos fuertes');
    expect(normalizar('Cafés')).toBe('cafes');
  });
});
