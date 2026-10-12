const analiticaModel = require('../models/analitica.model');
const { BadRequestError } = require('../errors');

// Eventos que el sistema sabe interpretar. Es una regla de negocio (define qué
// se puede medir), por eso vive aquí y el validador de la ruta la reutiliza.
//
// `menu_abierto` y `ver_ficha` no llevan plato: son de sesion y de pantalla.
// `scroll_down` se elimino: estaba declarado desde el principio, nunca se disparo,
// y lo que medía ya lo dice el `video_start` de la siguiente tarjeta del feed.
const TIPOS_EVENTO = [
  'menu_abierto',
  'video_start',
  'video_complete',
  'tiempo_visto',
  'abandono_video',
  'ver_ficha',
  'agrego_carrito',
  'click_favorito',
  'compra_exitosa',
];

// Estas consultas agregan miles de filas y el panel se recarga a cada rato. Un
// minuto de desfase no le cambia la decisión a nadie, y ahorra repetir el mismo
// recorrido. Mismo patrón (y mismo TTL) que la caché de features.
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

function limpiarCacheAnalitica() {
  cache.clear();
}

async function cacheado(clave, fn) {
  const hit = cache.get(clave);
  if (hit && hit.exp > Date.now()) return hit.valor;

  const valor = await fn();
  cache.set(clave, { valor, exp: Date.now() + CACHE_TTL_MS });
  return valor;
}

// El rango llega como 'YYYY-MM-DD' desde la URL. `hasta` se desplaza un día porque
// las consultas comparan con `<`: sin eso, pedir "hasta el 31" perdía ese día
// entero salvo la medianoche exacta, que es el error clásico de estos informes.
const DIAS_POR_DEFECTO = 30;

function resolverRango({ desde, hasta } = {}) {
  const formato = /^\d{4}-\d{2}-\d{2}$/;
  for (const [nombre, valor] of [['desde', desde], ['hasta', hasta]]) {
    if (valor && !formato.test(valor)) {
      throw new BadRequestError(`${nombre} debe tener el formato YYYY-MM-DD`);
    }
  }

  const fin = hasta ? new Date(`${hasta}T00:00:00Z`) : new Date();
  const inicio = desde
    ? new Date(`${desde}T00:00:00Z`)
    : new Date(fin.getTime() - DIAS_POR_DEFECTO * 24 * 60 * 60 * 1000);

  if (inicio > fin) throw new BadRequestError('desde no puede ser posterior a hasta');

  const iso = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
  const finExclusivo = new Date(fin.getTime() + 24 * 60 * 60 * 1000);
  return { desde: iso(inicio), hasta: iso(finExclusivo) };
}

// Publico: el cliente (app/web del comensal) reporta cada interaccion con el video/feed
const registrarEvento = (evento) => analiticaModel.registrarEvento(evento);

const porcentaje = (parte, total) =>
  total > 0 ? Number(((parte / total) * 100).toFixed(1)) : 0;

// Resumen del restaurante: la portada del panel de analíticas.
const resumen = async (restauranteId, query) => {
  const rango = resolverRango(query);
  return cacheado(`resumen:${restauranteId}:${rango.desde}:${rango.hasta}`, async () => {
    const [eventos, pedidos, platos] = await Promise.all([
      analiticaModel.resumenEventos(restauranteId, rango),
      analiticaModel.resumenPedidos(restauranteId, rango),
      analiticaModel.rendimientoPorPlato(restauranteId, rango),
    ]);

    // El embudo se arma con sesiones distintas en cada paso, así que cada peldaño
    // es siempre menor o igual que el anterior y los porcentajes significan algo.
    //
    // El primer peldaño son TODAS las sesiones, no las que tienen `menu_abierto`.
    // Ese evento nació el 2026-08-10 y no existe hacia atrás: usarlo dejaba el
    // embudo al revés (1 abrió el menú, 12 vieron un video) sobre datos viejos.
    // Y es igual de cierto: una sesión que generó cualquier evento abrió la carta.
    const visitantes = Number(eventos.visitantes) || 0;
    const embudo = [
      { paso: 'Abrieron el menú', sesiones: visitantes },
      { paso: 'Vieron un video', sesiones: Number(eventos.vieron_video) || 0 },
      { paso: 'Abrieron la ficha', sesiones: Number(eventos.abrieron_ficha) || 0 },
      { paso: 'Agregaron al pedido', sesiones: Number(eventos.agregaron) || 0 },
      { paso: 'Pidieron', sesiones: Number(eventos.compraron) || 0 },
    ].map((p) => ({ ...p, porcentaje: porcentaje(p.sesiones, visitantes) }));

    const conVistas = platos.filter((p) => Number(p.vistas) > 0);

    return {
      rango,
      visitantes,
      menus_abiertos: Number(eventos.menus_abiertos) || 0,
      pedidos: Number(pedidos.pedidos) || 0,
      cancelados: Number(pedidos.cancelados) || 0,
      ingresos: Number(pedidos.ingresos) || 0,
      ticket_promedio: Number(Number(pedidos.ticket_promedio).toFixed(2)),
      conversion: porcentaje(Number(eventos.compraron) || 0, visitantes),
      embudo,
      // "Menos vistos" solo tiene sentido entre los platos publicados: un plato
      // despublicado sale cero por definición y no es un problema que arreglar.
      mas_vistos: conVistas.slice(0, 5),
      menos_vistos: platos
        .filter((p) => p.activo)
        .slice(-5)
        .reverse(),
      sin_vistas: platos.filter((p) => p.activo && Number(p.vistas) === 0).length,
    };
  });
};

// Tabla por producto: mezcla lo que dice el feed (vistas, fichas) con lo que dice
// la caja (unidades vendidas), que son dos fuentes distintas y no intercambiables.
const productos = async (restauranteId, query) => {
  const rango = resolverRango(query);
  return cacheado(`productos:${restauranteId}:${rango.desde}:${rango.hasta}`, async () => {
    const [platos, ventas] = await Promise.all([
      analiticaModel.rendimientoPorPlato(restauranteId, rango),
      analiticaModel.unidadesVendidasPorPlato(restauranteId, rango),
    ]);

    const porPlato = new Map(ventas.map((v) => [v.plato_id, v]));

    return {
      rango,
      productos: platos.map((p) => {
        const venta = porPlato.get(p.plato_id);
        const vistas = Number(p.vistas) || 0;
        return {
          ...p,
          vistas,
          completados: Number(p.completados) || 0,
          fichas: Number(p.fichas) || 0,
          favoritos: Number(p.favoritos) || 0,
          agregados: Number(p.agregados) || 0,
          comprados: Number(p.comprados) || 0,
          segundos_promedio: Number(Number(p.segundos_promedio).toFixed(1)),
          unidades: Number(venta?.unidades) || 0,
          ingresos: Number(venta?.ingresos) || 0,
          // Cuánta de la gente que vio el video acabó pidiéndolo.
          conversion: porcentaje(Number(p.comprados) || 0, vistas),
          retencion: porcentaje(Number(p.completados) || 0, vistas),
        };
      }),
    };
  });
};

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Cuándo hay movimiento: por hora del día y por día de la semana.
const actividad = async (restauranteId, query) => {
  const rango = resolverRango(query);
  return cacheado(`actividad:${restauranteId}:${rango.desde}:${rango.hasta}`, async () => {
    const [horas, dias, tiempos] = await Promise.all([
      analiticaModel.actividadPorHora(restauranteId, rango),
      analiticaModel.actividadPorDia(restauranteId, rango),
      analiticaModel.minutosPorPedido(restauranteId, rango),
    ]);

    // Las horas sin pedidos no vuelven de SQL, pero una gráfica de actividad con
    // huecos se lee mal: se rellenan las 24 en cero.
    const porHora = new Map(horas.map((h) => [Number(h.hora), h]));
    const promedio = tiempos.length
      ? tiempos.reduce((acc, r) => acc + (Number(r.minutos_totales) || 0), 0) / tiempos.length
      : 0;

    return {
      rango,
      horas: Array.from({ length: 24 }, (_, hora) => ({
        hora,
        pedidos: Number(porHora.get(hora)?.pedidos) || 0,
        ingresos: Number(porHora.get(hora)?.ingresos) || 0,
      })),
      dias: dias.map((d) => ({
        dia: DIAS[Number(d.dia_semana) - 1],
        pedidos: Number(d.pedidos) || 0,
        ingresos: Number(d.ingresos) || 0,
      })),
      cocina: {
        promedio_minutos: Number(promedio.toFixed(1)),
        pedidos_medidos: tiempos.length,
      },
    };
  });
};

// Superadmin: uso agregado de la plataforma y quién la está usando de verdad.
const plataforma = async (query) => {
  const rango = resolverRango(query);
  return cacheado(`plataforma:${rango.desde}:${rango.hasta}`, async () => {
    const [uso, altas] = await Promise.all([
      analiticaModel.usoPorRestaurante(rango),
      analiticaModel.altasPorMes(12),
    ]);

    const normalizado = uso.map((r) => ({
      ...r,
      visitantes: Number(r.visitantes) || 0,
      pedidos: Number(r.pedidos) || 0,
    }));
    const activos = normalizado.filter((r) => r.estado === 'activo');

    return {
      rango,
      altas_por_mes: altas,
      total_visitantes: normalizado.reduce((acc, r) => acc + r.visitantes, 0),
      total_pedidos: normalizado.reduce((acc, r) => acc + r.pedidos, 0),
      mas_activos: normalizado.slice(0, 5),
      // Un restaurante activo, pagando, y sin una sola visita en el periodo es el
      // que hay que llamar antes de que se dé de baja.
      sin_actividad: activos.filter((r) => r.visitantes === 0 && r.pedidos === 0),
      restaurantes: normalizado,
    };
  });
};

module.exports = {
  TIPOS_EVENTO,
  registrarEvento,
  resumen,
  productos,
  actividad,
  plataforma,
  limpiarCacheAnalitica,
};
