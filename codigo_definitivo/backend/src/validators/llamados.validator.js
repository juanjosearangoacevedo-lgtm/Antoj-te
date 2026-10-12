const { z, idOpcional, sesionToken } = require('./comunes');
const { MOTIVOS } = require('../services/llamados.service');

// La lista de motivos vive en el service (es la regla de negocio) y aquí solo
// se consume, igual que hace analitica.validator con TIPOS_EVENTO.
const crear = z.object({
  sesion_token: sesionToken,
  motivo: z
    .enum(MOTIVOS, { error: `motivo invalido. Valores permitidos: ${MOTIVOS.join(', ')}` })
    .optional(),
});

const filtros = z.object({
  sucursal_id: idOpcional,
  // El superadmin acota por restaurante; para el resto lo impone su token.
  restaurante_id: idOpcional,
});

module.exports = { crear, filtros };
