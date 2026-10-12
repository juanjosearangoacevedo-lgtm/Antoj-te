const { z, id, idOpcional, sesionToken, exigirPlatoOCombo } = require('./comunes');
const { TIPOS_EVENTO } = require('../services/analitica.service');

// Eventos de sesión, no de producto: "abrió la carta" no cuelga de ningún plato.
// El resto sí, y para esos vale la misma regla que usan carrito y favoritos.
const EVENTOS_SIN_PRODUCTO = ['menu_abierto'];

const registrarEvento = z
  .object({
    sucursal_id: id,
    plato_id: idOpcional,
    combo_id: idOpcional,
    tipo_evento: z.enum(TIPOS_EVENTO, {
      error: `tipo_evento invalido. Valores permitidos: ${TIPOS_EVENTO.join(', ')}`,
    }),
    tiempo_segundos: z.coerce.number().min(0).optional().nullable(),
    sesion_token: sesionToken,
  })
  .superRefine((datos, ctx) => {
    if (EVENTOS_SIN_PRODUCTO.includes(datos.tipo_evento)) return;
    exigirPlatoOCombo(datos, ctx);
  });

module.exports = { registrarEvento };
