const { z, id, idOpcional, textoOpcional, sesionToken, exigirPlatoOCombo } = require('./comunes');

const agregarItem = z
  .object({
    sesion_token: sesionToken,
    plato_id: idOpcional,
    combo_id: idOpcional,
    cantidad: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1').default(1),
    notas_instrucciones: textoOpcional(500),
    modificadores: z.array(id).optional().default([]),
  })
  .superRefine(exigirPlatoOCombo);

// `sesion_token` es obligatorio aunque la linea ya se identifique por su id: es lo
// unico que prueba que quien la edita es el mismo comensal que la agrego.
const actualizarItem = z.object({
  sesion_token: sesionToken,
  cantidad: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1').optional(),
  notas_instrucciones: textoOpcional(500),
});

const eliminarItem = z.object({ sesion_token: sesionToken });

const checkout = z.object({
  sesion_token: sesionToken,
  observaciones: textoOpcional(1000),
});

module.exports = { agregarItem, actualizarItem, eliminarItem, checkout };
