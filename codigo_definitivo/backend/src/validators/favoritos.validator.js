const { z, idOpcional, sesionToken, exigirPlatoOCombo } = require('./comunes');

const toggle = z
  .object({
    sesion_token: sesionToken,
    plato_id: idOpcional,
    combo_id: idOpcional,
  })
  .superRefine(exigirPlatoOCombo);

module.exports = { toggle };
