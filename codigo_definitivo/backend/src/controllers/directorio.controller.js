const asyncHandler = require('../middlewares/asyncHandler');
const directorio = require('../services/seo/directorio');
const { NotFoundError } = require('../errors');

// Directorio público de restaurantes, en JSON.
//
// La versión en HTML la escribe el servidor para los buscadores (ver
// routes/seo.routes.js). Esta la pide React para pintar la misma página con el
// diseño de Antojate, y para navegar dentro de la SPA sin recargar.
//
// Las dos salen del MISMO servicio, así que la puerta de calidad —cuántos platos
// necesita un restaurante para aparecer, cuántos restaurantes necesita una
// ciudad para tener página— se aplica igual en las dos. Si estuviera duplicada,
// el HTML y la pantalla acabarían enseñando listas distintas.

const listar = asyncHandler(async (req, res) => {
  const restaurantes = await directorio.publicables();
  res.json({
    restaurantes,
    ciudades: directorio.ciudadesConPagina(restaurantes).map(({ nombre, slug, items }) => ({
      nombre,
      slug,
      total: items.length,
    })),
  });
});

const porCiudad = asyncHandler(async (req, res) => {
  const restaurantes = await directorio.publicables();
  const ciudad = directorio.ciudadesConPagina(restaurantes).find((c) => c.slug === req.params.ciudad);
  if (!ciudad) throw new NotFoundError('Ciudad sin restaurantes publicados');

  res.json({ ciudad: { nombre: ciudad.nombre, slug: ciudad.slug }, restaurantes: ciudad.items });
});

module.exports = { listar, porCiudad };
