const { z, id, idOpcional, texto, textoOpcional, url, precioOpcional, booleano } = require('./comunes');

const item = z.object({
  plato_id: id,
  cantidad: z.coerce.number().int().min(1).optional(),
});

const crear = z.object({
  nombre: z.string({ error: 'nombre es obligatorio' }).trim().min(1, 'nombre es obligatorio').max(255),
  descripcion: textoOpcional(2000),
  precio: precioOpcional,
  video_url: url,
  items: z.array(item).optional(),
  restaurante_id: idOpcional, // solo lo envía el superadmin
});

const actualizar = z.object({
  nombre: texto('nombre').optional(),
  descripcion: textoOpcional(2000),
  precio: precioOpcional,
  video_url: url,
  activo: booleano,
});

const setItems = z.object({
  items: z.array(item, { error: 'items debe ser un arreglo' }),
});

module.exports = { crear, actualizar, setItems };
