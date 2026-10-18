const pool = require('../config/db');

// Señales del feed de la app (vistas, tiempo visto, compartidos…). Llegan por
// lotes: la app las junta unos segundos y las manda en una sola petición, que
// además no choca con los frenos de tasa.
//
// Van a `eventos_app` y NO a `analiticas_eventos_video`: esa tabla es el embudo
// del restaurante en su mesa, y el feed de la app le cambiaría las cifras. Son
// la materia prima de la personalización (APP_MOVIL.md §21.3, v1).

const TIPOS = new Set(['vista', 'tiempo_visto', 'video_completo', 'compartido', 'detalle_abierto', 'restaurante_abierto']);

/** Guarda los eventos que entiende y devuelve cuántos guardó. */
async function registrar(eventos, quien, db = pool) {
  const filas = eventos
    .filter((e) => TIPOS.has(e.tipo))
    .map((e) => [
      quien.dispositivoId ?? null,
      quien.comensalId ?? null,
      quien.plataforma ?? null,
      e.tipo,
      e.plato_id ?? null,
      e.valor ?? null,
    ]);
  if (!filas.length) return 0;
  await db.query('INSERT INTO eventos_app (dispositivo_id, comensal_id, plataforma, tipo, plato_id, valor) VALUES ?', [filas]);
  return filas.length;
}

module.exports = { TIPOS, registrar };
