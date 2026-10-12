// Manejador global de errores.
//
// Dos reglas, y las dos estaban al reves antes de este archivo:
//
// 1. AL CLIENTE solo se le cuenta lo que le sirve. Los errores previstos
//    (ApiError y sus subclases) llevan un mensaje redactado para que alguien lo
//    lea: ese se manda tal cual. Un 500 NO: su `message` suele venir del driver
//    de MySQL y regala nombres de tablas y columnas ("Unknown column
//    'restaurante_id' in 'where clause'"), que es justo el mapa que necesita
//    quien esta buscando por donde entrar.
//
// 2. AL LOG va todo. Antes se hacia `if (NODE_ENV !== 'production')
//    console.error(err)`, o sea que produccion —el unico sitio donde no puedes
//    reproducir el fallo a voluntad— era precisamente donde no quedaba rastro.
//    Un 500 que nadie registra no existe hasta que lo reporta un cliente.
module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const esPrevisto = Boolean(err.statusCode);

  if (!esPrevisto || statusCode >= 500) {
    // Sin stack en los 4xx: ensucian el log sin aportar nada.
    console.error(
      JSON.stringify({
        nivel: 'error',
        hora: new Date().toISOString(),
        metodo: req.method,
        ruta: req.originalUrl,
        estado: statusCode,
        usuario: req.user?.id ?? null,
        restaurante: req.user?.restaurante_id ?? null,
        mensaje: err.message,
        stack: err.stack,
      })
    );
  }

  res.status(statusCode).json({
    error: true,
    message: esPrevisto && statusCode < 500 ? err.message : 'Error interno del servidor',
    details: esPrevisto ? err.details || undefined : undefined,
  });
};
