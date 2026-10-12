const { z, idOpcional, texto, textoOpcional } = require('./comunes');

const crear = z.object({
  nombre: z.string({ error: 'nombre es obligatorio' }).trim().min(1, 'nombre es obligatorio').max(255),
  direccion: textoOpcional(500),
  telefono: textoOpcional(50),
  restaurante_id: idOpcional, // solo lo envía el superadmin
});

const actualizar = z.object({
  nombre: texto('nombre').optional(),
  direccion: textoOpcional(500),
  telefono: textoOpcional(50),
});

module.exports = { crear, actualizar };
