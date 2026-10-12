const { BadRequestError } = require('../errors');

// Valida una parte de la petición contra un esquema Zod ANTES de que llegue al
// controller. Si pasa, sustituye el dato por el ya parseado (tipos coercionados,
// strings recortados), así el resto de capas trabaja con datos limpios.
//
//   router.post('/', validar(crearPlatoSchema), ctrl.crear);
//   router.get('/', validar(filtrosSchema, 'query'), ctrl.listar);
const validar = (schema, origen = 'body') => (req, res, next) => {
  const resultado = schema.safeParse(req[origen] ?? {});

  if (!resultado.success) {
    const detalles = resultado.error.issues.map((issue) => ({
      campo: issue.path.join('.') || '(raiz)',
      mensaje: issue.message,
    }));
    // El primer problema va como `message` porque es lo que el frontend muestra;
    // la lista completa viaja en `details`.
    return next(new BadRequestError(detalles[0].mensaje, detalles));
  }

  // `req.query` y `req.params` son de solo lectura en Express 5: se mutan en
  // sitio en vez de reasignarse, para que esto siga funcionando al actualizar.
  if (origen === 'body') req.body = resultado.data;
  else Object.assign(req[origen], resultado.data);

  next();
};

module.exports = validar;
