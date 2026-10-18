const { z, id } = require('../comunes');

// Esquemas del feed de la app (/api/app/v1/feed y /platos/:id).
//
// `antojo` llega una vez o varias (?antojo=postres&antojo=chef): Express lo
// entrega como texto o como arreglo. Aquí solo se acota el tamaño; cuáles se
// entienden lo decide services/feed/orden.js, que ignora los desconocidos para
// que una app vieja no se quede sin feed por un antojo nuevo.
const antojo = z.union([z.string().max(120), z.array(z.string().max(120)).max(30)]).optional();

const pagina = z.object({
  antojo,
  cursor: z.string().trim().max(200).optional(),
  // Una página llena la pantalla dos o tres veces; más es gastar datos móviles
  // en videos que quizá nadie vea.
  limite: z.coerce.number().int().min(1).max(30).default(12),
});

const conteo = z.object({ antojo });

const paramsPlato = z.object({ id });

module.exports = { pagina, conteo, paramsPlato };
